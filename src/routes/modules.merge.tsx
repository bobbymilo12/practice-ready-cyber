import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp } from "@/lib/store";
import { useManagerAction } from "@/hooks/use-manager-action";

export const Route = createFileRoute("/modules/merge")({
  head: () => ({
    meta: [
      { title: "Merge modules — PracticeReady" },
      {
        name: "description",
        content:
          "Combine two or more onboarding modules into a single training module for your reception team.",
      },
      { property: "og:title", content: "Merge modules — PracticeReady" },
      {
        property: "og:description",
        content: "Join related PracticeReady modules into one longer onboarding module.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MergePage,
});

function MergePage() {
  const nav = useNavigate();
  const modules = useApp((s) => s.modules);
  const action = useManagerAction();

  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("Combined onboarding module");

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const total = modules
    .filter((m) => picked.includes(m.id))
    .reduce((a, m) => a + m.scenarios.length, 0);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <Link to="/dashboard" className="text-sm text-primary hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Merge modules</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick two or more modules to combine. The new module starts as a draft so you can review
          the full set of scenarios before publishing. Questions from paused modules require fresh
          approval.
        </p>

        {action.error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {action.error}
          </p>
        )}
        <fieldset disabled={action.saving} className="min-w-0">
          <Card className="mt-6">
            <div className="space-y-2">
              {modules.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                    picked.includes(m.id) ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={picked.includes(m.id)}
                    onChange={() => toggle(m.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">{m.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {m.type} · {m.scenarios.length} scenarios ·{" "}
                      {m.needsReview
                        ? "Needs review — training paused"
                        : m.published
                          ? "published"
                          : "draft"}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <label className="mt-5 block text-sm">
              <span className="font-medium">New module title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <p className="mt-3 text-xs text-muted-foreground">
              {picked.length < 2
                ? "Select at least two modules."
                : `${total} scenarios will be combined (duplicates removed).`}
            </p>

            <button
              disabled={action.saving || picked.length < 2 || !title.trim()}
              onClick={() => {
                const id = crypto.randomUUID();
                void action.run(
                  { kind: "merge", moduleId: id, moduleIds: picked, title: title.trim() },
                  () => nav({ to: "/modules/review", search: { id } }),
                );
              }}
              className="mt-4 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {action.pending ? "Merging…" : "Merge into one module"}
            </button>
          </Card>
        </fieldset>
      </div>
    </Shell>
  );
}
