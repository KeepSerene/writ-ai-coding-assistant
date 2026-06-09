import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import FilterListItemsDialog from "./filter-list-items";
import { useTheme } from "../../providers/theme";
import type { SupportedChatModelId } from "@writ/shared";

interface ModelsDialogProps {
  models: SupportedChatModelId[];
  onSelectModel: (model: SupportedChatModelId) => void;
}

export default function ModelsDialog({
  models,
  onSelectModel,
}: ModelsDialogProps) {
  const dialog = useDialog();
  const {
    currentTheme: { colors },
  } = useTheme();

  const handleSelect = useCallback(
    (newModel: SupportedChatModelId) => {
      onSelectModel(newModel);
      dialog.close();
    },
    [onSelectModel, dialog],
  );

  return (
    <FilterListItemsDialog
      items={models}
      onSelect={handleSelect}
      filterPredicate={(model, query) =>
        model.toLowerCase().includes(query.trim().toLowerCase())
      }
      renderItem={(model, isSelected) => (
        <text
          selectable={false}
          fg={isSelected ? colors.onSelection : colors.onDialog}
        >
          {/* {TODO: selectModelCondition ? "• " : "» "} */}
          {/* TODO: Display model labels instead */}
          {model}
        </text>
      )}
      getListItemUniqueKey={(model) => model}
      placeholder="Search model"
      emptyStateText="No matching models"
    />
  );
}
