import type { ScrollBoxRenderable } from "@opentui/core";
import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import type { CommandMenuItem } from "../components/command-menu/types";
import { getFilteredCmdItems } from "../lib/utils";
import { useKeyboard } from "@opentui/react";
import { useInputStack } from "../providers/input-stack";

interface CommandMenuControls {
  showCmdMenu: boolean;
  cmdQuery: string;
  selectedCmdIndex: number;
  setSelectedCmdIndex: (index: number) => void;
  handleInputChange: (inputStr: string) => void;
  resolveCmdItem: (index: number) => CommandMenuItem | undefined;
  scrollBoxRef: RefObject<ScrollBoxRenderable | null>;
}

export default function useCommandMenu(): CommandMenuControls {
  const [showCmdMenu, setShowCmdMenu] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);

  const scrollBoxRef = useRef<ScrollBoxRenderable>(null);

  const { pushLayer, popLayer, isTopLayer } = useInputStack();

  // Extract the command query by stripping the leading "/" if the menu is active
  const cmdQuery =
    showCmdMenu && userInput.startsWith("/") ? userInput.slice(1) : "";

  const filteredCmdItems = useMemo(
    () => getFilteredCmdItems(cmdQuery),
    [cmdQuery],
  );

  const closeMenu = () => {
    setShowCmdMenu(false);
    popLayer("command-menu");
  };

  const handleInputChange = (inputStr: string) => {
    setUserInput(inputStr);
    setSelectedCmdIndex(0); // Reset selection to the top when query changes

    const scrollBox = scrollBoxRef.current;

    if (scrollBox) {
      scrollBox.scrollTo(0); // Reset scroll position to top when query changes
    }

    const suffix = inputStr.startsWith("/") ? inputStr.slice(1) : null;

    if (suffix !== null && !suffix.includes(" ")) {
      setShowCmdMenu(true);
      pushLayer("command-menu", () => {
        closeMenu();

        return true;
      });
    } else {
      closeMenu();
    }
  };

  const resolveCmdItem = useCallback(
    (index: number): CommandMenuItem | undefined => {
      const cmdItem = filteredCmdItems[index];

      // Auto-close the menu once an item is successfully resolved
      if (cmdItem) {
        closeMenu();
      }

      return cmdItem;
    },
    [filteredCmdItems, closeMenu],
  );

  // Handle keyboard navigation
  useKeyboard((key) => {
    if (!showCmdMenu || !isTopLayer("command-menu")) return;

    if (key.name === "escape") {
      key.preventDefault();
      closeMenu();
    } else if (key.name === "up") {
      key.preventDefault();
      setSelectedCmdIndex((prev: number) => {
        const newIndex = Math.max(0, prev - 1);
        const scrollBox = scrollBoxRef.current;

        // Auto-scroll up: If the new highlighted index is above the current scroll position,
        // snap the scroll position to that item
        if (scrollBox && newIndex < scrollBox.scrollTop) {
          scrollBox.scrollTo(newIndex);
        }

        return newIndex;
      });
    } else if (key.name === "down") {
      key.preventDefault();
      setSelectedCmdIndex((prev: number) => {
        // Prevent moving down if there are no items to select
        if (filteredCmdItems.length === 0) return 0;

        const newIndex = Math.min(filteredCmdItems.length - 1, prev + 1);
        const scrollBox = scrollBoxRef.current;

        // Auto-scroll down: Calculate the bottom boundary of the visible area
        // If the new highlighted index is below the visible area, adjust the scroll down
        if (scrollBox) {
          const viewportHeight = scrollBox.viewport.height;
          const visibleEnd = scrollBox.scrollTop + viewportHeight - 1;

          if (newIndex > visibleEnd) {
            // Scroll down just enough to reveal the new item
            scrollBox.scrollTo(newIndex - viewportHeight + 1);
          }
        }

        return newIndex;
      });
    }
  });

  return {
    showCmdMenu,
    cmdQuery,
    selectedCmdIndex,
    setSelectedCmdIndex,
    handleInputChange,
    resolveCmdItem,
    scrollBoxRef,
  };
}
