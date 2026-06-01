import type { CommandMenuItem } from "../components/command-menu/types";
import { COMMAND_MENU_ITEMS } from "./constants";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  CONFIG_DIR,
  DEFAULT_THEME,
  THEME_PREFERENCES_PATH,
  THEMES,
  type Theme,
  type ThemePreferences,
} from "./themes";

export function getFilteredCmdItems(query: string): CommandMenuItem[] {
  if (query.length === 0) return COMMAND_MENU_ITEMS;

  return COMMAND_MENU_ITEMS.filter((item) =>
    item.name.toLowerCase().startsWith(query.toLowerCase()),
  );
}

export function saveTheme(theme: Theme) {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(
      THEME_PREFERENCES_PATH,
      JSON.stringify(
        { themeName: theme.name } satisfies ThemePreferences,
        null,
        2,
      ),
      "utf8",
    );
  } catch (error) {
    console.error("Error saving theme:", error);
  }
}

export function getSavedTheme(): Theme {
  try {
    const preferences = JSON.parse(
      readFileSync(THEME_PREFERENCES_PATH, "utf8"),
    ) as Partial<ThemePreferences>;
    const savedTheme = THEMES.find(
      (theme) => theme.name === preferences.themeName,
    );

    return savedTheme ?? DEFAULT_THEME;
  } catch (error) {
    console.error("Error getting saved theme:", error);

    return DEFAULT_THEME;
  }
}
