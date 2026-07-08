import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Trainee dashboard — PracticeReady" }] }),
  component: Staff,
});

function Staff() {
  const modules = useApp((s) => s.modules);
  const available = modules.filter((m) => m.published);

  // Demo assignment: pretend the first module is completed
  const completedIds = new Set(available.slice(0, 0).map((m) => m.id));

  return (
    <Shell>
      <div>
        <p className="text-sm text-muted-foreground">Signed in as Amira K. · Reception trainee</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Your training</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Complete each module at your own pace. You can retake any module as many times as you'd
          like — this is practice, not an assessment.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-muted-foreground">Assigned</div>
          <div className="mt-2 font-display text-3xl font-bold">{available.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="mt-2 font-display text-3xl font-bold">{completedIds.size}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Average confidence</div>
          <div className="mt-2 font-display text-3xl font-bold">—</div>
        </Card>
      </section>

      <h2 className="mt-10 font-display text-xl font-semibold">Available modules</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {available.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">
              No modules have been published yet. Your manager will let you know when training is
              ready.
            </p>
          </Card>
        )}
        {available.map((m) => {
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
                {m.scenarios.length} scenarios ·{" "}
                {mcqCount > 0 && `${mcqCount} multiple choice`}
                {mcqCount > 0 && orderCount > 0 && " · "}
                {orderCount > 0 && `${orderCount} order-the-steps`}
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

      <div className="mt-10 rounded-xl border border-border bg-surface p-4 text-xs text-muted-foreground">
        PracticeReady is a training aid. Always follow your practice's real protocols and your
        manager's instructions in live situations.
      </div>
    </Shell>
  );
}
