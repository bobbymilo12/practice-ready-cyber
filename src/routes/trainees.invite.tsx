import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { api, flushPractice, loadWorkspace } from "@/lib/backend";
import { devRole } from "@/lib/dev-mode";
import { useApp, TRAINEE_ROLE_OPTIONS } from "@/lib/store";

export const Route = createFileRoute("/trainees/invite")({
  head: () => ({
    meta: [
      { title: "Invite a trainee — PracticeReady" },
      {
        name: "description",
        content:
          "Invite a reception or admin trainee to PracticeReady using their work email address.",
      },
      { property: "og:title", content: "Invite a trainee — PracticeReady" },
      {
        property: "og:description",
        content: "Send a PracticeReady invite to a new reception or admin starter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const trainees = useApp((s) => s.trainees);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(TRAINEE_ROLE_OPTIONS[0]);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const field =
    "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  async function invite(value: string, traineeName: string, traineeRole: string) {
    setBusy(true);
    setError("");
    setSentTo(null);
    let canRefresh = false;
    try {
      await flushPractice();
      canRefresh = true;
      await api("invite", { email: value, name: traineeName, role: traineeRole });
      setSentTo(value);
      setEmail("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The invitation could not be sent.");
    } finally {
      if (canRefresh) await loadWorkspace().catch(() => {});
      setBusy(false);
    }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter the trainee's name.");
      return;
    }
    void invite(email.trim(), name.trim(), role);
  }
  async function remove(id: string) {
    if (
      !window.confirm("Remove this trainee's account and training history? This cannot be undone.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await flushPractice();
      await api("remove-trainee", { id });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove trainee.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <Link to="/dashboard" className="text-sm text-primary hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Invite a trainee</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Send login details to the trainee’s work email. Their practice Induction Package is
          assigned automatically when published modules are ready.
        </p>

        <Card className="mt-6">
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-sm">
              <span className="font-medium">Trainee work email</span>
              <input
                className={field}
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="new.starter@practice.nhs.uk"
                autoComplete="email"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Name</span>
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Price"
              />
            </label>

            <div className="block text-sm">
              <span className="font-medium">Role</span>
              <div className="mt-1 grid gap-2 md:grid-cols-[1fr_auto]">
                <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
                  {TRAINEE_ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              disabled={busy}
              type="submit"
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {busy ? "Sending…" : "Invite employee"}
            </button>
          </form>

          {sentTo && (
            <div className="mt-5 rounded-xl border border-[color:var(--success)]/40 bg-success/10 p-4 text-sm">
              <p className="font-semibold text-[color:var(--success)]">
                {devRole() ? "Mock trainee added" : "Invitation accepted for email delivery"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {devRole() ? (
                  `${sentTo} was added to the mock team. No email was sent.`
                ) : (
                  <>
                    {sentTo} has been added to your team. The email contains their login link and
                    temporary password. They must change it before training.
                  </>
                )}
              </p>
            </div>
          )}
        </Card>

        <Card className="mt-6">
          <h2 className="font-display text-lg font-semibold">Your team</h2>
          {trainees.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No trainees yet. Invite your first new starter above.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {trainees.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={t.status === "active" ? "approved" : "draft"}>
                      {t.status === "active"
                        ? "Active"
                        : t.inviteStatus === "failed"
                          ? "Email failed"
                          : "Invited"}
                    </Badge>
                    {t.status === "invited" && (
                      <button
                        disabled={busy}
                        onClick={() => void invite(t.email, t.name, t.role)}
                        className="text-xs text-primary hover:underline"
                      >
                        Resend invitation
                      </button>
                    )}
                    <Link
                      to="/trainees/$id"
                      params={{ id: t.id }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View progress →
                    </Link>
                    <button
                      disabled={busy}
                      onClick={() => void remove(t.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
