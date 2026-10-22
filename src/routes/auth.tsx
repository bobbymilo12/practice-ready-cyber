import { PasswordRecovery } from "@/components/PasswordRecovery";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { devAuthAvailable, devRole, enterDevSession } from "@/lib/dev-mode";
import { useEffect, useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp } from "@/lib/store";
import { api, configured, loadWorkspace, signOut, supabase, useConnection } from "@/lib/backend";
import "@/auth.css";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Log in — PracticeReady" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { email?: string; practice?: string; mode?: "login" | "create" | "forgot" | "recovery" } => ({
    mode: s.mode === "forgot" || s.mode === "recovery" || s.mode === "create" ? s.mode : "login",
    email: typeof s.email === "string" ? s.email : undefined,
    practice: typeof s.practice === "string" ? s.practice : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const [showDev, setShowDev] = useState(false);
  useEffect(() => setShowDev(devAuthAvailable()), []);
  const search = Route.useSearch();
  const nav = useNavigate();
  const account = useApp((s) => s.account);
  const connection = useConnection();
  const mode = search.practice ? "login" : (search.mode ?? "login");
  const setMode = (mode: "login" | "create") =>
    void nav({ to: "/auth", search: { ...search, mode } });
  const [email, setEmail] = useState(search.email ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const reset = Boolean(account?.mustResetPassword);
  const field = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (!supabase)
        throw new Error("Accounts are not available yet. Please contact the site administrator.");
      if ((reset || mode === "create") && (password.length < 12 || password !== confirm))
        throw new Error("Use at least 12 characters and make sure both new passwords match.");
      if (reset) {
        await api("password", { currentPassword, password });
        // Changing the password revokes every session, including this one.
        const { error: again } = await supabase.auth.signInWithPassword({
          email: useApp.getState().account!.email,
          password,
        });
        if (again) throw new Error("Your password was changed. Log in with your new password.");
        await loadWorkspace();
        setPassword("");
        setCurrentPassword("");
        setConfirm("");
        await nav({ to: "/staff" });
      } else if (mode === "create") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (signupError) throw signupError;
        if (!data.session) {
          setMessage("Check your email to confirm your manager account, then log in.");
          setMode("login");
          setPassword("");
          return;
        }
        await loadWorkspace();
        await nav({ to: useApp.getState().setupComplete ? "/dashboard" : "/practice/setup" });
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (loginError) throw new Error("We couldn't log you in. Check your email and password.");
        await loadWorkspace();
        const me = useApp.getState().account!;
        if (search.practice && me.practiceId !== search.practice) {
          await signOut();
          throw new Error(
            "This invitation belongs to a different practice. Use the email from your invitation.",
          );
        }
        setCurrentPassword(password);
        setPassword("");
        if (!me.mustResetPassword)
          await nav({
            to:
              me.role === "manager"
                ? useApp.getState().setupComplete
                  ? "/dashboard"
                  : "/practice/setup"
                : "/staff",
          });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (search.mode === "forgot" || search.mode === "recovery")
    return <PasswordRecovery key={search.mode} reset={search.mode === "recovery"} />;
  return (
    <Shell className="auth-shell">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-3xl font-bold">
          {reset
            ? "Choose your own password"
            : mode === "create"
              ? "Create a manager account"
              : "Log in"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {reset
            ? "Change your temporary password to open your assigned training."
            : mode === "create"
              ? "Set up training for your practice. Invite your team once your modules are ready."
              : "Use your account details or the login details in your practice invitation."}
        </p>
        {showDev && (
          <Card className="mt-6 border-dashed">
            <p className="text-sm font-semibold">Local development</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use fake accounts and data. No emails are sent.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["manager", "trainee"] as const).map((role) => (
                <button
                  key={role}
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void (
                      devRole()
                        ? import("@/lib/backend").then((m) => m.flushPractice())
                        : Promise.resolve()
                    )
                      .then(() => enterDevSession(role))
                      .catch((e) => {
                        setError(e.message);
                        setBusy(false);
                      });
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  Continue as {role === "manager" ? "Manager" : "Trainee"}
                </button>
              ))}
            </div>
            {devRole() && <p className="mt-3 text-xs">Log out to return to real authentication.</p>}
          </Card>
        )}
        {!configured && !devRole() && (
          <p role="status" className="mt-4 rounded-xl border border-border p-4 text-sm">
            Accounts are not available yet. Please contact the site administrator.
          </p>
        )}
        {!reset && !search.practice && (
          <div className="mt-6 flex gap-4 text-sm">
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={mode === "login" ? "font-bold text-primary" : ""}
            >
              Log in
            </button>
            <button
              onClick={() => {
                setMode("create");
                setError("");
              }}
              className={mode === "create" ? "font-bold text-primary" : ""}
            >
              New practice manager
            </button>
          </div>
        )}
        <Card className="mt-6">
          <form onSubmit={submit} className="space-y-5">
            {!reset && mode === "create" && (
              <label className="block text-sm">
                Full name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className={field}
                />
              </label>
            )}
            {!reset && (
              <label className="block text-sm">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className={field}
                />
              </label>
            )}
            {reset && (
              <label className="block text-sm">
                Temporary password
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className={field}
                />
              </label>
            )}
            <label className="block text-sm">
              {reset ? "New password" : "Password"}
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={reset || mode === "create" ? 12 : undefined}
                autoComplete={reset || mode === "create" ? "new-password" : "current-password"}
                className={field}
              />
            </label>
            {(reset || mode === "create") && (
              <>
                <p className="text-xs text-muted-foreground">Use at least 12 characters.</p>
                <label className="block text-sm">
                  Confirm new password
                  <input
                    required
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className={field}
                  />
                </label>
              </>
            )}
            {(error || connection.error) && (
              <p role="alert" className="text-sm text-destructive">
                {error || connection.error}
              </p>
            )}
            {message && (
              <p role="status" className="text-sm text-primary">
                {message}
              </p>
            )}
            <button
              disabled={busy || !configured || Boolean(devRole())}
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy
                ? "Please wait…"
                : reset
                  ? "Save password and start training"
                  : mode === "create"
                    ? "Create manager account"
                    : "Log in"}
            </button>
            {!reset && mode === "login" && (
              <Link
                to="/auth"
                search={{ mode: "forgot" }}
                className="block text-sm text-primary underline"
              >
                Forgot password?
              </Link>
            )}
            {!reset && mode === "login" && (
              <p className="text-xs text-muted-foreground">
                Invitation expired or missing? Ask your practice manager to resend it.
              </p>
            )}
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing, you acknowledge the{" "}
          <a href="/privacy" className="underline">
            Privacy Notice
          </a>
          .
        </p>
      </div>
    </Shell>
  );
}
