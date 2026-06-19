import type { CommandMenuItem } from "../components/command-menu/types";
import {
  COMMAND_MENU_ITEMS,
  CWD,
  MAX_MENTION_FALLBACK_CANDIDATES,
  MENTION_SKIP_DIRS,
  VALID_MENTION_QUERY_CHAR_REGEX,
} from "./constants";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  CONFIG_DIR,
  DEFAULT_THEME,
  THEME_PREFERENCES_PATH,
  THEMES,
  type Theme,
  type ThemePreferences,
} from "./themes";
import { SUPPORTED_CHAT_MODELS, type SupportedChatModelId } from "@writ/shared";
import { isAbsolute, relative, resolve } from "node:path";
import { readdir } from "node:fs/promises";
import type {
  ToolUseBlock,
  UIMessageBlock,
} from "../components/chat-messages/agent-response";
import { PortfolioQuotaError } from "../hooks/use-app-chat";

export interface ActiveCommandContext {
  query: string; // text after the "/"
  startIndex: number; // absolute index of the "/"
  endIndex: number; // end of the token
}

export function findActiveCommand(
  text: string,
  cursorOffset: number,
): ActiveCommandContext | null {
  const safeOffset = Math.max(0, Math.min(cursorOffset, text.length));

  // Isolate the word the cursor is currently touching
  let start = safeOffset,
    end = safeOffset;

  while (start > 0 && !/\s/.test(text[start - 1]!)) start--;

  while (end < text.length && !/\s/.test(text[end]!)) end++;

  const token = text.slice(start, end);
  const relativeCursor = safeOffset - start;

  // The "/" must be the very first character of the word.
  // If it's anywhere else (e.g. "src/components"), it's a path — ignore it.
  if (token[0] !== "/") return null;

  // Cursor must be positioned after the "/"
  if (relativeCursor <= 0) return null;

  const query = token.slice(1);

  // A second "/" means it's a path fragment, not a command
  if (query.includes("/")) return null;

  return { query, startIndex: start, endIndex: end };
}

