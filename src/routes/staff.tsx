import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp } from "@/lib/store";
import { useConnection, loadWorkspace } from "@/lib/backend";
import { assignmentProgress, primaryScenarios, resumableAttempt } from "@/lib/training";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Your training — PracticeReady" }] }),
  component: Staff,
});

function Staff() {
  const state = useApp();
  const sessions = useConnection((s) => s.sessions);
  const mine = state.assignments.filter((a) => a.traineeId === state.account?.id && !a.withdrawnAt);
  const withdrawn = state.assignments.filter(
    (a) => a.traineeId === state.account?.id && a.withdrawnAt,
  );
  const rows = mine.map((a) => ({
    assignment: a,
    module: state.modules.find((m) => m.id === a.moduleId),
    ...assignmentProgress(
      a,
      sessions,
      state.modules.find((m) => m.id === a.moduleId),
    ),
  }));
  const induction = state.packages.find((p) => p.kind === "induction");
  const inductionRows = induction
    ? rows.filter((row) => induction.moduleIds.includes(row.assignment.moduleId))
    : [];
  const inductionCompleted = inductionRows.filter((row) => row.completed).length;
  const inductionProgress = inductionRows.length
    ? Math.round(
        (inductionRows.reduce((sum, row) => sum + row.fraction, 0) / inductionRows.length) * 100,
      )
    : 0;
  const completed = rows.filter((r) => r.completed).length;
  const overall = rows.length
    ? Math.round((rows.reduce((sum, r) => sum + r.fraction, 0) / rows.length) * 100)
    : 0;
  const ready = rows.filter(
    (r) =>
      !r.completed &&
      r.module?.published &&
      !r.module.needsReview &&
      primaryScenarios(r.module).length,
  );
  const next = [...ready].sort(
    (a, b) => (b.latest?.updatedAt ?? 0) - (a.latest?.updatedAt ?? 0),
  )[0];
  const allDone = rows.length > 0 && completed === rows.length;
  const latestResults = rows.flatMap((row) => {
    const result = [...sessions]
      .filter((s) => s.assignmentId === row.assignment.id && s.result)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.result;
    return result ? [result] : [];
  });
  return (
    <Shell>
      <p className="text-sm text-muted-foreground">
        {state.practiceData.practiceName} · {state.account?.name}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold">Your training</h1>
      <p className="mt-3 text-muted-foreground">
        Choose a module below. Your progress saves after each checked answer.
      </p>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Assigned modules</p>
          <p className="mt-2 text-3xl font-bold">{rows.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-2 text-3xl font-bold">
            {completed} <span className="text-lg text-muted-foreground">of {rows.length}</span>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Overall training progress</p>
          <p className="mt-2 text-3xl font-bold">{overall}%</p>
          <progress
            aria-label="Overall training progress"
            value={overall}
            max={100}
            className="mt-3 h-2 w-full accent-primary"
          />
        </Card>
      </section>
      {induction && (
        <Card className="mt-6 border-primary/30 bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Training package</p>
              <h2 className="mt-1 font-display text-xl font-semibold">{induction.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{induction.description}</p>
            </div>
            <p className="text-sm font-semibold">
              {inductionCompleted} of {inductionRows.length} modules complete
            </p>
          </div>
          <progress
            aria-label="Induction Package progress"
            value={inductionProgress}
            max={100}
            className="mt-4 h-2 w-full accent-primary"
          />
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {inductionRows.map((row) => (
              <li
                key={row.assignment.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{row.module?.title ?? "Induction module"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.completed && row.latest?.result
                    ? `${Math.round((row.latest.result.correct / Math.max(row.latest.result.total, 1)) * 100)}%`
                    : row.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {allDone && (
        <div role="status" className="mt-6 rounded-2xl border border-accent bg-accent/10 p-6">
          <h2 className="text-xl font-bold">All assigned training completed!</h2>
          <p className="mt-2 text-sm">
            You've finished all the onboarding and training currently assigned to you. Your manager
            can see your achievements. You can still revisit areas that need practice.
          </p>
        </div>
      )}
      {next?.module && (
        <Card className="mt-6 border-primary/30">
          <p className="text-sm text-muted-foreground">
            {next.latest ? "Pick up where you left off" : "Your next module"}
          </p>
          <h2 className="mt-2 text-xl font-semibold">{next.module.title}</h2>
          <Link
            to="/train"
            search={{ id: next.module.id }}
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Continue Training →
          </Link>
        </Card>
      )}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Assigned modules</h2>
        <button
          onClick={() => void loadWorkspace().catch(() => {})}
          className="text-sm text-primary"
        >
          Refresh assignments
        </button>
      </div>
      {!rows.length && (
        <Card className="mt-4">
          <h3 className="font-semibold">You're ready for your first assignment</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your manager hasn't assigned any modules yet. Check back once they have prepared your
            training.
          </p>
        </Card>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {rows.map((row) => {
          const m = row.module;
          const available = m?.published && !m.needsReview && primaryScenarios(m).length > 0;
          const result = [...sessions]
            .filter((s) => s.assignmentId === row.assignment.id && s.result)
            .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.result;
          return (
            <Card key={row.assignment.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">
                  {m?.title ?? "Assigned module"}
                </h3>
                <Badge tone={row.completed ? "approved" : row.latest ? "info" : "neutral"}>
                  {row.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {m ? `${primaryScenarios(m).length} scenarios` : "Waiting for your manager"}
                {row.assignment.dueDate ? ` · Due ${row.assignment.dueDate}` : ""}
              </p>
              {!row.completed &&
                available &&
                m &&
                !row.latest &&
                sessions.some(
                  (s) =>
                    s.assignmentId === row.assignment.id && !s.result && !resumableAttempt(s, m),
                ) && (
                  <p className="mt-2 text-sm">
                    Training updated — start the updated module. Your earlier answers are kept.
                  </p>
                )}
              {row.latest && !row.completed && (
                <p className="mt-2 text-sm">
                  {row.latest.answers.length} of {row.latest.queue.length} answers saved
                </p>
              )}
              {result && (
                <p className="mt-2 text-sm">
                  Score: {result.correct}/{result.total} ·{" "}
                  {Math.round((result.correct / Math.max(result.total, 1)) * 100)}%
                  {state.emojiMarks[`${state.account?.id}:${result.moduleId}:${result.completedAt}`]
                    ? ` · Manager: ${state.emojiMarks[`${state.account?.id}:${result.moduleId}:${result.completedAt}`]}`
                    : ""}
                </p>
              )}
              <progress
                aria-label={`${m?.title ?? "Module"} progress`}
                value={row.fraction * 100}
                max={100}
                className="mt-3 h-2 w-full accent-primary"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                {available ? (
                  <Link
                    to="/train"
                    search={{ id: m.id }}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    {row.completed
                      ? "Practise again"
                      : row.latest
                        ? "Continue module"
                        : "Start module"}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Awaiting manager review</p>
                )}
                {result && (
                  <Link
                    to="/results"
                    onClick={() => useApp.setState({ lastResult: result })}
                    className="rounded-xl border border-border px-4 py-2 text-sm"
                  >
                    View results
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {withdrawn.length > 0 && (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold">Withdrawn training</h2>
          <p className="mt-2 text-sm">
            These assignments no longer count towards your current training. Your saved answers and
            completed results are kept.
          </p>
          {withdrawn.map((a) => (
            <div key={a.id} className="mt-3 border-t border-border pt-3 text-sm">
              <p>
                {state.modules.find((m) => m.id === a.moduleId)?.title ?? "Training module"} ·
                Withdrawn
              </p>
              {sessions
                .filter((s) => s.assignmentId === a.id && s.result)
                .map((s) => (
                  <Link
                    key={s.id}
                    to="/results"
                    onClick={() => useApp.setState({ lastResult: s.result! })}
                    className="mr-4 inline-block text-primary underline"
                  >
                    View completed result ({s.result!.correct}/{s.result!.total})
                  </Link>
                ))}
            </div>
          ))}
        </Card>
      )}
      {latestResults.length > 0 && (
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold">Your strengths</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ...new Set(
                  latestResults.flatMap((r) => [
                    ...(r.strongTitles ?? []),
                    ...(r.recoveredTitles ?? []),
                  ]),
                ),
              ].map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
            </ul>
            {!latestResults.some((r) => r.strongTitles?.length || r.recoveredTitles?.length) && (
              <p className="mt-2 text-sm text-muted-foreground">
                Keep practising to build confidence in these topics.
              </p>
            )}
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Areas to practise</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[...new Set(latestResults.flatMap((r) => r.wrongTitles))].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {latestResults.every((r) => !r.wrongTitles.length) && (
              <p className="mt-2 text-sm text-muted-foreground">
                No outstanding topics from your latest attempts.
              </p>
            )}
          </Card>
        </section>
      )}
    </Shell>
  );
}
