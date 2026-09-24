import { useEffect, type ReactNode } from "react";
import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import {
  configured,
  flushPractice,
  initializeBackend,
  loadWorkspace,
  useConnection,
} from "@/lib/backend";
import { devRole } from "@/lib/dev-mode";
import { useApp } from "@/lib/store";

export function AccountGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const connection = useConnection();
  const account = useApp((s) => s.account);
  useEffect(() => {
    initializeBackend();
  }, []);
  const publicPage = ["/", "/about", "/faqs", "/auth"].includes(path);
  const traineePage = ["/staff", "/train", "/results"].includes(path);
  if (!publicPage && connection.loading)
    return (
      <p className="p-10" role="status">
        Loading your practice…
      </p>
    );
  if (!publicPage && !configured && !devRole())
    return (
      <div className="mx-auto max-w-xl p-10">
        <h1 className="text-2xl font-bold">PracticeReady setup required</h1>
        <p className="mt-3">
          Connect Supabase and deploy the practice API before using accounts or training. See the
          setup guide in docs/SETUP.md.
        </p>
        <Link to="/" className="mt-4 block text-primary">
          Back to home
        </Link>
      </div>
    );
  if (!publicPage && connection.error && !connection.ready)
    return (
      <div className="p-10" role="alert">
        <p>{connection.error}</p>
        <button className="mt-3 underline" onClick={() => void loadWorkspace().catch(() => {})}>
          Retry
        </button>
      </div>
    );
  if (!publicPage && !account) return <Navigate to="/auth" />;
  if (account?.mustResetPassword && path !== "/auth") return <Navigate to="/auth" />;
  if (!publicPage && !traineePage && account?.role === "trainee") return <Navigate to="/staff" />;
  return (
    <>
      {connection.ready && devRole() && (
        <div className="border-b border-warning bg-warning/10 px-6 py-2 text-sm">
          Development only · Mock {account?.role} · Fake data in this tab. No emails or live
          database changes.{" "}
          <Link to="/auth" className="ml-2 underline">
            Switch mock role
          </Link>
        </div>
      )}
      {connection.ready && connection.error && (
        <div
          role="alert"
          className="border-b border-destructive bg-destructive/5 px-6 py-3 text-sm"
        >
          {connection.error}{" "}
          <button onClick={() => void flushPractice().catch(() => {})} className="ml-3 underline">
            Retry save
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Reload the saved practice? Unsaved changes on this device will be discarded.",
                )
              )
                void loadWorkspace().catch(() => {});
            }}
            className="ml-3 underline"
          >
            Reload saved practice
          </button>
        </div>
      )}
      {children}
    </>
  );
}
