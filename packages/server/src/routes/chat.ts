import { z } from "zod";
import {
  convertToModelMessages,
  consumeStream,
  streamText,
  validateUIMessages,
  type ModelMessage,
  type InferUITools,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import {
  getToolContracts,
  modeSchema,
  SUPPORTED_CHAT_MODEL_IDS,
  type AppMessageMetadata,
  type ToolContracts,
} from "@writ/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AuthenticatedEnv } from "../middlewares/require-auth";
import { requireComputeCredits } from "../middlewares/require-compute-credits";
import { db } from "@writ/db/client";
import { resolveModel } from "../lib/model-resolver";
import buildSystemPrompt from "../lib/system-prompt";
import type { Prisma } from "@writ/db";
import { calculateWritConsumedTokens } from "../lib/compute-credits";
import { ingestTokenUsage } from "../lib/polar";
import { requirePortfolioQuota } from "../middlewares/require-portfolio-quota";

const isProd = process.env["NODE_ENV"] === "production";

type AppUIMessage = UIMessage<
  AppMessageMetadata,
  never,
  InferUITools<ToolContracts>
>;

const chatReqSchema = z.object({
  id: z.string(),
  model: z.enum(SUPPORTED_CHAT_MODEL_IDS),
  mode: modeSchema,
  messages: z
    .array(
      z.custom<AppUIMessage>((value) => {
        return (
          value != null &&
          typeof value === "object" &&
          "id" in value &&
          "parts" in value
        );
      }),
    )
    .min(1),
});

const chatReqValidator = zValidator("json", chatReqSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid chat request payload" }, 400);
  }
});

function hasPendingToolCalls(responseMessage: AppUIMessage) {
  return responseMessage.parts.some((part) => {
    if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
      const state = (part as { state?: string }).state;

      return state !== "output-available" && state !== "output-error";
    }

    return false;
  });
}

/**
 * Removes assistant messages from the history that have unresolved tool calls
 * or are completely empty. These are artefacts of previously failed/aborted
 * streams that were saved mid-flight. Leaving them in causes
 * validateUIMessages / convertToModelMessages to throw on the next request.
 */
function sanitizeMessages(messages: AppUIMessage[]): AppUIMessage[] {
  return messages.filter((msg) => {
    if (msg.role !== "assistant") return true;

    // Drop messages with pending (unresolved) tool calls
    if (hasPendingToolCalls(msg)) return false;

    // Drop completely empty assistant messages (aborted before any output)
    const hasContent = msg.parts.some(
      (p) =>
        (p.type === "text" && (p as { text: string }).text.trim().length > 0) ||
        p.type === "reasoning" ||
        p.type === "dynamic-tool" ||
        p.type.startsWith("tool-"),
    );

    return hasContent;
  });
}

/**
 * Ensures the context sent to the LLM doesn't exceed reasonable limits.
 * Walks backwards to keep the most recent messages, and ensures the
 * truncated history safely starts on a user message to prevent
 * orphaning tool-results from their tool-calls.
 */
function pruneModelMessages(
  messages: ModelMessage[],
  maxChars = 24_000,
): ModelMessage[] {
  let currentChars = 0;
  let startIndex = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (!msg) continue;

    const contentStr =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);

    currentChars += contentStr.length;

    if (currentChars > maxChars) {
      // Find the next closest user message to safely start the context
      for (let j = i + 1; j < messages.length; j++) {
        const innerMsg = messages[j];

        if (innerMsg && innerMsg.role === "user") {
          startIndex = j;
          break;
        }
      }

      // Fallback if no user message is found after the cutoff
      if (startIndex === 0 && i + 1 < messages.length) {
        startIndex = i + 1;
      }

      break;
    }
  }

  return messages.slice(startIndex);
}

