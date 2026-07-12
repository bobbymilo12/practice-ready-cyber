import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Trainee dashboard — PracticeReady" }] }),
  component: Staff,
});

function Staff() {
  const modules = useApp((s) => s.modules);
  const results = useApp((s) => s.results);
  const available = modules.filter((m) => m.published);

  // Latest result per module
  const latestByModule = new Map<string, (typeof results)[number]>();
  for (const r of results) {
    if (!latestByModule.has(r.moduleId)) latestByModule.set(r.moduleId, r);
  }

  const completed = available.filter((m) => latestByModule.has(m.id));
  const todo = available.filter((m) => !latestByModule.has(m.id));

  const confidenceValues = results
    .map((r) => r.confidence)
    .filter((c): c is number => typeof c === "number");
  const avgConfidence =
    confidenceValues.length > 0
      ? (
          confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
        ).toFixed(1)
      : "—";

  return (
    <Shell>
      <div>
        <p className="text-sm text-muted-foreground">Signed in as Amira K. · Reception trainee</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Your training</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Work through modules at your own pace. This is practice, not an assessment —
          you can retake any module and results are only shared with your manager to
          support your learning.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-muted-foreground">Assigned</div>
          <div className="mt-2 font-display text-3xl font-bold">{available.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="mt-2 font-display text-3xl font-bold">{completed.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Average confidence</div>
          <div className="mt-2 font-display text-3xl font-bold">{avgConfidence}<span className="text-lg text-muted-foreground">/5</span></div>
        </Card>
      </section>

      {/* Available */}
      <h2 className="mt-10 font-display text-xl font-semibold">Available modules</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {todo.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">
              {available.length === 0
                ? "No modules published yet. Your manager will let you know when training is ready."
                : "You've started every module — nice work. Retake any from Completed to keep it fresh."}
            </p>
          </Card>
        )}
        {todo.map((m) => {
          const mcqCount = m.scenarios.filter((s) => s.kind === "mcq").length;
          const orderCount = m.scenarios.filter((s) => s.kind === "order").length;
          return (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.type}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-semibold">{m.title}</h3>
                </div>
                <Badge tone="approved">Ready</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {m.scenarios.length} scenarios
                {mcqCount > 0 && ` · ${mcqCount} multiple choice`}
                {orderCount > 0 && ` · ${orderCount} order-the-steps`}
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  to="/train"
                  search={{ id: m.id }}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Start module →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-semibold">Completed</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {completed.map((m) => {
              const r = latestByModule.get(m.id)!;
              const pct = Math.round((r.correct / r.total) * 100);
              return (
                <Card key={m.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {m.type}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold">{m.title}</h3>
                    </div>
                    <Badge tone="approved">Done</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div>
                      <span className="font-semibold">{r.correct}/{r.total}</span>{" "}
                      <span className="text-muted-foreground">({pct}%)</span>
                    </div>
                    {r.confidence && (
                      <div className="text-muted-foreground">
                        Confidence {r.confidence}/5
                      </div>
                    )}
                    <div className="text-muted-foreground">
                      {new Date(r.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/train"
                      search={{ id: m.id }}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface"
                    >
                      Retake
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-10 rounded-xl border border-border bg-surface p-4 text-xs text-muted-foreground">
        PracticeReady supports local onboarding. Always follow your practice's real
        protocols and your manager's instructions in live situations. Not a substitute
        for mandatory training or clinical advice.
      </div>
    </Shell>
  );
}
