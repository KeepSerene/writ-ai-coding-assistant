import { tool } from "ai";
import { readFile, stat } from "node:fs/promises";
import { relative, resolve, isAbsolute } from "node:path";
import z from "zod";

const MAX_FILE_CHARS = 24_000;
// 5MB limit to prevent V8 out-of-memory crashes on massive binaries/logs
const MAX_READABLE_BYTES = 5 * 1024 * 1024;

export default function createReadFileTool(cwd: string) {
  return tool({
    description: `
      Read the contents of a file in the project. 
      ALWAYS use this to inspect a file before attempting to modify it with editFile or writeFile.
      Returns the file text, truncated if it exceeds the maximum context length.
    `.trim(),
    inputSchema: z.object({
      path: z.string().describe("Relative path to the file to read"),
    }),
    execute: async ({ path }) => {
      const resolvedPath = resolve(cwd, path);
      const relativePath = relative(cwd, resolvedPath);

      // Secure boundary check
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        return { error: "Path is outside the project directory" };
      }

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
    },
  });
}
