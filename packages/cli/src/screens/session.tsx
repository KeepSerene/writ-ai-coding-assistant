import { useLocation, useNavigate, useParams } from "react-router";
import SessionShell from "../components/session-shell";
import type { InferResponseType } from "hono/client";
import apiClient from "../lib/api-client";
import { z } from "zod";
import UserPrompt from "../components/chat-messages/user-prompt";
import ErrorResponse from "../components/chat-messages/error-response";
import AgentResponse from "../components/chat-messages/agent-response";
import { useToast } from "../providers/toast";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "../lib/utils";
import { DEFAULT_CHAT_MODEL_ID, type SupportedChatModelId } from "@writ/shared";
import prettyMilliseconds from "pretty-ms";
import { useChat, type Message } from "../hooks/use-chat";
import { MessageStatus } from "@writ/db/enums";
import { useInputStack } from "../providers/input-stack";
import { useKeyboard } from "@opentui/react";

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
});

function formatSessionMessages(
  sessionMessages: SessionData["messages"],
): Message[] {
  return sessionMessages.map((msg) => {
    if (msg.role === "ERROR") {
      return { id: msg.id, role: "error", content: msg.content };
    }

    if (msg.role === "USER") {
      return {
        id: msg.id,
        role: "user",
        model: msg.model as SupportedChatModelId,
        mode: msg.mode,
        content: msg.content,
      };
    }

    return {
      id: msg.id,
      role: "agent",
      model: msg.model as SupportedChatModelId,
      mode: msg.mode,
      content: msg.content,
      blocks: [{ type: "text", text: msg.content }],
      ...(msg.duration !== null
        ? { duration: prettyMilliseconds(msg.duration * 1000) }
        : {}),
      isInterrupted: msg.status === MessageStatus.INTERRUPTED,
    };
  });
}

function ChatMessage({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return <UserPrompt prompt={msg.content} />;
  }

  if (msg.role === "error") {
    return <ErrorResponse response={msg.content} />;
  }

  return (
    <AgentResponse
      isStreaming={false}
      model={msg.model}
      mode={msg.mode}
      blocks={msg.blocks}
      duration={msg.duration}
      isInterrupted={msg.isInterrupted}
    />
  );
}

function SessionChat({ session }: { session: SessionData }) {
  const [initialMessages] = useState(() =>
    formatSessionMessages(session.messages),
  );
  const {
    messages,
    streamState,
    handleSubmit,
    abortAgentStream,
    interruptGeneration,
  } = useChat(session.id, initialMessages);
  const { isTopLayer } = useInputStack();

  // Stop pending agent stream chunks when user leaves the session (on unmount)
  useEffect(() => {
    return () => {
      abortAgentStream();
    };
  }, [abortAgentStream]);

  // Let user cancel a reply even before the first streamed chunk arrives
  useKeyboard((key) => {
    if (
      key.name === "escape" &&
      isTopLayer("base") &&
      streamState.status === "streaming"
    ) {
      key.preventDefault();
      interruptGeneration();
    }
  });

  return (
    <SessionShell
      isLoading={streamState.status === "streaming"}
      canInterrupt={streamState.status === "streaming"}
      onSubmit={(prompt) => {
        handleSubmit({ prompt, model: DEFAULT_CHAT_MODEL_ID, mode: "BUILD" });
      }}
    >
      {messages.map((msg) => (
        <ChatMessage key={msg.id} msg={msg} />
      ))}

      {/* Streaming response must be rendered AFTER messages so it sits at the
          bottom of the scrollbox. stickyScroll + stickyStart="bottom" anchors
          the viewport to the last child — if this were first, the sticky anchor
          would land on the historical messages and never scroll up to follow the
          stream. */}
      {streamState.status === "streaming" && streamState.blocks.length > 0 && (
        <AgentResponse
          isStreaming
          blocks={streamState.blocks}
          model={streamState.model}
          mode={streamState.mode}
        />
      )}
    </SessionShell>
  );
}

export default function SessionScreen() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const prefetchedSession = useMemo(() => {
    const parsed = sessionLocationStateSchema.safeParse(location.state);

    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState(prefetchedSession);

  useEffect(() => {
    if (!sessionId || prefetchedSession) return;

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
  }, [sessionId, prefetchedSession, toast, navigate]);

  if (!session) {
    return <SessionShell onSubmit={() => {}} promptAreaDisabled isLoading />;
  }

  return <SessionChat key={session.id} session={session} />;
}
