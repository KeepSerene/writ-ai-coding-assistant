import type { CommandMenuItem } from "../components/command-menu/types";
import { COMMAND_MENU_ITEMS } from "./constants";

export function getFilteredCmdItems(query: string): CommandMenuItem[] {
  if (query.length === 0) return COMMAND_MENU_ITEMS;

  return COMMAND_MENU_ITEMS.filter((item) =>
    item.name.toLowerCase().startsWith(query.toLowerCase()),
  );
}
