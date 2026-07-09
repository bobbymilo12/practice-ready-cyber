import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp, TOPICS, draftsForTopic, type ScenarioFormat } from "@/lib/store";

export const Route = createFileRoute("/modules/setup")({
  head: () => ({ meta: [{ title: "AI setup assistant — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    topic: (s.topic as string) || "custom",
    title: (s.title as string) || "Custom module",
  }),
  component: Setup,
});

function Setup() {
  const { topic, title } = Route.useSearch();
  const nav = useNavigate();
  const { answers, setAnswer, resetAnswers, createDraftModule } = useApp();

  const topicDef = TOPICS.find((t) => t.key === topic) ?? TOPICS[TOPICS.length - 1];
  const questions = topicDef.questions;

  const [step, setStep] = useState(0);
  const [format, setFormat] = useState<ScenarioFormat>("mixed");
  const [phase, setPhase] = useState<"questions" | "format">("questions");
  const [generating, setGenerating] = useState(false);

  const current = questions[step];
  const total = questions.length;
  const progressCount = phase === "format" ? total : step + 1;
  const progress = (progressCount / (total + 1)) * 100;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const seed = draftsForTopic(topic, format, title);
      const id = createDraftModule(title, `${title} — draft`, topic, seed);
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
          Your answers shape the AI-assisted draft. All generated content is marked as draft and
          requires manager review before staff can use it.
        </p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

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
                  onClick={() => setPhase("format")}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Choose scenario format →
                </button>
              )}
            </div>
          </Card>
        )}

        {phase === "format" && (
          <Card className="mt-6">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Final step
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold">
              Which type of scenarios should we draft?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You can mix formats. All drafts still require your review before publishing.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {(
                [
                  {
                    key: "mcq",
                    title: "Multiple choice (1 of 4)",
                    desc: "Staff pick the best of four options. Great for judgement calls.",
                  },
                  {
                    key: "order",
                    title: "Put steps in order",
                    desc: "Staff drag steps into the correct sequence. Great for procedures.",
                  },
                  {
                    key: "mixed",
                    title: "Mix of both",
                    desc: "Recommended — variety keeps trainees engaged and tests both skills.",
                  },
                ] as const
              ).map((opt) => {
                const active = format === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFormat(opt.key)}
                    className={`text-left rounded-2xl border p-4 transition ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="font-display text-sm font-semibold">{opt.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
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
