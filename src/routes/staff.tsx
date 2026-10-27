import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card } from "@/components/Shell";
import { useApp } from "@/lib/store";
import { useConnection } from "@/lib/backend";
import { useLiveWorkspace } from "@/hooks/use-live-workspace";
import { assignmentProgress, primaryScenarios, resumableAttempt } from "@/lib/training";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Your training — PracticeReady" }] }),
  component: Staff,
});

const bigButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-primary-foreground hover:opacity-90";
const plainButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 py-2.5 text-base font-semibold hover:bg-surface";

// Due dates are stored as YYYY-MM-DD; read them as local midnight so the day doesn't shift.
const formatDue = (date: string) =>
  new Date(`${date}T00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

function Staff() {
  useLiveWorkspace();
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
  const todo = rows.filter((r) => !r.completed);
  const finished = rows.filter((r) => r.completed);

  const moduleCard = (row: (typeof rows)[number]) => {
    const m = row.module;
    const available = m?.published && !m.needsReview && primaryScenarios(m).length > 0;
    const result = [...sessions]
      .filter((s) => s.assignmentId === row.assignment.id && s.result)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.result;
    const mark =
      result && state.emojiMarks[`${state.account?.id}:${result.moduleId}:${result.completedAt}`];
    return (
      <Card key={row.assignment.id}>
        <h3 className="font-display text-xl font-semibold">{m?.title ?? "Assigned module"}</h3>
        <p className="mt-2 text-base text-muted-foreground">
          {m ? `${primaryScenarios(m).length} questions` : "Waiting for your manager"}
          {row.completed ? " · Finished" : row.latest ? " · Started" : " · Not started"}
        </p>
        {row.assignment.dueDate && !row.completed && (
          <p className="mt-1 text-base font-semibold">Due {formatDue(row.assignment.dueDate)}</p>
        )}
        {!row.completed &&
          available &&
          m &&
          !row.latest &&
          sessions.some(
            (s) => s.assignmentId === row.assignment.id && !s.result && !resumableAttempt(s, m),
          ) && (
            <p className="mt-2 text-base">
              This training was updated. Start it again — your earlier answers are kept.
            </p>
          )}
        {row.latest && !row.completed && (
          <p className="mt-2 text-base">
            {row.latest.answers.length} of {row.latest.queue.length} questions answered
          </p>
        )}
        {result && (
          <p className="mt-2 text-base">
            Score: {result.correct} of {result.total} correct (
            {Math.round((result.correct / Math.max(result.total, 1)) * 100)}%)
            {mark ? ` · Your manager: ${mark}` : ""}
          </p>
        )}
        <progress
          aria-label={`${m?.title ?? "Module"} progress`}
          value={row.fraction * 100}
          max={100}
          className="mt-3 h-3 w-full accent-primary"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          {available ? (
            <Link to="/train" search={{ id: m.id }} className={bigButton}>
              {row.completed ? "Practise again" : row.latest ? "Carry on" : "Start"}
            </Link>
          ) : (
            <p className="text-base text-muted-foreground">
              Your manager is checking this module. You can start it once they have finished.
            </p>
          )}
          {result && (
            <Link
              to="/results"
              onClick={() => useApp.setState({ lastResult: result })}
              className={plainButton}
            >
              See my results
            </Link>
          )}
        </div>
      </Card>
    );
  };

  return (
    <Shell>
      <p className="text-base text-muted-foreground">{state.practiceData.practiceName}</p>
      <h1 className="mt-2 font-display text-3xl font-bold">
        {state.account?.name ? `Hello, ${state.account.name}` : "Your training"}
      </h1>
      <p className="mt-3 text-lg">Your progress saves after every question you answer.</p>
      {next?.module && (
        <Card className="mt-6 border-2 border-primary/40 bg-primary/5">
          <p className="text-base text-muted-foreground">
            {next.latest ? "Carry on where you left off" : "Your next module"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{next.module.title}</h2>
          <Link
            to="/train"
            search={{ id: next.module.id }}
            className="mt-4 inline-flex min-h-14 items-center rounded-xl bg-primary px-8 text-lg font-semibold text-primary-foreground hover:opacity-90"
          >
            {next.latest ? "Carry on training →" : "Start training →"}
          </Link>
        </Card>
      )}
      {allDone && (
        <div role="status" className="mt-6 rounded-2xl border border-accent bg-accent/10 p-6">
          <h2 className="text-xl font-bold">You've finished all your training!</h2>
          <p className="mt-2 text-base">
            Your manager can see your results. You can practise any module again below.
          </p>
        </div>
      )}
      {!rows.length && (
        <Card className="mt-6">
          <h2 className="text-xl font-semibold">No training yet</h2>
          <p className="mt-2 text-base">
            Your manager hasn't given you any training yet. It will appear here when they do.
          </p>
        </Card>
      )}
      {rows.length > 0 && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-base text-muted-foreground">Modules to do</p>
            <p className="mt-2 text-3xl font-bold">{todo.length}</p>
          </Card>
          <Card>
            <p className="text-base text-muted-foreground">Modules finished</p>
            <p className="mt-2 text-3xl font-bold">
              {completed} <span className="text-lg text-muted-foreground">of {rows.length}</span>
            </p>
          </Card>
          <Card>
            <p className="text-base text-muted-foreground">Overall progress</p>
            <p className="mt-2 text-3xl font-bold">{overall}%</p>
            <progress
              aria-label="Overall training progress"
              value={overall}
              max={100}
              className="mt-3 h-3 w-full accent-primary"
            />
          </Card>
        </section>
      )}
      {induction && (
        <Card className="mt-6 border-primary/30 bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-base text-muted-foreground">Training package</p>
              <h2 className="mt-1 font-display text-xl font-semibold">{induction.title}</h2>
              <p className="mt-1 text-base text-muted-foreground">{induction.description}</p>
            </div>
            <p className="text-base font-semibold">
              {inductionCompleted} of {inductionRows.length} modules finished
            </p>
          </div>
          <progress
            aria-label="Induction Package progress"
            value={inductionProgress}
            max={100}
            className="mt-4 h-3 w-full accent-primary"
          />
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {inductionRows.map((row) => (
              <li
                key={row.assignment.id}
                className="flex items-center justify-between gap-3 text-base"
              >
                <span>{row.module?.title ?? "Induction module"}</span>
                <span className="shrink-0 text-muted-foreground">
                  {row.completed && row.latest?.result
                    ? `${Math.round((row.latest.result.correct / Math.max(row.latest.result.total, 1)) * 100)}%`
                    : row.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {todo.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-2xl font-semibold">To do</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">{todo.map(moduleCard)}</div>
        </>
      )}
      {finished.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-2xl font-semibold">Finished</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">{finished.map(moduleCard)}</div>
        </>
      )}
      {withdrawn.length > 0 && (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold">Training you no longer need to do</h2>
          <p className="mt-2 text-base">
            Your manager removed these. They don't count towards your training any more, but your
            answers and results are kept.
          </p>
          {withdrawn.map((a) => (
            <div key={a.id} className="mt-3 border-t border-border pt-3 text-base">
              <p>{state.modules.find((m) => m.id === a.moduleId)?.title ?? "Training module"}</p>
              {sessions
                .filter((s) => s.assignmentId === a.id && s.result)
                .map((s) => (
                  <Link
                    key={s.id}
                    to="/results"
                    onClick={() => useApp.setState({ lastResult: s.result! })}
                    className="mr-4 inline-block text-primary underline"
                  >
                    See result ({s.result!.correct} of {s.result!.total} correct)
                  </Link>
                ))}
            </div>
          ))}
        </Card>
      )}
      {latestResults.length > 0 && (
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold">What you're good at</h2>
            <ul className="mt-3 space-y-2 text-base">
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
              <p className="mt-2 text-base text-muted-foreground">
                Keep practising to build confidence in these topics.
              </p>
            )}
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Worth practising again</h2>
            <ul className="mt-3 space-y-2 text-base">
              {[...new Set(latestResults.flatMap((r) => r.wrongTitles))].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {latestResults.every((r) => !r.wrongTitles.length) && (
              <p className="mt-2 text-base text-muted-foreground">
                Nothing to practise again from your latest attempts.
              </p>
            )}
          </Card>
        </section>
      )}
    </Shell>
  );
}
