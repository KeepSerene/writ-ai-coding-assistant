import { useCallback, useEffect, useRef } from "react";
import { SPLIT_BORDER_CONFIG, TEXTAREA_KEY_BINDINGS } from "../lib/constants";
import CommandMenu from "./command-menu";
import SessionContext from "./session-context";
import type { TextareaRenderable } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import useCommandMenu from "../hooks/use-command-menu";
import type { CommandMenuItem } from "./command-menu/types";

interface PromptAreaProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

function PromptArea({ onSubmit, disabled = false }: PromptAreaProps) {
  const textareaRef = useRef<TextareaRenderable>(null);
  const onSubmitRef = useRef<() => void>(() => {});
  const renderer = useRenderer();

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
        });
      } else {
        textarea.insertText(cmdItem.command + " ");
      }
    },
    [renderer],
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
  }, []);

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
        borderColor="cyan"
        customBorderChars={{
          ...SPLIT_BORDER_CONFIG.customBorderChars,
          bottomLeft: "╹",
        }}
      >
        <box
          width="100%"
          backgroundColor="#1a1a24"
          paddingX={2}
          paddingY={1}
          justifyContent="center"
          gap={1}
          position="relative"
        >
          {showCmdMenu && (
            <box
              width="100%"
              backgroundColor="#1a1a24"
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
            focused={!disabled}
            keyBindings={TEXTAREA_KEY_BINDINGS}
            onContentChange={handleContentChange}
            placeholder='Ask anything... "Fix a bug in the database"'
          />

          <SessionContext />
        </box>
      </box>
    </box>
  );
}

export default PromptArea;
