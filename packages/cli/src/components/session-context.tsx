import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { useSessionCtx } from "../providers/session-context";
import { Mode } from "@writ/db/enums";
import { getModelLabel } from "../lib/utils";

function SessionContext() {
  const { mode, model } = useSessionCtx();
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={mode === Mode.BUILD ? colors.primary : colors.secondary}>
        {mode === Mode.BUILD ? "Build" : "Plan"}
      </text>

      <text attributes={TextAttributes.DIM} fg={colors.onSurface}>
        &rsaquo;
      </text>

      <text fg={colors.onSurface}>{getModelLabel(model)}</text>
    </box>
  );
}

export default SessionContext;
