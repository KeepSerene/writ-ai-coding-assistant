import { tool, type LanguageModelUsage } from "ai";
import { z } from "zod";
import type { SupportedChatModelId } from "./models";

export enum Mode {
  Build = "Build",
  Plan = "Plan",
}

export const modeSchema = z.enum(Mode);

export const toolInputSchemas = {
  bash: z.object({
    command: z.string().describe("The shell command to execute"),
    timeout: z.number().describe("Timeout in milliseconds").optional(),
  }),
  readFile: z.object({
    path: z.string().describe("Relative path to the file to read"),
  }),
  listDirectory: z.object({
    path: z
      .string()
      .describe(
        "Relative path to the directory to list (defaults to project root)",
      )
      .default("."),
  }),
  grep: z.object({
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
  glob: z.object({
    pattern: z
      .string()
      .describe("Glob pattern to match (e.g., '**/*.ts', 'src/**/*.tsx')"),
    path: z
      .string()
      .describe("Relative directory to search in (defaults to project root)")
      .default("."),
  }),
  writeFile: z.object({
    path: z.string().describe("Relative path to the file to write"),
    content: z.string().describe("The full content to write to the file"),
  }),
  editFile: z.object({
    path: z.string().describe("Relative path to the file to edit"),
    oldString: z
      .string()
      .describe(
        "The exact text to find and replace (must include surrounding lines to be unique)",
      ),
    newString: z.string().describe("The text to replace it with"),
  }),
} as const;

export const readOnlyToolContracts = {
  readFile: tool({
    description: `
      Read the contents of a file in the project. 
      ALWAYS use this to inspect a file before attempting to modify it with editFile or writeFile.
      Returns the file text, truncated if it exceeds the maximum context length.
    `.trim(),
    inputSchema: toolInputSchemas.readFile,
  }),
  listDirectory: tool({
    description: `
      Actively explore the project structure to gather context.
      Use this to understand directory layouts, verify file existence, or find specific files before reading them.
      Automatically skips hidden files/directories (like .git) and node_modules to save context.
      NEVER guess directory structures; ALWAYS use this tool to verify them.
    `.trim(),
    inputSchema: toolInputSchemas.listDirectory,
  }),
  grep: tool({
    description: `
      Actively search file contents using a regex pattern. 
      Use this to find function definitions, variable references, or gather context across the codebase quickly.
      Returns matching lines with file paths and line numbers. Automatically skips node_modules and hidden directories.
    `.trim(),
    inputSchema: toolInputSchemas.grep,
  }),
  glob: tool({
    description: `
      Actively search the codebase for files matching a glob pattern to gather context. 
      Never guess file paths; ALWAYS use this tool to find them exactly.
      Returns file paths relative to the project root. Automatically skips node_modules and hidden directories.
    `.trim(),
    inputSchema: toolInputSchemas.glob,
  }),
} as const;

export const buildToolContracts = {
  ...readOnlyToolContracts,
  bash: tool({
    description: `
      Execute a shell command in the project directory.
      SAFE uses: running tests, linting, building, starting dev servers, reading git status, inspecting files.
      NEVER run destructive commands (rm -rf, DROP DATABASE, git push --force, mass deletions) — those require explicit user confirmation first.
    `.trim(),
    inputSchema: toolInputSchemas.bash,
  }),
  writeFile: tool({
    description: `
      Create a brand-new file or completely overwrite an existing file from scratch. 
      Creates parent directories automatically if they don't exist.
      ONLY use this for new files or full rewrites. For surgical, targeted edits, ALWAYS use the editFile tool instead.
    `.trim(),
    inputSchema: toolInputSchemas.writeFile,
  }),
  editFile: tool({
    description: `
      Make a surgical, targeted edit to a file by replacing an exact string match. 
      The oldString MUST be perfectly identical to the existing file content and completely unique within that file. 
      Include enough surrounding lines in oldString to guarantee uniqueness. 
      Use this instead of rewriting entire files.
    `.trim(),
    inputSchema: toolInputSchemas.editFile,
  }),
} as const;

export type ToolContracts = typeof buildToolContracts;

export function getToolContracts(mode: Mode) {
  return mode === Mode.Build ? buildToolContracts : readOnlyToolContracts;
}

export interface AppMessageMetadata {
  model?: SupportedChatModelId;
  mode?: Mode;
  modelUsage?: LanguageModelUsage;
  durationMs?: number;
  isInterrupted?: boolean;
}
