import { Mode } from "@writ/shared";
import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import FilterListItemsDialog from "./filter-list-items";
import { useTheme } from "../../providers/theme";

const AVAILABLE_MODES: Mode[] = [Mode.Build, Mode.Plan];

const getModeLabel = (mode: Mode) => (mode === Mode.Build ? "Build" : "Plan");

interface ModesDialogProps {
  currentMode: Mode;
  onSelectMode: (mode: Mode) => void;
}

export default function ModesDialog({
  currentMode,
  onSelectMode,
}: ModesDialogProps) {
  const dialog = useDialog();
  const {
    currentTheme: { colors },
  } = useTheme();

  const handleSelect = useCallback(
    (newMode: Mode) => {
      onSelectMode(newMode);
      dialog.close();
    },
    [onSelectMode, dialog],
  );

  return (
    <FilterListItemsDialog
      items={AVAILABLE_MODES}
      onSelect={handleSelect}
      filterPredicate={(mode, query) =>
        getModeLabel(mode).toLowerCase().includes(query.trim().toLowerCase())
      }
      renderItem={(mode, isSelected) => (
        <text
          selectable={false}
          fg={isSelected ? colors.onSelection : colors.onDialog}
        >
          {mode === currentMode ? "• " : "» "}
          {getModeLabel(mode)}
        </text>
      )}
      getListItemUniqueKey={(mode) => mode}
      placeholder="Select mode"
      emptyStateText="No matching modes"
      onEscape={dialog.close}
    />
  );
}
