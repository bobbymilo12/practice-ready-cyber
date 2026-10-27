import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { signOut, useConnection } from "@/lib/backend";
import { useState } from "react";
import { useApp } from "@/lib/store";

export function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [error, setError] = useState("");
  const saving = useConnection((s) => s.saving);
  const account = useApp((s) => s.account);
  const dashboardPath = account
    ? account.platformAdmin
      ? "/admin"
      : account.role === "manager"
        ? "/dashboard"
        : "/staff"
    : "/auth";

  return (
    <div className={`min-h-screen bg-background text-foreground ${className}`}>
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
              P
            </span>
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
              PracticeReady
            </span>
          </Link>
          <nav className="flex gap-4 whitespace-nowrap text-sm text-muted-foreground sm:gap-6">
            <Link
              to="/about"
              className="hover:text-foreground [&.active]:text-foreground [&.active]:font-medium"
            >
              About Us
            </Link>
            <Link
              to="/faqs"
              className="hover:text-foreground [&.active]:text-foreground [&.active]:font-medium"
            >
              FAQs
            </Link>
            <Link
              to="/contact"
              className="hover:text-foreground [&.active]:text-foreground [&.active]:font-medium"
            >
              Contact Us
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {!account && (
              <Link
                to="/auth"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Log in
              </Link>
            )}
            {account && (
              <Link
                to={dashboardPath}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
              >
                Dashboard
              </Link>
            )}
            {account && (
              <button
                onClick={() => void signOut().catch((e) => setError(e.message))}
                className="cursor-pointer rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                Log out
              </button>
            )}
          </div>
        </div>
      </header>
      {saving && (
        <p
          role="status"
          className="pointer-events-none fixed right-6 top-20 z-20 rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground shadow-sm"
        >
          Saving practice changes…
        </p>
      )}
      {error && (
        <p role="alert" className="px-6 text-destructive">
          {error}
        </p>
      )}
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mt-16 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          <nav className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-foreground underline underline-offset-4">
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookies">Cookies</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/accessibility">Accessibility</Link>
          </nav>
          PracticeReady supports local onboarding and does not replace statutory or mandatory
          training, clinical protocols or manager judgement.
        </div>
      </footer>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,30,60,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "draft" | "approved" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    draft: "bg-warning/20 text-[color:var(--warning-foreground)]",
    approved: "bg-success/15 text-[color:var(--success)]",
    info: "bg-secondary text-secondary-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
