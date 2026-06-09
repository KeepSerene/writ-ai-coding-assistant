import { Mode } from "@writ/db/enums";
import { DEFAULT_CHAT_MODEL_ID, type SupportedChatModelId } from "@writ/shared";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface SessionCtxContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  model: SupportedChatModelId;
  setModel: (model: SupportedChatModelId) => void;
}

const SessionCtxContext = createContext<SessionCtxContextValue | null>(null);

export function useSessionCtx(): SessionCtxContextValue {
  const context = useContext(SessionCtxContext);

  if (!context) {
    throw new Error("useSessionCtx must be used within a SessionCtxProvider");
  }

  return context;
}

export function SessionCtxProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [mode, setMode] = useState<Mode>(Mode.BUILD);
  const [model, setModel] = useState<SupportedChatModelId>(
    DEFAULT_CHAT_MODEL_ID,
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === Mode.BUILD ? Mode.PLAN : Mode.BUILD));
  }, [setMode]);

  return (
    <SessionCtxContext.Provider
      value={{ mode, setMode, toggleMode, model, setModel }}
    >
      {children}
    </SessionCtxContext.Provider>
  );
}
