import { useCallback, useEffect, useRef } from "react";
import { SPLIT_BORDER_CONFIG, TEXTAREA_KEY_BINDINGS } from "../lib/constants";
import CommandMenu from "./command-menu";
import SessionContext from "./session-context";
import type { TextareaRenderable } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import useCommandMenu from "../hooks/use-command-menu";
import type { CommandMenuItem } from "./command-menu/types";
import { useToast } from "../providers/toast";
import { useInputStack } from "../providers/input-stack";
import { useDialog } from "../providers/dialog";
import { useTheme } from "../providers/theme";

interface PromptAreaProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

function PromptArea({ onSubmit, disabled = false }: PromptAreaProps) {
  const toast = useToast();
  const dialog = useDialog();
  const textareaRef = useRef<TextareaRenderable>(null);
  const onSubmitRef = useRef<() => void>(() => {});
  const renderer = useRenderer();
  const { setInterruptHandler, isTopLayer } = useInputStack();
  const {
    currentTheme: { colors },
  } = useTheme();

  const {
    cmdQuery,
    showCmdMenu,
    selectedCmdIndex,
    setSelectedCmdIndex,
    handleInputChange,
    resolveCmdItem,
    scrollBoxRef,
  } = useCommandMenu();

  const handleCmdItem = useCallback(
    (cmdItem: CommandMenuItem | undefined) => {
      const textarea = textareaRef.current;

      if (!textarea || !cmdItem) return;

      textarea.setText("");

      if (cmdItem.action) {
        cmdItem.action({
          exit: () => renderer.destroy(),
          toast,
          dialog,
        });
      } else {
        textarea.insertText(cmdItem.command + " ");
      }
    },
    [renderer, toast],
  );

  const executeCmdItem = useCallback(
    (index: number) => {
      const cmdItem = resolveCmdItem(index);
      handleCmdItem(cmdItem);
    },
    [resolveCmdItem, handleCmdItem],
  );

  const handleSubmit = useCallback(() => {
    if (disabled) return;

    const textarea = textareaRef.current;

    if (!textarea) return;

    const text = textarea.plainText.trim();

    if (text.length === 0) return;

    onSubmit(text);
    textarea.setText("");
  }, [disabled, onSubmit]);

  onSubmitRef.current = () => {
    if (disabled) return;

    if (showCmdMenu) {
      const cmdItem = resolveCmdItem(selectedCmdIndex);
      handleCmdItem(cmdItem);

      return;
    }

    handleSubmit();
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.onSubmit = () => {
      onSubmitRef.current();
    };

    setInterruptHandler("base", () => {
      if (disabled) return false;

      if (textarea.plainText.length > 0) {
        textarea.setText("");

        return true;
      }

      return false;
    });

    return () => setInterruptHandler("base", null);
  }, [disabled, setInterruptHandler]);

  const handleContentChange = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    handleInputChange(textarea.plainText);
  }, [handleInputChange]);

  return (
    <box width="100%" alignItems="center">
      <box
        width="100%"
        border={["left"]}
        borderColor={colors.primary}
        customBorderChars={{
          ...SPLIT_BORDER_CONFIG.customBorderChars,
          bottomLeft: "╹",
        }}
      >
        <box
          width="100%"
          backgroundColor={colors.surface}
          paddingX={2}
          paddingY={1}
          justifyContent="center"
          gap={1}
          position="relative"
        >
          {showCmdMenu && (
            <box
              width="100%"
              backgroundColor={colors.surface}
              position="absolute"
              bottom="100%"
              left={0}
              zIndex={10}
            >
              <CommandMenu
                query={cmdQuery}
                selectedCmdIndex={selectedCmdIndex}
                scrollBoxRef={scrollBoxRef}
                onSelectCmd={setSelectedCmdIndex}
                onExecuteCmd={executeCmdItem}
              />
            </box>
          )}

          <textarea
            ref={textareaRef}
            focused={
              !disabled && (isTopLayer("base") || isTopLayer("command-menu"))
            }
            keyBindings={TEXTAREA_KEY_BINDINGS}
            onContentChange={handleContentChange}
            textColor={colors.onSurface}
            placeholder='Ask anything... "Fix a bug in the database"'
          />

          <SessionContext />
        </box>
      </box>
    </box>
  );
}

export default PromptArea;
