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
import type { UIMessageToolUseBlock } from "../hooks/use-chat";
import { SUPPORTED_CHAT_MODELS, type SupportedChatModelId } from "@writ/shared";

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

interface CustomErrorResponse {
  json: () => Promise<unknown>;
  status: number;
  statusText: string;
}

export async function getErrorMessage(response: CustomErrorResponse) {
  try {
    const data = (await response.json()) as { error?: string };

    if (typeof data.error === "string" && data.error.length > 0) {
      return data.error;
    }
  } catch (error) {
    console.error("Failed to get error message:", error);
  } finally {
    return (
      response.statusText || `Request failed with status ${response.status}`
    );
  }
}

/**
 * Formats a tool name from camelCase/kebab-case/snake_case to Title Case with spaces.
 *
 * @example
 * formatToolName("readFile")      // "Read File"
 * formatToolName("grep")          // "Grep"
 * formatToolName("edit_file")     // "Edit File"
 * formatToolName("list-directory")// "List Directory"
 * formatToolName("runCommand")    // "Run Command"
 */
export function formatToolName(name: string): string {
  // Split on capital letters, underscores, or hyphens
  const words = name
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase -> space before caps
    .replace(/[_-]/g, " ") // snake_case or kebab-case
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // Capitalize first letter of each word, keep rest as lowercase
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Example output: path: "/src/index.ts"  •  encoding: "utf-8"
export function formatToolArguments(
  toolUseBlock: UIMessageToolUseBlock,
): string {
  const entries = Object.entries(toolUseBlock.input);

  if (entries.length === 0) return "No arguments";

  return entries
    .map(([key, value]) => {
      const isString = typeof value === "string";
      let stringified = JSON.stringify(value);

      if (stringified && stringified.length > 50) {
        if (isString) {
          const rawString = value as string;
          const cleaned = rawString.replace(/\r?\n/g, " ↵ ");
          const truncated = `${cleaned.slice(0, 45)}...`;
          stringified = `"${truncated}"`;
        } else {
          stringified = `${stringified.slice(0, 47)}...`;
        }
      }

      return `${key}: ${stringified}`;
    })
    .join("  •  ");
}

export function getModelLabel(modelId: SupportedChatModelId): string {
  return SUPPORTED_CHAT_MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}
