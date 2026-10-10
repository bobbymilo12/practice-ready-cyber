import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
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
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">Step 1 of 3 · Topic</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 rounded-full bg-primary" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">What should staff practise?</h1>
        <p className="mt-2 text-muted-foreground">
          Pick a topic. Next we’ll ask a few quick questions, then draft the scenarios for you to
          review. Want to{" "}
          <Link to="/modules/merge" className="text-primary underline">
            combine existing modules
          </Link>{" "}
          instead?
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => {
            const active = selected === t.key;
            return (
              <button
                key={t.key}
                aria-pressed={active}
                onClick={() => setSelected(t.key)}
                className={`relative rounded-2xl border p-5 text-left transition hover:border-primary/50 ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"}`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                  >
                    ✓
                  </span>
                )}
                <span className="block font-semibold">{t.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t.desc}</span>
              </button>
            );
          })}
        </div>
        {selected === "custom" && (
          <label className="mt-5 block text-sm font-medium">
            What’s it called?
            <input
              autoFocus
              className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 font-normal"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Handling home visit requests"
            />
          </label>
        )}
        <div className="sticky bottom-0 -mx-1 mt-6 flex justify-end bg-background/90 px-1 py-3 backdrop-blur">
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
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      </div>
    </Shell>
  );
}
