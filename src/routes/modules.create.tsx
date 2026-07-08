import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { TOPICS } from "@/lib/store";

export const Route = createFileRoute("/modules/create")({
  head: () => ({ meta: [{ title: "Create module — PracticeReady" }] }),
  component: CreateModule,
});

function CreateModule() {
  const [selected, setSelected] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const nav = useNavigate();

  const selectedTopic = TOPICS.find((t) => t.key === selected);
  const canContinue = selectedTopic && (selected !== "custom" || customTitle.trim().length > 2);

  return (
    <Shell>
      <div>
        <p className="text-sm text-muted-foreground">Step 1 of 3 · Create a new module</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          What module do you want to create?
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pick the topic your new reception or admin staff should practise. The next step will ask
          you specific questions about how your practice handles it — the more detail, the better
          the training.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => {
          const active = selected === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSelected(t.key)}
              className={`text-left rounded-2xl border p-5 transition ${
                active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="font-display text-base font-semibold">{t.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t.desc}</div>
              <div className="mt-3 text-xs text-muted-foreground">
                {t.questions.length} setup questions
              </div>
            </button>
          );
        })}
      </div>

      {selected === "custom" && (
        <Card className="mt-6">
          <label className="text-sm font-medium">Name your custom module</label>
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="e.g. Registering a new patient at Willow Lane"
            className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </Card>
      )}

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedTopic
            ? `Selected: ${selected === "custom" && customTitle ? customTitle : selectedTopic.title}`
            : "Select a topic to continue."}
        </p>
        <button
          disabled={!canContinue}
          onClick={() => {
            if (!selectedTopic) return;
            const title =
              selected === "custom" && customTitle ? customTitle : selectedTopic.title;
            nav({ to: "/modules/setup", search: { topic: selectedTopic.key, title } });
          }}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Continue →
        </button>
      </Card>
    </Shell>
  );
}
