import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useInputStack } from "../input-stack";
import type { DialogConfig } from "./types";
import { RGBA, TextAttributes } from "@opentui/core";
import { useTheme } from "../theme";

interface DialogProps {
  config: DialogConfig | null;
  close: () => void;
}

function Dialog({ config, close }: DialogProps) {
  const { isTopLayer } = useInputStack();
  const { width, height } = useTerminalDimensions();
  const {
    currentTheme: { colors },
  } = useTheme();

  useKeyboard((key) => {
    if (!config || !isTopLayer("dialog")) return;

    if (key.name === "escape") {
      close();
    }
  });

  if (!config) return null;

  const { title, children } = config;

  return (
    <box
      width={width}
      height={height}
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
      justifyContent="center"
      alignItems="center"
      position="absolute"
      left={0}
      top={0}
      zIndex={100}
      onMouseDown={close}
    >
      <box
        width={Math.min(60, width - 4)}
        height="auto"
        backgroundColor={colors.dialog}
        paddingX={4}
        paddingY={1}
        flexDirection="column"
        gap={1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <box
          paddingBottom={1}
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <text attributes={TextAttributes.BOLD} fg={colors.onDialog}>
            {title}
          </text>

          <text
            attributes={TextAttributes.DIM}
            onMouseDown={close}
            fg={colors.onDialog}
          >
            Esc
          </text>
        </box>

        <box flexGrow={1}>{children}</box>
      </box>
    </box>
  );
}

export default Dialog;
