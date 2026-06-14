import { useKeyboard, useRenderer } from "@opentui/react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

// An InterruptHandler returns 'true' if it successfully
// handled the interruption (e.g., cleared text, closed a modal), telling
// the global system to stop propagating the event
type InterruptHandler = () => boolean;
// UI layers
// "prompt-area" is the base layer
// any input or textarea on a dialog or a surface represents a text-field layer
type LayerId =
  | "base"
  | "command-menu"
  | "dialog"
  | "text-field"
  | "mention-menu";

interface InputStackContextValue {
  pushLayer: (id: LayerId, handler?: InterruptHandler) => void;
  popLayer: (id: LayerId) => void;
  isTopLayer: (id: LayerId) => boolean;
  setInterruptHandler: (id: LayerId, handler: InterruptHandler | null) => void;
}

const InputStackContext = createContext<InputStackContextValue | null>(null);

export function useInputStack(): InputStackContextValue {
  const context = useContext(InputStackContext);

  if (!context) {
    throw new Error("useInputStack must be used within an InputStackProvider");
  }

  return context;
}

export function InputStackProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  // 1. A stack of active UI layers. The last item is the "top" layer
  const [layerIds, setLayerIds] = useState<LayerId[]>(["base"]);

  // 2. A mutable ref of layerIds. Doing this so our global useKeyboard
  // hook can access the absolute latest stack without needing to re-bind on every render
  const layerIdsRef = useRef(layerIds);
  layerIdsRef.current = layerIds;

  // 3. A map holding the interception callbacks for each layer
  const handlers = useRef<Map<string, InterruptHandler>>(new Map());

  const renderer = useRenderer();

  // 4. pushLayer adds a new layer to the top of the stack
  const pushLayer = useCallback((id: LayerId, handler?: InterruptHandler) => {
    if (handler) {
      handlers.current.set(id, handler);
    }

    setLayerIds((prev) => {
      // Prevent duplicate layers if pushed multiple times
      if (prev.includes(id)) return prev;

      return [...prev, id];
    });
  }, []);

  // 5. popLayer removes a layer and cleans up its handler to prevent memory leaks.
  const popLayer = useCallback((id: LayerId) => {
    handlers.current.delete(id);
    setLayerIds((prev) => prev.filter((layerId) => layerId !== id));
  }, []);

  // 6. Utility to check if a component is currently the active focus context
  const isTopLayer = useCallback(
    (id: LayerId) => {
      return layerIds.length === 0 || layerIds[layerIds.length - 1] === id;
    },
    [layerIds],
  );

  // 7. Attaches or removes a handler for an existing layer without changing stack order
  const setInterruptHandler = useCallback(
    (id: LayerId, handler: InterruptHandler | null) => {
      if (handler) {
        handlers.current.set(id, handler);
      } else {
        handlers.current.delete(id);
      }
    },
    [],
  );

  // 8. The Global intercept handler (Ctrl + c)
  useKeyboard((key) => {
    if (!key.ctrl || key.name !== "c") return;

    const currentLayerIds = layerIdsRef.current;

    // Traverse the stack backwards (from the top-most active layer down to the base)
    for (let i = currentLayerIds.length - 1; i >= 0; i--) {
      const id = currentLayerIds[i]!;
      const currentHandler = handlers.current.get(id);

      // If a handler exists and returns `true`, it swallowed the event
      // return immediately, stopping propagation
      if (currentHandler && currentHandler()) return;
    }

    // If no layer intercepted the event, destroy the renderer (exit the app)
    renderer.destroy();
  });

  return (
    <InputStackContext.Provider
      value={{ pushLayer, popLayer, isTopLayer, setInterruptHandler }}
    >
      {children}
    </InputStackContext.Provider>
  );
}
