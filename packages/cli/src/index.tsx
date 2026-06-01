import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import Header from "./components/header";
import PromptArea from "./components/prompt-area";
import { ToastProvider } from "./providers/toast";
import { InputStackProvider } from "./providers/input-stack";
import { DialogProvider } from "./providers/dialog";
import { ThemeProvider, useTheme } from "./providers/theme";

function AppContent() {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box
      width="100%"
      height="100%"
      backgroundColor={colors.background}
      justifyContent="center"
      alignItems="center"
      gap={2}
    >
      <Header />

      <box width="100%" maxWidth={78} paddingX={2}>
        <PromptArea onSubmit={() => {}} />
      </box>
    </box>
  );
}

const App = () => (
  <ThemeProvider>
    <InputStackProvider>
      <DialogProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </DialogProvider>
    </InputStackProvider>
  </ThemeProvider>
);

const renderer = await createCliRenderer({ targetFps: 60, exitOnCtrlC: false });
createRoot(renderer).render(<App />);
