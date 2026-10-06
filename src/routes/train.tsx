import { MatchingBoard } from "@/components/MatchingBoard";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp, type Scenario } from "@/lib/store";
import { trainingAction, useConnection } from "@/lib/backend";
import {
  type SavedAnswer,
  type TrainingSession,
  type AnswerValue,
  isMatchingAnswer,
  matchingComplete,
  primaryScenarios,
} from "@/lib/training";

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

  async function act(action: string, value?: AnswerValue) {
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
  if (!preview && session?.review)
    return (
      <Shell>
        <div className="mx-auto max-w-3xl">
          <Link to="/staff" className="text-sm text-primary">
            ← Save and exit
          </Link>
          <h1 className="mt-5 font-display text-2xl font-bold">Review your answers</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your selected answers before submitting this module. Your score and feedback will
            only be shown after submission.
          </p>
          <Card className="mt-6">
            <ol className="space-y-4">
              {session.queue.map((scenarioId, index) => {
                const reviewScenario = session.scenarios.find((item) => item.id === scenarioId);
                const selected = session.answers.find((item) => item.scenarioId === scenarioId);
                if (!reviewScenario || !selected) return null;
                return (
                  <li key={scenarioId} className="rounded-xl border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Question {index + 1}
                    </p>
                    <h2 className="mt-1 font-semibold">{reviewScenario.title}</h2>
                    <p className="mt-2 text-sm">
                      Selected answer:{" "}
                      {Array.isArray(selected.value)
                        ? selected.value.join(" → ")
                        : reviewScenario.kind === "mcq" && typeof selected.value === "number"
                          ? reviewScenario.options[selected.value]
                          : reviewScenario.kind === "matching" && isMatchingAnswer(selected.value)
                            ? reviewScenario.items
                                .map(
                                  (item) =>
                                    `${item.label} → ${reviewScenario.targets.find((t) => t.id === (selected.value as Record<string, string>)[item.id])?.label ?? "Not selected"}`,
                                )
                                .join("; ")
                            : "Selected order"}
                    </p>
                  </li>
                );
              })}
            </ol>
            <button
              disabled={busy}
              onClick={() => void act("submit")}
              className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit module"}
            </button>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </Card>
        </div>
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
                : "Answers saved to your account"}
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
          onPrevious={() =>
            preview ? setPreviewIndex((i) => Math.max(0, i - 1)) : void act("previous")
          }
          isFirst={index === 0}
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
  onPrevious,
  isFirst,
  isLast,
}: {
  scenario: Scenario;
  answer?: SavedAnswer;
  busy: boolean;
  preview: boolean;
  onAnswer: (value: AnswerValue) => void;
  onContinue: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [localAnswer, setLocalAnswer] = useState<SavedAnswer>();
  const selected = preview ? localAnswer : answer;
  const [items, setItems] = useState<string[]>(() => {
    if (Array.isArray(answer?.value)) return answer.value;
    if (scenario.kind !== "order") return [];
    return [...scenario.steps.slice(1), scenario.steps[0]];
  });
  const check = (value: AnswerValue) => {
    if (busy) return;
    if (preview)
      setLocalAnswer({
        scenarioId: scenario.id,
        title: scenario.title,
        value,
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
      {scenario.kind !== "matching" && (
        <blockquote className="mt-4 rounded-lg border-l-4 border-accent bg-surface p-4 italic">
          “{scenario.patientQuote}”
        </blockquote>
      )}
      {scenario.kind !== "matching" && <p className="mt-5 font-medium">{scenario.question}</p>}
      {scenario.kind === "mcq" ? (
        <div className="mt-4 space-y-3">
          {scenario.options.map((option, i) => (
            <button
              key={i}
              disabled={busy}
              aria-pressed={selected?.value === i}
              onClick={() => check(i)}
              className={`flex w-full gap-3 rounded-xl border p-4 text-left text-sm disabled:cursor-default ${selected?.value === i ? "border-primary bg-primary/10" : "border-border hover:border-primary"}`}
            >
              <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
              <span>
                {option}
                {selected?.value === i && <span className="ml-2 text-primary">(Selected)</span>}
              </span>
            </button>
          ))}
        </div>
      ) : scenario.kind === "matching" ? (
        <MatchingBoard
          instructions={scenario.provenance.managerModified ? scenario.question : undefined}
          items={scenario.items}
          targets={scenario.targets}
          value={isMatchingAnswer(selected?.value) ? selected.value : {}}
          oneToOne={scenario.pairingMode === "one_to_one"}
          disabled={busy}
          onChange={check}
        />
      ) : scenario.kind === "order" ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            Use the arrows to arrange the steps, then select this order.
          </p>
          <ol className="mt-4 space-y-2">
            {items.map((step, i) => (
              <li
                key={`${i}:${step}`}
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"
              >
                <span>{i + 1}.</span>
                <span className="flex-1">{step}</span>
                {(!preview || !selected) && (
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
          {(!preview || !selected) && (
            <button
              disabled={busy}
              onClick={() => check(items)}
              className="mt-4 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground disabled:opacity-50"
            >
              Select this order
            </button>
          )}
        </>
      ) : null}
      {selected && (
        <p className="mt-6 text-sm">
          {scenario.kind === "matching"
            ? "Matches saved. You can change them before submitting."
            : "Answer selected. You can review all answers before submitting."}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          disabled={busy || isFirst}
          onClick={onPrevious}
          className="rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          ← Previous question
        </button>
        <button
          disabled={
            busy ||
            !selected ||
            (scenario.kind === "matching" && !matchingComplete(scenario, selected.value)) ||
            (scenario.kind === "order" && JSON.stringify(items) !== JSON.stringify(selected.value))
          }
          onClick={onContinue}
          className="ml-auto rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isLast ? (preview ? "Finish preview" : "Review answers →") : "Next question →"}
        </button>
      </div>
    </Card>
  );
}
