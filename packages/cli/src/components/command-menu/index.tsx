import type { RefObject } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import { MAX_VISIBLE_COMMAND_ITEMS } from "../../lib/constants";
import { useTheme } from "../../providers/theme";
import type { CommandMenuItem } from "./types";

interface CommandMenuProps {
  filteredCmdItems: CommandMenuItem[];
  selectedCmdIndex: number;
  onSelectCmd: (index: number) => void;
  onExecuteCmd: (index: number) => void;
  scrollBoxRef: RefObject<ScrollBoxRenderable | null>;
}

export default function CommandMenu({
  filteredCmdItems,
  selectedCmdIndex,
  onSelectCmd,
  onExecuteCmd,
  scrollBoxRef,
}: CommandMenuProps) {
  const visibleHeight = Math.min(
    filteredCmdItems.length,
    MAX_VISIBLE_COMMAND_ITEMS,
  );
  const {
    currentTheme: { colors },
  } = useTheme();

  if (filteredCmdItems.length === 0) {
    return (
      <box paddingX={1}>
        <text attributes={TextAttributes.DIM} fg={colors.onSurface}>
          No matching commands
        </text>
      </box>
    );
  }

  const colWidth =
    Math.max(...filteredCmdItems.map((item) => item.command.length)) + 4;

  return (
    <scrollbox ref={scrollBoxRef} height={visibleHeight}>
      {filteredCmdItems.map((item, index) => {
        const isSelected = index === selectedCmdIndex;

        return (
          <box
            key={item.command}
            height={1}
            backgroundColor={isSelected ? colors.selection : undefined}
            paddingX={1}
            flexDirection="row"
            overflow="hidden"
            onMouseMove={() => onSelectCmd(index)}
            onMouseDown={() => onExecuteCmd(index)}
          >
            <box width={colWidth} flexShrink={0}>
              <text
                selectable={false}
                fg={isSelected ? colors.onSelection : colors.onSurface}
              >
                {item.command}
              </text>
            </box>

            <box flexGrow={1} flexShrink={1} overflow="hidden">
              <text
                selectable={false}
                attributes={isSelected ? undefined : TextAttributes.DIM}
                fg={isSelected ? colors.onSelection : colors.onSurface}
              >
                {item.description}
              </text>
            </box>
          </box>
        );
      })}
    </scrollbox>
  );
}
