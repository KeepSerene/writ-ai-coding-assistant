import { tool } from "ai";
import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve, isAbsolute } from "node:path";
import z from "zod";

export default function createEditFileTool(cwd: string) {
  return tool({
    description: `
      Make a surgical, targeted edit to a file by replacing an exact string match. 
      The oldString MUST be perfectly identical to the existing file content and completely unique within that file. 
      Include enough surrounding lines in oldString to guarantee uniqueness. 
      Use this instead of rewriting entire files.
    `.trim(),
    inputSchema: z.object({
      path: z.string().describe("Relative path to the file to edit"),
      oldString: z
        .string()
        .describe(
          "The exact text to find and replace (must include surrounding lines to be unique)",
        ),
      newString: z.string().describe("The text to replace it with"),
    }),
    execute: async ({ path, oldString, newString }) => {
      const resolvedPath = resolve(cwd, path);
      const relativePath = relative(cwd, resolvedPath);

      // Secure boundary check to prevent directory traversal attacks (e.g., ../../etc/passwd)
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        return { error: "Path is outside the project directory" };
      }

      try {
        const content = await readFile(resolvedPath, "utf-8");
        const occurrences = content.split(oldString).length - 1;

        if (occurrences === 0) {
          return {
            error:
              "oldString not found in file. Ensure exact match including whitespace.",
          };
        }

        if (occurrences > 1) {
          return {
            error: `oldString is ambiguous - found ${occurrences} matches. Provide more surrounding context to make it unique.`,
          };
        }

        const updated = content.replace(oldString, newString);

        await writeFile(resolvedPath, updated, "utf-8");

        return { success: true as const, path: relativePath };
      } catch (error) {
        console.error("Error in editFile tool:", error);

        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return { error: `File not found at path: ${path}` };
        }

        const errMsg = error instanceof Error ? error.message : String(error);

        return { error: `Failed to edit file: ${errMsg}` };
      }
    },
  });
}
