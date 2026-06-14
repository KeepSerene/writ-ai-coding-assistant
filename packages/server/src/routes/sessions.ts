import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { Role, Mode, MessageStatus } from "@writ/db/enums";
import { db } from "@writ/db/client";
import * as Sentry from "@sentry/hono/node";
import { SUPPORTED_CHAT_MODEL_IDS } from "@writ/shared";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { AuthenticatedEnv } from "../middlewares/require-auth";

const newSessionSchema = z.object({
  title: z.string(),
  cwd: z.string().optional(),
  prompt: z
    .object({
      role: z.enum(Role),
      content: z.string(),
      mode: z.enum(Mode),
      model: z.enum(SUPPORTED_CHAT_MODEL_IDS),
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

const titleSchema = z.object({
  prompt: z.string().min(1),
});

const titleValidator = zValidator("json", titleSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "prompt is required" }, 400);
  }
});

const sessionsRouter = new Hono<AuthenticatedEnv>()
  .get("/", async (c) => {
    const userId = c.get("userId");

    const sessions = await db.session.findMany({
      where: { userId },
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
    const userId = c.get("userId");
    const id = c.req.param("id");
    const session = await db.session.findUnique({
      where: { userId, id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!session) {
      Sentry.logger.warn("Session not found", {
        userId,
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
    const userId = c.get("userId");
    const { prompt, ...newSessiondata } = c.req.valid("json");

    const session = await db.session.create({
      data: {
        ...newSessiondata,
        userId,
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
  })
  .post("/:id/title", titleValidator, async (c) => {
    const id = c.req.param("id");
    const { prompt } = c.req.valid("json");

    const buildFallbackTitle = () => {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      const safe = Array.from(segmenter.segment(prompt))
        .slice(0, 40)
        .map((s) => s.segment)
        .join("");
      return safe.length < prompt.length ? `${safe}...` : safe;
    };

    let title: string;

    try {
      const { text } = await generateText({
        model: google("gemini-3.1-flash-lite"),
        prompt: `Generate a concise title (3-6 words) for a coding assistant session based on this user request:\n\n"${prompt}"\n\nRules: Return only the title. No quotes. No trailing punctuation. Capitalize like a title.`,
        maxOutputTokens: 25,
      });

      title = text.trim().slice(0, 60);
      Sentry.logger.info("Session title generated", { sessionId: id });
    } catch (error) {
      title = buildFallbackTitle();
      Sentry.logger.warn("Title generation failed, using fallback", {
        sessionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await db.session.update({ where: { id }, data: { title } });

    return c.json({ title });
  });

export default sessionsRouter;
