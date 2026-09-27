import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import {
  flushPractice,
  importLegacyPractice,
  loadWorkspace,
  readLegacyPractice,
  useConnection,
} from "@/lib/backend";
import { assignmentProgress } from "@/lib/training";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Manager dashboard — PracticeReady" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [importError, setImportError] = useState("");
  useEffect(() => {
    setLegacyAvailable(Boolean(readLegacyPractice()));
  }, []);
  const sessions = useConnection((s) => s.sessions);
  const modules = useApp((s) => s.modules);
  const results = useApp((s) => s.results);
  const practiceData = useApp((s) => s.practiceData);
  const clearReviewFlag = useApp((s) => s.clearReviewFlag);
  const trainees = useApp((s) => s.trainees);
  const assignments = useApp((s) => s.assignments);
  const setupComplete = useApp((s) => s.setupComplete);
  const removeDraftModule = useApp((s) => s.removeDraftModule);

  const drafts = modules.flatMap((m) => m.scenarios.filter((s) => s.status === "draft"));
  const published = modules.filter((m) => m.published);
  const draftModules = modules.filter((m) => !m.published);
  const needsReview = modules.filter((m) => m.needsReview);

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{practiceData.practiceName}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Manager dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              void flushPractice()
                .then(() => loadWorkspace())
                .catch((e) => setImportError(e.message))
            }
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          >
            Refresh progress
          </button>
          <Link
            to="/trainees/invite"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-surface"
          >
            Invite trainees
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

      {legacyAvailable && modules.length === 0 && (
        <Card className="mt-6">
          <h2 className="font-semibold">Keep your existing practice setup</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This browser has a saved demo practice. Import its practice information and modules into
            this new account. Invite trainees again to create real accounts; demo passwords and
            results are not imported.
          </p>
          <button
            onClick={() =>
              void importLegacyPractice()
                .then(() => setLegacyAvailable(false))
                .catch((e) => setImportError(e.message))
            }
            className="mt-3 rounded-xl border border-border px-4 py-2 text-sm"
          >
            Import saved demo practice
          </button>
        </Card>
      )}
      {importError && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {importError}
        </p>
      )}
      <Card className="mt-6 border-primary/20 bg-primary/5">
        <h2 className="font-display text-lg font-semibold">
          {!setupComplete
            ? "Start with your practice setup"
            : draftModules.length
              ? "Next: review your draft modules"
              : !trainees.length
                ? "Next: invite your team"
                : "Your team’s training"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {!setupComplete
            ? "Add your team and local procedures to create starter training drafts."
            : draftModules.length
              ? "Check the scenarios, then publish and assign the modules."
              : !trainees.length
                ? "Send invitations and assign your published modules."
                : "Review progress below or create additional training."}
        </p>
        {!setupComplete ? (
          <Link to="/practice/setup" className="mt-4 inline-block font-semibold text-primary">
            Continue setup →
          </Link>
        ) : draftModules[0] ? (
          <Link
            to="/modules/review"
            search={{ id: draftModules[0].id }}
            className="mt-4 inline-block font-semibold text-primary"
          >
            Review a draft →
          </Link>
        ) : (
          <Link to="/trainees/invite" className="mt-4 inline-block font-semibold text-primary">
            Invite trainees →
          </Link>
        )}
      </Card>

      {/* Modules needing review */}
      {needsReview.length > 0 && (
        <Card className="mt-6 border-warning/40 bg-warning/5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Modules needing review</h3>
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
              Choose a topic, add local details and review the draft scenarios.
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
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <Link
                  to="/modules/review"
                  search={{ id: m.id }}
                  className="min-w-0 flex-1 hover:text-primary"
                >
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.scenarios.length} scenarios · manager review required
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this draft module?")) removeDraftModule(m.id);
                  }}
                  className="shrink-0 text-xs text-destructive hover:underline"
                >
                  Delete draft
                </button>
              </div>
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
            <Link
              to="/trainees/invite"
              className="text-xs font-medium text-primary hover:underline"
            >
              + Invite
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {trainees.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No trainees yet. Use &ldquo;Invite trainees&rdquo; to invite one.
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
                      (mine.reduce((sum, a) => sum + assignmentProgress(a, sessions).fraction, 0) /
                        mine.length) *
                        100,
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
        <Badge tone={tone}>
          {tone === "draft" ? "Review" : tone === "approved" ? "Live" : "Team"}
        </Badge>
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
