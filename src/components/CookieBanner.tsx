import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const KEY = "cookie-consent";
export const OPEN_COOKIE_SETTINGS = "open-cookie-settings";

function read() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// Only essential storage is used today, so either choice changes nothing yet. The stored
// choice must be checked before any optional cookie/analytics is ever added.
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!read()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen);
  }, []);

  function choose(choice: "accepted" | "rejected") {
    try {
      localStorage.setItem(KEY, JSON.stringify({ choice, date: new Date().toISOString() }));
    } catch {
      // Storage blocked: hide for this page view only.
    }
    setOpen(false);
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
          We use only essential cookies and similar storage to keep you signed in and keep the
          service secure. We don&apos;t use analytics or advertising cookies.{" "}
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
