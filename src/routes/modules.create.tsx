import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { TOPICS } from "@/lib/store";

export const Route = createFileRoute("/modules/create")({
  head: () => ({ meta: [{ title: "Create module — PracticeReady" }] }),
  component: CreateModule,
});

function CreateModule() {
  const [selected, setSelected] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const nav = useNavigate();

  const selectedTopics = TOPICS.filter((t) => selected.includes(t.key));
  const selectedTopic = selectedTopics[0];
  const canContinue = selectedTopics.length > 0;

  return (
    <Shell>
      <div>
        <p className="text-sm text-muted-foreground">Step 1 of 3 · Create a new module</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          What module do you want to create?
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pick one topic to build a new module, or select multiple topics to merge them into one combined module.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => {
          const active = selected.includes(t.key);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                setSelected((current) =>
                  current.includes(t.key)
                    ? current.filter((item) => item !== t.key)
                    : [...current, t.key],
                )
              }
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

      {selected.length > 1 && (
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Multiple topics are selected. PracticeReady will merge them into one module draft.
          </p>
        </Card>
      )}

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedTopics.length === 0
            ? "Select one or more topics to continue."
            : selectedTopics.length === 1
              ? `Selected: ${selectedTopic?.title}`
              : `${selectedTopics.length} topics selected for a merged module`}
        </p>
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => {
            if (selectedTopics.length > 1) {
              nav({ to: "/modules/merge" });
              return;
            }
            if (!selectedTopic) return;
            nav({
              to: "/modules/setup",
              search: { topic: selectedTopic.key, title: selectedTopic.title },
            });
          }}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {selectedTopics.length > 1 ? "Merge selected topics →" : "Continue →"}
        </button>
      </Card>
    </Shell>
  );
}
