import { useEffect } from "react";
import { flushPractice, loadWorkspace } from "@/lib/backend";

/** Reload saved practice data when a dashboard opens and whenever the user comes back to the tab. */
export function useLiveWorkspace() {
  useEffect(() => {
    // Save local edits first so the reload cannot overwrite them.
    const refresh = () =>
      void flushPractice()
        .then(loadWorkspace)
        .catch(() => {});
    const onVisible = () => document.visibilityState === "visible" && refresh();
    refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
}
