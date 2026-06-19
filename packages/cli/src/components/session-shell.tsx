import "opentui-spinner/react";
import type { ReactNode } from "react";
import PromptArea from "./prompt-area";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { useSessionCtx } from "../providers/session-context";
import { Mode } from "@writ/shared";

interface SessionShellProps {
  children?: ReactNode;
  title?: string;
  onSubmit: (prompt: string) => void;
  promptAreaDisabled?: boolean;
  isLoading?: boolean;
  canInterrupt?: boolean;
  canRegenerate?: boolean;
  quotaError?: { resetsAt: string } | null;
}

function SessionShell({
  children,
  title,
  onSubmit,
  promptAreaDisabled = false,
  isLoading = false,
  canInterrupt = false,
  canRegenerate = false,
  quotaError = null,
}: SessionShellProps) {
  const {
    currentTheme: { colors },
  } = useTheme();
  const { mode } = useSessionCtx();

  return (
    <box
      flexGrow={1}
      width="100%"
      height="100%"
      paddingX={2}
      paddingY={1}
      flexDirection="column"
      gap={1}
    >
      {title && (
        <box
          flexShrink={0}
          width="100%"
          flexDirection="row"
          alignItems="center"
          gap={1}
        >
          <text attributes={TextAttributes.DIM} fg={colors.primary}>
            ┃
          </text>

          <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
            {title}
          </text>
        </box>
      )}

      {children && (
        <scrollbox flexGrow={1} width="100%" stickyScroll stickyStart="bottom">
          <box gap={1}>{children}</box>
        </scrollbox>
      )}

      <box marginTop={children ? undefined : "auto"} flexShrink={0}>
        <PromptArea
          onSubmit={onSubmit}
          disabled={promptAreaDisabled}
          quotaError={quotaError}
        />
      </box>

      <box
        width="100%"
        height={1}
        paddingLeft={1}
        flexShrink={0}
        flexDirection="row"
        justifyContent="space-between"
        gap={2}
      >
        <box flexDirection="row" alignItems="center" gap={2}>
          {isLoading ? (
            <>
              <spinner
                name="aesthetic"
                color={mode === Mode.Build ? colors.primary : colors.secondary}
              />

              {canInterrupt && (
                <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
                  Esc to interrupt
                </text>
              )}
            </>
          ) : canRegenerate ? (
            <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
              ^R &rsaquo; regenerate
            </text>
          ) : null}
        </box>

        <box marginLeft="auto" flexShrink={0} flexDirection="row" gap={1}>
          <text fg={colors.onBackground}>Tab</text>

          <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
            &rsaquo; modes
          </text>
        </box>
      </box>
    </box>
  );
}

export default SessionShell;
