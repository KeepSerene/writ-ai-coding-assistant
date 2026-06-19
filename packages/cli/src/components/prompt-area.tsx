import { useCallback, useEffect, useRef, useState } from "react";
import { SPLIT_BORDER_CONFIG, TEXTAREA_KEY_BINDINGS } from "../lib/constants";
import CommandMenu from "./command-menu";
import SessionContext from "./session-context";
import {
  type ScrollBoxRenderable,
  type TextareaRenderable,
} from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import useCommandMenu from "../hooks/use-command-menu";
import type { CommandMenuItem } from "./command-menu/types";
import { useToast } from "../providers/toast";
import { useInputStack } from "../providers/input-stack";
import { useDialog } from "../providers/dialog";
import { useTheme } from "../providers/theme";
import { useNavigate } from "react-router";
import { useSessionCtx } from "../providers/session-context";
import { Mode } from "@writ/shared";
import {
  findActiveCommand,
  findActiveMention,
  getMentionCandidates,
  type ActiveMentionContext,
  type MentionCandidate,
} from "../lib/utils";
import MentionMenu from "./mention-menu";
import { format } from "date-fns";

interface PromptAreaProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  quotaError?: { resetsAt: string } | null;
}

function PromptArea({
  onSubmit,
  disabled = false,
  quotaError = null,
}: PromptAreaProps) {
  const [activeMention, setActiveMention] =
    useState<ActiveMentionContext | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<
    MentionCandidate[]
  >([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const textareaRef = useRef<TextareaRenderable>(null);
  const onSubmitRef = useRef<() => void>(() => {});
  const activeMentionRef = useRef<ActiveMentionContext | null>(null);
  const mentionMenuScrollBoxRef = useRef<ScrollBoxRenderable>(null);

  const toast = useToast();
  const dialog = useDialog();
  const renderer = useRenderer();
  const { setInterruptHandler, isTopLayer, pushLayer, popLayer } =
    useInputStack();
  const {
    currentTheme: { colors },
  } = useTheme();
  const navigate = useNavigate();
  const { mode, setMode, toggleMode, model, setModel } = useSessionCtx();
  const {
    filteredCmdItems,
    showCmdMenu,
    selectedCmdIndex,
    setSelectedCmdIndex,
    handleInputChange,
    resolveCmdItem,
    scrollBoxRef,
  } = useCommandMenu();

  const showMentionMenu = activeMention !== null;

  const handleCmdItem = useCallback(
    (cmdItem: CommandMenuItem | undefined) => {
      const textarea = textareaRef.current;

      if (!textarea || !cmdItem) return;

      const text = textarea.plainText;
      const commandCtx = findActiveCommand(text, textarea.cursorOffset);

      if (commandCtx) {
        // Slice out the command token
        const before = text.slice(0, commandCtx.startIndex);
        const after = text.slice(commandCtx.endIndex);

        if (cmdItem.action) {
          // Remove only the command token, preserving the user's surrounding text
          textarea.replaceText(before + after);
          textarea.cursorOffset = commandCtx.startIndex;

          cmdItem.action({
            exit: () => renderer.destroy(),
            toast,
            dialog,
            navigate,
            mode,
            setMode,
            model,
            setModel,
          });
        } else {
          // Replace token with full command string (for text-replacement commands)
          const commandStr = cmdItem.command + " ";
          textarea.replaceText(before + commandStr + after);
          textarea.cursorOffset = commandCtx.startIndex + commandStr.length;
        }
      } else {
        // Fallback: If context is lost, clear the text
        textarea.setText("");

        if (cmdItem.action) {
          cmdItem.action({
            exit: () => renderer.destroy(),
            toast,
            dialog,
            navigate,
            mode,
            setMode,
            model,
            setModel,
          });
        } else {
          textarea.insertText(cmdItem.command + " ");
        }
      }
    },
    [renderer, toast, dialog, navigate, mode, setMode, model, setModel],
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

  const closeMentionMenu = useCallback(() => {
    activeMentionRef.current = null;
    setActiveMention(null);
    setMentionCandidates([]);
    popLayer("mention-menu");
  }, [setActiveMention, setMentionCandidates, popLayer]);

  const syncMentionMenuUI = useCallback(
    (text: string, cursorOffset: number) => {
      const prevMention = activeMentionRef.current;
      const nextMention = findActiveMention(text, cursorOffset);

      if (!nextMention) {
        if (prevMention) {
          closeMentionMenu();
        }

        return;
      }

      activeMentionRef.current = nextMention;
      setActiveMention(nextMention);
      pushLayer("mention-menu", () => {
        closeMentionMenu();

        return true;
      });

      const hasMentionChanged =
        prevMention?.startIndex !== nextMention.startIndex ||
        prevMention?.endIndex !== nextMention.endIndex ||
        prevMention?.query !== nextMention.query;

      if (hasMentionChanged) {
        setSelectedMentionIndex(0);
        mentionMenuScrollBoxRef.current?.scrollTo(0);
      }
    },
    [closeMentionMenu, setActiveMention, pushLayer, setSelectedMentionIndex],
  );

  const handleMentionExecute = useCallback(
    (index: number) => {
      const textarea = textareaRef.current;
      const mention = activeMentionRef.current;
      const candidate = mentionCandidates[index];

      if (!textarea || !mention || !candidate) return;

      const query =
        candidate.type === "directory" ? candidate.path : `${candidate.path} `;
      const updatedText = `${textarea.plainText.slice(0, mention.startIndex)}@${query}${textarea.plainText.slice(mention.endIndex)}`;

      textarea.replaceText(updatedText);
      const updatedCursorOffset = mention.startIndex + query.length + 1;
      textarea.cursorOffset = updatedCursorOffset;
      syncMentionMenuUI(updatedText, updatedCursorOffset);
    },
    [mentionCandidates, syncMentionMenuUI],
  );

  const handleCursorPosChange = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    syncMentionMenuUI(textarea.plainText, textarea.cursorOffset);
  }, [syncMentionMenuUI]);

  const handleContentChange = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    const text = textarea.plainText;
    handleInputChange(text, textarea.cursorOffset);
    syncMentionMenuUI(text, textarea.cursorOffset);
  }, [handleInputChange, syncMentionMenuUI]);

  onSubmitRef.current = () => {
    if (disabled) return;

    if (showCmdMenu) {
      const cmdItem = resolveCmdItem(selectedCmdIndex);
      handleCmdItem(cmdItem);

      return;
    }

    if (showMentionMenu) {
      const candidate = mentionCandidates[selectedMentionIndex];

      if (candidate) {
        handleMentionExecute(selectedMentionIndex);

        return;
      }
    }

    handleSubmit();
  };

  useEffect(() => {
    if (!activeMention) {
      setMentionCandidates([]);

      return;
    }

    let shouldIgnore = false;

    const loadCandidates = async () => {
      if (shouldIgnore) return;

      const candidates = await getMentionCandidates(activeMention.query);
      setMentionCandidates(candidates);
      setSelectedMentionIndex((prev) => {
        if (candidates.length === 0) return 0;

        return Math.min(prev, candidates.length - 1);
      });
    };

    loadCandidates();

    return () => {
      shouldIgnore = true;
    };
  }, [activeMention, setMentionCandidates, setSelectedMentionIndex]);

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

  useKeyboard((key) => {
    if (disabled) return;

    // Mention menu layer takes priority
    if (showMentionMenu && isTopLayer("mention-menu")) {
      if (key.name === "escape") {
        key.preventDefault();
        closeMentionMenu();
      } else if (key.name === "up") {
        key.preventDefault();
        setSelectedMentionIndex((prev) => {
          const newIndex = Math.max(0, prev - 1);
          const scrollBox = mentionMenuScrollBoxRef.current;

          if (scrollBox && newIndex < scrollBox.scrollTop) {
            scrollBox.scrollTo(newIndex);
          }

          return newIndex;
        });
      } else if (key.name === "down") {
        key.preventDefault();
        setSelectedMentionIndex((prev) => {
          if (mentionCandidates.length === 0) return 0;

          const newIndex = Math.min(mentionCandidates.length - 1, prev + 1);
          const scrollBox = mentionMenuScrollBoxRef.current;

          if (scrollBox) {
            const viewportHeight = scrollBox.viewport.height;
            const visibleEnd = scrollBox.scrollTop + viewportHeight - 1;

            if (newIndex > visibleEnd) {
              scrollBox.scrollTo(newIndex - viewportHeight + 1);
            }
          }

          return newIndex;
        });
      }
      return;
    }

    // Base layer: tab toggles mode
    if (isTopLayer("base") && key.name === "tab") {
      key.preventDefault();
      toggleMode();
    }
  });

  return (
    <box width="100%" alignItems="center">
      <box
        width="100%"
        border={["left"]}
        borderColor={
          quotaError
            ? colors.warning
            : mode === Mode.Build
              ? colors.primary
              : colors.secondary
        }
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
                filteredCmdItems={filteredCmdItems}
                selectedCmdIndex={selectedCmdIndex}
                scrollBoxRef={scrollBoxRef}
                onSelectCmd={setSelectedCmdIndex}
                onExecuteCmd={executeCmdItem}
              />
            </box>
          )}

          {!showCmdMenu && showMentionMenu && (
            <box
              width="100%"
              backgroundColor={colors.surface}
              position="absolute"
              bottom="100%"
              left={0}
              zIndex={10}
            >
              <MentionMenu
                candidates={mentionCandidates}
                selectedIndex={selectedMentionIndex}
                onSelect={setSelectedMentionIndex}
                onExecute={handleMentionExecute}
                scrollBoxRef={mentionMenuScrollBoxRef}
              />
            </box>
          )}

          <textarea
            ref={textareaRef}
            focused={
              !disabled &&
              (isTopLayer("base") ||
                isTopLayer("command-menu") ||
                isTopLayer("mention-menu"))
            }
            keyBindings={TEXTAREA_KEY_BINDINGS}
            onContentChange={handleContentChange}
            onCursorChange={handleCursorPosChange}
            cursorColor={quotaError ? colors.warning : colors.primary}
            textColor={colors.onSurface}
            placeholder="Ask anything... [ / commands ] [ @ files ]"
          />

          <SessionContext quotaError={quotaError} />
        </box>

        {quotaError && (
          <box
            width="100%"
            paddingX={2}
            paddingY={1}
            backgroundColor={colors.warning}
          >
            <text fg={colors.onWarning}>
              Demo limit reached (3/3). Quota resets{" "}
              {format(new Date(quotaError.resetsAt), "MMM d, yyyy 'at' h:mm a")}
              .
            </text>
          </box>
        )}
      </box>
    </box>
  );
}

export default PromptArea;
