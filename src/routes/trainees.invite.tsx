import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp } from "@/lib/store";

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
  const inviteTrainee = useApp((s) => s.inviteTrainee);
  const removeTrainee = useApp((s) => s.removeTrainee);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const field =
    "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Please enter a valid work email address.");
      setSentTo(null);
      return;
    }
    setError("");
    inviteTrainee(value, name);
    setSentTo(value);
    setEmail("");
    setName("");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <Link to="/dashboard" className="text-sm text-primary hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
          Create a new trainee account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the trainee's work email. They'll appear in your team list straight away and
          can start any module you assign to them.
        </p>

        <Card className="mt-6">
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-sm">
              <span className="font-medium">Trainee work email</span>
              <input
                className={field}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="new.starter@practice.nhs.uk"
                autoComplete="email"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Name (optional)</span>
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Price"
              />
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Invite employee
            </button>
          </form>

          {sentTo && (
            <div className="mt-5 rounded-xl border border-[color:var(--success)]/40 bg-success/10 p-4 text-sm">
              <p className="font-semibold text-[color:var(--success)]">Invite sent</p>
              <p className="mt-1 text-muted-foreground">
                {sentTo} has been added to your team. They can sign in with that email and
                choose Trainee.
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
                      {t.status === "active" ? "Active" : "Invited"}
                    </Badge>
                    <Link
                      to="/trainees/$id"
                      params={{ id: t.id }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View progress →
                    </Link>
                    <button
                      onClick={() => removeTrainee(t.id)}
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
