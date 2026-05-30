import type { KeyBinding } from "@opentui/core";
import type { CommandMenuItem } from "../components/command-menu/types";

export const EMPTY_BORDER_CONFIG = {
  topLeft: "",
  bottomLeft: "",
  vertical: "",
  topRight: "",
  bottomRight: "",
  horizontal: " ",
  bottomT: "",
  topT: "",
  cross: "",
  leftT: "",
  rightT: "",
};

export const SPLIT_BORDER_CONFIG = {
  border: ["left" as const, "right" as const],
  customBorderChars: {
    ...EMPTY_BORDER_CONFIG,
    vertical: "┃",
  },
};

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "return", shift: true, action: "newline" },
  { name: "enter", shift: true, action: "newline" },
  { name: "return", action: "submit" },
  { name: "enter", action: "submit" },
];

export const COMMAND_MENU_ITEMS: CommandMenuItem[] = [
  {
    name: "new",
    description: "Start a new conversation",
    command: "/new",
  },
  {
    name: "agents",
    description: "Switch agents",
    command: "/agents",
  },
  {
    name: "models",
    description: "Select an AI model for generation",
    command: "/models",
  },
  {
    name: "themes",
    description: "Change color theme",
    command: "/themes",
  },
  {
    name: "login",
    description: "Sign in with your browser",
    command: "/login",
  },
  {
    name: "logout",
    description: "Sign out of your account",
    command: "/logout",
  },
  {
    name: "upgrade",
    description: "Buy more credits",
    command: "/upgrade",
  },
  {
    name: "usage",
    description: "Open billing portal on your browser",
    command: "/usage",
  },
  {
    name: "exit",
    description: "Quit the application",
    command: "/exit",
    action: (ctx) => ctx.exit(),
  },
];

export const MAX_VISIBLE_COMMAND_ITEMS = 8;

export const COMMAND_COL_WIDTH =
  Math.max(...COMMAND_MENU_ITEMS.map((item) => item.name.length)) + 4;
