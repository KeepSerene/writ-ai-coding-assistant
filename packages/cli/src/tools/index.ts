import { Mode, toolInputSchemas } from "@writ/shared";
import { resolveSafeProjectPath } from "../lib/utils";
import executeReadFile from "./read-file";
import executeListDirectory from "./list-directory";
import executeGlob from "./glob";
import executeGrep from "./grep";
import executeWriteFile from "./write-file";
import executeEditFile from "./edit-file";
import executeBash from "./bash";
import { CWD } from "../lib/constants";

export default async function executeTool(
  toolName: string,
  input: unknown,
  mode: Mode,
) {
  if (
    ![
      "bash",
      "readFile",
      "listDirectory",
      "grep",
      "glob",
      "editFile",
      "writeFile",
    ].includes(toolName)
  ) {
    throw new Error(`Tool "${toolName}" is not supported`);
  }

  if (
    mode === Mode.Plan &&
    !["readFile", "listDirectory", "grep", "glob"].includes(toolName)
  ) {
    throw new Error(`Tool "${toolName}" is not available in PLAN mode`);
  }

  switch (toolName) {
    case "bash": {
      const { command, timeout } = toolInputSchemas.bash.parse(input);

      return await executeBash(CWD, command, timeout);
    }
    case "readFile": {
      const { path } = toolInputSchemas.readFile.parse(input);
      const { resolvedPath, relativePath } = resolveSafeProjectPath(path);

      return await executeReadFile(resolvedPath, relativePath);
    }
    case "listDirectory": {
      const { path } = toolInputSchemas.listDirectory.parse(input);
      const { resolvedPath, relativePath } = resolveSafeProjectPath(path);

      return await executeListDirectory(resolvedPath, relativePath);
    }
    case "glob": {
      const { path, pattern } = toolInputSchemas.glob.parse(input);
      const { cwd, resolvedPath } = resolveSafeProjectPath(path);

      return await executeGlob(pattern, cwd, resolvedPath);
    }
    case "grep": {
      const { path, pattern, include } = toolInputSchemas.grep.parse(input);
      const { cwd, relativePath } = resolveSafeProjectPath(path);

      return await executeGrep(cwd, relativePath, pattern, include);
    }
    case "editFile": {
      const { path, oldString, newString } =
        toolInputSchemas.editFile.parse(input);
      const { resolvedPath, relativePath } = resolveSafeProjectPath(path);

      return await executeEditFile(
        path,
        resolvedPath,
        relativePath,
        oldString,
        newString,
      );
    }
    case "writeFile": {
      const { path, content } = toolInputSchemas.writeFile.parse(input);
      const { resolvedPath, relativePath } = resolveSafeProjectPath(path);

      return await executeWriteFile(resolvedPath, relativePath, content);
    }
    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }
}