const chatRouter = new Hono<AuthenticatedEnv>()
  .post(
    "/",
    requirePortfolioQuota,
    requireComputeCredits,
    chatReqValidator,
    async (c) => {
      const sessionId = c.req.param("sessionId");

      if (!sessionId) {
        return c.json({ error: "Missing session ID" }, 400);
      }

      const userId = c.get("userId");

      const session = await db.session.findUnique({
        where: { userId, id: sessionId },
      });

      if (!session) {
        return c.json({ error: "Session not found" }, 404);
      }

      const {
        model,
        mode,
        messages: incomingClientMessages,
      } = c.req.valid("json");
      const startedAt = Date.now();
      const toolContracts = getToolContracts(mode);
      const resolvedModel = resolveModel(model);

      const persistedMessages = Array.isArray(session.messages)
        ? (session.messages as unknown as AppUIMessage[])
        : [];

      // Merge incoming messages with DB history
      const mergedMessages = [...persistedMessages];

      for (const message of incomingClientMessages) {
        const incomingMessage = {
          ...message,
          metadata: { ...message.metadata, model, mode },
        } satisfies AppUIMessage;

        const persistedMessageIndex = mergedMessages.findIndex(
          (m) => m.id === incomingMessage.id,
        );

        if (persistedMessageIndex === -1) {
          mergedMessages.push(incomingMessage);
        } else {
          mergedMessages[persistedMessageIndex] = incomingMessage;
        }
      }

      let validatedUIMessages: AppUIMessage[];

      try {
        validatedUIMessages = await validateUIMessages<AppUIMessage>({
          messages: sanitizeMessages(mergedMessages),
          tools: toolContracts,
        });
      } catch (validationError) {
        console.error("[chat] validateUIMessages failed:", validationError);
        return c.json(
          {
            error:
              "Message history could not be validated. Please start a new session if this keeps happening.",
          },
          422,
        );
      }

      const rawModelMessages = await convertToModelMessages(
        validatedUIMessages,
        {
          tools: toolContracts,
        },
      );

      const prunedModelMessages = pruneModelMessages(rawModelMessages);

      let modelUsage: LanguageModelUsage | null = null;

      const result = streamText({
        model: resolvedModel.model,
        system: buildSystemPrompt(mode),
        messages: prunedModelMessages,
        tools: toolContracts,
        providerOptions: resolvedModel.providerOptions,
        // Wire the HTTP request's AbortSignal so streamText knows when the
        // client disconnects. Without this, event.isAborted is always false,
        // meaning the interrupted flag is never stamped on the DB message
        abortSignal: c.req.raw.signal,
        onFinish: (event) => {
          modelUsage = event.totalUsage;
        },
        onError: ({ error }) => {
          const streamError =
            error instanceof Error ? error : new Error(String(error));
          console.error(
            "[chat] streamText onError:",
            streamError.message,
            streamError.stack,
          );
        },
      });

      return result.toUIMessageStreamResponse<AppUIMessage>({
        consumeSseStream: consumeStream,
        originalMessages: validatedUIMessages,
        messageMetadata: ({ part }) => {
          if (part.type === "start") return { model, mode };
          if (part.type !== "finish") return undefined;

          const isStreamAborted = c.req.raw.signal.aborted;

          return {
            model,
            mode,
            durationMs: Date.now() - startedAt,
            ...(modelUsage ? { modelUsage } : {}),
            ...(isStreamAborted ? { isInterrupted: true } : {}),
          };
        },
        onFinish: async (event) => {
          const isStreamAborted = event.isAborted || c.req.raw.signal.aborted;

          if (!isStreamAborted && hasPendingToolCalls(event.responseMessage)) {
            return;
          }

          // On abort, stamp isInterrupted onto the response message so the UI
          // label persists after the user reloads the session from DB
          const msgsToSave = isStreamAborted
            ? event.messages.map((msg, index) =>
                index === event.messages.length - 1
                  ? {
                      ...msg,
                      metadata: {
                        ...(msg as AppUIMessage).metadata,
                        isInterrupted: true,
                      },
                    }
                  : msg,
              )
            : event.messages;

          await db.session.update({
            where: { id: sessionId, userId },
            data: {
              messages: msgsToSave as unknown as Prisma.InputJsonValue,
            },
          });

          if (isProd) {
            await db.userQuota.upsert({
              where: { userId },
              create: { userId, messageCount: 1 },
              update: { messageCount: { increment: 1 } },
            });
          }

          if (!modelUsage) return;

          try {
            const billingMetrics = calculateWritConsumedTokens({
              provider: resolvedModel.provider,
              model: resolvedModel.modelId,
              usage: modelUsage,
            });

            await ingestTokenUsage({
              eventId: `chat-message:${event.responseMessage.id}`,
              externalCustomerId: userId,
              amount: billingMetrics.consumedTokens,
              status: isStreamAborted ? "interrupted" : "completed",
            });
          } catch (error) {
            console.error(
              "Failed to ingest Polar token usage for chat message:",
              { error, userId, sessionId, messageId: event.responseMessage.id },
            );
          }
        },
        onError: (error) => {
          const raw =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : JSON.stringify(error);

          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;

            if (typeof parsed["error"] === "string") return parsed["error"];

            if (
              typeof parsed["error"] === "object" &&
              parsed["error"] !== null
            ) {
              const nested = parsed["error"] as Record<string, unknown>;

              if (typeof nested["message"] === "string")
                return nested["message"];
            }

            if (typeof parsed["message"] === "string") return parsed["message"];
          } catch {
            // raw was not JSON — return as-is
          }

          return raw;
        },
      });
    },
  )
  .post("/regenerate", async (c) => {
    const sessionId = c.req.param("sessionId");

    if (!sessionId) return c.json({ error: "Missing session ID" }, 400);

    const userId = c.get("userId");
    const session = await db.session.findUnique({
      where: { userId, id: sessionId },
    });

    if (!session) return c.json({ error: "Session not found" }, 404);

    const messages = Array.isArray(session.messages)
      ? (session.messages as unknown as AppUIMessage[])
      : [];

    const lastMsg = messages[messages.length - 1];

    // Only drop the message if the absolute last message is an assistant response.
    if (lastMsg && lastMsg.role === "assistant") {
      const cleaned = messages.slice(0, -1);

      await db.session.update({
        where: { id: sessionId, userId },
        data: { messages: cleaned as unknown as Prisma.InputJsonValue },
      });
    }

    return c.json({ ok: true });
  });

export default chatRouter;
