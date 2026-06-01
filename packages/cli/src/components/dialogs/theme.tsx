import { useCallback, useEffect, useRef } from "react";
import { useDialog } from "../../providers/dialog";
import { useTheme } from "../../providers/theme";
import { THEMES, type Theme } from "../../lib/themes";
import FilterListDialog from "./filter-list";

export default function ThemeDialog() {
  const { currentTheme, setTheme } = useTheme();
  const dialog = useDialog();

  const originalThemeRef = useRef(currentTheme);
  const isThemeSelectedRef = useRef(false);

  // Revert to original theme if user dimisses the dialog without selecting a theme
  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (!isThemeSelectedRef.current) {
        setTheme(originalThemeRef.current);
      }
    };
  }, [setTheme]);

  const handleSelect = useCallback(
    (theme: Theme) => {
      isThemeSelectedRef.current = true;
      setTheme(theme);
      dialog.close();
    },
    [setTheme, dialog],
  );

  const handleHighlight = useCallback(
    (theme: Theme) => {
      setTheme(theme);
    },
    [setTheme],
  );

  return (
    <FilterListDialog
      items={THEMES}
      onSelect={handleSelect}
      onHighlight={handleHighlight}
      filterPredicate={(theme, query) =>
        theme.name.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(theme, isSelected) => (
        <text
          selectable={false}
          fg={
            isSelected
              ? currentTheme.colors.onSelection
              : currentTheme.colors.onDialog
          }
        >
          {theme.name === originalThemeRef.current.name ? "• " : "» "}
          {theme.name}
        </text>
      )}
      getListItemUniqueKey={(theme) => theme.name}
      placeholder="Search theme"
      emptyStateText="No matching themes"
    />
  );
}
