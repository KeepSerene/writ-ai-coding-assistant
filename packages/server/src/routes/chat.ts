import { MessageStatus, Mode } from "@writ/db/enums";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  messageContentSchema,
  SUPPORTED_CHAT_MODEL_IDS,
  toolInputSchema,
  type AgentStreamEvent,
  type MessageBlock,
  type SupportedChatModelId,
} from "@writ/shared";
import { type SSEStreamingApi, streamSSE } from "hono/streaming";
import { isChatModelSupported, resolveModel } from "../lib/model-resolver";
import {
  stepCountIs,
  streamText,
  type JSONValue,
  type ModelMessage,
  type TextPart,
  type ToolCallPart,
  type ToolResultPart,
} from "ai";
import { db } from "@writ/db/client";
import { Hono } from "hono";
import type { Prisma } from "@writ/db";
import createTools from "../tools";
import buildSystemPrompt from "../lib/system-prompt";
import type { AuthenticatedEnv } from "../middlewares/require-auth";

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
  blocks: Prisma.JsonValue | null;
}

function buildChatHistory(messages: HistoryMessage[]): ModelMessage[] {
  return messages.flatMap((msg) => {
    if (msg.role === "ERROR") return [];

    if (msg.role === "USER") {
      return [{ role: "user", content: msg.content }];
    }

    if (msg.role === "AGENT") {
      // Legacy messages with no block data
      if (!msg.blocks) {
        if (!msg.content) return [];

        return [{ role: "assistant", content: msg.content }];
      }

      const parsed = messageContentSchema.safeParse(msg.blocks);

      if (!parsed.success) {
        if (!msg.content) return [];

        return [{ role: "assistant", content: msg.content }];
      }

      try {
        const assistantContent: (TextPart | ToolCallPart)[] = [];
        const toolContent: ToolResultPart[] = [];

        for (const block of parsed.data) {
          if (block.type === "text") {
            assistantContent.push({ type: "text", text: block.text });
          } else if (block.type === "tool-use") {
            // Skip tool-call blocks that never received a result
            // (can happen with interrupted streams)
            if (block.result === undefined) continue;

            assistantContent.push({
              type: "tool-call",
              toolCallId: block.id,
              toolName: block.name,
              input: block.input,
            });

            // Parse the stored JSON string back to its original shape
            let parsedResult: unknown = block.result;

            try {
              parsedResult = JSON.parse(block.result);
            } catch {
              // If it's not valid JSON, treat it as plain text
            }

            const wrappedOutput =
              typeof parsedResult === "string"
                ? ({ type: "text", value: parsedResult } as const)
                : ({ type: "json", value: parsedResult as JSONValue } as const);

            toolContent.push({
              type: "tool-result",
              toolCallId: block.id,
              toolName: block.name,
              output: wrappedOutput,
            });
          }
          // "reasoning" blocks are intentionally omitted from history:
          // they are display-only and not valid in AssistantContent for
          // most providers (Groq, Google).
        }

        const results: ModelMessage[] = [];

        if (assistantContent.length > 0) {
          results.push({ role: "assistant", content: assistantContent });
        } else if (msg.content) {
          // No parseable blocks but we have a text summary — use it
          results.push({ role: "assistant", content: msg.content });
        }

        if (toolContent.length > 0) {
          results.push({ role: "tool", content: toolContent });
        }

        return results;
      } catch {
        // Last-resort fallback: if reconstruction throws for any reason,
        // include the message as plain text so the session stays usable.
        if (!msg.content) return [];
        return [{ role: "assistant", content: msg.content }];
      }
    }

    return [];
  });
}

function pruneHistory(messages: HistoryMessage[], maxChars = 24000) {
  let currentChars = 0;
  const pruned = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (!msg) continue;
    if (msg.role === "ERROR") continue;

    let charCount = msg.content.length;

    // If it's an AGENT message with blocks, we must account for the
    // size of the tool's output, otherwise we'll blow past the context limit
    if (msg.role === "AGENT" && msg.blocks) {
      const parsed = messageContentSchema.safeParse(msg.blocks);

      if (parsed.success) {
        charCount = Math.max(charCount, JSON.stringify(parsed.data).length);
      }
    }

    // Skip truly empty messages
    if (msg.role === "AGENT" && charCount === 0) continue;

    currentChars += charCount;

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
  cwd: string | null;
  model: SupportedChatModelId;
  mode: Mode;
  history: ModelMessage[];
  abortController: AbortController;
}

