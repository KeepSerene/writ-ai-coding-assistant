import {
  TextAttributes,
  type InputRenderable,
  type ScrollBoxRenderable,
} from "@opentui/core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MAX_VISIBLE_FILTER_LIST_ITEMS } from "../../lib/constants";
import { useKeyboard } from "@opentui/react";
import { useInputStack } from "../../providers/input-stack";
import { useTheme } from "../../providers/theme";

interface FilterListDialogProps<TItem> {
  items: TItem[];
  onSelect: (item: TItem) => void;
  onHighlight: (item: TItem) => void;
  filterPredicate: (item: TItem, query: string) => boolean;
  renderItem: (item: TItem, isSelected: boolean) => ReactNode;
  getListItemUniqueKey: (item: TItem) => string;
  placeholder?: string;
  emptyStateText?: string;
}

function FilterListDialog<TItem>({
  items,
  onSelect,
  onHighlight,
  filterPredicate,
  renderItem,
  getListItemUniqueKey,
  placeholder = "Search",
  emptyStateText = "No results found",
}: FilterListDialogProps<TItem>) {
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [searchValue, setSearchValue] = useState("");

  const inputRef = useRef<InputRenderable>(null);
  const scrollBoxRef = useRef<ScrollBoxRenderable>(null);

  const { isTopLayer, pushLayer, popLayer, setInterruptHandler } =
    useInputStack();
  const {
    currentTheme: { colors },
  } = useTheme();

  // Push the "text-field" layer on mount so ctrl+c can be intercepted
  // before it reaches the "dialog" layer. Pop it on unmount
  useEffect(() => {
    pushLayer("text-field");

    return () => {
      popLayer("text-field");
    };
  }, [pushLayer, popLayer]);

  // Keep the interrupt handler up-to-date whenever searchValue changes so it
  // always sees the latest value without re-running the mount/unmount effect.
  useEffect(() => {
    setInterruptHandler("text-field", () => {
      const input = inputRef.current;

      if (!input || input.value.length === 0) return false;

      // Clear the input element and reset component state
      input.setText("");
      setSearchValue("");
      setSelectedItemIndex(0);
      scrollBoxRef.current?.scrollTo(0);

      return true;
    });
  }, [searchValue, setInterruptHandler]);

  const handleContentChange = useCallback(() => {
    const text = inputRef.current?.value ?? "";
    setSearchValue(text.trim());
    setSelectedItemIndex(0);

    const scrollBox = scrollBoxRef.current;

    if (scrollBox) {
      scrollBox.scrollTo(0);
    }
  }, [setSearchValue, setSelectedItemIndex]);

  const filteredItems = searchValue
    ? items.filter((item) => filterPredicate(item, searchValue))
    : items;

  const visibleHeight = Math.min(
    filteredItems.length,
    MAX_VISIBLE_FILTER_LIST_ITEMS,
  );

  useKeyboard((key) => {
    if (!isTopLayer("dialog") && !isTopLayer("text-field")) return;

    if (key.name === "return" || key.name === "enter") {
      const selectedItem = filteredItems[selectedItemIndex];

      if (selectedItem) onSelect(selectedItem);
    } else if (key.name === "up") {
      key.preventDefault();
      setSelectedItemIndex((prev: number) => {
        const newIndex = Math.max(0, prev - 1);
        const scrollBox = scrollBoxRef.current;

        if (scrollBox && newIndex < scrollBox.scrollTop) {
          scrollBox.scrollTo(newIndex);
        }

        const newItem = filteredItems[newIndex];

        if (newItem && onHighlight) onHighlight(newItem);

        return newIndex;
      });
    } else if (key.name === "down") {
      key.preventDefault();
      setSelectedItemIndex((prev: number) => {
        if (filteredItems.length === 0) return 0;

        const newIndex = Math.min(filteredItems.length - 1, prev + 1);
        const scrollBox = scrollBoxRef.current;

        if (scrollBox) {
          const viewportHeight = scrollBox.viewport.height;
          const visibleEnd = scrollBox.scrollTop + viewportHeight - 1;

          if (newIndex > visibleEnd) {
            scrollBox.scrollTo(newIndex - viewportHeight + 1);
          }
        }

        const newItem = filteredItems[newIndex];

        if (newItem && onHighlight) onHighlight(newItem);

        return newIndex;
      });
    }
  });

  return (
    <box backgroundColor={colors.dialog} flexDirection="column" gap={1}>
      <input
        ref={inputRef}
        focused
        textColor={colors.onDialog}
        onContentChange={handleContentChange}
        placeholder={placeholder}
      />

      {filteredItems.length === 0 ? (
        <text attributes={TextAttributes.DIM} fg={colors.onDialog}>
          {emptyStateText}
        </text>
      ) : (
        <scrollbox ref={scrollBoxRef} height={visibleHeight}>
          {filteredItems.map((item, index) => {
            const isSelected = index === selectedItemIndex;

            return (
              <box
                key={getListItemUniqueKey(item)}
                height={1}
                backgroundColor={isSelected ? colors.selection : undefined}
                overflow="hidden"
                flexDirection="row"
                onMouseMove={() => {
                  setSelectedItemIndex(index);

                  if (onHighlight) onHighlight(item);
                }}
                onMouseDown={() => onSelect(item)}
              >
                {renderItem(item, isSelected)}
              </box>
            );
          })}
        </scrollbox>
      )}
    </box>
  );
}

export default FilterListDialog;
