import { tool } from "ai";
import { readdir } from "node:fs/promises";
import { relative, resolve, isAbsolute } from "node:path";
import z from "zod";

export default function createListDirectoryTool(cwd: string) {
  return tool({
    description: `
      Actively explore the project structure to gather context.
      Use this to understand directory layouts, verify file existence, or find specific files before reading them.
      Automatically skips hidden files/directories (like .git) and node_modules to save context.
      NEVER guess directory structures; ALWAYS use this tool to verify them.
    `.trim(),
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Relative path to the directory to list (defaults to project root)",
        )
        .default("."),
    }),
    execute: async ({ path }) => {
      const resolvedPath = resolve(cwd, path);
      let relativePath = relative(cwd, resolvedPath);

      if (relativePath === "") relativePath = ".";

      // Secure boundary check
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        return { error: "Path is outside the project directory" };
      }

      try {
        const entries = await readdir(resolvedPath, { withFileTypes: true });
        const result: { name: string; type: "file" | "directory" }[] = [];

        for (const entry of entries) {
          // Skip hidden files/directories and dependency folders
          if (entry.name.startsWith(".") || entry.name === "node_modules")
            continue;

          result.push({
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
          });
        }

        // Sort: directories first, then alphabetical
        result.sort((a, b) => {
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;

          return a.name.localeCompare(b.name);
        });

        return {
          path: relativePath,
          entries: result,
        };
      } catch (error) {
        console.error("Error in listDirectory tool:", error);

        const err = error as NodeJS.ErrnoException;

        if (err.code === "ENOENT") {
          return { error: `Directory not found at path: ${relativePath}` };
        }

        if (err.code === "ENOTDIR") {
          return {
            error: `Path is a file, not a directory: ${relativePath}. Use readFile instead.`,
          };
        }

        const errMsg = error instanceof Error ? error.message : String(error);

        return {
          error: `Failed to list directory at ${relativePath}. System detail: ${errMsg}`,
        };
      }
    },
  });
}
