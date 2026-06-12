import { tool } from "ai";
import { relative, resolve, isAbsolute } from "node:path";
import { glob } from "node:fs/promises";
import z from "zod";

const MAX_RESULTS = 200;

export default function createGlobTool(cwd: string) {
  return tool({
    description: `
      Actively search the codebase for files matching a glob pattern to gather context. 
      Never guess file paths; ALWAYS use this tool to find them exactly.
      Returns file paths relative to the project root. Automatically skips node_modules and hidden directories.
    `.trim(),
    inputSchema: z.object({
      pattern: z
        .string()
        .describe("Glob pattern to match (e.g., '**/*.ts', 'src/**/*.tsx')"),
      path: z
        .string()
        .describe("Relative directory to search in (defaults to project root)")
        .default("."),
    }),
    execute: async ({ pattern, path }) => {
      const resolvedPath = resolve(cwd, path);
      const relativePath = relative(cwd, resolvedPath);

      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        return { error: "Path is outside the project directory" };
      }

      try {
        const files: string[] = [];
        let isTruncated = false;

        const stream = glob(pattern, {
          cwd: resolvedPath,
          exclude: (p: string) =>
            p.includes("node_modules") || p.includes(".git"),
        });

        for await (const match of stream) {
          if (files.length >= MAX_RESULTS) {
            isTruncated = true;
            break;
          }

          const absoluteMatch = resolve(resolvedPath, match);
          files.push(relative(cwd, absoluteMatch));
        }

        files.sort();

        return {
          files,
          ...(isTruncated ? { truncated: true } : {}),
        };
      } catch (error) {
        console.error("Error in glob tool:", error);
        const errMsg = error instanceof Error ? error.message : String(error);

        return {
          error: `Failed to search files: ${errMsg}`,
        };
      }
    },
  });
}
