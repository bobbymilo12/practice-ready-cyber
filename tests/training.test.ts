import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSession,
  previousSession,
  answerSession,
  assignmentProgress,
  startSession,
  submitSession,
} from "../src/lib/training.ts";
import type { Assignment, Module, Scenario } from "../src/lib/store.ts";

const question: Scenario = {
  id: "q1",
  kind: "mcq",
  title: "Booking",
  patientQuote: "Can I book?",
  question: "What next?",
  options: ["Guess", "Check"],
  correctIndex: 1,
  learningPoint: "Check local guidance.",
  status: "approved",
};
const followup: Scenario = {
  ...question,
  id: "q2",
  followUpFor: "q1",
  title: "Booking a follow-up",
  patientQuote: "My appointment needs changing.",
};
const order: Scenario = {
  id: "q3",
  kind: "order",
  title: "Steps",
  patientQuote: "What happens?",
  question: "Order",
  steps: ["Check", "Book", "Record"],
  learningPoint: "Check first.",
  status: "approved",
};
const module: Module = {
  id: "m1",
  title: "Bookings",
  type: "Booking",
  topicKey: "booking",
  published: true,
  createdAt: 1,
  scenarios: [question, order, followup],
};
const assignment: Assignment = {
  id: "a1",
  moduleId: "m1",
  traineeId: "alice",
  assignedAt: 1,
  status: "assigned",
};

test("missed questions receive a different approved scenario and preserve the first score", () => {
  let session = startSession(module, assignment, "attempt");
  assert.deepEqual(session.queue, ["q1", "q3"]);
  session = answerSession(session, 0);
  assert.deepEqual(session.queue, ["q1", "q3", "q2"]);
  session = advanceSession(session, module.title);
  session = answerSession(session, ["Check", "Book", "Record"]);
  session = advanceSession(session, module.title);
  session = answerSession(session, 1);
  session = advanceSession(session, module.title);
  session = submitSession(session, module.title);
  assert.equal(session.result?.correct, 1);
  assert.equal(session.result?.total, 2);
  assert.deepEqual(session.result?.wrongTitles, []);
  assert.deepEqual(session.result?.recoveredTitles, ["Booking"]);
  assert.deepEqual(session.result?.strongTitles, ["Steps"]);
  assert.equal(advanceSession(session, module.title), session);
});

test("refreshing during feedback retains the submitted answer and prevents duplicate scoring", () => {
  const saved = answerSession(startSession(module, assignment, "attempt"), 0);
  const resumed = JSON.parse(JSON.stringify(saved));
  assert.equal(resumed.answers[0].value, 0);
  assert.equal(resumed.index, 0);
  const changed = answerSession(resumed, 1);
  assert.equal(changed.answers.length, 1);
  assert.equal(changed.answers[0].value, 0);
  assert.equal(changed.answers[0].correct, false);
  assert.deepEqual(changed, resumed);
  assert.equal(advanceSession(resumed, module.title).index, 1);
});

test("progress is isolated by trainee and assignment, including reassignment", () => {
  const session = answerSession(startSession(module, assignment, "attempt"), 1);
  assert.equal(assignmentProgress(assignment, [session]).status, "In Progress");
  assert.equal(assignmentProgress(assignment, [session]).fraction, 0.5);
  assert.equal(
    assignmentProgress({ ...assignment, traineeId: "bob" }, [session]).status,
    "Not Started",
  );
  assert.equal(assignmentProgress({ ...assignment, id: "redo" }, [session]).status, "Not Started");
});

test("unapproved followups never reach training", () => {
  const m = { ...module, scenarios: [question, { ...followup, status: "draft" as const }] };
  const session = answerSession(startSession(m, assignment, "attempt"), 0);
  assert.deepEqual(session.queue, ["q1"]);
  const review = advanceSession(session, m.title);
  assert.equal(review.review, true);
  assert.deepEqual(submitSession(review, m.title).result?.wrongTitles, ["Booking"]);
});

test("unanswered, invalid and unavailable module operations fail", () => {
  const session = startSession(module, assignment, "attempt");
  assert.throws(() => advanceSession(session, module.title), /Answer/);
  assert.throws(() => answerSession(session, -1), /Choose/);
  assert.throws(() => answerSession(session, 5), /Choose/);
  assert.throws(() => startSession({ ...module, published: false }, assignment, "attempt"));
  assert.throws(() => startSession({ ...module, needsReview: true }, assignment, "attempt"));
  const next = advanceSession(answerSession(session, 1), module.title);
  assert.throws(() => answerSession(next, ["Check", "Check", "Record"]), /Arrange/);
});

