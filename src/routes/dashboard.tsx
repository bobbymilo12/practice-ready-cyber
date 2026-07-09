import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Manager dashboard — PracticeReady" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const modules = useApp((s) => s.modules);
  const drafts = modules.flatMap((m) => m.scenarios.filter((s) => s.status === "draft"));
  const published = modules.filter((m) => m.published);
  const draftModules = modules.filter((m) => !m.published);

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Willow Lane Medical Practice</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Manager dashboard
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/data-hub"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-surface"
          >
            Data hub
          </Link>
          <Link
            to="/modules/create"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            + Create new module
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label="Draft scenarios" value={drafts.length || 3} tone="draft" />
        <Stat label="Modules published" value={published.length || 1} tone="approved" />
        <Stat label="Trainees invited" value={4} tone="info" />
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <Link to="/modules/create" className="group">
          <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              +
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">Create new module</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a module type and let the AI assistant draft scenarios from your local
              process.
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
              <Link
                key={m.id}
                to="/modules/review"
                search={{ id: m.id }}
                className="block rounded-lg border border-border p-3 text-sm hover:border-primary/40"
              >
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">
                  {m.scenarios.length} scenarios · manager review required
                </div>
              </Link>
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
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-10">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Staff completion</h3>
            <span className="text-xs text-muted-foreground">Sample data</span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { name: "Amira K.", role: "Reception trainee", pct: 100 },
              { name: "Jordan P.", role: "Reception trainee", pct: 66 },
              { name: "Sam R.", role: "Admin trainee", pct: 25 },
              { name: "Priya S.", role: "Reception trainee", pct: 0 },
            ].map((t) => (
              <div key={t.name} className="grid grid-cols-[1fr_2fr_auto] items-center gap-4">
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
                <div className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                  {t.pct}%
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
        <Badge tone={tone}>{tone === "draft" ? "Review" : tone === "approved" ? "Live" : "Team"}</Badge>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
    </Card>
  );
}
