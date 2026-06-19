import { createMiddleware } from "hono/factory";
import { db } from "@writ/db/client";
import type { AuthenticatedEnv } from "./require-auth";

const QUOTA_LIMIT = 3;
const QUOTA_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const isProd = process.env["NODE_ENV"] === "production";

export const requirePortfolioQuota = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    if (!isProd) {
      return next();
    }

    const userId = c.get("userId");
    const now = new Date();

    const quota = await db.userQuota.findUnique({ where: { userId } });

    if (quota) {
      const windowExpired =
        now.getTime() - quota.windowStart.getTime() > QUOTA_WINDOW_MS;

      if (windowExpired) {
        await db.userQuota.update({
          where: { userId },
          data: { messageCount: 0, windowStart: now },
        });
      } else if (quota.messageCount >= QUOTA_LIMIT) {
        const resetsAt = new Date(
          quota.windowStart.getTime() + QUOTA_WINDOW_MS,
        );

        return c.json(
          {
            error: "Portfolio quota exceeded. This is a personal project demo.",
            resetsAt: resetsAt.toISOString(),
          },
          429,
        );
      }
    }

    return next();
  },
);
