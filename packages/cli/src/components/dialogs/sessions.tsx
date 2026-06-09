import "opentui-spinner/react";
import type { InferResponseType } from "hono/client";
import { useCallback, useEffect, useState } from "react";
import apiClient from "../../lib/api-client";
import { useDialog } from "../../providers/dialog";
import { useNavigate } from "react-router";
import { useToast } from "../../providers/toast";
import { getErrorMessage } from "../../lib/utils";
import { useTheme } from "../../providers/theme";
import FilterListItemsDialog from "./filter-list-items";
import { TextAttributes } from "@opentui/core";
import { format } from "date-fns";

type Session = InferResponseType<
  (typeof apiClient.sessions)["$get"],
  200
>[number];

function SessionsDialog() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { close } = useDialog();
  const { show: showToast } = useToast();
  const {
    currentTheme: { colors },
  } = useTheme();

  useEffect(() => {
    let shouldIgnore = false;

    const fetchSessions = async () => {
      setIsLoading(true);

      try {
        const res = await apiClient.sessions.$get();

        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }

        const data = await res.json();

        if (!shouldIgnore) {
          setSessions(data);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);

        if (!shouldIgnore) {
          showToast({
            variant: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to fetch sessions",
          });
          close();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();

    return () => {
      shouldIgnore = true;
    };
  }, [setIsLoading, setSessions, showToast, close]);

  const handleSelect = useCallback(
    (session: Session) => {
      close();
      navigate(`/sessions/${session.id}`);
    },
    [close, navigate],
  );

  if (isLoading) {
    return (
      <box flexDirection="row" justifyContent="center">
        <spinner name="material" color={colors.onDialog} />
      </box>
    );
  }

  return (
    <FilterListItemsDialog
      items={sessions}
      onSelect={handleSelect}
      filterPredicate={(session, query) =>
        session.title.toLowerCase().includes(query.trim().toLowerCase())
      }
      renderItem={(session, isSelected) => (
        <>
          <text
            selectable={false}
            fg={isSelected ? colors.onSelection : colors.onDialog}
          >
            {session.title}
          </text>

          <box flexGrow={1} />

          <text
            selectable={false}
            attributes={isSelected ? undefined : TextAttributes.DIM}
            fg={isSelected ? colors.onSelection : colors.onDialog}
          >
            {format(new Date(session.createdAt), "hh:mm a")}
          </text>
        </>
      )}
      getListItemUniqueKey={(session) => session.id}
      placeholder="Find session"
      emptyStateText="No matching sessions"
    />
  );
}

export default SessionsDialog;
