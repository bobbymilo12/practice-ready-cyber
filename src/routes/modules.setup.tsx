import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PredefinedModuleSetup } from "@/components/PredefinedModuleSetup";
import { flushPractice } from "@/lib/backend";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Link } from "@tanstack/react-router";
import {
  useApp,
  TOPICS,
  draftsForTopic,
  type ScenarioFormat,
  type Difficulty,
  type ModuleLength,
} from "@/lib/store";

export const Route = createFileRoute("/modules/setup")({
  head: () => ({ meta: [{ title: "Module setup — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    id: (s.id as string) || "",
    topic: (s.topic as string) || "custom",
    title: (s.title as string) || "Custom module",
  }),
  component: ModuleSetup,
});

function ModuleSetup() {
  const { topic, title, id } = Route.useSearch();
  return topic !== "custom" && TOPICS.some((t) => t.key === topic) ? (
    <PredefinedModuleSetup key={`${topic}:${id}`} topic={topic} title={title} id={id} />
  ) : (
    <Setup />
  );
}

type Phase = "questions" | "options";

function Setup() {
  const { topic, title } = Route.useSearch();
  const nav = useNavigate();
  const { answers, setAnswer, resetAnswers, createDraftModule, practiceData } = useApp();
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>(answers);

  const topicDef = TOPICS.find((t) => t.key === topic) ?? TOPICS[TOPICS.length - 1];
  const questions = topicDef.questions;

  const [step, setStep] = useState(0);
  const [format, setFormat] = useState<ScenarioFormat>("mixed");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [length, setLength] = useState<ModuleLength>("short");
  const [phase, setPhase] = useState<Phase>("questions");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);

  const current = questions[step];
  const total = questions.length;
  const progressCount = phase === "options" ? total : step + 1;
  const progress = (progressCount / (total + 1)) * 100;

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      let id = draftId;
      if (!id) {
        const topicAnswers = Object.fromEntries(
          questions.map((q) => [q.key, draftAnswers[q.key] ?? ""]),
        );
        const seed = draftsForTopic(topic, format, title, difficulty, length, topicAnswers);
        id = createDraftModule(title, `${title} — draft`, topic, seed, difficulty, length);
        setDraftId(id);
        resetAnswers();
      }
      await flushPractice();
      await nav({ to: "/modules/review", search: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please retry.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">
          Step 2 of 3 · {title}
          {phase === "questions" ? ` · Question ${step + 1} of ${total}` : " · Final options"}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${33 + progress / 3}%` }}
          />
        </div>

        {phase === "questions" && current && (
          <div className="mt-8">
            <label htmlFor="module-answer" className="block font-display text-2xl font-bold">
              {current.q}
            </label>
            <textarea
              id="module-answer"
              autoFocus
              value={draftAnswers[current.key] ?? ""}
              onChange={(e) =>
                setDraftAnswers((currentAnswers) => ({
                  ...currentAnswers,
                  [current.key]: e.target.value,
                }))
              }
              placeholder={current.placeholder}
              rows={4}
              className="mt-4 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2"
            />
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => {
                  setAnswer(current.key, draftAnswers[current.key] ?? "");
                  if (step === 0) void nav({ to: "/modules/create" });
                  else setStep((s) => s - 1);
                }}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  setAnswer(current.key, draftAnswers[current.key] ?? "");
                  if (step < total - 1) setStep((s) => s + 1);
                  else setPhase("options");
                }}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {step < total - 1 ? "Next →" : "Almost done →"}
              </button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Using saved info for {practiceData.practiceName}.{" "}
              <Link to="/data-hub" className="text-primary hover:underline">
                Edit practice information
              </Link>
            </p>
          </div>
        )}

        {phase === "options" && (
          <div className="mt-8 space-y-7">
            <h1 className="font-display text-2xl font-bold">Last step — how should it feel?</h1>
            <OptionGroup
              label="Length"
              value={length}
              onChange={setLength}
              disabled={generating || Boolean(draftId)}
              options={[
                { key: "short", title: "Short", desc: "Up to 5 questions" },
                { key: "medium", title: "Medium", desc: "Up to 10 questions" },
                { key: "long", title: "Long", desc: "Up to 15 questions" },
              ]}
            />
            <OptionGroup
              label="Scenario type"
              value={format}
              onChange={setFormat}
              disabled={generating || Boolean(draftId)}
              options={[
                { key: "mcq", title: "Multiple choice", desc: "Pick 1 of 4" },
                { key: "order", title: "Put in order", desc: "Sequence the steps" },
                { key: "mixed", title: "Mix of both", desc: "Recommended" },
              ]}
            />
            <OptionGroup
              label="Answer order"
              value={difficulty}
              onChange={setDifficulty}
              disabled={generating || Boolean(draftId)}
              options={[
                { key: "easy", title: "Fixed", desc: "Original order" },
                { key: "intermediate", title: "Shuffled", desc: "Vary positions" },
              ]}
            />
            <div className="flex items-center justify-between">
              <button
                disabled={generating || Boolean(draftId)}
                onClick={() => setPhase("questions")}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {generating ? "Saving draft…" : draftId ? "Retry saving draft" : "Create my module"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              You’ll review and edit the draft before anything is published.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </Shell>
  );
}

function OptionGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { key: T; title: string; desc: string }[];
  disabled: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.key}
            role="radio"
            aria-checked={value === o.key}
            disabled={disabled}
            onClick={() => onChange(o.key)}
            className={`rounded-xl border p-3 text-left transition ${
              value === o.key
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="text-sm font-semibold">{o.title}</div>
            <div className="text-xs text-muted-foreground">{o.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
