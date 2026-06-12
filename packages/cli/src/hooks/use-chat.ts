import type { Mode } from "@writ/db/enums";
import {
  agentStreamEventSchema,
  type SupportedChatModelId,
} from "@writ/shared";
import type { ClientResponse } from "hono/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../lib/utils";
import { EventSourceParserStream } from "eventsource-parser/stream";
import prettyMilliseconds from "pretty-ms";
import apiClient from "../lib/api-client";

export interface UIMessageToolUseBlock {
  type: "tool-use";
  status: "calling" | "done";
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
}

export type UIMessageBlock =
  | { type: "reasoning"; text: string }
  | UIMessageToolUseBlock
  | { type: "text"; text: string };

export type Message =
  | {
      id: string;
      role: "user";
      model: SupportedChatModelId;
      mode: Mode;
      content: string;
    }
  | {
      id: string;
      role: "agent";
      model: SupportedChatModelId;
      mode: Mode;
      content: string;
      blocks: UIMessageBlock[];
      duration?: string;
      isInterrupted?: boolean;
    }
  | { id: string; role: "error"; content: string };

type StreamUIState =
  | { status: "idle" }
  | {
      status: "streaming";
      model: SupportedChatModelId;
      mode: Mode;
      blocks: UIMessageBlock[];
    };

interface ActiveStreamSession {
  requestId: string;
  model: SupportedChatModelId;
  mode: Mode;
  blocks: UIMessageBlock[];
  controller: AbortController;
  interruptionCaptured: boolean;
}

interface SubmitChatParams {
  prompt: string;
  model: SupportedChatModelId;
  mode: Mode;
}

interface StreamActionParams {
  model: SupportedChatModelId;
  mode: Mode;
  request: (controller: AbortController) => Promise<ClientResponse<unknown>>;
}

