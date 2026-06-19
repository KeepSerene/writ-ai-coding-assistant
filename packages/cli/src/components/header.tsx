import { Mode } from "@writ/shared";
import { useSessionCtx } from "../providers/session-context";
import { useTheme } from "../providers/theme";

function Header() {
  const {
    currentTheme: { colors },
  } = useTheme();
  const { mode } = useSessionCtx();

  return (
    <box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      gap={0}
    >
      <ascii-font
        font="tiny"
        text="Writ"
        color={mode === Mode.Build ? colors.primary : colors.secondary}
      />
    </box>
  );
}

export default Header;
