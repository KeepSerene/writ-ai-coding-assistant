import type { Mode } from "@writ/db/enums";
import type { DialogContextValue } from "../../providers/dialog";
import type { ToastContextValue } from "../../providers/toast";
import type { SupportedChatModelId } from "@writ/shared";

export interface CommandContext {
  exit: () => void;
  toast: ToastContextValue;
  dialog: DialogContextValue;
  navigate: (path: string) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  model: SupportedChatModelId;
  setModel: (model: SupportedChatModelId) => void;
}

export interface CommandMenuItem {
  name: string;
  description: string;
  command: string;
  action?: (ctx: CommandContext) => void | Promise<void>;
}
