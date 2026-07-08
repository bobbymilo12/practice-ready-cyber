import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
              P
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              PracticeReady
            </span>
          </Link>
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/dashboard" className="hover:text-foreground [&.active]:text-foreground [&.active]:font-medium">
              Manager
            </Link>
            <Link to="/staff" className="hover:text-foreground [&.active]:text-foreground [&.active]:font-medium">
              Trainee
            </Link>
            <Link to="/" className="hover:text-foreground">
              About
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/staff"
              className="hidden rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface sm:inline-flex"
            >
              Trainee
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Manager
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mt-16 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          PracticeReady supports local onboarding and does not replace statutory or mandatory
          training, clinical protocols or manager judgement.
        </div>
      </footer>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
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
