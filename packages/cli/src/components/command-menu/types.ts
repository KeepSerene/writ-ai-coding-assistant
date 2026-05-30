export interface CommandContext {
  exit: () => void;
}

export interface CommandMenuItem {
  name: string;
  description: string;
  command: string;
  action?: (ctx: CommandContext) => void | Promise<void>;
}
