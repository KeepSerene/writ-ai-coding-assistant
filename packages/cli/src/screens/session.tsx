import { useParams } from "react-router";
import SessionShell from "../components/session-shell";

export default function SessionScreen() {
  const { sessionId } = useParams();

  return <SessionShell onSubmit={() => {}} promptAreaDisabled isLoading />;
}
