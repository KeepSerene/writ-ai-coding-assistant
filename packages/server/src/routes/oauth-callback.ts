/**
 * OAuth callback relay route.
 *
 * Why does this exist?
 * Clerk requires that redirect_uri be a pre-registered HTTPS URL — a
 * localhost URL cannot be registered as a production redirect URI.
 * So the CLI registers the Writ server as the redirect target.
 *
 * When Clerk redirects here after the user authenticates:
 *  1. We extract the local server port from the `state` parameter (the CLI
 *     embedded it there before opening the browser).
 *  2. We forward the authorization code + state to the CLI's temporary local
 *     HTTP server at http://localhost:{port}/callback.
 *  3. The CLI's local server completes the token exchange with Clerk directly.
 *
 * This route never sees or stores the authorization code — it only relays it.
 */

import { Hono } from "hono";

const oAuthCallbackRouter = new Hono().get("/callback", (c) => {
  const authorizationCode = c.req.query("code");
  const rawState = c.req.query("state");
  const oauthError = c.req.query("error");
  const oauthErrorDescription = c.req.query("error_description");

  if (oauthError) {
    return c.text(oauthErrorDescription ?? oauthError, 400);
  }

  if (!authorizationCode || !rawState) {
    return c.text("Missing authorization code or state", 400);
  }

  try {
    const [encodedPayload] = rawState.split(".");

    if (!encodedPayload) {
      throw new Error("State payload segment is missing");
    }

    const statePayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8"),
    ) as { port?: unknown };

    const localPort = statePayload.port;

    if (typeof localPort !== "number") {
      throw new Error("State payload is missing a valid port");
    }

    // Redirect to the CLI's temporary local server
    const localCallbackUrl = new URL(`http://localhost:${localPort}/callback`);
    localCallbackUrl.searchParams.set("code", authorizationCode);
    localCallbackUrl.searchParams.set("state", rawState);

    return c.redirect(localCallbackUrl.toString());
  } catch (error) {
    console.error("[oauth-callback] Failed to decode state:", error);

    return c.text("Invalid authentication state", 400);
  }
});

export default oAuthCallbackRouter;
