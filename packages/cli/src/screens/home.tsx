import { useCallback } from "react";
import { useNavigate } from "react-router";
import Header from "../components/header";
import PromptArea from "../components/prompt-area";
import { useSessionCtx } from "../providers/session-context";
import { useTheme } from "../providers/theme";
import { TextAttributes } from "@opentui/core";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { model, mode } = useSessionCtx();
  const {
    currentTheme: { colors },
  } = useTheme();

  const handleSubmit = useCallback(
    (prompt: string) => {
      navigate("/sessions/new", {
        replace: true,
        state: { model, mode, message: prompt },
      });
    },
    [navigate, model, mode],
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

      <box
        width="100%"
        maxWidth={78}
        paddingX={2}
        flexDirection="column"
        gap={1}
      >
        <PromptArea onSubmit={handleSubmit} />

        <box flexShrink={0} marginLeft="auto" flexDirection="row" gap={1}>
          <text fg={colors.onBackground}>Tab</text>

          <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
            &rsaquo; modes
          </text>
        </box>
      </box>

      <box position="absolute" bottom={1} right={2} flexDirection="row" gap={1}>
        <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
          Developed by
        </text>

        <text fg={colors.onBackground}>@KeepSerene</text>

        <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
          |
        </text>

        <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
          https://math-to-dev.vercel.app
        </text>
      </box>
    </box>
  );
}
