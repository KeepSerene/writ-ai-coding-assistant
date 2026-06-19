import type { RefObject } from "react";
import type { MentionCandidate } from "../lib/utils";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { MAX_VISIBLE_MENTIONS } from "../lib/constants";

interface MentionMenuProps {
  candidates: MentionCandidate[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onExecute: (index: number) => void;
  scrollBoxRef: RefObject<ScrollBoxRenderable | null>;
}

export default function MentionMenu({
  candidates,
  selectedIndex,
  onSelect,
  onExecute,
  scrollBoxRef,
}: MentionMenuProps) {
  const {
    currentTheme: { colors },
  } = useTheme();

  const visibleHeight = Math.min(candidates.length, MAX_VISIBLE_MENTIONS);

  if (candidates.length === 0) {
    return (
      <box paddingX={1}>
        <text attributes={TextAttributes.DIM} fg={colors.onSurface}>
          No matching files or folders
        </text>
      </box>
    );
  }

  return (
    <scrollbox ref={scrollBoxRef} height={visibleHeight}>
      {candidates.map((candidate, index) => {
        const isSelected = index === selectedIndex;

        return (
          <box
            key={candidate.path}
            height={1}
            backgroundColor={isSelected ? colors.selection : undefined}
            paddingX={1}
            flexDirection="row"
            overflow="hidden"
            onMouseMove={() => onSelect(index)}
            onMouseDown={() => onExecute(index)}
          >
            <box flexGrow={1} flexShrink={1} overflow="hidden">
              <text
                fg={isSelected ? colors.onSelection : colors.onSurface}
                selectable={false}
              >
                {candidate.path}
              </text>
            </box>

            <box flexShrink={0} width={8} alignItems="flex-end">
              <text
                attributes={isSelected ? undefined : TextAttributes.DIM}
                fg={isSelected ? colors.onSelection : colors.onSurface}
                selectable={false}
              >
                {candidate.type === "directory" ? "Folder" : "File"}
              </text>
            </box>
          </box>
        );
      })}
    </scrollbox>
  );
}
