import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp, sampleDraftScenarios, type ManagerAnswers } from "@/lib/store";

export const Route = createFileRoute("/modules/setup")({
  head: () => ({ meta: [{ title: "AI setup assistant — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    type: (s.type as string) || "Custom module",
  }),
  component: Setup,
});

const QUESTIONS: { key: keyof ManagerAnswers; q: string; placeholder: string }[] = [
  { key: "role", q: "What role are you training?", placeholder: "e.g. New reception team member, part-time" },
  { key: "struggles", q: "What are the top things new starters struggle with?", placeholder: "e.g. Triage questions, prescription queries…" },
  { key: "commonCalls", q: "What common patient calls should they practise?", placeholder: "e.g. Repeat prescriptions, test results, cancellations" },
  { key: "localRules", q: "What local rules should the training include?", placeholder: "e.g. All same-day requests go through duty GP triage" },
  { key: "appointmentHandlers", q: "Who handles key appointment types?", placeholder: "e.g. Duty GP for on-the-day, ANPs for minor illness" },
  { key: "escalate", q: "What should staff escalate immediately?", placeholder: "e.g. Chest pain, stroke symptoms, suicidal ideation" },
  { key: "neverPromise", q: "What should staff never promise?", placeholder: "e.g. Same-day prescriptions, specific GP, test result timings" },
  { key: "tone", q: "What tone or phrases should staff use with patients?", placeholder: "e.g. Warm, calm, 'let me check that for you'" },
];

function Setup() {
  const { type } = Route.useSearch();
  const nav = useNavigate();
  const { answers, setAnswers, createDraftModule } = useApp();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const id = createDraftModule(type, `${type} — draft`, sampleDraftScenarios());
      nav({ to: "/modules/review", search: { id } });
    }, 1400);
  };

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">AI setup assistant · {type}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Tell us about your practice
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

        <Card className="mt-6">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Question {step + 1} of {QUESTIONS.length}
          </div>
          <label className="mt-2 block font-display text-xl font-semibold">
            {current.q}
          </label>
          <textarea
            value={answers[current.key]}
            onChange={(e) => setAnswers({ [current.key]: e.target.value } as Partial<ManagerAnswers>)}
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
            {!isLast ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {generating ? "Drafting scenarios…" : "Generate draft scenarios"}
              </button>
            )}
          </div>
        </Card>

        <p className="mt-4 text-xs text-muted-foreground">
          AI-assisted draft generation. Manager review required before staff use.
        </p>
      </div>
    </Shell>
  );
}
