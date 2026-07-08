import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp, type Scenario } from "@/lib/store";

export const Route = createFileRoute("/train")({
  head: () => ({ meta: [{ title: "Training module — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || "" }),
  component: Train,
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // ensure not identical when possible
  return a;
}

function Train() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const module = useApp((s) => s.modules.find((m) => m.id === id));
  const setLastResult = useApp((s) => s.setLastResult);

  const scenarios = useMemo(
    () => module?.scenarios.filter((s) => s.status === "approved") ?? [],
    [module],
  );

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<
    { id: string; correct: boolean; title: string }[]
  >([]);

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

  if (scenarios.length === 0) {
    return (
      <Shell>
        <Card>
          <p className="text-sm">No approved scenarios in this module yet.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-primary hover:underline">
            Back to dashboard
          </Link>
        </Card>
      </Shell>
    );
  }

  const current = scenarios[idx];

  const handleAnswered = (correct: boolean) => {
    setAnswers((prev) => [...prev, { id: current.id, correct, title: current.title }]);
  };

  const handleContinue = () => {
    if (idx + 1 >= scenarios.length) {
      const finalAnswers = answers;
      const correct = finalAnswers.filter((a) => a.correct).length;
      setLastResult({
        moduleId: module.id,
        moduleTitle: module.title,
        correct,
        total: scenarios.length,
        wrongTitles: finalAnswers.filter((a) => !a.correct).map((a) => a.title),
        completedAt: Date.now(),
      });
      nav({ to: "/results" });
    } else {
      setIdx((i) => i + 1);
    }
  };

  const progress = (idx / scenarios.length) * 100;

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">
          {module.title} · Scenario {idx + 1} of {scenarios.length}
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {current.kind === "mcq" ? (
          <MCQBlock
            key={current.id}
            scenario={current}
            onAnswered={handleAnswered}
            onContinue={handleContinue}
            isLast={idx + 1 >= scenarios.length}
          />
        ) : (
          <OrderBlock
            key={current.id}
            scenario={current}
            onAnswered={handleAnswered}
            onContinue={handleContinue}
            isLast={idx + 1 >= scenarios.length}
          />
        )}
      </div>
    </Shell>
  );
}

function MCQBlock({
  scenario,
  onAnswered,
  onContinue,
  isLast,
}: {
  scenario: Extract<Scenario, { kind: "mcq" }>;
  onAnswered: (correct: boolean) => void;
  onContinue: () => void;
  isLast: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
    onAnswered(i === scenario.correctIndex);
  };

  return (
    <Card className="mt-6">
      <h2 className="font-display text-2xl font-bold">{scenario.title}</h2>
      <blockquote className="mt-4 rounded-lg border-l-4 border-accent bg-surface p-4 italic text-foreground">
        &ldquo;{scenario.patientQuote}&rdquo;
      </blockquote>
      <p className="mt-5 font-medium">{scenario.question}</p>

      <div className="mt-4 space-y-3">
        {scenario.options.map((opt, i) => {
          const isCorrect = i === scenario.correctIndex;
          const isPicked = selected === i;
          let classes = "border-border hover:border-primary/40";
          if (revealed && isCorrect) classes = "border-accent bg-accent/10";
          else if (revealed && isPicked && !isCorrect)
            classes = "border-destructive/50 bg-destructive/5";
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition ${classes}`}
            >
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <Feedback
          isCorrect={selected === scenario.correctIndex}
          learningPoint={scenario.learningPoint}
          onContinue={onContinue}
          isLast={isLast}
        />
      )}
    </Card>
  );
}

function OrderBlock({
  scenario,
  onAnswered,
  onContinue,
  isLast,
}: {
  scenario: Extract<Scenario, { kind: "order" }>;
  onAnswered: (correct: boolean) => void;
  onContinue: () => void;
  isLast: boolean;
}) {
  const [items, setItems] = useState<string[]>(() => {
    let shuffled = shuffle(scenario.steps);
    if (shuffled.every((v, i) => v === scenario.steps[i]) && shuffled.length > 1) {
      shuffled = [shuffled[shuffled.length - 1], ...shuffled.slice(0, -1)];
    }
    return shuffled;
  });
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    setItems(() => {
      let shuffled = shuffle(scenario.steps);
      if (shuffled.every((v, i) => v === scenario.steps[i]) && shuffled.length > 1) {
        shuffled = [shuffled[shuffled.length - 1], ...shuffled.slice(0, -1)];
      }
      return shuffled;
    });
    setChecked(false);
    setIsCorrect(false);
  }, [scenario.id, scenario.steps]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setItems(next);
  };

  const handleCheck = () => {
    const correct = items.every((v, i) => v === scenario.steps[i]);
    setIsCorrect(correct);
    setChecked(true);
    onAnswered(correct);
  };

  return (
    <Card className="mt-6">
      <h2 className="font-display text-2xl font-bold">{scenario.title}</h2>
      <blockquote className="mt-4 rounded-lg border-l-4 border-accent bg-surface p-4 italic text-foreground">
        &ldquo;{scenario.patientQuote}&rdquo;
      </blockquote>
      <p className="mt-5 font-medium">{scenario.question}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Use the arrows to put the steps in the correct order.
      </p>

      <ol className="mt-4 space-y-2">
        {items.map((step, i) => {
          const rightPos = checked && step === scenario.steps[i];
          const wrongPos = checked && step !== scenario.steps[i];
          return (
            <li
              key={step}
              className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                rightPos
                  ? "border-accent bg-accent/10"
                  : wrongPos
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-border"
              }`}
            >
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="flex-1">{step}</span>
              {!checked && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded-md border border-border px-2 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, i + 1)}
                    disabled={i === items.length - 1}
                    aria-label="Move down"
                    className="rounded-md border border-border px-2 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!checked ? (
        <button
          onClick={handleCheck}
          className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Check my order
        </button>
      ) : (
        <>
          {!isCorrect && (
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Correct order
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {scenario.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          <Feedback
            isCorrect={isCorrect}
            learningPoint={scenario.learningPoint}
            onContinue={onContinue}
            isLast={isLast}
          />
        </>
      )}
    </Card>
  );
}

function Feedback({
  isCorrect,
  learningPoint,
  onContinue,
  isLast,
}: {
  isCorrect: boolean;
  learningPoint: string;
  onContinue: () => void;
  isLast: boolean;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-surface p-4">
      <div
        className={`text-xs font-semibold uppercase tracking-wider ${
          isCorrect ? "text-[color:var(--success)]" : "text-destructive"
        }`}
      >
        {isCorrect ? "Correct" : "Not quite"}
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Learning point
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{learningPoint}</p>

      <button
        onClick={onContinue}
        className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        {isLast ? "Finish module" : "Continue →"}
      </button>
    </div>
  );
}
