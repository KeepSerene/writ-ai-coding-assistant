import { tool } from "ai";
import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve, isAbsolute, dirname } from "node:path";
import z from "zod";

export default function createWriteFileTool(cwd: string) {
  return tool({
    description: `
      Create a brand-new file or completely overwrite an existing file from scratch. 
      Creates parent directories automatically if they don't exist.
      ONLY use this for new files or full rewrites. For surgical, targeted edits, ALWAYS use the editFile tool instead.
    `.trim(),
    inputSchema: z.object({
      path: z.string().describe("Relative path to the file to write"),
      content: z.string().describe("The full content to write to the file"),
    }),
    execute: async ({ path, content }) => {
      const resolvedPath = resolve(cwd, path);
      const relativePath = relative(cwd, resolvedPath);

      // Secure boundary check to prevent directory traversal attacks (e.g., ../../etc/passwd)
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        return { error: "Path is outside the project directory" };
      }

      try {
        await mkdir(dirname(resolvedPath), { recursive: true });
        await writeFile(resolvedPath, content, "utf-8");

        return {
          success: true as const,
          path: relativePath,
          bytesWritten: Buffer.byteLength(content, "utf-8"),
        };
      } catch (error) {
        console.error("Error in writeFile tool:", error);
        const errMsg = error instanceof Error ? error.message : String(error);

        return {
          error: `Failed to write file at ${relativePath}. System detail: ${errMsg}`,
        };
      }
    },
  });
}
