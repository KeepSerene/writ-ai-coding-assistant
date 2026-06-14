import { createMiddleware } from "hono/factory";
import { verifyClerkOAuthToken } from "../lib/clerk-auth";

export interface AuthenticatedEnv {
  Variables: {
    userId: string;
  };
}

/**
 * Hono middleware that enforces authentication on protected routes.
 *
 * Reads and verifies the Clerk OAuth access token from the Authorization
 * header. Attaches `userId` to Hono's context variables on success so
 * downstream route handlers can call `c.get("userId")` without re-validating.
 *
 * Returns 401 if the token is missing, invalid, or expired.
 */
export const requireAuth = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    try {
      const verifiedUser = await verifyClerkOAuthToken(c.req.raw);

      if (!verifiedUser) {
        return c.json(
          { error: "Unauthorized — please run /login to sign in" },
          401,
        );
      }

      c.set("userId", verifiedUser.userId);
      await next();
    } catch (error) {
      console.error(
        "[require-auth] Unexpected error during auth check:",
        error,
      );

      return c.json(
        { error: "Unauthorized — please run /login to sign in" },
        401,
      );
    }
  },
);