async function streamAIResponse(
  stream: SSEStreamingApi,
  context: ChatStreamContext,
) {
  const { sessionId, cwd, model, mode, history, abortController } = context;
  const startedAt = Date.now();
  const tools = cwd ? createTools(cwd, mode) : undefined;
  const messageBlocks: MessageBlock[] = [];
  const resolvedModel = resolveModel(model);

  const saveInterruptedMsg = async () => {
    if (messageBlocks.length === 0) return;

    const fullText = messageBlocks
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    if (fullText.length === 0) return;

    const validatedBlocks: Prisma.InputJsonValue | undefined =
      messageBlocks.length > 0
        ? messageContentSchema.parse(messageBlocks)
        : undefined;
    const elapsedMs = Date.now() - startedAt;

    await db.message.create({
      data: {
        sessionId,
        role: "AGENT",
        status: MessageStatus.INTERRUPTED,
        model,
        mode,
        content: fullText, // save whatever text was generated before abort
        blocks: validatedBlocks,
        duration: Math.round(elapsedMs / 1000),
      },
    });
  };

  try {
    const result = streamText({
      providerOptions: resolvedModel.providerOptions,
      system: buildSystemPrompt({ cwd, mode }),
      tools,
      stopWhen: tools ? stepCountIs(50) : undefined,
      model: resolvedModel.model,
      messages: history,
      abortSignal: abortController.signal,
    });

    for await (const block of result.fullStream) {
      if (stream.aborted) break;

      if (block.type === "reasoning-delta") {
        const lastBlock = messageBlocks[messageBlocks.length - 1];

        if (lastBlock && lastBlock.type === "reasoning") {
          lastBlock.text += block.text;
        } else {
          messageBlocks.push({ type: "reasoning", text: block.text });
        }

        const reasoningDeltaEvent: AgentStreamEvent = {
          type: "reasoning-delta",
          text: block.text,
        };
        await stream.writeSSE({
          event: "reasoning-delta",
          data: JSON.stringify(reasoningDeltaEvent),
        });
      }

      if (block.type === "text-delta") {
        const lastBlock = messageBlocks[messageBlocks.length - 1];

        if (lastBlock && lastBlock.type === "text") {
          lastBlock.text += block.text;
        } else {
          messageBlocks.push({ type: "text", text: block.text });
        }

        const textDeltaEvent: AgentStreamEvent = {
          type: "text-delta",
          text: block.text,
        };
        await stream.writeSSE({
          event: "text-delta",
          data: JSON.stringify(textDeltaEvent),
        });
      }

      if (block.type === "tool-call") {
        const toolInput = toolInputSchema.parse(block.input);
        messageBlocks.push({
          type: "tool-use",
          id: block.toolCallId,
          name: block.toolName,
          input: toolInput,
        });
        const toolCallEvent: AgentStreamEvent = {
          type: "tool-input",
          toolCallId: block.toolCallId,
          toolName: block.toolName,
          input: toolInput,
        };
        await stream.writeSSE({
          event: "tool-input",
          data: JSON.stringify(toolCallEvent),
        });
      }

      if (block.type === "tool-result") {
        const storedResult =
          typeof block.output === "string"
            ? block.output
            : JSON.stringify(block.output);

        const toolUseBlock = messageBlocks.find(
          (b): b is Extract<MessageBlock, { type: "tool-use" }> =>
            b.type === "tool-use" && b.id === block.toolCallId,
        );

        if (toolUseBlock) {
          toolUseBlock.result = storedResult;
        }

        const toolOutputEvent: AgentStreamEvent = {
          type: "tool-output",
          toolCallId: block.toolCallId,
          result: storedResult,
        };
        await stream.writeSSE({
          event: "tool-output",
          data: JSON.stringify(toolOutputEvent),
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

    const fullText = messageBlocks
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const validatedBlocks: Prisma.InputJsonValue | undefined =
      messageBlocks.length > 0
        ? messageContentSchema.parse(messageBlocks)
        : undefined;
    const elapsedMs = Date.now() - startedAt;
    const agentMessage = await db.message.create({
      data: {
        sessionId,
        role: "AGENT",
        status: MessageStatus.COMPLETED,
        model,
        mode,
        content: fullText,
        blocks: validatedBlocks,
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

    const errMsg =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error);
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

const chatRouter = new Hono<AuthenticatedEnv>()
  .post("/", chatReqValidator, async (c) => {
    const sessionId = c.req.param("sessionId");

    if (!sessionId) {
      return c.json({ error: "Missing session ID" }, 400);
    }

    const userId = c.get("userId");

    const session = await db.session.findUnique({
      where: { userId, id: sessionId },
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
        blocks: null,
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
          cwd: session.cwd,
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

    const userId = c.get("userId");

    const session = await db.session.findUnique({
      where: { userId, id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    // Check if the last message is the AI's response (or a failed response)
    // If it is, we delete it to make room for the new regeneration
    const lastMsg = session.messages[session.messages.length - 1];

    if (lastMsg && (lastMsg.role === "AGENT" || lastMsg.role === "ERROR")) {
      await db.message.delete({ where: { id: lastMsg.id } });

      // Remove it from the in-memory array so the rest of the code
      // (like buildChatHistory) doesn't use it
      session.messages.pop();
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

    const recentMessages = pruneHistory(session.messages);
    const history = buildChatHistory(recentMessages);
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
              cwd: session.cwd,
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
