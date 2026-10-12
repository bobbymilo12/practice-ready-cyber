import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { approvedTestSequence, sequencePreviewModule } from "./fixtures/sequence.ts";
import { empty } from "./fixtures/role-matching.ts";
import {
  createSequenceScenario,
  createTestSequenceScenario,
  shuffleSequence,
  moveSequence,
  orderLabels,
} from "../src/lib/sequence.ts";
import {
  startSession,
  answerSession,
  advanceSession,
  previousSession,
  submitSession,
} from "../src/lib/training.ts";
import {
  generateConfiguredModule,
  defaultModuleSettings,
  reviseConfiguredScenario,
  regenerateConfiguredScenario,
} from "../src/lib/module-config.ts";
import { practiceScenarios } from "../src/lib/practice-scenarios.ts";
import type { Assignment } from "../src/lib/training-types.ts";

const assignment: Assignment = {
  id: "a",
  moduleId: "dev-sequence-preview",
  traineeId: "t",
  assignedAt: 1,
  status: "assigned",
};

test("stable IDs, independent key and seeded Fisher–Yates permutations retain approved evidence", () => {
  const source = structuredClone(approvedTestSequence);
  const scenario = createTestSequenceScenario(source, 17);
  const key = source.correctOrder;
  assert.deepEqual(scenario.sequence.correctOrder, key);
  assert.notDeepEqual(scenario.sequence.presentationOrder, key);
  const orders = Array.from({ length: 20 }, (_, seed) => shuffleSequence(key, seed));
  const rotations = key.map((_, i) => JSON.stringify([...key.slice(i), ...key.slice(0, i)]));
  assert.ok(orders.some((o) => !rotations.includes(JSON.stringify(o))));
  assert.ok(new Set(orders.map((o) => JSON.stringify(o))).size > 4);
  assert.deepEqual(shuffleSequence(key, 17), shuffleSequence(key, 17));
  for (const order of orders) assert.deepEqual([...order].sort(), [...key].sort());
  source.steps[0].label = "Later revision";
  source.correctOrder.reverse();
  assert.notEqual(scenario.sequence.steps[0].label, source.steps[0].label);
  assert.equal(scenario.provenance.sourceVersion, 1);
  assert.deepEqual(scenario.provenance.snapshot, approvedTestSequence);
});

test("source approval/confirmation, explicit order and test isolation fail closed", () => {
  assert.throws(() => createSequenceScenario(approvedTestSequence, 1), /Test-only/);
  assert.throws(() =>
    createTestSequenceScenario({ ...approvedTestSequence, scope: "production" }, 1),
  );
  assert.throws(() => createTestSequenceScenario({ ...approvedTestSequence, correctOrder: [] }, 1));
  assert.throws(() =>
    createTestSequenceScenario(
      { ...approvedTestSequence, steps: approvedTestSequence.steps.slice(0, 2) },
      1,
    ),
  );
  assert.throws(() =>
    createTestSequenceScenario(
      { ...approvedTestSequence, approval: { status: "draft" } } as any,
      1,
    ),
  );
  const local = {
    ...approvedTestSequence,
    kind: "local_sequence" as const,
    scope: "production" as const,
    confirmation: { status: "confirmed" as const, by: "Fixture manager", on: "2026-10-06" },
  };
  assert.equal(createSequenceScenario(local, 3).provenance.sourceKind, "local_sequence");
});

test("answer validation rejects duplicate, missing, unknown IDs and labels used as answers", () => {
  const module = sequencePreviewModule();
  const session = startSession(module, assignment, "attempt");
  const ids = approvedTestSequence.correctOrder;
  for (const invalid of [
    ids.slice(1),
    [...ids, ids[0]],
    [ids[0], ids[0], ids[2], ids[3]],
    ["unknown", ...ids.slice(1)],
    approvedTestSequence.steps.map((s) => s.label),
    {},
  ])
    assert.throws(() => answerSession(session, invalid));
});

test("first checked order survives navigation/reload; exact order counts as one scenario", () => {
  const module = sequencePreviewModule();
  let session = startSession(module, assignment, "attempt");
  const scenario = module.scenarios[0];
  if (scenario.kind !== "order" || !scenario.sequence) throw new Error("fixture");
  let ids = moveSequence(scenario.sequence.presentationOrder, 0, 2);
  session = answerSession(session, ids);
  session = JSON.parse(JSON.stringify(session));
  assert.deepEqual(session.answers[0].value, ids);
  session = previousSession(advanceSession(session, module.title));
  assert.deepEqual(session.answers[0].value, ids);
  session = answerSession(session, scenario.sequence.correctOrder);
  const result = submitSession(advanceSession(session, module.title), module.title);
  assert.equal(result.result!.correct, session.answers[0].correct ? 1 : 0);
  assert.deepEqual(session.answers[0].value, ids);
  assert.equal(result.result!.total, 1);
  const wrong = answerSession(
    startSession(module, assignment, "wrong"),
    scenario.sequence.presentationOrder,
  );
  assert.equal(submitSession(advanceSession(wrong, module.title), module.title).result!.correct, 0);
  scenario.sequence.steps[0].label = "Later changed";
  assert.notDeepEqual(session.scenarios[0], scenario);
});

