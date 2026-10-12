import { useRef, useState } from "react";
import { confirmManagerAction, useConnection } from "@/lib/backend";
import type { ManagerAction } from "@/lib/manager-actions";

/** UI lock is synchronous so repeated clicks before a rerender cannot submit twice. */
export function useManagerAction() {
  const locked = useRef(false);
  const [pending, setPending] = useState<ManagerAction | null>(null);
  const [error, setError] = useState("");
  const saving = useConnection((s) => s.managerSaving);
  async function run(action: ManagerAction, onSuccess?: () => void | Promise<unknown>) {
    if (locked.current || useConnection.getState().managerSaving) return;
    locked.current = true;
    setPending(action);
    setError("");
    let confirmed = false;
    try {
      await confirmManagerAction(action);
      confirmed = true;
      await onSuccess?.();
    } catch (error) {
      setError(
        confirmed
          ? "The action was saved, but the next screen could not open. Return to the dashboard to check it."
          : `${error instanceof Error ? error.message : "The action could not be saved."} Retry the action. If the connection was interrupted, reload the saved practice to check before retrying.`,
      );
    } finally {
      locked.current = false;
      setPending(null);
    }
  }
  return { run, pending, error, saving: saving || !!pending };
}
