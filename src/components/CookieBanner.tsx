import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { COOKIE_POLICY_VERSION } from "@/lib/cookie-data";
import { recordConsent, recordPageView } from "@/lib/cookie-data.functions";

const KEY = "cookie-consent";
const VISITOR_KEY = "analytics-visitor-id";
export const OPEN_COOKIE_SETTINGS = "open-cookie-settings";

function read(): { choice?: string; version?: string } | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

function visitorId() {
  try {
    return localStorage.getItem(VISITOR_KEY);
  } catch {
    return null;
  }
}

// Analytics runs only after "Accept all". Rejecting (or withdrawing) deletes the visitor id.
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const firstView = useRef(true);

  useEffect(() => {
    // Ask again when the policy changes: an older acceptance did not cover what is collected now.
    if (read()?.version !== COOKIE_POLICY_VERSION) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen);
  }, []);

  useEffect(() => {
    const id = visitorId();
    const consent = read();
    if (consent?.choice !== "accepted" || consent.version !== COOKIE_POLICY_VERSION || !id) return;
    let referrerHost: string | null = null;
    if (firstView.current && document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host !== location.hostname) referrerHost = host;
    }
    firstView.current = false;
    recordPageView({ data: { visitorId: id, path: pathname, referrerHost } }).catch(() => {});
  }, [pathname]);

  function choose(choice: "accepted" | "rejected") {
    // Keep the old id on rejection so a withdrawal is logged against the earlier acceptance.
    let id = visitorId();
    try {
      if (choice === "accepted") {
        id ??= crypto.randomUUID();
        localStorage.setItem(VISITOR_KEY, id);
      } else {
        localStorage.removeItem(VISITOR_KEY);
      }
      localStorage.setItem(
        KEY,
        JSON.stringify({
          choice,
          version: COOKIE_POLICY_VERSION,
          date: new Date().toISOString(),
        }),
      );
    } catch {
      // Storage blocked: hide for this page view only, and nothing is tracked.
      id = null;
    }
    recordConsent({ data: { visitorId: id, choice } }).catch(() => {});
    setOpen(false);
    if (choice === "accepted" && id) {
      recordPageView({ data: { visitorId: id, path: pathname, referrerHost: null } }).catch(
        () => {},
      );
    }
  }

  if (!open) return null;
  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background shadow-[0_-8px_30px_#172c4314]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm leading-6 text-foreground">
          We use essential storage to keep you signed in and the service secure. With your
          permission, we also count which pages are visited to improve PracticeReady. This uses a
          random ID, not your name, IP address or account. We don&apos;t use advertising cookies.{" "}
          <Link to="/cookies" className="underline underline-offset-4">
            Read our cookie policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("rejected")}
            className="cursor-pointer rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Reject non-essential
          </button>
          <button
            onClick={() => choose("accepted")}
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
