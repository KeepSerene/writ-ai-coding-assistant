import { useTheme } from "../providers/theme";

function Header() {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      gap={0}
    >
      <ascii-font font="tiny" text="Writ" color={colors.primary} />
    </box>
  );
}

export default Header;
