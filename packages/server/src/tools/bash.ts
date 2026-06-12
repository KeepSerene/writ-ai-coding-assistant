import { tool } from "ai";
import { spawn } from "node:child_process";
import z from "zod";

const MAX_OUTPUT_LENGTH = 20_000;
const DEFAULT_TIMEOUT_MS = 30_000;

export default function createBashTool(cwd: string) {
  return tool({
    description: `
      Execute a shell command in the project directory.
      SAFE uses: running tests, linting, building, starting dev servers, reading git status, inspecting files.
      NEVER run destructive commands (rm -rf, DROP DATABASE, git push --force, mass deletions) — those require explicit user confirmation first.
    `.trim(),
    inputSchema: z.object({
      command: z.string().describe("The shell command to execute"),
      timeout: z
        .number()
        .describe(`Timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})`)
        .default(DEFAULT_TIMEOUT_MS),
    }),
    execute: async ({ command, timeout }) => {
      return new Promise((resolve) => {
        try {
          const proc = spawn("bash", ["-c", command], {
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, TERM: "dumb" },
          });

          let stdout = "";
          let stderr = "";

          proc.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString("utf8");
          });

          proc.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
          });

          const timer = setTimeout(() => {
            proc.kill("SIGTERM");
          }, timeout);

          proc.on("close", (code) => {
            clearTimeout(timer);

            const truncate = (str: string) =>
              str.length > MAX_OUTPUT_LENGTH
                ? str.slice(0, MAX_OUTPUT_LENGTH) +
                  `\n... (truncated, ${str.length} total chars)`
                : str;

            resolve({
              stdout: truncate(stdout),
              stderr: truncate(stderr),
              exitCode: code ?? 1, // null means killed by signal; treat as failure
            });
          });

          proc.on("error", (err) => {
            clearTimeout(timer);
            resolve({ error: `Failed to spawn process: ${err.message}` });
          });
        } catch (error) {
          console.error("Error in bash tool:", error);
          const errMsg = error instanceof Error ? error.message : String(error);
          resolve({ error: `Failed to execute bash command: ${errMsg}` });
        }
      });
    },
  });
}
