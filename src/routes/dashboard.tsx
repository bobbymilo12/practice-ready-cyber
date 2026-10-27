import { NeedsSupport } from "@/components/NeedsSupport";
import { useManagerAction } from "@/hooks/use-manager-action";
import { useLiveWorkspace } from "@/hooks/use-live-workspace";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Shell, Card } from "@/components/Shell";
import { useConnection } from "@/lib/backend";
import { assignmentProgress, primaryScenarios } from "@/lib/training";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Manager dashboard — PracticeReady" }],
  }),
  component: Dashboard,
});

const bigButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const plainButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 py-2.5 text-base font-semibold hover:bg-surface disabled:opacity-50";

// Long module lists scroll inside their card so the page stays short.
const scrollList =
  "mt-4 max-h-[32rem] divide-y divide-border overflow-y-auto pr-2 focus-visible:outline-2 focus-visible:outline-primary";

function Dashboard() {
  useLiveWorkspace();
  const sessions = useConnection((s) => s.sessions);
  const modules = useApp((s) => s.modules);
  const results = useApp((s) => s.results);
  const practiceData = useApp((s) => s.practiceData);
  const action = useManagerAction();
  const trainees = useApp((s) => s.trainees);
  const assignments = useApp((s) => s.assignments);
  const setupComplete = useApp((s) => s.setupComplete);

  const published = modules.filter((m) => m.published);
  const draftModules = modules.filter((m) => !m.published);
  const needsReview = modules.filter((m) => m.needsReview);
  const traineeName = (id?: string) => {
    const t = trainees.find((t) => t.id === id);
    return t ? t.name || t.email : "";
  };

  return (
    <Shell>
      {action.error && (
        <p role="alert" className="mb-4 text-base text-destructive">
          {action.error}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-base text-muted-foreground">{practiceData.practiceName}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Manager dashboard</h1>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-base">
            <Link to="/analytics" className="font-semibold text-primary underline">
              Analytics
            </Link>
            <Link to="/data-hub" className="font-semibold text-primary underline">
              Practice information
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/trainees/invite" className={plainButton}>
            Invite staff
          </Link>
          <Link to="/modules/create" className={bigButton}>
            + Create a module
          </Link>
        </div>
      </div>

      <Card className="mt-8 border-primary/30 bg-primary/5">
        <h2 className="font-display text-xl font-semibold">What needs your attention</h2>
        <ul className="mt-4 space-y-3">
          {!setupComplete && (
            <AttentionItem
              text="Finish setting up your practice. Add your team and local procedures to get starter training."
              action={
                <Link to="/practice/setup" className={bigButton}>
                  Continue setup
                </Link>
              }
            />
          )}
          {needsReview.map((m) => (
            <AttentionItem
              key={`review-${m.id}`}
              text={
                <>
                  <strong>{m.title}</strong> — your practice information changed. Check it before
                  staff can carry on.
                  <span className="mt-1 block whitespace-pre-line text-muted-foreground">
                    {m.reviewReason ??
                      "Practice data changed — questions may contain outdated information."}
                  </span>
                </>
              }
              action={
                <Link to="/modules/review" search={{ id: m.id }} className={bigButton}>
                  Check module
                </Link>
              }
            />
          ))}
          {draftModules.map((m) => (
            <AttentionItem
              key={`draft-${m.id}`}
              text={
                <>
                  <strong>{m.title}</strong> is a draft with {m.scenarios.length} questions. Check
                  it and publish it so you can assign it.
                </>
              }
              action={
                <Link to="/modules/review" search={{ id: m.id }} className={bigButton}>
                  Review draft
                </Link>
              }
            />
          ))}
          {setupComplete && !trainees.length && (
            <AttentionItem
              text="You haven't invited any staff yet."
              action={
                <Link to="/trainees/invite" className={bigButton}>
                  Invite staff
                </Link>
              }
            />
          )}
          {setupComplete && !needsReview.length && !draftModules.length && trainees.length > 0 && (
            <li className="text-base">Nothing needs your attention right now.</li>
          )}
        </ul>
      </Card>

      <NeedsSupport
        trainees={trainees}
        assignments={assignments}
        modules={modules}
        sessions={sessions}
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Draft modules to review" value={draftModules.length} />
        <Stat label="Modules ready to use" value={published.length} />
        <Stat label="Staff invited" value={trainees.length} />
        <Stat label="Modules completed by staff" value={results.length} />
      </section>

      <Card className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Your team</h2>
          <Link to="/trainees/invite" className={plainButton}>
            + Invite staff
          </Link>
        </div>
        {trainees.length === 0 && (
          <p className="mt-4 text-base text-muted-foreground">
            No staff yet. Press &ldquo;Invite staff&rdquo; to add someone.
          </p>
        )}
        <ul className="mt-4 divide-y divide-border">
          {trainees.map((t) => {
            const mine = assignments.filter((a) => a.traineeId === t.id && !a.withdrawnAt);
            const progress = mine.map((a) =>
              assignmentProgress(
                a,
                sessions,
                modules.find((m) => m.id === a.moduleId),
              ),
            );
            const finished = progress.filter((p) => p.completed).length;
            const pct = mine.length
              ? Math.round((progress.reduce((sum, p) => sum + p.fraction, 0) / mine.length) * 100)
              : 0;
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-48 flex-1">
                  <p className="text-lg font-semibold">{t.name || t.email}</p>
                  <p className="text-base text-muted-foreground">
                    {t.inactiveAt
                      ? "No longer active"
                      : t.status === "invited"
                        ? "Invited — not signed in yet"
                        : mine.length
                          ? `Finished ${finished} of ${mine.length} modules`
                          : "No training assigned yet"}
                  </p>
                </div>
                <div className="flex min-w-48 flex-1 items-center gap-3">
                  <progress
                    aria-label={`${t.name || t.email} training progress`}
                    value={pct}
                    max={100}
                    className="h-3 w-full accent-primary"
                  />
                  <span className="w-12 text-right text-base tabular-nums">{pct}%</span>
                </div>
                <Link to="/trainees/$id" params={{ id: t.id }} className={plainButton}>
                  View
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">
              Ready to assign ({published.length})
            </h2>
          </div>
          {published.length === 0 && (
            <p className="mt-4 text-base text-muted-foreground">
              No modules ready yet. Publish a draft to assign it to staff.
            </p>
          )}
          <ul tabIndex={0} aria-label="Modules ready to assign" className={scrollList}>
            {published.map((m) => (
              <li key={m.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{m.title}</p>
                    <p className="text-base text-muted-foreground">
                      {primaryScenarios(m).length} questions ·{" "}
                      {m.needsReview ? (
                        <span className="text-[color:var(--warning-foreground)]">
                          Paused — needs checking
                        </span>
                      ) : (
                        "Ready to use"
                      )}
                    </p>
                  </div>
                  <Link to="/modules/review" search={{ id: m.id }} className={plainButton}>
                    Open
                  </Link>
                </div>
                <AssignControl moduleId={m.id} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Drafts ({draftModules.length})</h2>
            <Link to="/modules/create" className={plainButton}>
              + Create a module
            </Link>
          </div>
          {draftModules.length === 0 && (
            <p className="mt-4 text-base text-muted-foreground">
              No drafts. Press &ldquo;Create a module&rdquo; to make a new one.
            </p>
          )}
          <ul tabIndex={0} aria-label="Draft modules" className={scrollList}>
            {draftModules.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-lg font-semibold">{m.title}</p>
                  <p className="text-base text-muted-foreground">
                    {m.scenarios.length} questions · Draft — not visible to staff yet
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/modules/review" search={{ id: m.id }} className={bigButton}>
                    Review draft
                  </Link>
                  <button
                    type="button"
                    disabled={action.saving}
                    onClick={() => {
                      if (window.confirm(`Delete the draft "${m.title}"? This cannot be undone.`))
                        void action.run({ kind: "delete-draft", moduleId: m.id });
                    }}
                    className={`${plainButton} text-destructive`}
                  >
                    {action.pending?.kind === "delete-draft" && action.pending.moduleId === m.id
                      ? "Deleting…"
                      : "Delete draft"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Card className="mt-8">
        <h2 className="font-display text-xl font-semibold">Recently completed</h2>
        {results.length === 0 && (
          <p className="mt-4 text-base text-muted-foreground">
            Nothing completed yet. When staff finish a module, it shows here.
          </p>
        )}
        <ul className="mt-4 divide-y divide-border">
          {results.slice(0, 6).map((r, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-base font-semibold">
                  {traineeName(r.traineeId) || "A staff member"} finished {r.moduleTitle}
                </p>
                <p className="text-base text-muted-foreground">
                  {new Date(r.completedAt).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {r.confidence ? ` · Felt ${r.confidence} out of 5 confident` : ""}
                </p>
              </div>
              <p className="text-base font-semibold tabular-nums">
                {r.correct} of {r.total} correct
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </Shell>
  );
}

function AttentionItem({ text, action }: { text: ReactNode; action: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
      <p className="min-w-60 flex-1 text-base">{text}</p>
      {action}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-base text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </Card>
  );
}

function AssignControl({ moduleId }: { moduleId: string }) {
  const trainees = useApp((s) => s.trainees).filter((t) => !t.inactiveAt);
  const assignments = useApp((s) => s.assignments);
  const action = useManagerAction();
  const [open, setOpen] = useState(false);

  if (trainees.length === 0) return null;

  return (
    <div className="mt-3">
      {action.error && (
        <p role="alert" className="mb-2 text-base text-destructive">
          {action.error}
        </p>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={bigButton}>
        {open ? "Close staff list" : "Assign to staff"}
      </button>
      {open && (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {trainees.map((t) => {
            const assigned = assignments.some(
              (a) => a.traineeId === t.id && a.moduleId === moduleId && !a.withdrawnAt,
            );
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="text-base">{t.name || t.email}</span>
                {assigned ? (
                  <span className="flex flex-wrap items-center justify-end gap-3">
                    <span className="text-base font-semibold text-[color:var(--success)]">
                      ✓ Assigned
                    </span>
                    <button
                      disabled={action.saving}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Ask ${t.name || t.email} to do this module again from the start? Their earlier results are kept.`,
                          )
                        )
                          void action.run({ kind: "reassign", traineeId: t.id, moduleId });
                      }}
                      className={plainButton}
                    >
                      {action.pending?.kind === "reassign" && action.pending.traineeId === t.id
                        ? "Reassigning…"
                        : "Reassign"}
                    </button>
                  </span>
                ) : (
                  <button
                    disabled={action.saving}
                    onClick={() => void action.run({ kind: "assign", traineeId: t.id, moduleId })}
                    className={plainButton}
                  >
                    {action.pending &&
                    "traineeId" in action.pending &&
                    action.pending.traineeId === t.id
                      ? "Assigning…"
                      : "Assign"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
