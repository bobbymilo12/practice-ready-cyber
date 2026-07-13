import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp, type Scenario } from "@/lib/store";

export const Route = createFileRoute("/modules/review")({
  head: () => ({ meta: [{ title: "Review draft scenarios — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || "" }),
  component: Review,
});

function Review() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const module = useApp((s) => s.modules.find((m) => m.id === id));
  const { approveScenario, deleteScenario, regenerateScenario, updateScenario, publishModule } =
    useApp();

  if (!module) {
    return (
      <Shell>
        <Card>
          <p>Module not found.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-primary hover:underline">
            Back to dashboard
          </Link>
        </Card>
      </Shell>
    );
  }

  const allApproved =
    module.scenarios.length > 0 && module.scenarios.every((s) => s.status === "approved");

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {module.type} · AI-assisted draft generation
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Review draft scenarios
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manager review required. Approve every scenario, then publish the module for staff.
          </p>
        </div>
        <button
          onClick={() => {
            publishModule(module.id);
            nav({ to: "/dashboard" });
          }}
          disabled={!allApproved}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Publish module
        </button>
      </div>

      <div className="mt-8 space-y-5">
        {module.scenarios.map((s) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            onApprove={() => approveScenario(module.id, s.id)}
            onDelete={() => deleteScenario(module.id, s.id)}
            onRegenerate={() => regenerateScenario(module.id, s.id)}
            onSave={(next) => updateScenario(module.id, next)}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="text-sm text-muted-foreground">
          {allApproved
            ? "All scenarios approved — ready to publish to staff."
            : "Approve every scenario above before publishing."}
        </div>
        <button
          onClick={() => {
            publishModule(module.id);
            nav({ to: "/dashboard" });
          }}
          disabled={!allApproved}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Publish module
        </button>
      </div>
    </Shell>
  );
}

function ScenarioCard({
  scenario,
  onApprove,
  onDelete,
  onRegenerate,
  onSave,
}: {
  scenario: Scenario;
  onApprove: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onSave: (s: Scenario) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Scenario>(scenario);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {scenario.kind === "mcq" ? "Multiple choice · 1 of 4" : "Put steps in order"}
          </div>
          {editing ? (
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 font-display text-lg font-semibold"
            />
          ) : (
            <h3 className="mt-1 font-display text-lg font-semibold">{scenario.title}</h3>
          )}
        </div>
        <Badge tone={scenario.status === "approved" ? "approved" : "draft"}>
          {scenario.status === "approved" ? "Approved" : "Requires manager review"}
        </Badge>
      </div>

      <blockquote className="mt-3 rounded-lg border-l-4 border-accent bg-surface p-3 text-sm italic">
        {editing ? (
          <textarea
            value={draft.patientQuote}
            onChange={(e) => setDraft({ ...draft, patientQuote: e.target.value })}
            className="w-full resize-none bg-transparent outline-none"
            rows={2}
          />
        ) : (
          <>&ldquo;{scenario.patientQuote}&rdquo;</>
        )}
      </blockquote>

      <p className="mt-4 text-sm font-medium">
        {editing ? (
          <input
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            className="w-full rounded-lg border border-input bg-background p-2"
          />
        ) : (
          scenario.question
        )}
      </p>

      {scenario.kind === "mcq" && draft.kind === "mcq" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {scenario.options.map((opt, i) => {
            const isBest = i === scenario.correctIndex;
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  isBest ? "border-accent/60 bg-accent/5" : "border-border"
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Option {String.fromCharCode(65 + i)}</span>
                  {isBest && <span className="text-[color:var(--success)]">Best answer</span>}
                </div>
                {editing ? (
                  <textarea
                    value={draft.options[i]}
                    onChange={(e) => {
                      const next = [...draft.options];
                      next[i] = e.target.value;
                      setDraft({ ...draft, options: next });
                    }}
                    rows={3}
                    className="w-full resize-none bg-transparent outline-none"
                  />
                ) : (
                  opt
                )}
              </div>
            );
          })}
        </div>
      )}

      {scenario.kind === "order" && draft.kind === "order" && (
        <ol className="mt-3 space-y-2">
          {scenario.steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
            >
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              {editing ? (
                <input
                  value={draft.steps[i]}
                  onChange={(e) => {
                    const next = [...draft.steps];
                    next[i] = e.target.value;
                    setDraft({ ...draft, steps: next });
                  }}
                  className="w-full bg-transparent outline-none"
                />
              ) : (
                <span>{s}</span>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 rounded-lg bg-surface p-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Learning point
        </div>
        {editing ? (
          <textarea
            value={draft.learningPoint}
            onChange={(e) => setDraft({ ...draft, learningPoint: e.target.value })}
            className="mt-1 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm"
            rows={3}
          />
        ) : (
          <p className="mt-1 text-muted-foreground">{scenario.learningPoint}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Save changes
            </button>
            <button
              onClick={() => {
                setDraft(scenario);
                setEditing(false);
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onApprove}
              disabled={scenario.status === "approved"}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
            >
              Approve
            </button>
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Edit
            </button>
            <button
              onClick={onRegenerate}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Regenerate
            </button>
            <button
              onClick={onDelete}
              className="ml-auto rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
