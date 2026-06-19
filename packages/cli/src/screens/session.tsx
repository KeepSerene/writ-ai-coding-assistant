import { useLocation, useNavigate, useParams } from "react-router";
import SessionShell from "../components/session-shell";
import type { InferResponseType } from "hono/client";
import apiClient from "../lib/api-client";
import { z } from "zod";
import { useToast } from "../providers/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { extractErrorMessage, getErrorMessage } from "../lib/utils";
import {
  DEFAULT_CHAT_MODEL_ID,
  Mode,
  SUPPORTED_CHAT_MODEL_IDS,
  type SupportedChatModelId,
} from "@writ/shared";
import { type Message, useAppChat } from "../hooks/use-app-chat";
import { useInputStack } from "../providers/input-stack";
import { useKeyboard } from "@opentui/react";
import { useSessionCtx } from "../providers/session-context";
import {
  AgentResponse,
  ErrorResponse,
  UserPrompt,
} from "../components/chat-messages";

type SessionData = InferResponseType<
  (typeof apiClient.sessions)[":id"]["$get"],
  200
>;

const sessionLocationStateSchema = z.object({
  session: z.custom<SessionData>(
    (val) =>
      val !== null &&
      typeof val === "object" &&
      "id" in val &&
      "messages" in val &&
      Array.isArray((val as { messages: unknown }).messages),
  ),
  initialPrompt: z.object({
    model: z.enum(SUPPORTED_CHAT_MODEL_IDS),
    mode: z.enum(Mode),
    message: z.string(),
  }),
});

function ChatMessage({
  msg,
  isInterrupted,
  isStreaming,
}: {
  msg: Message;
  isInterrupted?: boolean;
  isStreaming?: boolean;
}) {
  if (msg.role === "user") {
    const text = msg.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");

    return <UserPrompt prompt={text} mode={msg.metadata?.mode ?? Mode.Build} />;
  }

  return (
    <AgentResponse
      model={msg.metadata?.model ?? DEFAULT_CHAT_MODEL_ID}
      mode={msg.metadata?.mode ?? Mode.Build}
      blocks={msg.parts}
      durationMs={msg.metadata?.durationMs}
      isInterrupted={isInterrupted || msg.metadata?.isInterrupted}
      isStreaming={isStreaming}
    />
  );
}

interface SessionChatParams {
  session: SessionData;
  initialPrompt?: { model: SupportedChatModelId; mode: Mode; message: string };
}

