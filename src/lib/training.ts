import { trainingContent } from "./training-content.ts";
import { isStepPermutation, orderKey } from "./sequence.ts";
import type {
  Assignment,
  Module,
  Scenario,
  TrainingResult,
  MatchingScenario,
} from "./training-types.ts";

export type MatchingAnswer = Record<string, string>;
export type AnswerValue = number | string[] | MatchingAnswer;
export function isMatchingAnswer(value: unknown): value is MatchingAnswer {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}
export function matchingFeedback(scenario: MatchingScenario, value: unknown) {
  const answers = isMatchingAnswer(value) ? value : {};
  return scenario.items.map((item) => ({
    id: item.id,
    label: item.label,
    selected: answers[item.id],
    validTargets: scenario.validMatches[item.id] ?? [],
    correct: (scenario.validMatches[item.id] ?? []).includes(answers[item.id]),
  }));
}
export function matchingComplete(scenario: MatchingScenario, value: unknown): boolean {
  return (
    isMatchingAnswer(value) &&
    scenario.items.every((i) => scenario.targets.some((t) => t.id === value[i.id])) &&
    (scenario.pairingMode !== "one_to_one" ||
      new Set(Object.values(value)).size === scenario.items.length)
  );
}
export interface SavedAnswer {
  scenarioId: string;
  value: AnswerValue;
  correct?: boolean;
  title: string;
  followUpFor?: string;
}

export interface TrainingSession {
  id: string;
  moduleId: string;
  assignmentId: string;
  traineeId: string;
  scenarios: Scenario[];
  queue: string[];
  index: number;
  answers: SavedAnswer[];
  updatedAt: number;
  review?: boolean;
  result?: TrainingResult;
  // Missing on legacy attempts: their overwritten first responses cannot be reconstructed.
  answerFlow?: "check";
  supersededAt?: number;
}

/** Compare legacy and new attempts directly, without changing their historical snapshots. */
export function attemptUsesOlderContent(session: TrainingSession, module: Module): boolean {
  return trainingContent(session.scenarios) !== trainingContent(module.scenarios);
}
export function resumableAttempt(session: TrainingSession, module: Module): boolean {
  return !session.result && !session.supersededAt && !attemptUsesOlderContent(session, module);
}

export const primaryScenarios = (module: Module) =>
  module.scenarios.filter((s) => s.status === "approved" && !s.followUpFor);

export function startSession(module: Module, assignment: Assignment, id: string): TrainingSession {
  if (!module.published || module.needsReview || !primaryScenarios(module).length)
    throw new Error("This module is awaiting manager review.");
  return {
    id,
    moduleId: module.id,
    assignmentId: assignment.id,
    traineeId: assignment.traineeId,
    scenarios: structuredClone(module.scenarios.filter((s) => s.status === "approved")),
    queue: primaryScenarios(module).map((s) => s.id),
    index: 0,
    answers: [],
    answerFlow: "check",
    updatedAt: Date.now(),
  };
}

/** Structural completeness only; draft editing must not record an attempt. */
export function answerIsComplete(scenario: Scenario, value: unknown): value is AnswerValue {
  if (scenario.kind === "mcq")
    return (
      Number.isInteger(value) &&
      (value as number) >= 0 &&
      (value as number) < scenario.options.length
    );
  if (scenario.kind === "matching")
    return (
      matchingComplete(scenario, value) &&
      isMatchingAnswer(value) &&
      Object.keys(value).every((key) => scenario.items.some((item) => item.id === key))
    );
  const key = orderKey(scenario);
  return scenario.sequence
    ? isStepPermutation(value, key)
    : Array.isArray(value) &&
        value.length === key.length &&
        JSON.stringify([...value].sort()) === JSON.stringify([...key].sort());
}

export function evaluateAnswer(scenario: Scenario, value: unknown): boolean {
  if (!answerIsComplete(scenario, value))
    throw new Error(
      scenario.kind === "mcq"
        ? "Choose one answer."
        : scenario.kind === "matching"
          ? "Match every request before checking."
          : "Arrange all the steps before checking.",
    );
  if (scenario.kind === "mcq") return value === scenario.correctIndex;
  if (scenario.kind === "matching")
    return matchingFeedback(scenario, value).every((item) => item.correct);
  return (value as string[]).every((step, index) => step === orderKey(scenario)[index]);
}

/** Complete legacy saved answers are retained; incomplete legacy matching is a draft. */
export function committedAnswer(
  session: TrainingSession,
  scenario: Scenario,
): SavedAnswer | undefined {
  return session.answers.find(
    (answer) => answer.scenarioId === scenario.id && answerIsComplete(scenario, answer.value),
  );
}

