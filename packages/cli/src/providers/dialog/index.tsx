import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { DialogConfig } from "./types";
import { useInputStack } from "../input-stack";
import Dialog from "./dialog";

export interface DialogContextValue {
  open: (config: DialogConfig) => void;
  close: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }

  return context;
}

export function DialogProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null);
  const { pushLayer, popLayer } = useInputStack();

  const close = useCallback(() => {
    setDialogConfig(null);
    popLayer("dialog");
  }, [setDialogConfig, popLayer]);

  const open = useCallback(
    (config: DialogConfig) => {
      setDialogConfig(config);
      pushLayer("dialog", () => {
        close();

        return true;
      });
    },
    [setDialogConfig, pushLayer, close],
  );

  return (
    <DialogContext.Provider value={{ open, close }}>
      {children}

      <Dialog config={dialogConfig} close={close} />
    </DialogContext.Provider>
  );
}
