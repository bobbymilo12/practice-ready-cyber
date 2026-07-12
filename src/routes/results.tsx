import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Results — PracticeReady" }] }),
  component: Results,
});

function Results() {
  const r = useApp((s) => s.lastResult);
  const results = useApp((s) => s.results);
  const setResults = useApp.setState;
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

  const saveConfidence = (value: number) => {
    setConfidence(value);
    // Update the most recent matching result in history + lastResult
    const updated = { ...r, confidence: value };
    const newResults = results.map((x) =>
      x.completedAt === r.completedAt && x.moduleId === r.moduleId ? updated : x,
    );
    setResults({ lastResult: updated, results: newResults });
    setSaved(true);
  };

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <Badge tone="approved">Module completed</Badge>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
          {r.moduleTitle}
        </h1>

        <Card className="mt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Score
              </div>
              <div className="mt-1 font-display text-4xl font-bold">
                {r.correct}
                <span className="text-muted-foreground">/{r.total}</span>
              </div>
              <div className="text-sm text-muted-foreground">{pct}%</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Learning summary
              </div>
              <div className="mt-1 font-display text-2xl font-semibold">{scoreLabel}</div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completed
              </div>
              <div className="mt-1 text-sm">
                {new Date(r.completedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>

        {/* Confidence check */}
        <Card className="mt-5">
          <h3 className="font-display text-lg font-semibold">Confidence check</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            How confident do you feel handling this in a real call? This helps your
            manager know where to give extra support — it is not a test score.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((v) => {
              const active = confidence === v;
              return (
                <button
                  key={v}
                  onClick={() => saveConfidence(v)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {v} — {["Not yet", "Shaky", "Ok", "Confident", "Very confident"][v - 1]}
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
              You picked the best answer for every scenario. Revisit the learning points
              to reinforce what you've practised.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {r.wrongTitles.map((t) => (
                <li
                  key={t}
                  className="rounded-lg border border-border bg-surface px-3 py-2"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          Results are for learning support only. They are not a performance assessment or
          a disciplinary measure. Speak with your manager if any topic feels unclear.
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