test("completion and an optional retake do not erase the achievement", () => {
  let session = startSession({ ...module, scenarios: [question] }, assignment, "attempt");
  session = advanceSession(answerSession(session, 1), module.title);
  session = submitSession(session, module.title);
  const retake = startSession(module, assignment, "retake");
  assert.equal(assignmentProgress(assignment, [session, retake]).status, "Completed");
  assert.equal(assignmentProgress(assignment, [session, retake]).fraction, 1);
});

test("previous navigation retains immutable committed MCQ and ordering answers through reload and submission", () => {
  let s = startSession(module, assignment, "navigation");
  assert.equal(previousSession(s).index, 0);
  s = advanceSession(answerSession(s, 1), module.title);
  s = answerSession(s, ["Record", "Book", "Check"]);
  s = previousSession(JSON.parse(JSON.stringify(s)));
  assert.equal(s.index, 0);
  assert.equal(s.answers.find((a) => a.scenarioId === "q1")?.value, 1);
  s = answerSession(s, 0);
  s = answerSession(s, 1);
  assert.equal(s.answers.filter((a) => a.scenarioId === "q1").length, 1);
  s = advanceSession(s, module.title);
  assert.deepEqual(s.answers.find((a) => a.scenarioId === "q3")?.value, [
    "Record",
    "Book",
    "Check",
  ]);
  s = advanceSession(answerSession(s, order.kind === "order" ? order.steps : []), module.title);
  s = submitSession(s, module.title);
  assert.equal(s.result?.correct, 1);
  assert.equal(s.result?.total, 2);
  assert.equal(previousSession(s), s);
  assert.throws(() => answerSession(s, 0), /complete/);
});

test("content comparison preserves normal resume and ignores unrelated persistence metadata", async () => {
  const { resumableAttempt, attemptUsesOlderContent } = await import("../src/lib/training.ts");
  const session = answerSession(startSession(module, assignment, "old"), 0);
  const reloaded = JSON.parse(JSON.stringify(session));
  const saved = {
    ...module,
    title: "Renamed module",
    createdAt: 999,
    reviewReason: "Reviewed",
    scenarios: module.scenarios.map((s) => ({
      ...s,
      id: "new-" + s.id,
      followUpFor: s.followUpFor ? "new-" + s.followUpFor : undefined,
    })),
  };
  assert.equal(resumableAttempt(reloaded, saved), true);
  assert.equal(attemptUsesOlderContent(reloaded, saved), false);
  assert.equal(assignmentProgress(assignment, [reloaded], saved).latest?.id, "old");
  const changed = structuredClone(saved);
  changed.scenarios[0].learningPoint = "Corrected saved practice guidance";
  assert.equal(resumableAttempt(reloaded, changed), false);
  assert.equal(assignmentProgress(assignment, [reloaded], changed).latest, undefined);
  const fresh = startSession(changed, assignment, "fresh");
  assert.equal(fresh.scenarios[0].learningPoint, "Corrected saved practice guidance");
  assert.deepEqual(reloaded, JSON.parse(JSON.stringify(session)));
  assert.equal(resumableAttempt({ ...reloaded, supersededAt: 123 }, module), false);
});

test("completed history remains complete when teaching content changes", async () => {
  const { attemptUsesOlderContent } = await import("../src/lib/training.ts");
  const one = { ...module, scenarios: [question] };
  const completed = submitSession(
    advanceSession(answerSession(startSession(one, assignment, "done"), 1), one.title),
    one.title,
  );
  const before = structuredClone(completed);
  const updated = { ...one, scenarios: [{ ...question, managerNote: "New guidance" }] };
  assert.equal(attemptUsesOlderContent(completed, updated), true);
  assert.equal(assignmentProgress(assignment, [completed], updated).completed, true);
  assert.deepEqual(completed, before);
});

test("presentation shuffles do not supersede teaching, but changes to correct answers and recovery do", async () => {
  const { attemptUsesOlderContent } = await import("../src/lib/training.ts");
  const session = startSession(module, assignment, "original");
  const reordered = structuredClone(module);
  reordered.scenarios = [...module.scenarios].reverse().map((s) => structuredClone(s));
  const mcq = reordered.scenarios.find((s) => s.id === question.id)!;
  if (mcq.kind !== "mcq") throw new Error("Expected MCQ");
  mcq.options.reverse();
  mcq.correctIndex = 0;
  assert.equal(attemptUsesOlderContent(session, reordered), false);
  mcq.correctIndex = 1;
  assert.equal(attemptUsesOlderContent(session, reordered), true);
  const recoveryChange = structuredClone(module);
  recoveryChange.scenarios.find((s) => s.id === followup.id)!.learningPoint =
    "Changed recovery guidance";
  assert.equal(attemptUsesOlderContent(session, recoveryChange), true);
});
