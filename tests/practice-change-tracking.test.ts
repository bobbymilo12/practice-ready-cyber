import assert from "node:assert/strict";
import test from "node:test";
import * as tracking from "../src/lib/practice-change-tracking.ts";
import { managerActionPatch } from "../src/lib/manager-actions.ts";
import { empty } from "./fixtures/practice.ts";
import { startSession } from "../src/lib/training.ts";
import type { AppState } from "../src/lib/store.ts";
import type { MCQScenario, Module } from "../src/lib/training-types.ts";

const p = () => ({ ...empty(), hours: "08:00–18:30" });
const legacy = (id = "standalone"): Module => ({
  id,
  title: "Local training",
  type: "Custom",
  topicKey: "custom",
  published: true,
  createdAt: 1,
  scenarios: [
    {
      id: "q",
      kind: "mcq",
      title: "Local rule",
      question: "What next?",
      patientQuote: "",
      options: ["Saved rule", "Other"],
      correctIndex: 0,
      learningPoint: "Saved local guidance",
      status: "approved",
    },
  ],
});
const linked = (id: string, paths: string[]): MCQScenario => ({
  ...(legacy().scenarios[0] as MCQScenario),
  id,
  provenance: { kind: "test", paths },
});
const stateFor = (practice: ReturnType<typeof p>, modules = [legacy()]): AppState =>
  ({
    practiceData: practice,
    modules,
    assignments: [],
    packages: [],
    trainees: [],
    currentDraftId: null,
    account: { id: "manager", name: "Practice Manager", role: "manager" },
  }) as unknown as AppState;

for (const field of ["practiceName", "hours", "address"] as const)
  test(`${field} changes flag published training across packages without changing questions`, () => {
    const before = p();
    const next = { ...before, [field]: "Changed" };
    const modules = [
      legacy("standalone"),
      { ...legacy("induction"), packageId: "induction" },
      { ...legacy("draft"), published: false },
    ];
    const snapshot = JSON.stringify(modules.map((m) => m.scenarios));
    const flagged = tracking.flagPracticeChanges(before, next, modules);
    assert.equal(flagged[0].needsReview, true);
    assert.equal(flagged[1].needsReview, true);
    assert.equal(flagged[2].needsReview, undefined);
    assert.equal(JSON.stringify(flagged.map((m) => m.scenarios)), snapshot);
    assert.ok(flagged[0].reviewChanges?.length);
  });

test("no-op edits don't flag; reasons accumulate and repeat edits are idempotent", () => {
  const before = p();
  const modules = [legacy()];
  assert.equal(tracking.flagPracticeChanges(before, structuredClone(before), modules), modules);
  const next = { ...before, hours: "09:00–17:00" };
  const flagged = tracking.flagPracticeChanges(before, next, modules);
  assert.match(flagged[0].reviewReason!, /08:00–18:30.*09:00–17:00/);
  const more = { ...next, address: "2 Example Road" };
  const again = tracking.flagPracticeChanges(next, more, flagged);
  assert.equal(again[0].reviewChanges?.length, 2);
  assert.match(again[0].reviewReason!, /Practice address/);
  assert.equal(tracking.flagPracticeChanges(next, more, again), again);
});

test("review flags block new and resumed training until a recorded explicit decision", () => {
  const before = p(),
    next = { ...before, hours: "09:00–17:00" };
  const module = tracking.flagPracticeChanges(before, next, [legacy()])[0];
  const state = stateFor(next, [module]);
  assert.throws(
    () =>
      startSession(
        module,
        { id: "a", moduleId: module.id, traineeId: "t", assignedAt: 1, status: "assigned" },
        "attempt",
      ),
    /review/,
  );
  assert.throws(
    () =>
      managerActionPatch(
        state,
        { kind: "publish", moduleId: module.id },
        { id: "decision", at: 1 },
      ),
    /Approve/,
  );
  state.modules[0] = module.scenarios.reduce(
    (m, q) => tracking.approveReviewedQuestion(m, q.id, next),
    module,
  );
  const action = {
    kind: "publish" as const,
    moduleId: module.id,
    reviewKey: tracking.reviewKey(module, next),
  };
  const patch = managerActionPatch(state, action, { id: "decision", at: 1 });
  assert.equal(state.modules[0].needsReview, true); // Preparing never mutates visible state.
  assert.equal(patch.modules![0].needsReview, false);
  assert.equal(patch.modules![0].reviewConfirmations![0].by, "manager");
  assert.deepEqual(
    patch.modules![0].reviewConfirmations![0].reasons,
    module.reviewChanges!.map((c) => c.reason),
  );
  const newer = { ...state, practiceData: { ...next, hours: "Changed again" } };
  assert.throws(
    () => managerActionPatch(newer, action, { id: "decision", at: 1 }),
    /current practice information/,
  );
  const applied = managerActionPatch(newer, action, { id: "decision", at: 1 }, state);
  assert.equal(applied.modules![0].needsReview, true);
  assert.equal(applied.modules![0].reviewConfirmations!.length, 1);
});

