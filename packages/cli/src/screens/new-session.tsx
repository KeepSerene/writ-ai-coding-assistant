import { useLocation, useNavigate } from "react-router";
import { useTheme } from "../providers/theme";
import { useEffect } from "react";
import SessionShell from "../components/session-shell";
import UserPrompt from "../components/conversation/user-prompt";
import AgentResponse from "../components/conversation/agent-response";
import ErrorResponse from "../components/conversation/error-response";

export default function NewSessionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentTheme: { colors },
  } = useTheme();

  const locationState = location.state as { message?: string } | null;

  useEffect(() => {
    if (!locationState?.message) {
      navigate("/", { replace: true });
    }
  }, [locationState, navigate]);

  if (!locationState?.message) return null;

  return (
    <SessionShell onSubmit={() => {}} promptAreaDisabled isLoading>
      <UserPrompt prompt={locationState.message} />
      <AgentResponse
        response="This is a sample coding agent response to demonstrate the layout!"
        model="opus-4-6"
      />
      <ErrorResponse response="This is a sample error response." />
    </SessionShell>
  );
}