export function getFilteredCmdItems(
  items: CommandMenuItem[],
  query: string,
): CommandMenuItem[] {
  if (!query) return items;

  const lowered = query.toLowerCase();

  return items.filter(
    (item) =>
      item.name.toLowerCase().startsWith(lowered) ||
      item.command.toLowerCase().includes(lowered),
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

export function isToolUseBlock(block: UIMessageBlock): block is ToolUseBlock {
  return block.type === "dynamic-tool" || block.type.startsWith("tool-");
}

export function formatToolArguments(toolUseBlock: ToolUseBlock): string {
  if (!("input" in toolUseBlock) || toolUseBlock.input === null) {
    return "";
  }

  if (typeof toolUseBlock.input !== "object") return String(toolUseBlock.input);

  const entries = Object.entries(toolUseBlock.input as Record<string, unknown>);

  if (entries.length === 0) return "";

  return entries
    .map(([key, value]) => {
      const isString = typeof value === "string";
      const raw = isString ? (value as string) : JSON.stringify(value);
      // Collapse newlines and truncate long values for single-line TUI display
      const cleaned = raw.replace(/\r?\n|\r/g, " ↵ ");
      const display =
        cleaned.length > 40 ? `${cleaned.slice(0, 37)}...` : cleaned;

      return `${key}: ${display}`;
    })
    .join("  •  ");
}

export function extractErrorMessage(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as Record<string, unknown>;

    if (typeof parsed["error"] === "string") return parsed["error"];
    if (typeof parsed["message"] === "string") return parsed["message"];
  } catch {
    // Not JSON — return message as-is
  }

  return error.message;
}

export function getModelLabel(modelId: SupportedChatModelId): string {
  return SUPPORTED_CHAT_MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}

export function isWithinCWD(targetPath: string): boolean {
  const abs = isAbsolute(targetPath) ? targetPath : resolve(CWD, targetPath);
  const rel = relative(CWD, abs); // "src/comp" or "../../etc" etc.

  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function isValidMentionQueryChar(char: string) {
  return VALID_MENTION_QUERY_CHAR_REGEX.test(char);
}

export interface ActiveMentionContext {
  query: string; // The text typed after the '@' (e.g., "src/comp")
  startIndex: number; // Absolute position in the full text where the '@' starts
  endIndex: number; // Absolute position in the full text where the word ends
}

export function findActiveMention(
  text: string,
  cursorOffset: number,
): ActiveMentionContext | null {
  const safeOffset = Math.max(0, Math.min(cursorOffset, text.length));

  // Expand outwards to isolate the exact word the cursor is currently touching
  let start = safeOffset,
    end = safeOffset;

  while (start > 0 && !/\s/.test(text[start - 1]!)) {
    start -= 1;
  }

  while (end < text.length && !/\s/.test(text[end]!)) {
    end += 1;
  }

  const token = text.slice(start, end);
  const relativeCursor = safeOffset - start;

  // Find the closest '@' symbol looking backwards from the cursor
  const mentionStart = token.lastIndexOf("@", relativeCursor);

  if (mentionStart === -1) return null; // No '@' found before the cursor

  // Prevent false positives (e.g., email addresses like "user@domain.com")
  // An '@' must be at the very start of the word, or preceded by a non-query char
  const prevChar = token[mentionStart - 1];

  if (prevChar && isValidMentionQueryChar(prevChar)) return null;

  // Ensure the cursor is actually positioned after the '@' symbol
  // If relativeCursor < mentionStart, they are typing before the '@'
  if (relativeCursor <= mentionStart) return null;

  // Return the query string (everything after the '@' up to the end of the word)
  // and the absolute positions so the UI knows exactly what text to replace later
  return {
    query: token.slice(mentionStart + 1), // Extract the string after the '@'
    startIndex: start + mentionStart, // Absolute index of the '@'
    endIndex: end, // Absolute index of the end of the word
  };
}

export interface MentionCandidate {
  type: "file" | "directory";
  path: string;
}

export async function getMentionCandidates(
  query: string,
): Promise<MentionCandidate[]> {
  // Normalize: strip leading "./" so "./src" and "src" are treated identically
  const normalized = query.startsWith("./") ? query.slice(2) : query;

  // Reject absolute paths — only project-relative references are allowed
  if (normalized.startsWith("/")) return [];

  // Split the query into the folder to scan (dirPart) and the partial
  // filename to filter by (namePrefix). A trailing slash means "list
  // everything inside this folder" with no prefix filter.
  const hasTrailingSlash = normalized.endsWith("/");
  const lastSlashIndex = hasTrailingSlash
    ? normalized.length - 1
    : normalized.lastIndexOf("/");

  const dirPart = hasTrailingSlash
    ? normalized.slice(0, -1)
    : lastSlashIndex === -1
      ? ""
      : normalized.slice(0, lastSlashIndex);

  const namePrefix = hasTrailingSlash
    ? ""
    : lastSlashIndex === -1
      ? normalized
      : normalized.slice(lastSlashIndex + 1);

  const absoluteDir = resolve(CWD, dirPart || ".");

  // Security: block path traversal (e.g. "@../../etc/passwd")
  if (!isWithinCWD(absoluteDir)) return [];

  const lowerCased = namePrefix.toLowerCase();
  // Only surface hidden entries (dotfiles) when the user explicitly types a "."
  const shouldShowHiddenEntries = namePrefix.startsWith(".");

  try {
    // Phase 1: direct scan of the target directory
    const entries = await readdir(absoluteDir, { withFileTypes: true });

    const directMatches = entries
      .filter(
        (entry) =>
          !(entry.isDirectory() && MENTION_SKIP_DIRS.has(entry.name)) &&
          (shouldShowHiddenEntries || !entry.name.startsWith(".")) &&
          (lowerCased === "" ||
            entry.name.toLowerCase().startsWith(lowerCased)),
      )
      // Directories first, then alphabetical within each group
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      })
      .map((entry) => {
        const type: MentionCandidate["type"] = entry.isDirectory()
          ? "directory"
          : "file";
        const entryPath = dirPart ? `${dirPart}/${entry.name}` : entry.name;

        // Append trailing slash to directories so tab-completing into them works
        return {
          type,
          path: type === "directory" ? `${entryPath}/` : entryPath,
        };
      });

    // Return early if: we found something, the user already drilled into a
    // subdir (further recursion won't help), or the query was empty
    if (directMatches.length > 0 || dirPart !== "" || namePrefix === "") {
      return directMatches;
    }

    // Phase 2: recursive fallback walk from CWD
    // Only reached when the user typed a bare name (e.g. "@index") and
    // nothing matched directly in CWD.
    const fallbackMatches: MentionCandidate[] = [];

    const visit = async (absDir: string, relDir: string): Promise<void> => {
      if (fallbackMatches.length >= MAX_MENTION_FALLBACK_CANDIDATES) return;

      const entries = await readdir(absDir, { withFileTypes: true });
      const subdirs: Array<{ abs: string; rel: string }> = [];

      for (const entry of entries) {
        if (fallbackMatches.length >= MAX_MENTION_FALLBACK_CANDIDATES) break;
        if (!shouldShowHiddenEntries && entry.name.startsWith(".")) continue;
        // Skip known large/irrelevant directories to keep the walk fast
        if (entry.isDirectory() && MENTION_SKIP_DIRS.has(entry.name)) continue;

        const type: MentionCandidate["type"] = entry.isDirectory()
          ? "directory"
          : "file";
        const entryRel = relDir ? `${relDir}/${entry.name}` : entry.name;

        if (entry.name.toLowerCase().startsWith(lowerCased)) {
          fallbackMatches.push({
            type,
            path: type === "directory" ? `${entryRel}/` : entryRel,
          });
        }

        // Collect subdirectories; don't recurse yet so we can go parallel below
        if (entry.isDirectory()) {
          subdirs.push({ abs: resolve(absDir, entry.name), rel: entryRel });
        }
      }

      // Recurse into all subdirectories in parallel instead of sequentially.
      // Guard with the cap before spawning any promises to avoid wasteful I/O.
      if (fallbackMatches.length < MAX_MENTION_FALLBACK_CANDIDATES) {
        await Promise.all(subdirs.map(({ abs, rel }) => visit(abs, rel)));
      }
    };

    await visit(CWD, "");

    // Sort by full relative path for a stable, predictable ordering
    return fallbackMatches.sort((left, right) =>
      left.path.localeCompare(right.path),
    );
  } catch (error) {
    console.error("Failed to fetch mention candidates:", error);

    return [];
  }
}

export function resolveSafeProjectPath(targetPath: string) {
  if (!isWithinCWD(targetPath)) {
    throw new Error("Path is outside the project directory");
  }

  const resolvedPath = isAbsolute(targetPath)
    ? targetPath
    : resolve(CWD, targetPath);
  const relativePath = relative(CWD, resolvedPath) || ".";

  return {
    cwd: CWD,
    resolvedPath,
    relativePath,
  };
}

export function isPortfolioQuotaError(err: Error): err is PortfolioQuotaError {
  return (
    err instanceof PortfolioQuotaError || err.name === "PortfolioQuotaError"
  );
}
