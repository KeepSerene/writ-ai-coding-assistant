import { readFile, writeFile } from "node:fs/promises";

export default async function executeEditFile(
  path: string,
  resolvedPath: string,
  relativePath: string,
  oldString: string,
  newString: string,
) {
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
}
