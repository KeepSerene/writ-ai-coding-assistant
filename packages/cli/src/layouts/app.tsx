import type { ReactNode } from "react";
import { useTheme } from "../providers/theme";

function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box
      flexGrow={1}
      width="100%"
      height="100%"
      backgroundColor={colors.background}
    >
      {children}
    </box>
  );
}

export default AppLayout;
