import { TextAttributes } from "@opentui/core";
import { SPLIT_BORDER_CONFIG } from "../../lib/constants";
import { useTheme } from "../../providers/theme";

function ErrorResponse({ response }: { response: string }) {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box width="100%" alignItems="center">
      <box
        width="100%"
        border={["left"]}
        borderColor={colors.error}
        customBorderChars={{
          ...SPLIT_BORDER_CONFIG.customBorderChars,
          bottomLeft: "╹",
        }}
      >
        <box
          width="100%"
          backgroundColor={colors.surface}
          paddingX={2}
          paddingY={1}
          justifyContent="center"
        >
          <text attributes={TextAttributes.DIM} fg={colors.onSurface}>
            {response}
          </text>
        </box>
      </box>
    </box>
  );
}

export default ErrorResponse;
