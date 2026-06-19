import { type SupportedChatModelId, Mode } from "@writ/shared";
import { useTheme } from "../../providers/theme";
import { type Message } from "../../hooks/use-app-chat";
import { TextAttributes } from "@opentui/core";
import { SPLIT_BORDER_CONFIG } from "../../lib/constants";
import {
  formatToolArguments,
  formatToolName,
  getModelLabel,
  isToolUseBlock,
} from "../../lib/utils";
import prettyMilliseconds from "pretty-ms";

export type UIMessageBlock = Message["parts"][number];
export type ToolUseBlock = Extract<
  UIMessageBlock,
  { type: `tool-${string}` | "dynamic-tool" }
>;

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
      const groupId = isToolUseBlock(block)
        ? `group-tool-use-${block.toolCallId}`
        : `group-${block.type}-${i}`;

      groups.push({ id: groupId, type: block.type, blocks: [block] });
    }
  }

  return groups;
}

interface AgentResponseProps {
  model: SupportedChatModelId;
  mode: Mode;
  blocks: UIMessageBlock[];
  durationMs?: number;
  isInterrupted?: boolean;
  isStreaming?: boolean;
}

function AgentResponse({
  model,
  mode,
  blocks,
  durationMs,
  isInterrupted,
  isStreaming,
}: AgentResponseProps) {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box width="100%" alignItems="center">
      {getConsecutiveBlocksGroup(blocks).map((group, index) => (
        <box key={group.id} width="100%" paddingTop={index === 0 ? 0 : 1}>
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

            if (isToolUseBlock(block)) {
              const toolName =
                block.type === "dynamic-tool"
                  ? block.toolName
                  : block.type.slice("tool-".length);

              return (
                <box
                  key={block.toolCallId}
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
                    <em fg={colors.info}>{formatToolName(toolName)}: </em>
                    {formatToolArguments(block)}
                    {block.state !== "output-available" &&
                    block.state !== "output-error"
                      ? " ..."
                      : ""}

                    {block.state === "output-error"
                      ? ` ${block.errorText}`
                      : ""}
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

      <box width="100%" paddingX={2} paddingY={1} gap={1}>
        <box flexDirection="row" gap={2}>
          <text fg={mode === Mode.Build ? colors.primary : colors.secondary}>
            ◉
          </text>

          <box flexDirection="row" gap={1}>
            <text fg={colors.onBackground}>
              {mode === Mode.Build ? "Build" : "Plan"}
            </text>

            <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
              &rsaquo;
            </text>

            <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
              {getModelLabel(model)}
            </text>

            {!isStreaming && (isInterrupted || durationMs !== undefined) && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
                  &rsaquo;
                </text>

                {isInterrupted ? (
                  <text attributes={TextAttributes.DIM} fg={colors.error}>
                    Interrupted
                  </text>
                ) : (
                  <text
                    attributes={TextAttributes.DIM}
                    fg={colors.onBackground}
                  >
                    {prettyMilliseconds(durationMs!)}
                  </text>
                )}
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  );
}

export default AgentResponse;
