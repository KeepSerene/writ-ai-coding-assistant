import "opentui-spinner/react";
import type { ReactNode } from "react";
import PromptArea from "./prompt-area";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { useSessionCtx } from "../providers/session-context";
import { Mode } from "@writ/db/enums";

interface SessionShellProps {
  children?: ReactNode;
  onSubmit: (prompt: string) => void;
  promptAreaDisabled?: boolean;
  isLoading?: boolean;
  canInterrupt?: boolean;
}

function SessionShell({
  children,
  onSubmit,
  promptAreaDisabled = false,
  isLoading = false,
  canInterrupt = false,
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
      {children && (
        <scrollbox flexGrow={1} width="100%" stickyScroll stickyStart="bottom">
          <box gap={1}>{children}</box>
        </scrollbox>
      )}

      <box marginTop={children ? undefined : "auto"} flexShrink={0}>
        <PromptArea onSubmit={onSubmit} disabled={promptAreaDisabled} />
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
        {isLoading && (
          <box flexDirection="row" alignItems="center" gap={2}>
            <spinner
              name="aesthetic"
              color={mode === Mode.BUILD ? colors.primary : colors.secondary}
            />

            {canInterrupt && (
              <text fg={colors.onBackground}>Esc to interrupt</text>
            )}
          </box>
        )}

        <box marginLeft="auto" flexShrink={0} flexDirection="row" gap={1}>
          <text fg={colors.onBackground}>Tab</text>
          <text attributes={TextAttributes.DIM} fg={colors.onBackground}>
            agents
          </text>
        </box>
      </box>
    </box>
  );
}

export default SessionShell;
