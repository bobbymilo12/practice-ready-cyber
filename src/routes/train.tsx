import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/train")({
  head: () => ({ meta: [{ title: "Training module — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || "" }),
  component: Train,
});

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
  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [answers, setAnswers] = useState<{ id: string; choice: "A" | "B"; correct: boolean; title: string }[]>([]);

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
  const revealed = selected !== null;
  const progress = ((idx + (revealed ? 1 : 0)) / scenarios.length) * 100;

  const handleContinue = () => {
    if (idx + 1 >= scenarios.length) {
      const correct = answers.filter((a) => a.correct).length;
      setLastResult({
        moduleId: module.id,
        moduleTitle: module.title,
        correct,
        total: scenarios.length,
        wrongTitles: answers.filter((a) => !a.correct).map((a) => a.title),
        completedAt: Date.now(),
      });
      nav({ to: "/results" });
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  };

  const handleSelect = (choice: "A" | "B") => {
    if (revealed) return;
    setSelected(choice);
    setAnswers((prev) => [
      ...prev,
      { id: current.id, choice, correct: choice === current.bestAnswer, title: current.title },
    ]);
  };

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

        <Card className="mt-6">
          <h2 className="font-display text-2xl font-bold">{current.title}</h2>
          <blockquote className="mt-4 rounded-lg border-l-4 border-accent bg-surface p-4 italic text-foreground">
            "{current.patientQuote}"
          </blockquote>
          <p className="mt-5 font-medium">{current.question}</p>

          <div className="mt-4 space-y-3">
            {(["A", "B"] as const).map((letter) => {
              const text = letter === "A" ? current.optionA : current.optionB;
              const isCorrect = letter === current.bestAnswer;
              const isPicked = selected === letter;
              let classes = "border-border hover:border-primary/40";
              if (revealed && isCorrect) classes = "border-accent bg-accent/10";
              else if (revealed && isPicked && !isCorrect)
                classes = "border-destructive/50 bg-destructive/5";
              return (
                <button
                  key={letter}
                  onClick={() => handleSelect(letter)}
                  disabled={revealed}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition ${classes}`}
                >
                  <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">
                    {letter}
                  </span>
                  <span>{text}</span>
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-6 rounded-xl border border-border bg-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Best answer
              </div>
              <div className="mt-1 font-medium">
                Option {current.bestAnswer} ·{" "}
                {current.bestAnswer === "A" ? current.optionA : current.optionB}
              </div>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Learning point
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{current.learningPoint}</p>

              <button
                onClick={handleContinue}
                className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {idx + 1 >= scenarios.length ? "Finish module" : "Continue →"}
              </button>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
