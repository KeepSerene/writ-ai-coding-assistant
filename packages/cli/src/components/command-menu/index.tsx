import type { RefObject } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import {
  COMMAND_COL_WIDTH,
  MAX_VISIBLE_COMMAND_ITEMS,
} from "../../lib/constants";
import { getFilteredCmdItems } from "../../lib/utils";

interface CommandMenuProps {
  query: string;
  selectedCmdIndex: number;
  onSelectCmd: (index: number) => void;
  onExecuteCmd: (index: number) => void;
  scrollBoxRef: RefObject<ScrollBoxRenderable | null>;
}

export default function CommandMenu({
  query,
  selectedCmdIndex,
  onSelectCmd,
  onExecuteCmd,
  scrollBoxRef,
}: CommandMenuProps) {
  const filteredCmdItems = getFilteredCmdItems(query);
  const visibleHeight = Math.min(
    filteredCmdItems.length,
    MAX_VISIBLE_COMMAND_ITEMS,
  );

  if (filteredCmdItems.length === 0) {
    return (
      <box paddingX={1}>
        <text attributes={TextAttributes.DIM}>No matching commands</text>
      </box>
    );
  }

  return (
    <scrollbox ref={scrollBoxRef} height={visibleHeight}>
      {filteredCmdItems.map((item, index) => {
        const isSelected = index === selectedCmdIndex;

        return (
          <box
            key={item.command}
            height={1}
            backgroundColor={isSelected ? "#89b4fa" : undefined}
            paddingX={1}
            flexDirection="row"
            overflow="hidden"
            onMouseMove={() => onSelectCmd(index)}
            onMouseDown={() => onExecuteCmd(index)}
          >
            <box width={COMMAND_COL_WIDTH} flexShrink={0}>
              <text selectable={false} fg={isSelected ? "black" : "white"}>
                {item.command}
              </text>
            </box>

            <box flexGrow={1} flexShrink={1} overflow="hidden">
              <text selectable={false} fg={isSelected ? "black" : "gray"}>
                {item.description}
              </text>
            </box>
          </box>
        );
      })}
    </scrollbox>
  );
}
