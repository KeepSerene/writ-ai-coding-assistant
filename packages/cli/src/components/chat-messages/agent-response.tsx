import type { SupportedChatModelId } from "@writ/shared";
import { useTheme } from "../../providers/theme";
import type { UIMessageBlock } from "../../hooks/use-chat";
import { Mode } from "@writ/db/enums";
import { TextAttributes } from "@opentui/core";
import { SPLIT_BORDER_CONFIG } from "../../lib/constants";
import {
  formatToolArguments,
  formatToolName,
  getModelLabel,
} from "../../lib/utils";

interface ConsecutiveBlocksGroup {
  id: string;
  type: UIMessageBlock["type"];
  blocks: UIMessageBlock[];
}

function getConsecutiveBlocksGroup(
  blocks: UIMessageBlock[],
): ConsecutiveBlocksGroup[] {
  const groups: ConsecutiveBlocksGroup[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.type === block.type) {
      lastGroup.blocks.push(block);
    } else {
      const groupId =
        block.type === "tool-use"
          ? `group-tool-use-${block.id}`
          : `group-${block.type}-${i}`;
      groups.push({ id: groupId, type: block.type, blocks: [block] });
    }
  }

  return groups;
}

interface AgentResponseProps {
  model: SupportedChatModelId;
  mode: Mode;
  // isStreaming?: boolean;
  blocks: UIMessageBlock[];
  duration?: string;
  isInterrupted?: boolean;
}

function AgentResponse({
  model,
  mode,
  // isStreaming = false,
  blocks,
  duration,
  isInterrupted = false,
}: AgentResponseProps) {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box width="100%" alignItems="center">
      {getConsecutiveBlocksGroup(blocks).map((group) => (
        <box key={group.id} width="100%" paddingY={1}>
          {group.blocks.map((block, index) => {
            if (block.type === "reasoning") {
              return (
                <box
                  key={`reasoning-${index}`}
                  width="100%"
                  border={["left"]}
                  borderColor={colors.border}
                  customBorderChars={{
                    ...SPLIT_BORDER_CONFIG.customBorderChars,
                    bottomLeft: "╹",
                  }}
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em fg={colors.accent}>Thoughts:</em> {block.text}
                  </text>
                </box>
              );
            }

            if (block.type === "tool-use") {
              return (
                <box
                  key={block.id}
                  width="100%"
                  border={["left"]}
                  borderColor={colors.border}
                  customBorderChars={{
                    ...SPLIT_BORDER_CONFIG.customBorderChars,
                    bottomLeft: "╹",
                  }}
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em fg={colors.info}>{formatToolName(block.name)}: </em>
                    {formatToolArguments(block)}
                    {block.status === "calling" ? "..." : ""}
                  </text>
                </box>
              );
            }

            if (block.type === "text") {
              return (
                <box key={`text-${index}`} width="100%" paddingX={3}>
                  <text fg={colors.onBackground}>{block.text}</text>
                </box>
              );
            }

            return null;
          })}
        </box>
      ))}

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
              {getModelLabel(model)}
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