test("the server refuses boolean dismissal, authenticates decisions and retains previous audit records", () => {
  const before = p(),
    next = { ...before, hours: "09:00–17:00" };
  const module = tracking.flagPracticeChanges(before, next, [legacy()])[0];
  assert.throws(
    () =>
      tracking.enforceReviewDecisions(
        [module],
        [{ ...module, needsReview: false }],
        next,
        { id: "verified", name: "Verified manager" },
        "2026-10-10T12:00:00Z",
      ),
    /decision/,
  );
  const reviewed = module.scenarios.reduce(
    (m, q) => tracking.approveReviewedQuestion(m, q.id, next),
    module,
  );
  const state = stateFor(next, [reviewed]);
  const candidate = managerActionPatch(
    state,
    {
      kind: "publish",
      moduleId: module.id,
      reviewKey: tracking.reviewKey(module, next),
    },
    { id: "decision", at: 1 },
  ).modules!;
  const stamped = tracking.enforceReviewDecisions(
    [module],
    candidate,
    next,
    { id: "verified", name: "Verified manager" },
    "2026-10-10T12:00:00Z",
  );
  assert.equal(stamped[0].reviewConfirmations![0].by, "verified");
  assert.equal(stamped[0].reviewConfirmations![0].at, "2026-10-10T12:00:00Z");
  const history = tracking.enforceReviewDecisions(
    stamped,
    [{ ...stamped[0], reviewConfirmations: [] }],
    next,
    { id: "verified", name: "Verified manager" },
    "2026-10-11T12:00:00Z",
  );
  assert.deepEqual(history[0].reviewConfirmations, stamped[0].reviewConfirmations);
  const future = { ...next, hours: "10:00–16:00" };
  const flagged = tracking.flagPracticeChanges(next, future, stamped)[0];
  assert.equal(flagged.needsReview, true);
  assert.equal(flagged.reviewConfirmations!.length, 1);
});

test("recorded provenance paths target questions; missing or edited provenance stays module-wide", () => {
  const before = p(),
    after = { ...before, hours: "Changed hours" };
  const hours = linked("hours", ["practiceData.hours"]);
  const address = linked("address", ["practiceData.address"]);
  const module = { ...legacy(), scenarios: [hours, address] };
  assert.equal(
    tracking.flagPracticeChanges(before, { ...before, extras: "x" } as never, [module])[0]
      .needsReview,
    undefined,
  );
  let flagged = tracking.flagPracticeChanges(before, after, [module])[0];
  assert.deepEqual(tracking.questionReviewScope(flagged), { broad: false, ids: ["hours"] });
  assert.deepEqual(tracking.pendingQuestionReviews(flagged, after), ["hours"]);
  flagged = tracking.approveReviewedQuestion(flagged, "hours", after);
  assert.deepEqual(tracking.pendingQuestionReviews(flagged, after), []);
  assert.equal(flagged.needsReview, true, "approval alone does not resume training");
  const repeated = tracking.flagPracticeChanges(before, after, [flagged])[0];
  assert.equal(repeated.reviewedQuestions, undefined, "a fresh change cannot reuse old approvals");

  for (const provenance of [
    undefined,
    { kind: "test" },
    { kind: "test", paths: [42] },
    { kind: "test", paths: ["practiceData.address"], managerModified: true },
  ]) {
    const unknown = { ...legacy(), scenarios: [{ ...address, provenance }] } as unknown as Module;
    const result = tracking.flagPracticeChanges(before, after, [unknown])[0];
    assert.equal(result.needsReview, true);
    assert.equal(tracking.questionReviewScope(result).broad, true);
  }
  assert.deepEqual(
    tracking
      .recordedSourceChanges(hours, tracking.practiceChanges(before, after))
      .map((c) => c.path),
    ["practiceData.hours"],
  );
});
