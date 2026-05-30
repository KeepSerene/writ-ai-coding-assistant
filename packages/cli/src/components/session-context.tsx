import { TextAttributes } from "@opentui/core";

function SessionContext() {
  return (
    <box flexDirection="row" gap={1}>
      <text fg="cyan">Build</text>
      <text attributes={TextAttributes.DIM} fg="gray">
        &rsaquo;
      </text>
      <text>opus-4-6</text>
    </box>
  );
}

export default SessionContext;
