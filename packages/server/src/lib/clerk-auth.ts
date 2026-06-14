/**
 * Clerk OAuth token verification for the Writ server.
 */

import { createClerkClient } from "@clerk/backend";

const clerkSecretKey = process.env["CLERK_SECRET_KEY"];
const clerkPublishableKey = process.env["CLERK_PUBLISHABLE_KEY"];

if (!clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY is not set in the environment");
}

if (!clerkPublishableKey) {
  throw new Error("CLERK_PUBLISHABLE_KEY is not set in the environment");
}

const clerkClient = createClerkClient({
  secretKey: clerkSecretKey,
  publishableKey: clerkPublishableKey,
});

export interface VerifiedUser {
  userId: string;
}

/**
 * Verifies the Clerk OAuth access token carried in the request's
 * Authorization header (Bearer scheme).
 *
 * Returns the authenticated user's Clerk user ID on success, or null if the
 * token is absent, expired, or invalid.
 */
export async function verifyClerkOAuthToken(
  request: Request,
): Promise<VerifiedUser | null> {
  try {
    const requestState = await clerkClient.authenticateRequest(request, {
      acceptsToken: "oauth_token",
    });

    if (!requestState.isAuthenticated) {
      return null;
    }

    const auth = requestState.toAuth();

    // Reject if the token type is not what we expect, or if userId is absent
    if (auth.tokenType !== "oauth_token" || !auth.userId) {
      return null;
    }

    return { userId: auth.userId };
  } catch (error) {
    // Log but don't throw — let the middleware return 401 cleanly
    console.error("[clerk-auth] Token verification failed:", error);

    return null;
  }
}