function SessionChat({ session, initialPrompt }: SessionChatParams) {
  const [title, setTitle] = useState(session.title);
  const [initialMessages] = useState(
    () => session.messages as unknown as Message[],
  );

  const {
    messages,
    status,
    error,
    submit,
    abort,
    wasInterrupted,
    regenerate,
    quotaError,
  } = useAppChat(session.id, initialMessages);
  const { isTopLayer } = useInputStack();
  const { model, mode } = useSessionCtx();

  const hasSubmittedPromptRef = useRef(false);
  const hasFetchedTitleRef = useRef(false);
  const abortRef = useRef(abort);

  const isInFlight = status === "streaming" || status === "submitted";
  const isNewSession = initialMessages.length === 0;
  const isLastMsgOfAgent = messages.at(-1)?.role === "assistant";

  // Keep the ref constantly updated with the latest abort function
  useEffect(() => {
    abortRef.current = abort;
  }, [abort]);

  // Generate title after the first assistant response lands in a new session
  useEffect(() => {
    if (!isNewSession || hasFetchedTitleRef.current) return;

    const firstUserMsg = messages.find((m) => m.role === "user");
    const hasAssistantResponse = messages.some((m) => m.role === "assistant");

    if (!firstUserMsg || !hasAssistantResponse) return;

    hasFetchedTitleRef.current = true;

    const prompt = firstUserMsg.parts
      .filter(
        (
          p,
        ): p is Extract<
          (typeof firstUserMsg.parts)[number],
          { type: "text" }
        > => p.type === "text",
      )
      .map((p) => p.text)
      .join("");

    if (!prompt) return;

    let shouldIgnore = false;

    void (async () => {
      try {
        const res = await apiClient.sessions[":id"].title.$post({
          param: { id: session.id },
          json: { prompt },
        });

        if (shouldIgnore || !res.ok) return;

        const data = await res.json();

        if (data.title) setTitle(data.title);
      } catch (error) {
        console.error("Failed to fetch title:", error);
      }
    })();

    return () => {
      shouldIgnore = true;
    };
  }, [messages, isNewSession, session.id]);

  // Stop pending agent stream chunks ONLY when user leaves the session (on true unmount)
  useEffect(() => {
    return () => {
      abortRef.current();
    };
  }, []);

  // Auto-regenerate when the session was loaded with an unanswered user message
  // This happens when the previous request errored before producing a response
  const hasAutoRegeneratedRef = useRef(false);

  useEffect(() => {
    if (hasAutoRegeneratedRef.current) return;
    // Don't interfere with new-session flow (initialPrompt handled separately)
    if (initialPrompt) return;
    if (status !== "ready") return;

    const lastMsg = messages.at(-1);

    if (!lastMsg || lastMsg.role !== "user") return;

    hasAutoRegeneratedRef.current = true;
    void regenerate();
  }, [status, messages, initialPrompt, regenerate]);

  // Interrupt and regenerate
  useKeyboard((key) => {
    if (key.name === "escape" && isTopLayer("base") && status === "streaming") {
      key.preventDefault();
      abort();
    }

    if (
      key.ctrl &&
      key.name === "r" &&
      isTopLayer("base") &&
      status !== "streaming" &&
      status !== "submitted" &&
      messages.at(-1)?.role === "assistant"
    ) {
      key.preventDefault();
      void regenerate();
    }
  });

  useEffect(() => {
    if (!initialPrompt || hasSubmittedPromptRef.current) return;

    hasSubmittedPromptRef.current = true;

    // Defer the initial submission slightly to bypass React StrictMode's
    // instant mount -> unmount -> remount cycle, preventing premature aborts
    const timeoutId = setTimeout(() => {
      void submit({
        prompt: initialPrompt.message,
        model: initialPrompt.model,
        mode: initialPrompt.mode,
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [submit, initialPrompt]);

  return (
    <SessionShell
      title={title}
      isLoading={isInFlight}
      canInterrupt={isInFlight}
      canRegenerate={!isInFlight && isLastMsgOfAgent}
      onSubmit={(prompt) => {
        submit({ prompt, model, mode });
      }}
      promptAreaDisabled={Boolean(quotaError) || isInFlight}
      quotaError={quotaError}
    >
      {messages.map((msg, index) => (
        <ChatMessage
          key={msg.id}
          msg={msg}
          isStreaming={
            (status === "streaming" || status === "submitted") &&
            index === messages.length - 1 &&
            msg.role === "assistant"
          }
          isInterrupted={
            wasInterrupted &&
            index === messages.length - 1 &&
            msg.role === "assistant"
          }
        />
      ))}

      {error && !quotaError && (
        <ErrorResponse response={extractErrorMessage(error)} />
      )}
    </SessionShell>
  );
}

export default function SessionScreen() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const prefetchedSessionData = useMemo(() => {
    const parsed = sessionLocationStateSchema.safeParse(location.state);

    return parsed.success ? parsed.data : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(
    prefetchedSessionData?.session ?? null,
  );

  useEffect(() => {
    if (!sessionId || prefetchedSessionData?.session) return;

    setSession(null);

    let shouldIgnore = false;

    const fetchSession = async () => {
      try {
        const res = await apiClient.sessions[":id"].$get({
          param: { id: sessionId },
        });

        if (shouldIgnore) return;

        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }

        const data = await res.json();
        setSession(data);
      } catch (error) {
        if (shouldIgnore) return;

        console.error("Failed to load session:", error);
        toast.show({
          variant: "error",
          message:
            error instanceof Error ? error.message : "Failed to load session",
        });
        navigate("/", { replace: true });
      }
    };

    fetchSession();

    return () => {
      shouldIgnore = true;
    };
  }, [sessionId, prefetchedSessionData, toast, navigate]);

  if (!session) {
    return <SessionShell onSubmit={() => {}} promptAreaDisabled isLoading />;
  }

  return (
    <SessionChat
      key={session.id}
      session={session}
      initialPrompt={prefetchedSessionData?.initialPrompt}
    />
  );
}
