import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Results — PracticeReady" }] }),
  component: Results,
});

function Results() {
  const r = useApp((s) => s.lastResult);

  if (!r) {
    return (
      <Shell>
        <Card>
          <p>No recent results. Complete a training module to see your score.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-primary hover:underline">
            Back to dashboard
          </Link>
        </Card>
      </Shell>
    );
  }

  const pct = Math.round((r.correct / r.total) * 100);
  const confidence = pct >= 90 ? "High" : pct >= 60 ? "Building" : "Needs practice";

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
                Confidence check
              </div>
              <div className="mt-1 font-display text-2xl font-semibold">{confidence}</div>
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

        <Card className="mt-5">
          <h3 className="font-display text-lg font-semibold">Areas to review</h3>
          {r.wrongTitles.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              You picked the best answer for every scenario. Consider revisiting the learning
              points to reinforce your knowledge.
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
            to="/dashboard"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </Shell>
  );
}
