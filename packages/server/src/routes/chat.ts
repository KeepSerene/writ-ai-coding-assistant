import { MessageStatus, Mode } from "@writ/db/enums";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  SUPPORTED_CHAT_MODEL_IDS,
  type AgentStreamEvent,
  type SupportedChatModelId,
} from "@writ/shared";
import { type SSEStreamingApi, streamSSE } from "hono/streaming";
import { isChatModelSupported, resolveModel } from "../lib/model-resolver";
import { streamText } from "ai";
import { db } from "@writ/db/client";
import { Hono } from "hono";

const chatReqSchema = z.object({
  content: z.string(),
  model: z.enum(SUPPORTED_CHAT_MODEL_IDS),
  mode: z.enum(Mode),
});

const chatReqValidator = zValidator("json", chatReqSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid chat request payload" }, 400);
  }
});

// Stores IDs of all sessions with regeneration active
const activeRegenerations = new Set<string>();

interface HistoryMessage {
  role: "USER" | "AGENT" | "ERROR";
  status: MessageStatus;
  content: string;
}

function buildChatHistory(messages: HistoryMessage[]) {
  return messages.flatMap((msg) => {
    if (msg.role === "ERROR") return [];
    if (msg.role === "AGENT" && msg.content.length === 0) return [];

    return [
      {
        role: msg.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      },
    ];
  });
}

function pruneHistory(messages: HistoryMessage[], maxChars = 24000) {
  let currentChars = 0;
  const pruned = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (!msg) continue;
    if (msg.role === "ERROR") continue;
    if (msg.role === "AGENT" && msg.content.length === 0) continue;

    currentChars += msg.content.length;

    if (currentChars > maxChars) {
      break;
    }

    pruned.unshift(msg);
  }

  return pruned;
}

function getLastUserMessageForRegeneration(
  messages: {
    role: "USER" | "AGENT" | "ERROR";
    model: string;
    mode: Mode;
  }[],
) {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "USER") return null;

  return lastMessage;
}

interface ChatStreamContext {
  sessionId: string;
  model: SupportedChatModelId;
  mode: Mode;
  history: { role: "user" | "assistant"; content: string }[];
  abortController: AbortController;
}

async function streamAIResponse(
  stream: SSEStreamingApi,
  context: ChatStreamContext,
) {
  const { sessionId, model, mode, history, abortController } = context;

  const startedAt = Date.now();
  const resolvedModel = resolveModel(model);
  let fullText = "";

  const saveInterruptedMsg = async () => {
    if (fullText.length === 0) return;

    const elapsedMs = Date.now() - startedAt;

    await db.message.create({
      data: {
        sessionId,
        role: "AGENT",
        status: MessageStatus.INTERRUPTED,
        model,
        mode,
        content: fullText, // save whatever text was generated before abort
        duration: Math.round(elapsedMs / 1000),
      },
    });
  };

  try {
    const result = streamText({
      model: resolvedModel.model,
      messages: history,
      abortSignal: abortController.signal,
    });

    for await (const block of result.fullStream) {
      if (stream.aborted) break;

      if (block.type === "text-delta") {
        fullText += block.text;
        const textDeltaEvent: AgentStreamEvent = {
          type: "text-delta",
          text: block.text,
        };
        await stream.writeSSE({
          event: "text-delta",
          data: JSON.stringify(textDeltaEvent),
        });
      }

      if (block.type === "error") {
        throw block.error;
      }
    }

    // Catch the abort signal and save the partial text to the DB
    if (stream.aborted || abortController.signal.aborted) {
      await saveInterruptedMsg();
      return;
    }

    const elapsedMs = Date.now() - startedAt;
    const agentMessage = await db.message.create({
      data: {
        sessionId,
        role: "AGENT",
        status: MessageStatus.COMPLETED,
        model,
        mode,
        content: fullText,
        duration: Math.round(elapsedMs / 1000),
      },
    });

    const doneEvent: AgentStreamEvent = {
      type: "done",
      messageId: agentMessage.id,
      durationMs: elapsedMs,
    };

    await stream.writeSSE({ event: "done", data: JSON.stringify(doneEvent) });
  } catch (error) {
    console.error("Failed to stream AI response:", error);

    if (abortController.signal.aborted) {
      await saveInterruptedMsg();
      return;
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    await db.message.create({
      data: {
        sessionId,
        role: "ERROR",
        status: MessageStatus.COMPLETED,
        model,
        mode,
        content: errMsg,
      },
    });

    const errorEvent: AgentStreamEvent = { type: "error", message: errMsg };
    await stream.writeSSE({ event: "error", data: JSON.stringify(errorEvent) });
  }
}

const chatRouter = new Hono()
  .post("/", chatReqValidator, async (c) => {
    const sessionId = c.req.param("sessionId");

    if (!sessionId) {
      return c.json({ error: "Missing session ID" }, 400);
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const data = c.req.valid("json");
    await db.message.create({
      data: {
        sessionId,
        role: "USER",
        status: MessageStatus.COMPLETED,
        model: data.model,
        mode: data.mode,
        content: data.content,
      },
    });

    const recentMessages = pruneHistory(session.messages);
    const history = buildChatHistory([
      ...recentMessages,
      // Append the new user message:
      {
        role: "USER" as const,
        content: data.content,
        status: MessageStatus.COMPLETED,
      },
    ]);

    const abortController = new AbortController();

    return streamSSE(
      c,
      async (stream) => {
        stream.onAbort(() => {
          abortController.abort();
        });

        await streamAIResponse(stream, {
          sessionId,
          model: data.model,
          history,
          mode: data.mode,
          abortController,
        });
      },
      async (error, stream) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errorEvent: AgentStreamEvent = { type: "error", message: errMsg };
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify(errorEvent),
        });
      },
    );
  })
  .post("/regenerate", async (c) => {
    const sessionId = c.req.param("sessionId");

    if (!sessionId) {
      return c.json({ error: "Missing session ID" }, 400);
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const regeneratableMessage = getLastUserMessageForRegeneration(
      session.messages,
    );

    if (!regeneratableMessage) {
      return c.json(
        { error: "Session has no pending user message for regeneration" },
        409,
      );
    }

    if (!isChatModelSupported(regeneratableMessage.model)) {
      return c.json(
        {
          error: `Session uses an unsupported model: ${regeneratableMessage.model}`,
        },
        409,
      );
    }

    if (activeRegenerations.has(sessionId)) {
      return c.json(
        { error: "Session already has an active regenaration" },
        409,
      );
    }

    activeRegenerations.add(sessionId);

    const history = buildChatHistory(session.messages);
    const abortController = new AbortController();

    try {
      return streamSSE(
        c,
        async (stream) => {
          stream.onAbort(() => {
            abortController.abort();
          });

          try {
            await streamAIResponse(stream, {
              sessionId,
              model: regeneratableMessage.model as SupportedChatModelId,
              mode: regeneratableMessage.mode,
              history,
              abortController,
            });
          } finally {
            activeRegenerations.delete(sessionId);
          }
        },
        async (error, stream) => {
          activeRegenerations.delete(sessionId);
          const errMsg = error instanceof Error ? error.message : String(error);
          const errorEvent: AgentStreamEvent = {
            type: "error",
            message: errMsg,
          };
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify(errorEvent),
          });
        },
      );
    } catch (error) {
      activeRegenerations.delete(sessionId);

      throw error;
    }
  });

export default chatRouter;
