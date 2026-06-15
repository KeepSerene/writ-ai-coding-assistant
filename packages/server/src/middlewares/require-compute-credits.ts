import { createMiddleware } from "hono/factory";
import type { AuthenticatedEnv } from "./require-auth";
import { getAvailableMeterTokens } from "../lib/polar";

export const requireComputeCredits = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    const userId = c.get("userId");
    const balance = await getAvailableMeterTokens(userId);

    if (balance <= 0) {
      return c.json(
        {
          error: "No compute credits remaining. Run /upgrade to top up.",
        },
        402,
      );
    }

    await next();
  },
);
