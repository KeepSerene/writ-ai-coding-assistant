import type { KeyBinding } from "@opentui/core";
import type { CommandMenuItem } from "../components/command-menu/types";
import ThemeDialog from "../components/dialogs/theme";

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
} as const;

export const SPLIT_BORDER_CONFIG = {
  border: ["left" as const, "right" as const],
  customBorderChars: {
    ...EMPTY_BORDER_CONFIG,
    vertical: "┃",
  },
} as const;

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "return", shift: true, action: "newline" },
  { name: "enter", shift: true, action: "newline" },
  { name: "return", action: "submit" },
  { name: "enter", action: "submit" },
] as const;

export const COMMAND_MENU_ITEMS: CommandMenuItem[] = [
  {
    name: "new",
    description: "Start a new conversation",
    command: "/new",
    action: (ctx) => {
      ctx.toast.show({ message: "Starting new conversation..." });
    },
  },
  {
    name: "agents",
    description: "Switch agents",
    command: "/agents",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Mode",
        children: <text>Agent selection coming soon...</text>,
      });
    },
  },
  {
    name: "models",
    description: "Select an AI model for generation",
    command: "/models",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Model",
        children: <text>Model selection coming soon...</text>,
      });
    },
  },
  {
    name: "sessions",
    description: "Browse past sessions",
    command: "/sessions",
    action: (ctx) => {
      ctx.toast.show({ message: "Loading sessions..." });
    },
  },
  {
    name: "themes",
    description: "Change color theme",
    command: "/themes",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Pick Theme",
        children: <ThemeDialog />,
      });
    },
  },
  {
    name: "login",
    description: "Sign in with your browser",
    command: "/login",
    action: (ctx) => {
      ctx.toast.show({ message: "Opening browser to sign in..." });
    },
  },
  {
    name: "logout",
    description: "Sign out of your account",
    command: "/logout",
    action: (ctx) => {
      ctx.toast.show({
        variant: "success",
        message: "Signed out successfully!",
      });
    },
  },
  {
    name: "upgrade",
    description: "Buy more credits",
    command: "/upgrade",
    action: (ctx) => {
      ctx.toast.show({ message: "Opening credits checkout..." });
    },
  },
  {
    name: "usage",
    description: "Open billing portal on your browser",
    command: "/usage",
    action: (ctx) => {
      ctx.toast.show({ message: "Opening billing portal..." });
    },
  },
  {
    name: "exit",
    description: "Quit the application",
    command: "/exit",
    action: (ctx) => ctx.exit(),
  },
] as const;

export const MAX_VISIBLE_COMMAND_ITEMS = 8 as const;

export const COMMAND_COL_WIDTH =
  Math.max(...COMMAND_MENU_ITEMS.map((item) => item.name.length)) + 4;

export const DEFAULT_TOAST_DURATION = 3000 as const;

export const MAX_VISIBLE_FILTER_LIST_ITEMS = 6 as const;