test("review displays labels, manager edits preserve the key/provenance, regeneration cannot replace the source", () => {
  const module = sequencePreviewModule();
  const scenario = module.scenarios[0];
  if (scenario.kind !== "order" || !scenario.sequence) throw new Error("fixture");
  assert.deepEqual(
    orderLabels(scenario, scenario.sequence.correctOrder),
    approvedTestSequence.steps.map((s) => s.label),
  );
  const altered = {
    ...scenario,
    sequence: { ...scenario.sequence, correctOrder: [...scenario.sequence.correctOrder].reverse() },
    title: "Reviewed",
  };
  const reviewed = reviseConfiguredScenario(module, altered).scenarios[0];
  assert.ok(reviewed.kind === "order" && reviewed.sequence);
  assert.deepEqual(reviewed.sequence.correctOrder, scenario.sequence.correctOrder);
  assert.equal(reviewed.provenance.managerModified, true);
  assert.deepEqual(regenerateConfiguredScenario(module, scenario.id, empty()), module);
});

test("normal generation cannot discover test fixtures or derive a sequence from unordered data", () => {
  const p = empty();
  p.prescriptionOrdering = "Use the online form";
  for (const topic of ["appointment-booking", "prescriptions", "custom"]) {
    const scenarios = generateConfiguredModule(topic, topic, p, defaultModuleSettings());
    assert.ok(scenarios.every((s) => s.kind !== "order"));
    assert.ok(!JSON.stringify(scenarios).includes(approvedTestSequence.id));
  }
  assert.ok(practiceScenarios("custom", "Custom", p, {}).every((s) => s.kind !== "order"));
  const store = readFileSync(new URL("../src/lib/store.ts", import.meta.url), "utf8");
  const conversion = store.slice(
    store.indexOf("export function draftsForTopic"),
    store.indexOf("// ------------- Seeded example module"),
  );
  assert.ok(!conversion.includes('kind: "order"'));
  assert.ok(!conversion.includes("steps: ["));
  assert.ok(conversion.includes('if (s.kind !== "mcq") return s'));
});

test("legacy ordering strings remain valid and score exactly as before", () => {
  const module = sequencePreviewModule();
  module.scenarios = [
    {
      kind: "order",
      id: "legacy",
      title: "Legacy",
      patientQuote: "",
      question: "Order",
      steps: ["First", "Second", "Third"],
      learningPoint: "Legacy source",
      status: "approved",
    },
  ];
  const session = answerSession(startSession(module, assignment, "legacy"), [
    "First",
    "Second",
    "Third",
  ]);
  assert.equal(
    submitSession(advanceSession(session, module.title), module.title).result!.correct,
    1,
  );
  assert.deepEqual(orderLabels(module.scenarios[0] as any, ["Third", "First", "Second"]), [
    "Third",
    "First",
    "Second",
  ]);
});

test("structured ordering survives forward/back navigation between different interaction kinds", () => {
  const module = sequencePreviewModule();
  const board = module.scenarios[0];
  if (board.kind !== "order" || !board.sequence) throw new Error("fixture");
  module.scenarios.push({
    kind: "mcq",
    id: "mcq-after",
    title: "Test",
    patientQuote: "",
    question: "Choose",
    options: ["One", "Two"],
    correctIndex: 0,
    learningPoint: "Test only",
    status: "approved",
  });
  let session = answerSession(
    startSession(module, assignment, "mixed"),
    board.sequence.presentationOrder,
  );
  session = advanceSession(session, module.title);
  session = answerSession(session, 0);
  session = previousSession(JSON.parse(JSON.stringify(session)));
  assert.equal(session.queue[session.index], board.id);
  assert.deepEqual(
    session.answers.find((a) => a.scenarioId === board.id)!.value,
    board.sequence.presentationOrder,
  );
  session = answerSession(session, board.sequence.correctOrder);
  session = advanceSession(session, module.title);
  session = advanceSession(session, module.title);
  assert.equal(submitSession(session, module.title).result!.total, 2);
});
