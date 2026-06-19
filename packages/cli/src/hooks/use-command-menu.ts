import type { ScrollBoxRenderable } from "@opentui/core";
import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import type { CommandMenuItem } from "../components/command-menu/types";
import { findActiveCommand, getFilteredCmdItems } from "../lib/utils";
import { useKeyboard } from "@opentui/react";
import { useInputStack } from "../providers/input-stack";
import { COMMAND_MENU_ITEMS } from "../lib/constants";
import { getAuthToken } from "../lib/auth-token-store";

interface CommandMenuControls {
  filteredCmdItems: CommandMenuItem[];
  showCmdMenu: boolean;
  selectedCmdIndex: number;
  setSelectedCmdIndex: (index: number) => void;
  handleInputChange: (inputStr: string, cursorOffset: number) => void;
  resolveCmdItem: (index: number) => CommandMenuItem | undefined;
  scrollBoxRef: RefObject<ScrollBoxRenderable | null>;
}

export default function useCommandMenu(): CommandMenuControls {
  const [showCmdMenu, setShowCmdMenu] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);

  const scrollBoxRef = useRef<ScrollBoxRenderable>(null);

  const { pushLayer, popLayer, isTopLayer } = useInputStack();

  const cmdQuery = (() => {
    if (!showCmdMenu) return "";

    // find the command token nearest end of input as a best-effort for filtering
    const match = /(?:^|\s)(\/([^/\s]*))$/.exec(userInput);

    return match?.[2] ?? "";
  })();

  const isAuthenticated = Boolean(getAuthToken());
  const filteredCmdItems = useMemo(() => {
    // First pass: filter by auth visibility
    const authVisibleItems = COMMAND_MENU_ITEMS.filter((item) => {
      if (item.showWhen === "authenticated") return isAuthenticated;
      if (item.showWhen === "unauthenticated") return !isAuthenticated;

      return true; // "always" or undefined
    });

    // Second pass: filter by the user's typed query
    return getFilteredCmdItems(authVisibleItems, cmdQuery);
  }, [cmdQuery, isAuthenticated]);

  const closeMenu = () => {
    setShowCmdMenu(false);
    popLayer("command-menu");
  };

  const handleInputChange = (inputStr: string, cursorOffset: number) => {
    setUserInput(inputStr);
    setSelectedCmdIndex(0);

    const scrollBox = scrollBoxRef.current;
    if (scrollBox) scrollBox.scrollTo(0);

    const activeCommand = findActiveCommand(inputStr, cursorOffset);

    if (activeCommand) {
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
    filteredCmdItems,
    showCmdMenu,
    selectedCmdIndex,
    setSelectedCmdIndex,
    handleInputChange,
    resolveCmdItem,
    scrollBoxRef,
  };
}
