import type { SupportedChatModelId } from "@writ/shared";
import { useTheme } from "../../providers/theme";
import type { MessageBlock } from "../../hooks/use-chat";
import { Mode } from "@writ/db/enums";
import { TextAttributes } from "@opentui/core";

interface AgentResponseProps {
  model: SupportedChatModelId;
  mode: Mode;
  isStreaming?: boolean;
  blocks: MessageBlock[];
  duration?: string;
  isInterrupted?: boolean;
}

function AgentResponse({
  model,
  mode,
  isStreaming = false,
  blocks,
  duration,
  isInterrupted = false,
}: AgentResponseProps) {
  const {
    currentTheme: { colors },
  } = useTheme();

  const response = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return (
    <box width="100%" alignItems="center">
      <box width="100%" paddingY={1}>
        <box width="100%" paddingX={3}>
          <text fg={colors.onBackground}>{response}</text>
        </box>
      </box>

      <box width="100%" paddingX={3} paddingY={1} gap={1}>
        <box flexDirection="row" gap={2}>
          <text
            attributes={isInterrupted ? TextAttributes.DIM : 0}
            fg={
              isInterrupted
                ? colors.onBackground
                : mode === Mode.BUILD
                  ? colors.primary
                  : colors.secondary
            }
          >
            ◉
          </text>

          <box flexDirection="row" gap={1}>
            <text
              attributes={isInterrupted ? TextAttributes.DIM : 0}
              fg={colors.onBackground}
            >
              {mode === Mode.BUILD ? "Build" : "Plan"}
            </text>

            <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
              &rsaquo;
            </text>

            <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
              {model}
            </text>

            {(duration || isInterrupted) && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
                  &rsaquo;
                </text>

                <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
                  {isInterrupted ? "Interrupted" : duration}
                </text>
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  );
}

export default AgentResponse;
