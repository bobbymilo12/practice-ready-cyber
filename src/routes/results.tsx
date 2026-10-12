import { orderKey, orderLabels } from "@/lib/sequence";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { trainingAction, useConnection } from "@/lib/backend";
import { assignmentProgress, matchingFeedback } from "@/lib/training";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Results — PracticeReady" }] }),
  component: Results,
});

function Results() {
  const account = useApp((s) => s.account);
  const stored = useApp((s) => s.lastResult);
  const r = stored?.traineeId === account?.id ? stored : null;
  const assignments = useApp((s) => s.assignments).filter((a) => a.traineeId === account?.id);
  const modules = useApp((s) => s.modules);
  const sessions = useConnection((s) => s.sessions);
  const attempt = sessions.find((s) => s.id === r?.attemptId);
  const remaining = assignments.filter((a) => !assignmentProgress(a, sessions).completed);
  const next = remaining
    .map((a) => modules.find((m) => m.id === a.moduleId && m.published && !m.needsReview))
    .find(Boolean);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(r?.confidence ?? null);
  const [saved, setSaved] = useState<boolean>(typeof r?.confidence === "number");

  if (!r) {
    return (
      <Shell>
        <Card>
          <p>No recent results. Complete a training module to see your score.</p>
          <Link to="/staff" className="mt-3 inline-block text-primary hover:underline">
            Back to your training
          </Link>
        </Card>
      </Shell>
    );
  }

  const pct = Math.round((r.correct / r.total) * 100);
  const scoreLabel = pct >= 90 ? "Strong" : pct >= 60 ? "Building" : "Needs practice";

  const saveConfidence = async (value: number) => {
    if (!attempt || busy) return;
    setBusy(true);
    setError("");
    try {
      await trainingAction("confidence", {
        assignmentId: attempt.assignmentId,
        sessionId: attempt.id,
        value,
      });
      setConfidence(value);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save confidence.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <Badge tone="approved">Module completed</Badge>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{r.moduleTitle}</h1>

        <Card className="mt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {r.scoreBasis === "first_committed"
                  ? "First-answer score"
                  : "Recorded-answer score"}
              </div>
              <div className="mt-1 font-display text-4xl font-bold">
                {r.correct}
                <span className="text-muted-foreground">/{r.total}</span>
              </div>
              <div className="text-sm text-muted-foreground">{pct}%</div>
              <p className="mt-2 text-xs text-muted-foreground">
                {r.scoreBasis === "first_committed"
                  ? "Based on your first checked answer to each main question. Follow-up practice does not change this score."
                  : "This attempt began before explicit answer checking was introduced. Its saved responses are retained; earlier selections cannot be reconstructed."}
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Learning summary
              </div>
              <div className="mt-1 font-display text-2xl font-semibold">{scoreLabel}</div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completed
              </div>
              <div className="mt-1 text-sm">{new Date(r.completedAt).toLocaleString()}</div>
            </div>
          </div>
        </Card>

        {attempt && (
          <Card className="mt-5">
            <h2 className="font-display text-xl font-semibold">Question review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your selected answer, the correct answer and the practice guidance are shown after
              submission.
            </p>
            <ol className="mt-5 space-y-4">
              {attempt.answers.map((answer, index) => {
                const scenario = attempt.scenarios.find((item) => item.id === answer.scenarioId);
                if (!scenario) return null;
                if (scenario.kind === "matching") {
                  const feedback = matchingFeedback(scenario, answer.value);
                  return (
                    <li key={answer.scenarioId} className="rounded-xl border border-border p-4">
                      <h3 className="font-semibold">
                        {index + 1}. {scenario.title}
                      </h3>
                      <p className="mt-2 text-sm">
                        {feedback.filter((item) => item.correct).length} of {feedback.length}{" "}
                        matches correct · {answer.correct ? "Correct" : "Incorrect"} scenario
                      </p>
                      <ul className="mt-3 space-y-3 text-sm">
                        {feedback.map((item) => (
                          <li key={item.id}>
                            <strong>{item.label}</strong>:{" "}
                            {scenario.targets.find((t) => t.id === item.selected)?.label ??
                              "Not selected"}{" "}
                            — {item.correct ? "Correct" : "Incorrect"}
                            {!item.correct && (
                              <p>
                                Configured match:{" "}
                                {scenario.targets
                                  .filter((t) => item.validTargets.includes(t.id))
                                  .map((t) => t.label)
                                  .join(" or ")}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm text-muted-foreground">{scenario.learningPoint}</p>
                      {scenario.managerNote && (
                        <p className="mt-3 text-sm">From your manager: {scenario.managerNote}</p>
                      )}
                    </li>
                  );
                }
                const selected = Array.isArray(answer.value)
                  ? (scenario.kind === "order"
                      ? orderLabels(scenario, answer.value)
                      : answer.value
                    ).join(" → ")
                  : scenario.kind === "mcq" && typeof answer.value === "number"
                    ? scenario.options[answer.value]
                    : "Selected order";
                const correct =
                  scenario.kind === "mcq"
                    ? scenario.options[scenario.correctIndex]
                    : orderLabels(scenario, orderKey(scenario)).join(" → ");
                return (
                  <li key={answer.scenarioId} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-semibold">
                        {index + 1}. {scenario.title}
                      </h3>
                      <Badge tone={answer.correct ? "approved" : "draft"}>
                        {answer.correct ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm">
                      <strong>Your answer:</strong> {selected}
                    </p>
                    <p className="mt-2 text-sm">
                      <strong>Correct answer:</strong> {correct}
                    </p>
                    <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                      {scenario.learningPoint}
                    </p>
                    {scenario.managerNote && (
                      <p className="mt-3 whitespace-pre-line text-sm">
                        <strong>From your manager:</strong> {scenario.managerNote}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        {assignments.length > 0 && remaining.length === 0 && (
          <Card className="mt-5 border-accent">
            <h2 className="text-xl font-semibold">All assigned training completed!</h2>
            <p className="mt-2 text-sm">Your manager can see your progress and achievements.</p>
          </Card>
        )}
        {next && (
          <Card className="mt-5">
            <h2 className="text-lg font-semibold">Next assigned module</h2>
            <p className="mt-2">{next.title}</p>
            <Link
              to="/train"
              search={{ id: next.id }}
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground"
            >
              Continue Training →
            </Link>
          </Card>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {(r.recoveredTitles?.length ?? 0) > 0 && (
          <Card className="mt-5">
            <h2 className="text-lg font-semibold">Improved with extra practice</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {r.recoveredTitles?.map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Your score above records your first answers. These topics were answered correctly in a
              different follow-up situation.
            </p>
          </Card>
        )}
        {/* Confidence check */}
        <Card className="mt-5">
          <h3 className="font-display text-lg font-semibold">Confidence check</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            How confident do you feel handling this in a real call? This helps your manager know
            where to give extra support — it is not a test score.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((v) => {
              const active = confidence === v;
              return (
                <button
                  key={v}
                  disabled={busy}
                  onClick={() => void saveConfidence(v)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {v} — {["Not yet", "Shaky", "OK", "Confident", "Very confident"][v - 1]}
                </button>
              );
            })}
          </div>
          {saved && confidence !== null && (
            <p className="mt-3 text-xs text-[color:var(--success)]">
              Saved. You can change this any time.
            </p>
          )}
        </Card>

        <Card className="mt-5">
          <h3 className="font-display text-lg font-semibold">Areas to review</h3>
          {r.wrongTitles.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              You have no outstanding topics from this attempt. Revisit the learning points to
              reinforce what you've practised.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {r.wrongTitles.map((t) => (
                <li key={t} className="rounded-lg border border-border bg-surface px-3 py-2">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          Results are for learning support only. They are not a performance assessment or a
          disciplinary measure. Speak with your manager if any topic feels unclear.
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/train"
            search={{ id: r.moduleId }}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
          >
            Retake module
          </Link>
          <Link
            to="/staff"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Back to your training
          </Link>
        </div>
      </div>
    </Shell>
  );
}
