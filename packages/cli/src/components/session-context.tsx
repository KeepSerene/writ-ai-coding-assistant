import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { useSessionCtx } from "../providers/session-context";
import { Mode } from "@writ/shared";
import { getModelLabel } from "../lib/utils";

function SessionContext({
  quotaError = null,
}: {
  quotaError?: { resetsAt: string } | null;
}) {
  const { mode, model } = useSessionCtx();
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <text
        attributes={quotaError ? TextAttributes.DIM : undefined}
        fg={mode === Mode.Build ? colors.primary : colors.secondary}
      >
        {mode === Mode.Build ? "Build" : "Plan"}
      </text>

      <text attributes={TextAttributes.DIM} fg={colors.onSurface}>
        &rsaquo;
      </text>

      <text
        attributes={quotaError ? TextAttributes.DIM : undefined}
        fg={colors.onSurface}
      >
        {getModelLabel(model)}
      </text>
    </box>
  );
}

export default SessionContext;
