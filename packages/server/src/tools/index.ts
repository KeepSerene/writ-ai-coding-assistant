import type { Mode } from "@writ/db/enums";
import createReadFileTool from "./read-file";
import createListDirectoryTool from "./list-directory";
import createGrepTool from "./grep";
import createGlobTool from "./glob";
import createWriteFileTool from "./write-file";
import createEditFileTool from "./edit-file";
import createBashTool from "./bash";

export default function createTools(cwd: string, mode: Mode) {
  const readOnlyTools = {
    readFile: createReadFileTool(cwd),
    listDirectory: createListDirectoryTool(cwd),
    grep: createGrepTool(cwd),
    glob: createGlobTool(cwd),
  };

  if (mode === "PLAN") {
    return readOnlyTools;
  }

  return {
    ...readOnlyTools,
    writeFile: createWriteFileTool(cwd),
    editFile: createEditFileTool(cwd),
    bash: createBashTool(cwd),
  };
}
