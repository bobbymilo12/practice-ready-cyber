import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
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
  head: () => ({ meta: [{ title: "AI setup assistant — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    topic: (s.topic as string) || "custom",
    title: (s.title as string) || "Custom module",
  }),
  component: Setup,
});

type Phase = "questions" | "options";

function Setup() {
  const { topic, title } = Route.useSearch();
  const nav = useNavigate();
  const { answers, setAnswer, resetAnswers, createDraftModule, practiceData } = useApp();

  const topicDef = TOPICS.find((t) => t.key === topic) ?? TOPICS[TOPICS.length - 1];
  const questions = topicDef.questions;

  const [step, setStep] = useState(0);
  const [format, setFormat] = useState<ScenarioFormat>("mixed");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [length, setLength] = useState<ModuleLength>("short");
  const [phase, setPhase] = useState<Phase>("questions");
  const [generating, setGenerating] = useState(false);

  const current = questions[step];
  const total = questions.length;
  const progressCount = phase === "options" ? total : step + 1;
  const progress = (progressCount / (total + 1)) * 100;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const seed = draftsForTopic(topic, format, title, difficulty, length);
      const id = createDraftModule(
        title,
        `${title} — draft`,
        topic,
        seed,
        difficulty,
        length,
      );
      resetAnswers();
      nav({ to: "/modules/review", search: { id } });
    }, 1200);
  };

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">AI setup assistant · {title}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Tell us how your practice handles this
        </h1>
        <p className="mt-2 text-muted-foreground">
          We only ask what isn't already in your Data Hub. All generated content is
          marked as draft and requires manager review before staff can use it.
        </p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card className="mt-6 bg-surface">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                From your data hub · we won't ask about these
              </div>
              <p className="mt-1 text-sm font-medium">{practiceData.practiceName}</p>
            </div>
            <Link to="/data-hub" className="text-xs font-medium text-primary hover:underline">
              Edit data hub →
            </Link>
          </div>
          {practiceData.staff.length > 0 && (
            <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
              {practiceData.staff.map((s) => (
                <li key={s.id}>
                  <span className="font-medium text-foreground">{s.name}</span> — {s.role}
                  {s.clinics ? ` · ${s.clinics}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>


        {phase === "questions" && current && (
          <Card className="mt-6">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Question {step + 1} of {total}
            </div>
            <label className="mt-2 block font-display text-xl font-semibold">
              {current.q}
            </label>
            <textarea
              value={answers[current.key] ?? ""}
              onChange={(e) => setAnswer(current.key, e.target.value)}
              placeholder={current.placeholder}
              rows={4}
              className="mt-4 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2"
            />

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                ← Back
              </button>
              {step < total - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => setPhase("options")}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Choose difficulty &amp; length →
                </button>
              )}
            </div>
          </Card>
        )}

        {phase === "options" && (
          <Card className="mt-6 space-y-8">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Difficulty
              </div>
              <h2 className="mt-1 font-display text-xl font-semibold">
                How challenging should the scenarios be?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Easy keeps the correct answer clearly signalled. Intermediate and
                advanced remove positional cues and expect closer judgement — the wrong
                answers look more plausible.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {(
                  [
                    { key: "easy", title: "New employee (Easy)", desc: "Correct choice is clearly signalled. Great for week 1." },
                    { key: "intermediate", title: "Intermediate", desc: "Options are shuffled and closer in wording — needs real thought." },
                    { key: "advanced", title: "Advanced", desc: "Plausible distractors, subtle differences. For confident staff." },
                  ] as const
                ).map((opt) => {
                  const active = difficulty === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setDifficulty(opt.key)}
                      className={`text-left rounded-2xl border p-4 transition ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="font-display text-sm font-semibold">{opt.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Length
              </div>
              <h2 className="mt-1 font-display text-xl font-semibold">
                How long should the module be?
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {(
                  [
                    { key: "short", title: "Short", desc: "4–5 questions. ~5 minutes." },
                    { key: "medium", title: "Medium", desc: "10 questions. ~12 minutes." },
                    { key: "long", title: "Long", desc: "15+ questions. Full walk-through." },
                  ] as const
                ).map((opt) => {
                  const active = length === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setLength(opt.key)}
                      className={`text-left rounded-2xl border p-4 transition ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="font-display text-sm font-semibold">{opt.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Scenario format
              </div>
              <h2 className="mt-1 font-display text-xl font-semibold">
                Which type of scenarios should we draft?
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {(
                  [
                    { key: "mcq", title: "Multiple choice (1 of 4)", desc: "Pick the best of four options." },
                    { key: "order", title: "Put steps in order", desc: "Drag steps into the correct sequence." },
                    { key: "mixed", title: "Mix of both", desc: "Recommended — variety keeps trainees engaged." },
                  ] as const
                ).map((opt) => {
                  const active = format === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setFormat(opt.key)}
                      className={`text-left rounded-2xl border p-4 transition ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="font-display text-sm font-semibold">{opt.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setPhase("questions")}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to questions
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {generating ? "Drafting scenarios…" : "Generate draft scenarios"}
              </button>
            </div>
          </Card>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          AI-assisted draft generation. Manager review required before staff use.
        </p>
      </div>
    </Shell>
  );
}


        <p className="mt-4 text-xs text-muted-foreground">
          AI-assisted draft generation. Manager review required before staff use.
        </p>
      </div>
    </Shell>
  );
}
