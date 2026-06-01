import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Theme } from "../../lib/themes";
import { getSavedTheme, saveTheme } from "../../lib/utils";

interface ThemeContextValue {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getSavedTheme);

  const setTheme = useCallback(
    (theme: Theme) => {
      setCurrentTheme(theme);
      saveTheme(theme);
    },
    [setCurrentTheme],
  );

  const value: ThemeContextValue = {
    currentTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
