/**
 * OAuth 2.0 Authorization Code flow with PKCE for the Writ CLI.
 *
 * Why PKCE?
 * The CLI is a public client — it cannot securely store a client secret. PKCE
 * (Proof Key for Code Exchange) replaces the client secret with a one-time
 * cryptographic challenge that only the original caller can answer, protecting
 * against authorization-code interception attacks.
 *
 * Full flow:
 *  1. Generate a random PKCE code verifier + its SHA-256 challenge.
 *  2. Start a temporary local HTTP server on an OS-assigned port.
 *  3. Open the browser to Clerk's /oauth/authorize endpoint.
 *  4. Clerk authenticates the user and redirects to the Writ server's
 *     /auth/callback endpoint (the registered redirect_uri).
 *  5. The server reads the local port from the state parameter and forwards
 *     (redirects) the callback to http://localhost:{port}/callback.
 *  6. The local server receives the authorization code + state.
 *  7. Verify the nonce in state to guard against CSRF.
 *  8. POST the authorization code + code verifier to Clerk's /oauth/token
 *     endpoint to exchange them for an access token.
 *  9. Save the access token to ~/.writ/auth.json and resolve the promise.
 */

import { createServer } from "node:http";
import open from "open";
import { saveAuthToken } from "./auth-token-store";

const clerkApiBaseUrl =
  process.env["CLERK_API_CLIENT_BASE_URL"] ??
  "https://crucial-lemur-72.clerk.accounts.dev";
const clerkOAuthClientId =
  process.env["CLERK_OAUTH_CLIENT_ID"] ?? "54hmCQJIeWcsdOHx";
const serverApiBaseUrl =
  process.env["API_BASE_URL"] ?? "https://writ-server-k1sb.onrender.com";

/**
 * Payload we embed in the OAuth `state` parameter.
 *
 * `nonce`  — random value we generate; verified on callback to prevent CSRF.
 * `port`   — the local server port; the Writ server reads this to redirect
 *             the OAuth callback back to our local listener.
 */
interface OAuthStatePayload {
  nonce: string;
  port: number;
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

/** Encodes arbitrary bytes or a string as a base64url string (no padding). */
function toBase64Url(input: Uint8Array | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Generates the PKCE code challenge from a verifier.
 * challenge = BASE64URL(SHA-256(verifier))   ← RFC 7636 §4.2
 */
async function generatePkceChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );

  return toBase64Url(new Uint8Array(digest));
}

/** Serializes the state payload to a base64url string for the OAuth request. */
function encodeOAuthState(payload: OAuthStatePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

/**
 * Deserializes the state string returned by Clerk.
 *
 * Clerk may append a signature after a "." — we only need the first segment
 * (our own payload).
 */
function decodeOAuthState(rawState: string): OAuthStatePayload {
  const [encodedPayload] = rawState.split(".");

  if (!encodedPayload) {
    throw new Error("Invalid OAuth state: payload segment is missing");
  }

  return JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf-8"),
  ) as OAuthStatePayload;
}

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Initiates the OAuth 2.0 Authorization Code + PKCE login flow.
 *
 * Opens the user's browser, waits for the callback, exchanges the
 * authorization code for an access token, and persists it to disk.
 *
 * Rejects if:
 *  - The OAuth provider returns an error
 *  - State validation fails (CSRF protection)
 *  - The token exchange fails
 *  - The user doesn't complete login within 5 minutes
 */
