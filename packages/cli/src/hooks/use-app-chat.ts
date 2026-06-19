import { useChat } from "@ai-sdk/react";
import {
  Mode,
  type AppMessageMetadata,
  type SupportedChatModelId,
  type ToolContracts,
} from "@writ/shared";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type InferUITools,
  type UIMessage,
} from "ai";
import { useCallback, useMemo, useState } from "react";
import apiClient from "../lib/api-client";
import { getAuthToken } from "../lib/auth-token-store";
import executeTool from "../tools";
import { isPortfolioQuotaError } from "../lib/utils";

export class PortfolioQuotaError extends Error {
  resetsAt: string;

  constructor(message: string, resetsAt: string) {
    super(message);
    this.name = "PortfolioQuotaError";
    this.resetsAt = resetsAt;
  }
}

type AppTools = {
  [Name in keyof InferUITools<ToolContracts>]: {
    input: InferUITools<ToolContracts>[Name]["input"];
    output: unknown;
  };
};

export type Message = UIMessage<AppMessageMetadata, never, AppTools>;

export function useAppChat(sessionId: string, initialMessages: Message[]) {
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const [quotaError, setQuotaError] = useState<{ resetsAt: string } | null>(
    null,
  );

  const transport = useMemo(() => {
    const chatApiUrl = apiClient.sessions[":sessionId"].chat
      .$url({ param: { sessionId } })
      .toString();

    return new DefaultChatTransport<Message>({
      api: chatApiUrl,
      headers: () => {
        const auth = getAuthToken();

        return auth ? { Authorization: `Bearer ${auth.token}` } : new Headers();
      },
      fetch: (async (input, init) => {
        const response = await fetch(input, init);

        if (response.status === 429) {
          const data = (await response
            .clone()
            .json()
            .catch(() => null)) as { error?: string; resetsAt?: string } | null;

          throw new PortfolioQuotaError(
            data?.error ?? "Portfolio quota exceeded",
            data?.resetsAt ?? new Date().toISOString(),
          );
        }

        return response;
      }) as typeof fetch,
      prepareSendMessagesRequest: ({ messages, id }) => {
        const lastMsg = messages[messages.length - 1];

        if (!lastMsg) throw new Error("No message to send");

        const metadata = messages.findLast(
          (m) => m.metadata?.model && m.metadata?.mode,
        )?.metadata;

        // Always send from the last user message forward so all tool-call rounds
        // in the current turn reach the server. The server merges by ID with DB
        // history, so earlier turns are never re-sent redundantly.
        const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
        const msgsToSend =
          lastUserIdx !== -1 ? messages.slice(lastUserIdx) : [lastMsg];

        return {
          api: chatApiUrl,
          body: {
            id: id ?? sessionId,
            messages: msgsToSend,
            model: lastMsg.metadata?.model ?? metadata?.model,
            mode: lastMsg.metadata?.mode ?? metadata?.mode,
          },
        };
      },
    });
  }, [sessionId]);

  const chat = useChat<Message>({
    id: sessionId,
    messages: initialMessages,
    transport,
    onToolCall: ({ toolCall }) => {
      const mode = chat.messages.at(-1)?.metadata?.mode ?? Mode.Build;
      void executeTool(toolCall.toolName, toolCall.input, mode)
        .then((output) =>
          chat.addToolOutput({
            tool: toolCall.toolName as keyof AppTools,
            toolCallId: toolCall.toolCallId,
            output,
          }),
        )
        .catch((error) =>
          chat.addToolOutput({
            tool: toolCall.toolName as keyof AppTools,
            toolCallId: toolCall.toolCallId,
            state: "output-error",
            errorText: error instanceof Error ? error.message : String(error),
          }),
        );
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (err) => {
      if (isPortfolioQuotaError(err)) {
        const resetsAt =
          err instanceof PortfolioQuotaError
            ? err.resetsAt
            : ((err as PortfolioQuotaError).resetsAt ??
              new Date().toISOString());
        setQuotaError({ resetsAt });

        return;
      }

      console.error("[useAppChat] transport/chat error:", err);
    },
  });

  const handleSubmit = useCallback(
    (params: { prompt: string; model: SupportedChatModelId; mode: Mode }) => {
      setWasInterrupted(false);
      setQuotaError(null);

      return chat.sendMessage({
        text: params.prompt,
        metadata: { model: params.model, mode: params.mode },
      });
    },
    [chat],
  );

  const handleAbort = useCallback(() => {
    setWasInterrupted(true);
    chat.stop();
  }, [chat]);

  const regenerate = useCallback(async () => {
    setWasInterrupted(false);
    setQuotaError(null);

    // Check if the last message is an assistant message (Manual regeneration)
    const isLastMsgAssistant = chat.messages.at(-1)?.role === "assistant";

    if (isLastMsgAssistant) {
      // Trim the stale assistant message from DB before reload fires
      await apiClient.sessions[":sessionId"].chat.regenerate.$post({
        param: { sessionId },
      });
    }

    return chat.regenerate();
  }, [chat, sessionId]);

  return {
    messages: chat.messages,
    status: chat.status,
    submit: handleSubmit,
    error: chat.error,
    abort: handleAbort,
    wasInterrupted,
    regenerate,
    quotaError,
  };
}