/** Called only by Check answer. The first committed response is immutable, including retries. */
export function answerSession(session: TrainingSession, value: unknown): TrainingSession {
  if (session.result) throw new Error("This attempt is already complete.");
  if (session.review) throw new Error("Review your answers before submitting the module.");
  const scenarioId = session.queue[session.index];
  const scenario = session.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error("Scenario not found.");
  if (committedAnswer(session, scenario)) return session;
  const correct = evaluateAnswer(scenario, value);
  // Old matching edits could have queued recovery before the board was complete.
  // Remove only unattempted recovery for that known incomplete response; retain history.
  const incompleteLegacy = session.answers.some((a) => a.scenarioId === scenarioId);
  const queue = session.queue.filter((id) => {
    const pending = session.scenarios.find((s) => s.id === id);
    return (
      !incompleteLegacy ||
      pending?.followUpFor !== scenarioId ||
      session.answers.some((a) => a.scenarioId === id)
    );
  });
  if (!correct && !scenario.followUpFor) {
    const followUp = session.scenarios.find((s) => s.followUpFor === scenario.id);
    if (followUp?.status === "approved" && !queue.includes(followUp.id)) queue.push(followUp.id);
  }
  return {
    ...session,
    queue,
    updatedAt: Date.now(),
    answers: [
      ...session.answers.filter((a) => a.scenarioId !== scenarioId),
      {
        scenarioId,
        value: structuredClone(value) as AnswerValue,
        correct,
        title: scenario.title,
        followUpFor: scenario.followUpFor,
      },
    ],
  };
}

export function previousSession(session: TrainingSession): TrainingSession {
  if (session.result) return session;
  return {
    ...session,
    review: false,
    index: session.review ? session.index : Math.max(0, session.index - 1),
    updatedAt: Date.now(),
  };
}

export function advanceSession(session: TrainingSession, moduleTitle: string): TrainingSession {
  if (session.result) return session;
  if (session.review) return session;
  const scenario = session.scenarios.find((s) => s.id === session.queue[session.index]);
  if (!scenario || !committedAnswer(session, scenario))
    throw new Error("Answer this scenario first using Check answer.");
  if (session.index + 1 < session.queue.length)
    return { ...session, index: session.index + 1, updatedAt: Date.now() };
  return { ...session, review: true, updatedAt: Date.now() };
}

export function submitSession(session: TrainingSession, moduleTitle: string): TrainingSession {
  if (session.result) return session;
  if (!session.review) throw new Error("Review every answer before submitting the module.");
  if (
    session.queue.some((id) => {
      const scenario = session.scenarios.find((s) => s.id === id);
      const answer = session.answers.find((a) => a.scenarioId === id);
      return !scenario || !answer || !answerIsComplete(scenario, answer.value);
    })
  )
    throw new Error("Answer every request before submitting.");
  const initial = session.answers.filter((a) => !a.followUpFor);
  const recovered = session.answers
    .filter((a) => a.followUpFor && a.correct)
    .map((a) => a.followUpFor);
  return {
    ...session,
    updatedAt: Date.now(),
    result: {
      attemptId: session.id,
      ...(session.answerFlow === "check" ? { scoreBasis: "first_committed" as const } : {}),
      moduleId: session.moduleId,
      moduleTitle,
      traineeId: session.traineeId,
      correct: initial.filter((a) => a.correct).length,
      total: initial.length,
      wrongTitles: initial
        .filter((a) => !a.correct && !recovered.includes(a.scenarioId))
        .map((a) => a.title),
      strongTitles: initial.filter((a) => a.correct).map((a) => a.title),
      recoveredTitles: initial.filter((a) => recovered.includes(a.scenarioId)).map((a) => a.title),
      completedAt: Date.now(),
    },
  };
}

export function assignmentProgress(
  assignment: Assignment,
  sessions: TrainingSession[],
  module?: Module,
) {
  if (assignment.withdrawnAt)
    return { latest: undefined, completed: false, fraction: 0, status: "Withdrawn" };
  const mine = sessions.filter(
    (s) =>
      s.assignmentId === assignment.id &&
      s.traineeId === assignment.traineeId &&
      (s.result || (!s.supersededAt && (!module || !attemptUsesOlderContent(s, module)))),
  );
  const latest = [...mine].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const completed = mine.some((s) => s.result);
  const fraction = completed
    ? 1
    : latest
      ? Math.min(
          latest.answers.filter((answer) => {
            const scenario = latest.scenarios.find((s) => s.id === answer.scenarioId);
            return scenario && answerIsComplete(scenario, answer.value);
          }).length / Math.max(latest.queue.length, 1),
          0.99,
        )
      : 0;
  return {
    latest,
    completed,
    fraction,
    status: completed ? "Completed" : latest ? "In Progress" : "Not Started",
  };
}
