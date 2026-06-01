import { useTheme } from "../../providers/theme";

interface AgentResponseProps {
  response: string;
  model: string;
}

function AgentResponse({ response, model }: AgentResponseProps) {
  const {
    currentTheme: { colors },
  } = useTheme();

  return (
    <box width="100%" alignItems="center">
      <box width="100%" paddingY={1}>
        <box width="100%" paddingX={3}>
          <text>{response}</text>
        </box>
      </box>

      <box width="100%" paddingX={3} paddingY={1} gap={1}>
        <box flexDirection="row" gap={2}>
          <text fg={colors.primary}>◉</text>
          <text fg={colors.onBackground}>{model}</text>
        </box>
      </box>
    </box>
  );
}

export default AgentResponse;
