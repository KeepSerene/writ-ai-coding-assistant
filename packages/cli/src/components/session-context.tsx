import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";

function SessionContext() {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={colors.primary}>Build</text>
      <text attributes={TextAttributes.DIM} fg={colors.onSurface}>
        &rsaquo;
      </text>
      <text fg={colors.text}>opus-4-6</text>
    </box>
  );
}

export default SessionContext;
