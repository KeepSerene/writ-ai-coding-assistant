import { useLocation, useNavigate, useParams } from "react-router";
import SessionShell from "../components/session-shell";
import type { InferResponseType } from "hono/client";
import apiClient from "../lib/api-client";
import { z } from "zod";
import UserPrompt from "../components/conversation/user-prompt";
import ErrorResponse from "../components/conversation/error-response";
import AgentResponse from "../components/conversation/agent-response";
import { useToast } from "../providers/toast";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "../lib/utils";

type SessionData = InferResponseType<
  (typeof apiClient.sessions)[":id"]["$get"],
  200
>;

const sessionLocationStateSchema = z.object({
  session: z.custom<SessionData>(
    (val) => val !== null && typeof val === "object" && "id" in val,
  ),
});

function Conversation({ msg }: { msg: SessionData["messages"][number] }) {
  if (msg.role === "USER") {
    return <UserPrompt prompt={msg.content} />;
  }

  if (msg.role === "ERROR") {
    return <ErrorResponse response={msg.content} />;
  }

  return <AgentResponse response={msg.content} model={msg.model} />;
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

  return (
    <SessionShell onSubmit={() => {}} promptAreaDisabled>
      {session.messages.map((msg) => (
        <Conversation key={msg.id} msg={msg} />
      ))}
    </SessionShell>
  );
}
