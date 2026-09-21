import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp, type Scenario } from "@/lib/store";
import { trainingAction, useConnection } from "@/lib/backend";
import { type SavedAnswer, type TrainingSession, primaryScenarios } from "@/lib/training";

export const Route = createFileRoute("/train")({
  head: () => ({ meta: [{ title: "Training module — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : "" }),
  component: Train,
});

function Train() {
  const { id } = Route.useSearch();
  const account = useApp((s) => s.account);
  return <Training key={`${account?.id}:${id}`} id={id} />;
}

function Training({ id }: { id: string }) {
  const nav = useNavigate();
  const state = useApp();
  const sessions = useConnection((s) => s.sessions);
  const module = state.modules.find((m) => m.id === id);
  const assignment = state.assignments.find(
    (a) => a.moduleId === id && a.traineeId === state.account?.id,
  );
  const open = sessions.find((s) => s.assignmentId === assignment?.id && !s.result);
  const [session, setSession] = useState<TrainingSession | undefined>(open);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = state.account?.role === "manager";
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewScenarios = module ? module.scenarios.filter((s) => s.status === "approved") : [];
  const scenario = preview
    ? previewScenarios[previewIndex]
    : session?.scenarios.find((s) => s.id === session.queue[session.index]);
  const answer = session?.answers.find((a) => a.scenarioId === scenario?.id);

  async function act(action: string, value?: number | string[]) {
    if (busy || !assignment) return;
    setBusy(true);
    setError("");
    try {
      const next = await trainingAction(action, {
        assignmentId: assignment.id,
        sessionId: session?.id,
        scenarioId: scenario?.id,
        value,
      });
      setSession(next);
      if (next.result) await nav({ to: "/results" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your progress. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  if (!module || (!preview && !assignment))
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-bold">Module unavailable</h1>
          <p className="mt-2">This module is not assigned to you.</p>
          <Link to="/staff" className="mt-4 block text-primary">
            Back to your training
          </Link>
        </Card>
      </Shell>
    );
  if (!preview && (!module.published || module.needsReview || !primaryScenarios(module).length))
    return (
      <Shell>
        <Card>
          <p>Your manager is reviewing this module. Your progress is saved; please return later.</p>
          <Link to="/staff" className="mt-3 block text-primary">
            Back to your training
          </Link>
        </Card>
      </Shell>
    );
  if (!preview && !session)
    return (
      <Shell>
        <Card>
          <h1 className="font-display text-2xl font-bold">{module.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {primaryScenarios(module).length} scenarios. Each checked answer saves automatically. If
            you miss a topic, you may receive an approved follow-up scenario for extra practice.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-destructive">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            onClick={() => void act("start")}
            className="mt-5 rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Starting…" : "Begin training"}
          </button>
        </Card>
      </Shell>
    );
  if (!scenario)
    return (
      <Shell>
        <Card>
          <p>No approved scenarios to preview.</p>
          <Link to="/dashboard">Back to dashboard</Link>
        </Card>
      </Shell>
    );
  const index = preview ? previewIndex : session!.index;
  const total = preview ? previewScenarios.length : session!.queue.length;
  const answered = preview ? index : session!.answers.length;
  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={preview ? "/dashboard" : "/staff"} className="text-sm text-primary">
            ← {preview ? "Back to manager dashboard" : "Save and exit"}
          </Link>
          <span role="status" className="text-xs text-muted-foreground">
            {preview
              ? "Manager preview · no results recorded"
              : busy
                ? "Saving…"
                : "Checked answers saved to your account"}
          </span>
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">{module.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state.practiceData.practiceName} · Scenario {index + 1} of {total}
        </p>
        <progress
          aria-label="Module progress"
          value={answered}
          max={total}
          className="mt-3 h-2 w-full accent-primary"
        />
        {scenario.followUpFor && (
          <div className="mt-4">
            <Badge tone="info">Extra practice</Badge>
            <p className="mt-2 text-sm">
              Try a different situation using the topic you found difficult. Your original score
              stays separate.
            </p>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-destructive/40 p-4 text-sm text-destructive"
          >
            {error} Your last saved answer is safe. Retry the action or return to your training.
          </div>
        )}
        <ScenarioBlock
          key={`${session?.id ?? "preview"}:${scenario.id}`}
          scenario={scenario}
          answer={answer}
          busy={busy}
          preview={preview}
          onAnswer={(value) => void act("answer", value)}
          onContinue={() => {
            if (preview) {
              if (previewIndex + 1 < total) setPreviewIndex((i) => i + 1);
              else void nav({ to: "/dashboard" });
            } else void act("continue");
          }}
          isLast={index + 1 === total}
        />
      </div>
    </Shell>
  );
}

function ScenarioBlock({
  scenario,
  answer,
  busy,
  preview,
  onAnswer,
  onContinue,
  isLast,
}: {
  scenario: Scenario;
  answer?: SavedAnswer;
  busy: boolean;
  preview: boolean;
  onAnswer: (value: number | string[]) => void;
  onContinue: () => void;
  isLast: boolean;
}) {
  const [localAnswer, setLocalAnswer] = useState<SavedAnswer>();
  const saved = preview ? localAnswer : answer;
  const [items, setItems] = useState<string[]>(() => {
    if (Array.isArray(answer?.value)) return answer.value;
    if (scenario.kind !== "order") return [];
    return [...scenario.steps.slice(1), scenario.steps[0]];
  });
  const check = (value: number | string[]) => {
    if (busy || saved) return;
    if (preview)
      setLocalAnswer({
        scenarioId: scenario.id,
        title: scenario.title,
        value,
        correct:
          scenario.kind === "mcq"
            ? value === scenario.correctIndex
            : Array.isArray(value) && value.every((s, i) => s === scenario.steps[i]),
      });
    else onAnswer(value);
  };
  const move = (index: number, direction: number) => {
    const next = [...items];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setItems(next);
  };
  return (
    <Card className="mt-6">
      <h2 className="font-display text-xl font-bold">{scenario.title}</h2>
      <blockquote className="mt-4 rounded-lg border-l-4 border-accent bg-surface p-4 italic">
        “{scenario.patientQuote}”
      </blockquote>
      <p className="mt-5 font-medium">{scenario.question}</p>
      {scenario.kind === "mcq" ? (
        <div className="mt-4 space-y-3">
          {scenario.options.map((option, i) => (
            <button
              key={i}
              disabled={busy || Boolean(saved)}
              onClick={() => check(i)}
              className={`flex w-full gap-3 rounded-xl border p-4 text-left text-sm disabled:cursor-default ${saved && i === scenario.correctIndex ? "border-accent bg-accent/10" : saved?.value === i ? "border-destructive bg-destructive/5" : "border-border hover:border-primary"}`}
            >
              <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
              <span>
                {option}
                {saved && i === scenario.correctIndex && (
                  <strong className="ml-2">Best answer</strong>
                )}
                {saved?.value === i && <span className="ml-2">(Your answer)</span>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            Use the arrows to arrange the steps, then check your answer.
          </p>
          <ol className="mt-4 space-y-2">
            {items.map((step, i) => (
              <li
                key={`${i}:${step}`}
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"
              >
                <span>{i + 1}.</span>
                <span className="flex-1">{step}</span>
                {!saved && (
                  <div className="flex gap-2">
                    <button
                      aria-label={`Move step ${i + 1} up`}
                      disabled={busy || i === 0}
                      onClick={() => move(i, -1)}
                      className="rounded border px-3 py-2 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move step ${i + 1} down`}
                      disabled={busy || i === items.length - 1}
                      onClick={() => move(i, 1)}
                      className="rounded border px-3 py-2 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {!saved && (
            <button
              disabled={busy}
              onClick={() => check(items)}
              className="mt-4 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground disabled:opacity-50"
            >
              Check my order
            </button>
          )}
        </>
      )}
      {saved && (
        <div role="status" className="mt-6 rounded-xl border border-border bg-surface p-4">
          <h3 className={`font-semibold ${saved.correct ? "text-primary" : "text-destructive"}`}>
            {saved.correct ? "Correct" : "Not quite — let's learn from it"}
          </h3>
          {!saved.correct && scenario.kind === "order" && (
            <>
              <p className="mt-3 font-medium">Correct order</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
                {scenario.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </>
          )}
          <p className="mt-3 text-sm">{scenario.learningPoint}</p>
          {scenario.managerNote && (
            <div className="mt-4 rounded-lg border border-accent/40 p-3 text-sm">
              <strong>From your manager</strong>
              <p className="mt-1 whitespace-pre-line">{scenario.managerNote}</p>
            </div>
          )}
          <button
            disabled={busy}
            onClick={onContinue}
            className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : isLast
                ? preview
                  ? "Finish preview"
                  : "Finish module"
                : "Continue →"}
          </button>
        </div>
      )}
    </Card>
  );
}
