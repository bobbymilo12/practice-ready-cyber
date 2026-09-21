import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSession,
  answerSession,
  assignmentProgress,
  startSession,
} from "../src/lib/training.ts";
import { practiceScenarios } from "../src/lib/practice-scenarios.ts";
import type { Assignment, Module, PracticeData, Scenario } from "../src/lib/store.ts";

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
  assert.equal(answerSession(resumed, 1), resumed);
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
  assert.deepEqual(advanceSession(session, m.title).result?.wrongTitles, ["Booking"]);
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
  const retake = startSession(module, assignment, "retake");
  assert.equal(assignmentProgress(assignment, [session, retake]).status, "Completed");
  assert.equal(assignmentProgress(assignment, [session, retake]).fraction, 1);
});

test("generated scenarios quote actual practice rules and clinicians, with draft followups", () => {
  const practice = {
    practiceName: "Oak Practice",
    prescriptionOrdering: "Use Oak's portal",
    repeatTurnaround: "Three working days",
    staff: [{ id: "staff", name: "Alex Green", role: "Pharmacist", clinics: "Medication queries" }],
    rolePolicies: {},
    sameDayReasons: [],
  } as unknown as PracticeData;
  const scenarios = practiceScenarios("prescriptions", "Prescriptions", practice, {
    runOut: "Contact Alex on extension 123",
  });
  assert.ok(scenarios.every((s) => s.status === "draft"));
  assert.ok(scenarios.some((s) => s.learningPoint.includes("Oak's portal")));
  assert.ok(scenarios.some((s) => s.learningPoint.includes("Alex Green")));
  assert.ok(scenarios.some((s) => s.learningPoint.includes("extension 123")));
  for (const s of scenarios.filter((s) => s.followUpFor)) {
    const primary = scenarios.find((p) => p.id === s.followUpFor)!;
    assert.ok(primary);
    assert.notEqual(primary.patientQuote, s.patientQuote);
  }
});
