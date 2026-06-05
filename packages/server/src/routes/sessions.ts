import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { findSupportedChatModel } from "@writ/shared";
import { Hono } from "hono";
import { Role, Mode, MessageStatus } from "@writ/db/enums";
import { db } from "@writ/db/client";
import * as Sentry from "@sentry/hono/node";

const newSessionSchema = z.object({
  title: z.string(),
  cwd: z.string().optional(),
  prompt: z
    .object({
      role: z.enum(Role),
      content: z.string(),
      mode: z.enum(Mode),
      model: z
        .string()
        .refine(
          (id) => Boolean(findSupportedChatModel(id)),
          "Unsupported model",
        ),
    })
    .optional(),
});

const newSessionValidator = zValidator(
  "json",
  newSessionSchema,
  (result, c) => {
    if (!result.success) {
      Sentry.logger.warn("Session creation validation failed", {
        path: c.req.path,
        issues: result.error.issues.length,
      });

      return c.json({ error: "Invalid request body" }, 400);
    }
  },
);

const sessionsRouter = new Hono()
  .get("/", async (c) => {
    const sessions = await db.session.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    Sentry.logger.info("Sessions found", {
      count: sessions.length,
    });

    return c.json(sessions);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const session = await db.session.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!session) {
      Sentry.logger.warn("Session not found", {
        userId: "clerk-user", // TODO: integrate Clerk auth
        sessionId: id,
      });

      return c.json({ error: "Session not found" }, 404);
    }

    Sentry.logger.info("Session loaded", {
      sessionId: session.id,
    });

    return c.json(session);
  })
  .post("/", newSessionValidator, async (c) => {
    const { prompt, ...newSessiondata } = c.req.valid("json");

    const session = await db.session.create({
      data: {
        ...newSessiondata,
        userId: "clerk-user", // TODO: integrate Clerk auth
        ...(prompt && {
          messages: {
            create: {
              ...prompt,
              status: MessageStatus.COMPLETED,
            },
          },
        }),
      },
      include: { messages: true },
    });

    Sentry.logger.info("Session created", {
      sessionId: session.id,
      title: session.title,
    });

    return c.json(session, 201);
  });

export default sessionsRouter;
