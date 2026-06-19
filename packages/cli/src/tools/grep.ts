import { spawn } from "node:child_process";

const MAX_MATCHES = 50;
const MAX_OUTPUT_LENGTH = 50_000; // Safeguard against massive stdout memory leaks

/**
 * macOS (BSD) grep does not support -P (PCRE). Both Linux and macOS support -E (POSIX).
 * Since LLMs heavily rely on PCRE shortcuts (\s, \d, \w), we must secretly transpile
 * them to POSIX character classes before passing them to grep -E.
 */
function polyfillPCREtoPOSIX(pattern: string): string {
  return pattern
    .replace(/\\d/g, "[0-9]")
    .replace(/\\D/g, "[^0-9]")
    .replace(/\\s/g, "[[:space:]]")
    .replace(/\\S/g, "[^[:space:]]")
    .replace(/\\w/g, "[a-zA-Z0-9_]")
    .replace(/\\W/g, "[^a-zA-Z0-9_]");
}

export default async function executeGrep(
  cwd: string,
  relativePath: string,
  pattern: string,
  include?: string,
) {
  return new Promise((resolveTool) => {
    try {
      const args = [
        "-rn",
        "--color=never",
        "--exclude-dir=node_modules",
        "--exclude-dir=.git",
        "-E", // Cross-platform POSIX regex
      ];

      // Handle LLM shell-brace habits (e.g., "*.{ts,tsx}" or "*.ts, *.tsx")
      if (include) {
        const braceMatch = include.match(/^(?:\*\.)?\{([^}]+)\}$/);

        if (braceMatch && braceMatch[1]) {
          const extensions = braceMatch[1].split(",");

          for (const ext of extensions) {
            args.push(`--include=*.${ext.trim()}`);
          }
        } else {
          const parts = include.split(",");

          for (const part of parts) {
            const trimmed = part.trim();

            if (trimmed) args.push(`--include=${trimmed}`);
          }
        }
      }

      // Explicitly tell grep the next argument is the pattern
      const safePattern = polyfillPCREtoPOSIX(pattern);
      args.push("-e", safePattern);

      // grep requires a path to search. If relativePath is empty (meaning project root), use "."
      args.push(relativePath || ".");

      const proc = spawn("grep", args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let killed = false;

      proc.stdout.on("data", (chunk: Buffer) => {
        if (killed) return;
        stdout += chunk.toString("utf8");

        // Protect Node from OOM if the LLM writes an overly broad regex
        if (stdout.length > MAX_OUTPUT_LENGTH) {
          killed = true;
          proc.kill("SIGTERM");
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        if (!killed) stderr += chunk.toString("utf8");
      });

      proc.on("close", (code) => {
        // grep exit codes: 0 = matches found, 1 = no matches, >1 = error
        // If code > 1, only fail if we ALSO got no standard output.
        // (Grep returns >1 for simple warnings like an unreadable permission on a single subfolder)
        if (code !== 0 && code !== 1 && !stdout.trim()) {
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
        const matches: { file: string; line: number; content: string }[] = [];
        let isTruncated = killed;

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
        // Handle environments where grep isn't installed (e.g., bare Windows CMD)
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          resolveTool({
            error: `The 'grep' command is not available on this host system. If you are on Windows, ensure you are running this within a Unix-like environment (like Git Bash or WSL).`,
          });

          return;
        }

        const errMsg = error instanceof Error ? error.message : String(error);
        resolveTool({
          error: `Failed to search file contents. System detail: ${errMsg}`,
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
}
