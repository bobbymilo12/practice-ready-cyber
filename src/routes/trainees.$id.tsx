import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp, RESULT_EMOJIS } from "@/lib/store";

export const Route = createFileRoute("/trainees/$id")({
  head: () => ({
    meta: [
      { title: "Trainee progress — PracticeReady" },
      {
        name: "description",
        content:
          "See how a reception or admin trainee is progressing through their assigned PracticeReady modules.",
      },
      { property: "og:title", content: "Trainee progress — PracticeReady" },
      {
        property: "og:description",
        content: "Module-by-module results, repeated attempts and reassignment for one trainee.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TraineeDetail,
});

function TraineeDetail() {
  const { id } = Route.useParams();
  const trainee = useApp((s) => s.trainees.find((t) => t.id === id));
  const modules = useApp((s) => s.modules);
  const results = useApp((s) => s.results);
  const assignments = useApp((s) => s.assignments);
  const assignModule = useApp((s) => s.assignModule);
  const markResult = useApp((s) => s.markResult);

  if (!trainee) {
    return (
      <Shell>
        <Card>
          <p className="text-sm">Trainee not found.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-primary hover:underline">
            Back to dashboard
          </Link>
        </Card>
      </Shell>
    );
  }

  const myResults = results.filter((r) => r.traineeId === trainee.id);
  const assigned = assignments.filter((a) => a.traineeId === trainee.id);
  const assignedModules = assigned
    .map((a) => modules.find((m) => m.id === a.moduleId))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const perModule = assignedModules.map((m) => {
    const attempts = myResults
      .filter((r) => r.moduleId === m.id)
      .sort((a, b) => b.completedAt - a.completedAt);
    const best = attempts.reduce(
      (acc, r) => Math.max(acc, r.total ? r.correct / r.total : 0),
      0,
    );
    const failedCount = attempts.filter((r) => (r.total ? r.correct / r.total : 0) < 0.7).length;
    return { module: m, attempts, best, failedCount };
  });

  const overall =
    perModule.length > 0
      ? Math.round(
          (perModule.reduce((a, p) => a + p.best, 0) / perModule.length) * 100,
        )
      : 0;

  const unassigned = modules.filter(
    (m) => m.published && !assigned.some((a) => a.moduleId === m.id),
  );

  return (
    <Shell>
      <Link to="/dashboard" className="text-sm text-primary hover:underline">
        ← Back to dashboard
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{trainee.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{trainee.email}</p>
        </div>
        <Badge tone={trainee.status === "active" ? "approved" : "draft"}>
          {trainee.status === "active" ? "Active" : "Invited"}
        </Badge>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Overall across assigned modules</p>
            <p className="mt-1 font-display text-4xl font-bold">{overall}%</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {perModule.length} assigned · {myResults.length} attempts logged
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-accent" style={{ width: `${overall}%` }} />
        </div>
      </Card>

      <h2 className="mt-10 font-display text-xl font-semibold">Module results</h2>
      <div className="mt-4 space-y-4">
        {perModule.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">
              No modules assigned yet. Assign one below.
            </p>
          </Card>
        )}
        {perModule.map(({ module, attempts, best, failedCount }) => {
          const latest = attempts[0];
          return (
            <Card key={module.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {module.type}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-semibold">{module.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {attempts.length === 0
                      ? "Not started"
                      : `Best ${Math.round(best * 100)}% · ${attempts.length} attempt${
                          attempts.length === 1 ? "" : "s"
                        } · last ${new Date(latest.completedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => assignModule(trainee.id, module.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface"
                >
                  Redo — reassign module
                </button>
              </div>

              {failedCount >= 3 && (
                <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  Flagged: scored below 70% on this module {failedCount} times. Worth a
                  conversation or a side-by-side run-through.
                </div>
              )}

              {attempts.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {attempts.slice(0, 5).map((r) => (
                    <li
                      key={r.completedAt}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                    >
                      <div>
                        <span className="font-medium tabular-nums">
                          {r.correct}/{r.total}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {new Date(r.completedAt).toLocaleString()}
                          {r.confidence ? ` · confidence ${r.confidence}/5` : ""}
                        </span>
                        {r.wrongTitles.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            To review: {r.wrongTitles.join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {RESULT_EMOJIS.map((e) => (
                          <button
                            key={e}
                            onClick={() =>
                              markResult(trainee.id, r.moduleId, r.completedAt, e)
                            }
                            aria-label={`Mark with ${e}`}
                            className={`rounded-md px-1.5 py-1 text-base transition ${
                              r.emoji === e ? "bg-primary/10 ring-1 ring-primary" : "opacity-50 hover:opacity-100"
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <Card className="mt-8">
          <h2 className="font-display text-lg font-semibold">Assign another module</h2>
          <div className="mt-4 space-y-2">
            {unassigned.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div className="font-medium">{m.title}</div>
                <button
                  onClick={() => assignModule(trainee.id, m.id)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-10 rounded-xl border border-border bg-surface p-4 text-xs text-muted-foreground">
        Results support onboarding conversations. They are not an assessment or a performance
        measure, and they do not replace statutory or mandatory training.
      </div>
    </Shell>
  );
}
