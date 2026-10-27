import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shell, Card } from "./Shell";
import { api, configured, supabase, useConnection } from "@/lib/backend";
import { devRole } from "@/lib/dev-mode";
import { requestPasswordRecovery, finishPasswordRecovery } from "@/lib/password-recovery";
import type { Account } from "@/lib/store";

export function PasswordRecovery({ reset }: { reset: boolean }) {
  const recoveryUserId = useConnection((s) => s.recoveryUserId);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let mounted = true;
    void supabase?.auth.getSession().finally(() => {
      if (mounted) setChecked(true);
    });
    if (!supabase) setChecked(true);
    return () => {
      mounted = false;
    };
  }, []);
  const field = "mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || !supabase || devRole()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!reset)
        setMessage(await requestPasswordRecovery(supabase.auth, email, window.location.origin));
      else {
        await finishPasswordRecovery(
          supabase.auth,
          recoveryUserId,
          password,
          confirm,
          async () => (await api<{ account: Account }>("load")).account,
          () => api("activate"),
        );
        setPassword("");
        setConfirm("");
        setDone(true);
        useConnection.setState({ recoveryUserId: null });
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) setError("Your password was changed. Please log out before signing in again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold">
          {reset ? "Choose a new password" : "Forgot your password?"}
        </h1>
        <Card className="mt-6">
          {done ? (
            <p role="status">Your password has been changed. Sign in with your new password.</p>
          ) : reset && !checked ? (
            <p role="status">Checking your reset link…</p>
          ) : reset && !recoveryUserId ? (
            <p role="alert">This reset link is invalid or has expired. Request a new link below.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {reset ? (
                <>
                  <label className="block text-sm">
                    New password
                    <input
                      required
                      minLength={12}
                      type="password"
                      autoComplete="new-password"
                      className={field}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    Confirm new password
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      className={field}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">Use at least 12 characters.</p>
                </>
              ) : (
                <label className="block text-sm">
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    className={field}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              <button
                disabled={busy || !configured || !!devRole()}
                className="rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Please wait…" : reset ? "Save new password" : "Send reset link"}
              </button>
            </form>
          )}
          {message && (
            <p role="status" className="mt-4 text-sm">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {(!configured || devRole()) && (
            <p className="mt-4 text-sm">
              Password recovery requires a connected real account. Mock accounts do not send emails.
            </p>
          )}
          {reset && !done && (
            <Link
              to="/auth"
              search={{ mode: "forgot" }}
              className="mt-4 block text-primary underline"
            >
              Request a new reset link
            </Link>
          )}
          <Link to="/auth" search={{ mode: "login" }} className="mt-4 block text-primary underline">
            Back to sign in
          </Link>
        </Card>
      </div>
    </Shell>
  );
}
