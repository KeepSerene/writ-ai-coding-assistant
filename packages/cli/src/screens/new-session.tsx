import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { useEffect, useMemo, useRef } from "react";
import SessionShell from "../components/session-shell";
import UserPrompt from "../components/conversation/user-prompt";
import { useToast } from "../providers/toast";
import apiClient from "../lib/api-client";
import { DEFAULT_CHAT_MODEL_ID } from "@writ/shared";
import { getErrorMessage } from "../lib/utils";

const newSessionLocationStateSchema = z.object({ message: z.string() });

export default function NewSessionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const sessionCreationStarted = useRef(false);

  const locationState = useMemo(() => {
    const parsed = newSessionLocationStateSchema.safeParse(location.state);

    return parsed.success ? parsed.data : null;
  }, [location.state]);

  useEffect(() => {
    if (!locationState) {
      navigate("/", { replace: true });
    }
  }, [locationState, navigate]);

  // Create session on mount
  useEffect(() => {
    if (!locationState || sessionCreationStarted.current) return;

    let shouldIgnore = false;

    const createSession = async () => {
      try {
        const response = await apiClient.sessions.$post({
          json: {
            title: locationState.message.slice(0, 100),
            cwd: process.cwd(),
            prompt: {
              role: "USER",
              content: locationState.message,
              mode: "BUILD",
              model: DEFAULT_CHAT_MODEL_ID,
            },
          },
        });

        if (shouldIgnore) return;

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const session = await response.json();
        navigate(`/sessions/${session.id}`, {
          replace: true,
          state: { session },
        });
      } catch (error) {
        if (shouldIgnore) return;

        console.error("Failed to create session:", error);

        toast.show({
          variant: "error",
          message:
            error instanceof Error ? error.message : "Failed to create session",
        });
        navigate("/", { replace: true });
      }
    };

    createSession();

    return () => {
      shouldIgnore = true;
    };
  }, [locationState, navigate, toast]);

  if (!locationState) return null;

  return (
    <SessionShell onSubmit={() => {}} promptAreaDisabled isLoading>
      <UserPrompt prompt={locationState.message} />
    </SessionShell>
  );
}
