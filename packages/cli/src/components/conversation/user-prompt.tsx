import { SPLIT_BORDER_CONFIG } from "../../lib/constants";
import { useTheme } from "../../providers/theme";

function UserPrompt({ prompt }: { prompt: string }) {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box width="100%" alignItems="center">
      <box
        width="100%"
        border={["left"]}
        borderColor={colors.primary}
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
          <text fg={colors.onSurface}>{prompt}</text>
        </box>
      </box>
    </box>
  );
}

export default UserPrompt;