export async function initiateOAuthLogin(): Promise<{ token: string }> {
  // 1. Generate PKCE pair
  const codeVerifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const codeChallenge = await generatePkceChallenge(codeVerifier);
  const nonce = crypto.randomUUID();

  return new Promise<{ token: string }>((resolve, reject) => {
    let isSettled = false;

    /** Saves the token to disk and resolves the outer Promise. */
    function resolveLogin(accessToken: string): void {
      if (isSettled) return;

      isSettled = true;
      saveAuthToken({ token: accessToken });
      resolve({ token: accessToken });
      // Give the HTTP response time to flush before tearing down
      setTimeout(() => callbackServer.close(), 500);
    }

    /** Rejects the outer Promise and tears down the local server. */
    function rejectLogin(error: Error): void {
      if (isSettled) return;

      isSettled = true;
      reject(error);
      setTimeout(() => callbackServer.close(), 500);
    }

    // 2. Local callback server
    const callbackServer = createServer(async (req, res) => {
      const requestUrl = new URL(req.url ?? "/", "http://localhost");

      if (requestUrl.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");

        return;
      }

      // OAuth provider returned an error (e.g. user denied consent)
      const oauthError = requestUrl.searchParams.get("error");

      if (oauthError) {
        const errorDescription =
          requestUrl.searchParams.get("error_description") ?? oauthError;
        rejectLogin(new Error(errorDescription));
        res.writeHead(400);
        res.end(`Authentication failed: ${errorDescription}`);

        return;
      }

      // Validate required callback params
      const authorizationCode = requestUrl.searchParams.get("code");
      const rawState = requestUrl.searchParams.get("state");

      if (!authorizationCode || !rawState) {
        rejectLogin(
          new Error("Callback is missing the authorization code or state"),
        );
        res.writeHead(400);
        res.end("Bad request");

        return;
      }

      // 7. CSRF check — verify the nonce matches what we sent
      try {
        const statePayload = decodeOAuthState(rawState);

        if (statePayload.nonce !== nonce) {
          throw new Error("OAuth state mismatch — possible CSRF attack");
        }
      } catch (error) {
        rejectLogin(
          error instanceof Error ? error : new Error("Invalid OAuth state"),
        );
        res.writeHead(400);
        res.end("Invalid state");
        return;
      }

      // 8. Exchange authorization code for access token
      const serverCallbackUri = `${serverApiBaseUrl}/auth/callback`;

      try {
        const tokenResponse = await fetch(`${clerkApiBaseUrl}/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: authorizationCode,
            redirect_uri: serverCallbackUri,
            client_id: clerkOAuthClientId!,
            code_verifier: codeVerifier,
          }),
        });

        if (!tokenResponse.ok) {
          const errorBody = await tokenResponse.text();

          throw new Error(
            errorBody || "Failed to exchange authorization code for a token",
          );
        }

        const tokenData = (await tokenResponse.json()) as {
          access_token: string;
        };

        // 9. Persist token and resolve
        resolveLogin(tokenData.access_token);
        res.writeHead(200);
        res.end("Authenticated! You can close this tab now.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        rejectLogin(new Error(message));
        res.writeHead(400);
        res.end(`Authentication failed: ${message}`);
      }
    });

    // 2 (cont.): Listen on an OS-assigned port
    callbackServer.listen(0, "127.0.0.1", () => {
      const address = callbackServer.address();

      if (!address || typeof address === "string") {
        rejectLogin(new Error("Failed to start local OAuth callback server"));
        callbackServer.close();

        return;
      }

      const localPort = address.port;
      const encodedState = encodeOAuthState({ nonce, port: localPort });

      // 3. Build the authorization URL
      const serverCallbackUri = `${serverApiBaseUrl}/auth/callback`;
      const authorizationUrl = new URL(`${clerkApiBaseUrl}/oauth/authorize`);

      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("client_id", clerkOAuthClientId!);
      authorizationUrl.searchParams.set("redirect_uri", serverCallbackUri);
      authorizationUrl.searchParams.set(
        "scope",
        "openid email profile offline_access",
      );
      authorizationUrl.searchParams.set("state", encodedState);
      authorizationUrl.searchParams.set("prompt", "login");
      authorizationUrl.searchParams.set("code_challenge", codeChallenge);
      authorizationUrl.searchParams.set("code_challenge_method", "S256");

      // 4. Open the browser — user authenticates with Clerk
      void open(authorizationUrl.toString());

      // Fail-safe: tear down if the user never completes login
      setTimeout(() => {
        rejectLogin(
          new Error(
            "Login timed out after 5 minutes. Please run /login again.",
          ),
        );
      }, LOGIN_TIMEOUT_MS);
    });
  });
}