export function useChat(sessionId: string, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamState, setStreamState] = useState<StreamUIState>({
    status: "idle",
  });

  const activeStreamRef = useRef<ActiveStreamSession | null>(null);
  const hasAutoRegeneratedRef = useRef(false);

  // Abort on unmount
  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.controller.abort();
        activeStreamRef.current = null;
      }
    };
  }, []);

  const isRequestActive = useCallback((reqId: string) => {
    return activeStreamRef.current?.requestId === reqId;
  }, []);

  const syncStreamUI = useCallback(
    (reqId: string, blocks: UIMessageBlock[]) => {
      if (!isRequestActive(reqId) || !activeStreamRef.current) return;

      activeStreamRef.current.blocks = blocks;
      setStreamState({
        status: "streaming",
        model: activeStreamRef.current.model,
        mode: activeStreamRef.current.mode,
        blocks,
      });
    },
    [isRequestActive],
  );

  const clearActiveStream = useCallback(
    (reqId: string) => {
      if (!isRequestActive(reqId)) return;

      activeStreamRef.current = null;
      setStreamState({ status: "idle" });
    },
    [isRequestActive],
  );

  const processStreamResponse = useCallback(
    async (
      response: ClientResponse<unknown>,
      activeStream: ActiveStreamSession,
    ) => {
      if (!isRequestActive(activeStream.requestId)) return;

      if (!response.ok) {
        const errMsg = await getErrorMessage(response);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "error", content: errMsg },
        ]);
        return;
      }

      let currentBlocks: UIMessageBlock[] = [];

      if (!response.body) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "error",
            content:
              "Failed to establish a stream: the server response body is empty.",
          },
        ]);
        return;
      }

      // Pipe the raw bytes through a TextDecoder, then into the eventsource-parser
      // which cleanly extracts Server-Sent Events (SSE) boundaries
      const responseStream = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream());

      // The loop pauses until the next SSE chunk arrives over the network
      for await (const { data } of responseStream) {
        // Break early if the user cancelled this specific request via the UI
        if (!isRequestActive(activeStream.requestId)) return;

        let agentStreamEvent;

        try {
          agentStreamEvent = agentStreamEventSchema.parse(JSON.parse(data));
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : "Invalid stream payload";
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "error", content: errMsg },
          ]);
          break;
        }

        switch (agentStreamEvent.type) {
          case "reasoning-delta": {
            const updatedBlocks = [...currentBlocks];
            const lastIndex = updatedBlocks.length - 1;
            const lastBlock = updatedBlocks[lastIndex];

            if (lastBlock?.type === "reasoning") {
              updatedBlocks[lastIndex] = {
                ...lastBlock,
                text: lastBlock.text + agentStreamEvent.text,
              };
            } else {
              updatedBlocks.push({
                type: "reasoning",
                text: agentStreamEvent.text,
              });
            }

            currentBlocks = updatedBlocks;
            syncStreamUI(activeStream.requestId, currentBlocks);
            break;
          }
          case "tool-input": {
            const updatedBlocks = [...currentBlocks];
            updatedBlocks.push({
              type: "tool-use",
              status: "calling",
              id: agentStreamEvent.toolCallId,
              name: agentStreamEvent.toolName,
              input: agentStreamEvent.input,
            });

            currentBlocks = updatedBlocks;
            syncStreamUI(activeStream.requestId, currentBlocks);
            break;
          }
          case "tool-output": {
            const updatedBlocks = [...currentBlocks];
            const index = updatedBlocks.findIndex(
              (b): b is UIMessageToolUseBlock =>
                b.type === "tool-use" && b.id === agentStreamEvent.toolCallId,
            );

            if (index !== -1) {
              const original = updatedBlocks[index] as UIMessageToolUseBlock;
              updatedBlocks[index] = {
                ...original,
                result: agentStreamEvent.result,
                status: "done",
              };
            }

            currentBlocks = updatedBlocks;
            syncStreamUI(activeStream.requestId, currentBlocks);
            break;
          }
          case "text-delta": {
            const updatedBlocks = [...currentBlocks];
            const lastIndex = updatedBlocks.length - 1;
            const lastBlock = updatedBlocks[lastIndex];

            if (lastBlock?.type === "text") {
              updatedBlocks[lastIndex] = {
                ...lastBlock,
                text: lastBlock.text + agentStreamEvent.text,
              };
            } else {
              updatedBlocks.push({ type: "text", text: agentStreamEvent.text });
            }

            currentBlocks = updatedBlocks;
            syncStreamUI(activeStream.requestId, currentBlocks);
            break;
          }
          case "done": {
            if (!isRequestActive(activeStream.requestId)) return;

            const fullText = currentBlocks
              .filter((block) => block.type === "text")
              .map((block) => block.text)
              .join("");

            setMessages((prev) => [
              ...prev,
              {
                id: agentStreamEvent.messageId,
                role: "agent",
                model: activeStream.model,
                mode: activeStream.mode,
                content: fullText,
                blocks: [...currentBlocks],
                duration: prettyMilliseconds(agentStreamEvent.durationMs),
              },
            ]);

            // Clear immediately so the spinner drops the moment the message lands,
            // rather than waiting for the TCP connection to fully close
            clearActiveStream(activeStream.requestId);
            break;
          }
          case "error": {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "error",
                content: agentStreamEvent.message,
              },
            ]);
            break;
          }
        }
      }
    },
    [isRequestActive, syncStreamUI, clearActiveStream],
  );

  const startStreamRequest = useCallback(
    async ({ request, model, mode }: StreamActionParams) => {
      const controller = new AbortController();
      const activeStream: ActiveStreamSession = {
        requestId: crypto.randomUUID(),
        model,
        mode,
        blocks: [],
        controller,
        interruptionCaptured: false,
      };

      activeStreamRef.current = activeStream;
      setStreamState({ status: "streaming", model, mode, blocks: [] });

      try {
        const response = await request(controller);
        await processStreamResponse(response, activeStream);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;

        if (!isRequestActive(activeStream.requestId)) return;

        const errMsg = error instanceof Error ? error.message : String(error);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "error", content: errMsg },
        ]);
      } finally {
        clearActiveStream(activeStream.requestId);
      }
    },
    [processStreamResponse, isRequestActive, clearActiveStream],
  );

  const regenerateAgentStream = useCallback(
    async ({ model, mode }: Omit<SubmitChatParams, "prompt">) => {
      await startStreamRequest({
        model,
        mode,
        request: async (controller) => {
          return apiClient.sessions[":sessionId"].chat.regenerate.$post(
            { param: { sessionId } },
            { init: { signal: controller.signal } },
          );
        },
      });
    },
    [startStreamRequest, sessionId],
  );

  // Auto-regenerate when the chat ends with a user message that has no reply
  useEffect(() => {
    if (hasAutoRegeneratedRef.current) return;

    const lastMsg = initialMessages[initialMessages.length - 1];

    if (!lastMsg || lastMsg.role !== "user") return;

    hasAutoRegeneratedRef.current = true;
    void regenerateAgentStream({ model: lastMsg.model, mode: lastMsg.mode });
  }, [initialMessages, regenerateAgentStream]);

  const captureInterruptedMsg = useCallback(
    (activeStream: ActiveStreamSession) => {
      if (
        activeStream.interruptionCaptured ||
        activeStream.blocks.length === 0
      ) {
        return;
      }

      activeStream.interruptionCaptured = true;
      const blocks = [...activeStream.blocks];
      const fullText = blocks
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          model: activeStream.model,
          mode: activeStream.mode,
          blocks,
          content: fullText,
          isInterrupted: true,
        },
      ]);
    },
    [setMessages],
  );

  const stopActiveStream = useCallback(
    (shouldCapturePartialMsg: boolean) => {
      const activeStream = activeStreamRef.current;

      if (!activeStream) return;

      if (shouldCapturePartialMsg) {
        captureInterruptedMsg(activeStream);
      }

      activeStreamRef.current = null;
      setStreamState({ status: "idle" });
      activeStream.controller.abort();
    },
    [captureInterruptedMsg],
  );

  const handleSubmit = useCallback(
    async ({ prompt, model, mode }: SubmitChatParams) => {
      // Show the partial msg before sending the next msg
      stopActiveStream(true);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        model,
        mode,
        content: prompt,
      };

      setMessages((prev) => [...prev, userMessage]);

      await startStreamRequest({
        model,
        mode,
        request: async (controller) => {
          return apiClient.sessions[":sessionId"].chat.$post(
            { param: { sessionId }, json: { model, mode, content: prompt } },
            { init: { signal: controller.signal } },
          );
        },
      });
    },
    [stopActiveStream, setMessages, startStreamRequest, sessionId],
  );

  const abortAgentStream = useCallback(() => {
    stopActiveStream(false);
  }, [stopActiveStream]);

  const interruptGeneration = useCallback(() => {
    stopActiveStream(true);
  }, [stopActiveStream]);

  return {
    messages,
    streamState,
    handleSubmit,
    abortAgentStream,
    interruptGeneration,
  };
}
