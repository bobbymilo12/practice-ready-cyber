import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Manager dashboard — PracticeReady" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const modules = useApp((s) => s.modules);
  const results = useApp((s) => s.results);
  const practiceData = useApp((s) => s.practiceData);
  const clearReviewFlag = useApp((s) => s.clearReviewFlag);
  const trainees = useApp((s) => s.trainees);
  const assignments = useApp((s) => s.assignments);
  const setupComplete = useApp((s) => s.setupComplete);

  const drafts = modules.flatMap((m) => m.scenarios.filter((s) => s.status === "draft"));
  const published = modules.filter((m) => m.published);
  const draftModules = modules.filter((m) => !m.published);
  const needsReview = modules.filter((m) => m.needsReview);

  const dataHubEmpty = practiceData.staff.length === 0;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{practiceData.practiceName}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Manager dashboard
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!setupComplete && (
            <Link
              to="/practice/setup"
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-surface"
            >
              Set up practice
            </Link>
          )}
          <Link
            to="/trainees/invite"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-surface"
          >
            Create new trainee account
          </Link>
          <Link
            to="/modules/merge"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-surface"
          >
            Merge modules
          </Link>
          <Link
            to="/data-hub"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-surface"
          >
            Practice Information
          </Link>
          <Link
            to="/modules/create"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            + Create new module
          </Link>
        </div>
      </div>

      {/* Gap banner */}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          What PracticeReady is
        </p>
        <p className="mt-1 text-sm text-foreground">
          <span className="font-semibold">
            Mandatory training teaches the rules. PracticeReady teaches how your practice
            actually works.
          </span>{" "}
          Use it for local onboarding — who books what, when to escalate, and the phrases
          your team uses. Not a replacement for mandatory training or clinical protocols.
        </p>
      </div>

      {/* First-run nudge */}
      {dataHubEmpty && !setupComplete && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <span className="font-semibold">Start here:</span> run{" "}
          <Link to="/practice/setup" className="font-semibold text-primary hover:underline">
            Set up practice
          </Link>{" "}
          to add your team, opening times, same-day reasons and prescription process — every draft is built from what you enter there.
        </div>
      )}

      {/* Modules needing review */}
      {needsReview.length > 0 && (
        <Card className="mt-6 border-warning/40 bg-warning/5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">
              Modules needing review
            </h3>
            <Badge tone="draft">Local knowledge changed</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {needsReview.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.reviewReason ??
                      "Practice data changed — scenarios may contain outdated information."}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/modules/review"
                    search={{ id: m.id }}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Review
                  </Link>
                  <button
                    onClick={() => clearReviewFlag(m.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Draft scenarios" value={drafts.length} tone="draft" />
        <Stat label="Modules published" value={published.length} tone="approved" />
        <Stat label="Trainees invited" value={trainees.length} tone="info" />
        <Stat label="Completions logged" value={results.length} tone="info" />
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <Link to="/modules/create" className="group">
          <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              +
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">Create new module</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a module type and answer specific questions. AI drafts scenarios you
              approve before staff see them.
            </p>
          </Card>
        </Link>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Draft modules</h3>
            <Badge tone="draft">Awaiting review</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {draftModules.length === 0 && (
              <p className="text-sm text-muted-foreground">No drafts right now.</p>
            )}
            {draftModules.map((m) => (
              <Link
                key={m.id}
                to="/modules/review"
                search={{ id: m.id }}
                className="block rounded-lg border border-border p-3 text-sm hover:border-primary/40"
              >
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">
                  {m.scenarios.length} scenarios · manager review required
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Published modules</h3>
            <Badge tone="approved">Live</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {published.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{m.title}</div>
                  <Link
                    to="/train"
                    search={{ id: m.id }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open →
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">
                  {m.scenarios.length} approved scenarios
                  {m.needsReview && (
                    <span className="ml-2 text-[color:var(--warning-foreground)]">
                      · review recommended
                    </span>
                  )}
                </div>
                <AssignControl moduleId={m.id} />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Trainee progress</h3>
            <Link to="/trainees/invite" className="text-xs font-medium text-primary hover:underline">
              + Invite
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {trainees.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No trainees yet. Use &ldquo;Create new trainee account&rdquo; to invite one.
              </p>
            )}
            {trainees.map((t) => {
              const mine = assignments.filter((a) => a.traineeId === t.id);
              const done = new Set(
                results.filter((r) => r.traineeId === t.id).map((r) => r.moduleId),
              );
              const pct =
                mine.length === 0
                  ? 0
                  : Math.round(
                      (mine.filter((a) => done.has(a.moduleId)).length / mine.length) * 100,
                    );
              return (
                <Link
                  key={t.id}
                  to="/trainees/$id"
                  params={{ id: t.id }}
                  className="grid grid-cols-[1fr_2fr_auto] items-center gap-4 rounded-lg p-2 hover:bg-surface"
                >
                  <div>
                    <div className="text-sm font-medium">{t.name || t.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.status === "invited" ? "Invited" : "Active"} · {mine.length} assigned
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                    {pct}%
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-semibold">Recent training activity</h3>
          <div className="mt-4 space-y-2">
            {results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No completions yet. Once trainees finish a module, results appear here.
              </p>
            )}
            {results.slice(0, 6).map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{r.moduleTitle}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.completedAt).toLocaleString()}
                    {r.confidence ? ` · confidence ${r.confidence}/5` : ""}
                  </div>
                </div>
                <div className="text-sm tabular-nums">
                  {r.correct}/{r.total}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </Shell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "draft" | "approved" | "info";
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Badge tone={tone}>{tone === "draft" ? "Review" : tone === "approved" ? "Live" : "Team"}</Badge>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
    </Card>
  );
}

function AssignControl({ moduleId }: { moduleId: string }) {
  const trainees = useApp((s) => s.trainees);
  const assignments = useApp((s) => s.assignments);
  const assignModule = useApp((s) => s.assignModule);
  const [open, setOpen] = useState(false);

  if (trainees.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface"
      >
        Assign to employees
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {trainees.map((t) => {
            const assigned = assignments.some(
              (a) => a.traineeId === t.id && a.moduleId === moduleId,
            );
            return (
              <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                <span>{t.name || t.email}</span>
                <button
                  disabled={assigned}
                  onClick={() => assignModule(t.id, moduleId)}
                  className="rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground disabled:opacity-40"
                >
                  {assigned ? "Assigned" : "Assign"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
