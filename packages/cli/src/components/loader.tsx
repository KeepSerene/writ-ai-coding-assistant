import "opentui-spinner/react";
import { useTheme } from "../providers/theme";

export default function Loader() {
  const {
    currentTheme: { colors },
  } = useTheme();

  return <spinner name="aesthetic" color={colors.primary} />;
}
