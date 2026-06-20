import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "@writ/db/client";
import { generateText } from "ai";
import { DEFAULT_CHAT_MODEL_ID } from "@writ/shared";
import type { AuthenticatedEnv } from "../middlewares/require-auth";
import { requireComputeCredits } from "../middlewares/require-compute-credits";
import { resolveModel } from "../lib/model-resolver";
import { requirePortfolioQuota } from "../middlewares/require-portfolio-quota";

const newSessionSchema = z.object({
  title: z.string(),
});

const newSessionValidator = zValidator(
  "json",
  newSessionSchema,
  (result, c) => {
    if (!result.success) {
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

const TITLE_GENERATION_MODELS = [
  "gemini-3.1-flash-lite",
  DEFAULT_CHAT_MODEL_ID, // fallback
] as const;

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

    return c.json(sessions);
  })
  .get("/:id", async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const session = await db.session.findUnique({
      where: { userId, id },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(session);
  })
  .post(
    "/",
    requirePortfolioQuota,
    requireComputeCredits,
    newSessionValidator,
    async (c) => {
      const userId = c.get("userId");
      const newSessiondata = c.req.valid("json");

      const session = await db.session.create({
        data: {
          ...newSessiondata,
          userId,
        },
      });

      return c.json(session, 201);
    },
  )
  .post("/:id/title", requireComputeCredits, titleValidator, async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");

    const sessionExists = await db.session.findUnique({
      where: { id, userId },
      select: { id: true },
    });

    if (!sessionExists) {
      return c.json({ error: "Session not found" }, 404);
    }

    const { prompt } = c.req.valid("json");

    const buildFallbackTitle = () => {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      const safe = Array.from(segmenter.segment(prompt))
        .slice(0, 40)
        .map((s) => s.segment)
        .join("");

      return safe.length < prompt.length ? `${safe}...` : safe;
    };

    const titlePrompt = `Generate a concise title (3-6 words) for a coding assistant session based on this user request:\n\n"${prompt}"\n\nRules: Return only the title. No quotes. No trailing punctuation. Capitalize like a title.`;

    let title: string | undefined;

    for (const modelId of TITLE_GENERATION_MODELS) {
      try {
        const { text } = await generateText({
          model: resolveModel(modelId).model,
          prompt: titlePrompt,
          maxOutputTokens: 25,
        });

        title = text.trim().slice(0, 60);
        break;
      } catch (error) {
        console.warn(
          `[sessions] Title generation failed with model "${modelId}":`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (!title) {
      title = buildFallbackTitle();
    }

    await db.session.update({ where: { id, userId }, data: { title } });

    return c.json({ title });
  });

export default sessionsRouter;
