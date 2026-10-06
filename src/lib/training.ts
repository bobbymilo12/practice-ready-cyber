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
    updatedAt: Date.now(),
  };
}

export function answerSession(session: TrainingSession, value: unknown): TrainingSession {
  if (session.result) throw new Error("This attempt is already complete.");
  if (session.review) throw new Error("Review your answers before submitting the module.");
  const scenarioId = session.queue[session.index];

  const scenario = session.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error("Scenario not found.");
  let correct: boolean;
  if (scenario.kind === "mcq") {
    if (
      !Number.isInteger(value) ||
      (value as number) < 0 ||
      (value as number) >= scenario.options.length
    )
      throw new Error("Choose one answer.");
    correct = value === scenario.correctIndex;
  } else if (scenario.kind === "matching") {
    if (
      !isMatchingAnswer(value) ||
      Object.keys(value).some((key) => !scenario.items.some((i) => i.id === key)) ||
      Object.values(value).some((id) => !scenario.targets.some((t) => t.id === id)) ||
      (scenario.pairingMode === "one_to_one" &&
        new Set(Object.values(value)).size !== Object.keys(value).length)
    )
      throw new Error("Choose one of the shown roles for each request.");
    correct =
      matchingComplete(scenario, value) &&
      matchingFeedback(scenario, value).every((i) => i.correct);
  } else if (scenario.kind === "order") {
    const key = orderKey(scenario);
    if (
      scenario.sequence
        ? !isStepPermutation(value, key)
        : !Array.isArray(value) ||
          value.length !== key.length ||
          JSON.stringify([...value].sort()) !== JSON.stringify([...key].sort())
    )
      throw new Error("Arrange all the steps before checking.");
    correct = (value as string[]).every((step, i) => step === key[i]);
  } else throw new Error("Unsupported interaction.");
  const queue = [...session.queue];
  if (!correct && !scenario.followUpFor) {
    const followUp = session.scenarios.find((s) => s.followUpFor === scenario.id);
    if (followUp && !queue.includes(followUp.id)) queue.push(followUp.id);
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
  if (!session.answers.some((a) => a.scenarioId === session.queue[session.index]))
    throw new Error("Answer this scenario first.");
  const current = session.scenarios.find((s) => s.id === session.queue[session.index]);
  if (
    current?.kind === "matching" &&
    !matchingComplete(current, session.answers.find((a) => a.scenarioId === current.id)?.value)
  )
    throw new Error("Match every request before continuing.");
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
      return (
        !answer || (scenario?.kind === "matching" && !matchingComplete(scenario, answer.value))
      );
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

export function assignmentProgress(assignment: Assignment, sessions: TrainingSession[]) {
  const mine = sessions.filter(
    (s) => s.assignmentId === assignment.id && s.traineeId === assignment.traineeId,
  );
  const latest = [...mine].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const completed = mine.some((s) => s.result);
  const fraction = completed
    ? 1
    : latest
      ? Math.min(latest.answers.length / Math.max(latest.queue.length, 1), 0.99)
      : 0;
  return {
    latest,
    completed,
    fraction,
    status: completed ? "Completed" : latest ? "In Progress" : "Not Started",
  };
}
