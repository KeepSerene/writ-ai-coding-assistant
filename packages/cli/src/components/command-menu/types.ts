import type { DialogContextValue } from "../../providers/dialog";
import type { ToastContextValue } from "../../providers/toast";

export interface CommandContext {
  exit: () => void;
  toast: ToastContextValue;
  dialog: DialogContextValue;
}

export interface CommandMenuItem {
  name: string;
  description: string;
  command: string;
  action?: (ctx: CommandContext) => void | Promise<void>;
}
