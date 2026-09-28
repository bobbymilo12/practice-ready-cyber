import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { TOPICS, useApp } from "@/lib/store";
export const Route = createFileRoute("/modules/create")({
  head: () => ({ meta: [{ title: "Create module — PracticeReady" }] }),
  component: CreateModule,
});
function CreateModule() {
  const [selected, setSelected] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const nav = useNavigate();
  const topic = TOPICS.find((t) => t.key === selected);
  return (
    <Shell>
      <p className="text-sm text-muted-foreground">Create a module · Step 1 of 3</p>
      <h1 className="mt-1 font-display text-3xl font-bold">Choose a training topic</h1>
      <p className="mt-2 text-muted-foreground">
        Create one module at a time, or{" "}
        <Link to="/modules/merge" className="text-primary underline">
          combine existing modules
        </Link>
        .
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => (
          <button
            key={t.key}
            aria-pressed={selected === t.key}
            onClick={() => setSelected(t.key)}
            className={`rounded-2xl border p-5 text-left ${selected === t.key ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <span className="block font-semibold">{t.title}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{t.desc}</span>
          </button>
        ))}
      </div>
      <Card className="mt-6">
        {selected === "custom" && (
          <label className="mb-4 block text-sm">
            Module title
            <input
              className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </label>
        )}
        <button
          disabled={!topic || (selected === "custom" && !customTitle.trim())}
          onClick={() => {
            if (!topic) return;
            useApp.getState().resetAnswers();
            void nav({
              to: "/modules/setup",
              search: {
                id: "",
                topic: topic.key,
                title: selected === "custom" ? customTitle.trim() : topic.title,
              },
            });
          }}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Continue →
        </button>
      </Card>
    </Shell>
  );
}
