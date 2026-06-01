import { useTerminalDimensions } from "@opentui/react";
import type { ToastOptions, ToastVariant } from "./types";
import { SPLIT_BORDER_CONFIG } from "../../lib/constants";
import { useTheme } from "../theme";

interface ToastProps {
  options: ToastOptions | null;
}

function Toast({ options }: ToastProps) {
  const { width } = useTerminalDimensions();
  const {
    currentTheme: { colors },
  } = useTheme();

  if (!options) return null;

  const variantColors: Record<ToastVariant, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.info,
    warning: colors.warning,
  };

  const borderColor = options.variant
    ? variantColors[options.variant]
    : variantColors.info;

  return (
    <box
      width={Math.max(1, Math.min(60, width - 6))}
      backgroundColor={colors.surface}
      paddingX={2}
      paddingY={1}
      border={["left", "right"]}
      borderColor={borderColor}
      customBorderChars={{
        ...SPLIT_BORDER_CONFIG.customBorderChars,
        bottomLeft: "╹",
      }}
      justifyContent="center"
      alignItems="flex-start"
      position="absolute"
      top={2}
      right={2}
      zIndex={20}
    >
      <box width="100%" flexDirection="column" gap={1}>
        <text width="100%" fg={colors.onSurface} wrapMode="word">
          {options.message}
        </text>
      </box>
    </box>
  );
}

export default Toast;
