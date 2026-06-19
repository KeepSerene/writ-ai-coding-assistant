import { readFile, stat } from "node:fs/promises";

const MAX_FILE_CHARS = 24_000;
// 5MB limit to prevent V8 out-of-memory crashes on massive binaries/logs
const MAX_READABLE_BYTES = 5 * 1024 * 1024;

export default async function executeReadFile(
  resolvedPath: string,
  relativePath: string,
) {
  try {
    // Check file metadata BEFORE reading into memory
    const fileStat = await stat(resolvedPath);

    if (fileStat.isDirectory()) {
      return {
        error: `Path at ${relativePath} is a directory, not a file. Use listDirectory instead.`,
      };
    }

    if (fileStat.size > MAX_READABLE_BYTES) {
      return {
        error: `File at ${relativePath} is too large (${(fileStat.size / 1024 / 1024).toFixed(2)}MB). It might be a binary or minified bundle. Refusing to read.`,
      };
    }

    const content = await readFile(resolvedPath, "utf-8");

    // Truncate for the LLM context if necessary
    if (content.length > MAX_FILE_CHARS) {
      return {
        content: content.slice(0, MAX_FILE_CHARS),
        truncated: true,
        totalLength: content.length,
        message:
          "File was truncated to save context window. If you need the rest, use grep.",
      };
    }

    return { content };
  } catch (error) {
    console.error("Error in readFile tool:", error);

    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { error: `File not found at path: ${relativePath}` };
    }

    const errMsg = error instanceof Error ? error.message : String(error);

    return {
      error: `Failed to read file at ${relativePath}. System detail: ${errMsg}`,
    };
  }
}
