import type { Assignment, Module, Scenario, TrainingResult } from "./training-types.ts";

export interface SavedAnswer {
  scenarioId: string;
  value: number | string[];
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
    scenarios: module.scenarios.filter((s) => s.status === "approved"),
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
  if (session.answers.some((a) => a.scenarioId === scenarioId)) return session;
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
  } else {
    if (
      !Array.isArray(value) ||
      value.length !== scenario.steps.length ||
      JSON.stringify([...value].sort()) !== JSON.stringify([...scenario.steps].sort())
    )
      throw new Error("Arrange all the steps before checking.");
    correct = value.every((step, i) => step === scenario.steps[i]);
  }
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
      ...session.answers,
      {
        scenarioId,
        value: value as number | string[],
        correct,
        title: scenario.title,
        followUpFor: scenario.followUpFor,
      },
    ],
  };
}

export function advanceSession(session: TrainingSession, moduleTitle: string): TrainingSession {
  if (session.result) return session;
  if (session.review) return session;
  if (!session.answers.some((a) => a.scenarioId === session.queue[session.index]))
    throw new Error("Answer this scenario first.");
  if (session.index + 1 < session.queue.length)
    return { ...session, index: session.index + 1, updatedAt: Date.now() };
  return { ...session, review: true, updatedAt: Date.now() };
}

export function submitSession(session: TrainingSession, moduleTitle: string): TrainingSession {
  if (session.result) return session;
  if (!session.review) throw new Error("Review every answer before submitting the module.");
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
