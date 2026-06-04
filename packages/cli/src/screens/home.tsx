import { useCallback } from "react";
import { useNavigate } from "react-router";
import Header from "../components/header";
import PromptArea from "../components/prompt-area";

export default function HomeScreen() {
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    (prompt: string) => {
      navigate("/sessions/new", { replace: true, state: { message: prompt } });
    },
    [navigate],
  );

  return (
    <box
      width="100%"
      height="100%"
      flexGrow={1}
      justifyContent="center"
      alignItems="center"
      gap={2}
      position="relative"
    >
      <Header />

      <box width="100%" maxWidth={78} paddingX={2}>
        <PromptArea onSubmit={handleSubmit} />
      </box>
    </box>
  );
}
