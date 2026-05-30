import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import Header from "./components/header";
import PromptArea from "./components/prompt-area";

function App() {
  return (
    <box
      width="100%"
      height="100%"
      backgroundColor="#0d0d12"
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

const renderer = await createCliRenderer({ targetFps: 60, exitOnCtrlC: false });
createRoot(renderer).render(<App />);
