import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import SessionShell from "../components/session-shell";
import UserPrompt from "../components/chat-messages/user-prompt";
import { useToast } from "../providers/toast";
import apiClient from "../lib/api-client";
import { modeSchema, SUPPORTED_CHAT_MODEL_IDS } from "@writ/shared";
import { getErrorMessage } from "../lib/utils";

const newSessionLocationStateSchema = z.object({
  model: z.enum(SUPPORTED_CHAT_MODEL_IDS),
  mode: modeSchema,
  message: z.string(),
});

export default function NewSessionScreen() {
  const [quotaError, setQuotaError] = useState<{ resetsAt: string } | null>(
    null,
  );

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
          json: { title: "New Session" },
        });

        if (shouldIgnore) return;

        const fetchRes = response as unknown as Response;

        if (fetchRes.status === 429) {
          const data = (await fetchRes
            .clone()
            .json()
            .catch(() => null)) as { resetsAt?: string } | null;

          setQuotaError({
            resetsAt: data?.resetsAt ?? new Date().toISOString(),
          });

          return; // Stop execution, don't navigate!
        }

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const session = await response.json();
        navigate(`/sessions/${session.id}`, {
          replace: true,
          state: { session, initialPrompt: locationState },
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
    <SessionShell
      onSubmit={() => {}}
      promptAreaDisabled
      isLoading={!quotaError}
      quotaError={quotaError}
    >
      <UserPrompt prompt={locationState.message} mode={locationState.mode} />
    </SessionShell>
  );
}
