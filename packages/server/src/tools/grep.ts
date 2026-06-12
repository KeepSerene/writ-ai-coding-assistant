import { tool } from "ai";
import { relative, resolve, isAbsolute } from "node:path";
import { spawn } from "node:child_process";
import z from "zod";

const MAX_MATCHES = 200;

export default function createGrepTool(cwd: string) {
  return tool({
    description: `
      Actively search file contents using a regex pattern. 
      Use this to find function definitions, variable references, or gather context across the codebase quickly.
      Returns matching lines with file paths and line numbers. Automatically skips node_modules and hidden directories.
    `.trim(),
    inputSchema: z.object({
      pattern: z.string().describe("Regex pattern to search for"),
      path: z
        .string()
        .describe("Relative directory to search in (defaults to project root)")
        .default("."),
      include: z
        .string()
        .optional()
        .describe("Glob pattern to filter files (e.g., '*.ts', '*.tsx')"),
    }),
    execute: async ({ pattern, path, include }) => {
      const resolvedPath = resolve(cwd, path);
      const relativePath = relative(cwd, resolvedPath);

      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        return { error: "Path is outside the project directory" };
      }

      return new Promise((resolveTool) => {
        try {
          const args = [
            "-rn",
            "--color=never",
            "--exclude-dir=node_modules",
            "--exclude-dir=.git",
            "-E", // Extended regex
          ];

          if (include) {
            args.push(`--include=${include}`);
          }

          args.push(pattern);

          // grep requires a path to search. If relativePath is empty (meaning project root), use "."
          args.push(relativePath || ".");

          const proc = spawn("grep", args, {
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
          });

          let stdout = "";
          let stderr = "";

          proc.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString("utf8");
          });

          proc.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
          });

          proc.on("close", (code) => {
            // grep exit codes: 0 = matches found, 1 = no matches, >1 = error
            if (code !== 0 && code !== 1) {
              resolveTool({
                error: `grep failed with exit code ${code}: ${stderr.trim()}`,
              });
              return;
            }

            if (!stdout.trim()) {
              resolveTool({ matches: [], message: "No matches found" });
              return;
            }

            const lines = stdout.trim().split("\n");
            const matches: { file: string; line: number; content: string }[] =
              [];
            let isTruncated = false;

            for (const line of lines) {
              if (matches.length >= MAX_MATCHES) {
                isTruncated = true;
                break;
              }

              // grep output format: path/to/file:lineNumber:content
              const match = line.match(/^(.+?):(\d+):(.*)$/);

              if (match) {
                let filePath = match[1]!;

                // If grep searched from root using ".", it prepends "./" to the paths
                if (filePath.startsWith("./")) {
                  filePath = filePath.slice(2);
                }

                matches.push({
                  file: filePath,
                  line: parseInt(match[2]!, 10),
                  content: match[3]!,
                });
              }
            }

            resolveTool({
              matches,
              ...(isTruncated
                ? { truncated: true, totalMatches: lines.length }
                : {}),
            });
          });

          proc.on("error", (error) => {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            resolveTool({
              error: `Failed to search file contents. The regex pattern "${pattern}" might be invalid, or grep is unavailable. System detail: ${errMsg}`,
            });
          });
        } catch (error) {
          console.error("Error in grep tool:", error);
          const errMsg = error instanceof Error ? error.message : String(error);

          resolveTool({
            error: `Failed to initialize search tool. System detail: ${errMsg}`,
          });
        }
      });
    },
  });
}
