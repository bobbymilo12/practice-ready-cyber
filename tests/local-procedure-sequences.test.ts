import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { localProcedureSequence } from "../src/lib/local-procedure-sequences.ts";
import { procedureTargets, confirmProcedure, procedureDraft } from "../src/lib/local-procedures.ts";
import {
  defaultModuleSettings,
  generateConfiguredModule,
  regenerateConfiguredScenario,
  reviseConfiguredScenario,
} from "../src/lib/module-config.ts";
import { startSession } from "../src/lib/training.ts";
import { practice } from "./fixtures/role-matching.ts";
import type { Module } from "../src/lib/store.ts";

function fixture(groups?: number[][]) {
  const p = practice(groups),
    target = procedureTargets(p)[0];
  const content = {
    steps: [
      { id: "first", text: "  Open the practice form.\nKeep its reference.  " },
      { id: "second", text: "Enter the request details." },
      { id: "third", text: "Save the completed form." },
    ],
    stepOrder: ["first", "second", "third"],
    appliesWhen: "For requests received through the manager's specified process.",
    orderRequirement: "required_linear" as const,
  };
  const record = confirmProcedure(target, undefined, content, "manager");
  p.localProcedures = { [target.id]: record };
  return { p, target, record };
}
test("only explicit required_linear produces a sequence; all other confirmation states fail closed", () => {
  for (const orderRequirement of ["unassessed", "conditional_or_flexible", undefined]) {
    const { p, record } = fixture();
    Object.assign(record, { orderRequirement });
    assert.equal(localProcedureSequence(p), undefined);
  }
  const { p, target } = fixture();
  assert.ok(localProcedureSequence(p));
  p.localProcedures![target.id] = confirmProcedure(target, undefined, null, "manager");
  assert.equal(localProcedureSequence(p), undefined);
});
test("only 3–5 complete unique steps are accepted, with exact explicit permutation", () => {
  for (const count of [2, 3, 4, 5, 6]) {
    const { p, record } = fixture();
    Object.assign(record, {
      steps: Array.from({ length: count }, (_, i) => ({
        id: String(i),
        text: `Manager step ${i}`,
      })),
      stepOrder: Array.from({ length: count }, (_, i) => String(i)),
    });
    assert.equal(!!localProcedureSequence(p), count >= 3 && count <= 5);
  }
  for (const patch of [
    { steps: [{ id: "a", text: " " }] },
    { stepOrder: ["first", "second", "second"] },
    { stepOrder: ["first", "second", "unknown"] },
    { confirmedBy: "" },
    { version: 0 },
    {
      steps: [
        { id: "a", text: "Same" },
        { id: "b", text: " same " },
        { id: "c", text: "Last" },
      ],
      stepOrder: ["a", "b", "c"],
    },
    {
      steps: [
        { id: "a", text: "One" },
        { id: "a", text: "Two" },
        { id: "c", text: "Last" },
      ],
      stepOrder: ["a", "a", "c"],
    },
  ]) {
    const { p, record } = fixture();
    Object.assign(record, patch);
    assert.equal(localProcedureSequence(p), undefined);
  }
});
test("orphaned, renamed, unconfirmed and conflicting request identities are excluded", () => {
  for (const mode of ["removed", "renamed", "unconfirmed", "conflict"]) {
    const { p, target } = fixture();
    if (mode === "removed") p.roleRequests = {};
    if (mode === "unconfirmed")
      Object.values(p.roleRequests!).forEach((r) => (r.confirmed = false));
    if (mode === "renamed") p.localProcedures![target.id].requestLabelAtConfirmation = "Old label";
    if (mode === "conflict") {
      const roles = Object.values(p.roleRequests!);
      roles[1].selectedRequestIds.push(target.id);
      roles[1].categories.flatMap((c) => c.requests).find((r) => r.id === target.id)!.label =
        "Conflicting name";
    }
    assert.equal(localProcedureSequence(p), undefined);
  }
});
test("obvious conditional steps are excluded despite a contradictory linear setting, without rewriting", () => {
  const { p, record } = fixture();
  if (record.status !== "configured") throw Error("fixture");
  record.steps[0].text = "If needed, open the form.";
  const original = JSON.stringify(p);
  assert.equal(localProcedureSequence(p), undefined);
  assert.equal(JSON.stringify(p), original);
});
test("manager text/context and all stable identities survive verbatim in independent snapshots", () => {
  const { p, record } = fixture();
  const s = localProcedureSequence(p)!;
  if (record.status !== "configured") throw Error("fixture");
  assert.deepEqual(
    s.sequence.steps,
    record.steps.map((step) => ({ id: step.id, label: step.text })),
  );
  assert.equal(s.patientQuote, record.appliesWhen);
  assert.deepEqual(s.provenance.snapshot.localProcedure, record);
  assert.equal(s.provenance.sourceVersion, record.version);
  assert.equal(s.provenance.sourceId, record.id);
  assert.deepEqual(s.sequence.correctOrder, record.stepOrder);
  assert.notDeepEqual(s.sequence.presentationOrder, record.stepOrder);
  assert.deepEqual(localProcedureSequence(p)!.sequence, s.sequence);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});
test("candidate selection is deterministic regardless of dictionary insertion and skips ineligible candidates", () => {
  const { p, record } = fixture();
  const target = procedureTargets(p)[1];
  p.localProcedures![target.id] = confirmProcedure(
    target,
    undefined,
    procedureDraft(record),
    "manager",
  );
  const first = localProcedureSequence(p)!;
  p.localProcedures = Object.fromEntries(Object.entries(p.localProcedures!).reverse());
  assert.equal(localProcedureSequence(p)!.provenance.sourceId, first.provenance.sourceId);
  Object.assign(p.localProcedures[first.provenance.snapshot.localProcedure!.requestId], {
    orderRequirement: "unassessed",
  });
  assert.notEqual(localProcedureSequence(p)!.provenance.sourceId, first.provenance.sourceId);
});
test("matching retains priority; sequences replace one existing local MCQ only with room", () => {
  const { p } = fixture();
  for (const count of [1, 2, 3, 4, 6, 10]) {
    const settings = { ...defaultModuleSettings(), trainingLevel: "learn" as const, count };
    const baseline = generateConfiguredModule(
      "appointment-booking",
      "Booking",
      { ...p, localProcedures: undefined },
      settings,
    );
    const result = generateConfiguredModule("appointment-booking", "Booking", p, settings);
    assert.equal(result.length, baseline.length);
    const core = result.filter((s) => s.provenance?.kind === "core").length;
    assert.equal(core, baseline.filter((s) => s.provenance?.kind === "core").length);
    const localCount = result.length - core;
    assert.equal(result.filter((s) => s.kind === "matching").length, localCount >= 2 ? 1 : 0);
    assert.equal(result.filter((s) => s.kind === "order").length, localCount >= 4 ? 1 : 0);
    if (localCount >= 4)
      assert.ok(result.filter((s) => s.kind === "mcq" && !s.provenance).length >= 2);
  }
});
test("sequence can use a two-slot local budget without matching; does not fill absent local capacity", () => {
  const { p } = fixture([[0, 1, 2, 3, 4, 5]]);
  const settings = { ...defaultModuleSettings(), trainingLevel: "learn" as const, count: 3 };
  const result = generateConfiguredModule("appointment-booking", "Booking", p, settings);
  assert.equal(result.filter((s) => s.kind === "matching").length, 0);
  assert.equal(result.filter((s) => s.kind === "order").length, 1);
  assert.equal(result.length, 3);
  const before = generateConfiguredModule(
    "appointment-booking",
    "Booking",
    { ...p, localProcedures: undefined },
    { ...settings, count: 100 },
  );
  assert.equal(
    generateConfiguredModule("appointment-booking", "Booking", p, { ...settings, count: 100 })
      .length,
    before.length,
  );
});
test("Apply, implicit legacy levels, other modules and ineligible Learn remain unchanged", () => {
  const { p, record } = fixture();
  const normalise = (v: unknown) =>
    JSON.stringify(v, (key, value) => (["id", "generatedAt"].includes(key) ? undefined : value));
  for (const [topic, level] of [
    ["appointment-booking", "apply"],
    ["appointment-booking", undefined],
    ["prescriptions", "learn"],
  ] as const) {
    const settings = { ...defaultModuleSettings(), trainingLevel: level, count: 10 };
    assert.equal(
      normalise(generateConfiguredModule(topic, "Booking", p, settings)),
      normalise(
        generateConfiguredModule(topic, "Booking", { ...p, localProcedures: undefined }, settings),
      ),
    );
  }
  Object.assign(record, { orderRequirement: "unassessed" });
  const settings = { ...defaultModuleSettings(), trainingLevel: "learn" as const, count: 10 };
  assert.equal(
    normalise(generateConfiguredModule("appointment-booking", "Booking", p, settings)),
    normalise(
      generateConfiguredModule(
        "appointment-booking",
        "Booking",
        { ...p, localProcedures: undefined },
        settings,
      ),
    ),
  );
});
test("later setting/step changes cannot alter modules or sessions; edit/regenerate retains evidence", () => {
  const { p, record } = fixture();
  const scenario = localProcedureSequence(p)!;
  scenario.status = "approved";
  const module: Module = {
    id: "module",
    title: "Booking",
    type: "Booking",
    topicKey: "appointment-booking",
    createdAt: 1,
    published: true,
    settings: { ...defaultModuleSettings(), trainingLevel: "learn" },
    scenarios: [scenario],
  };
  const session = startSession(
    module,
    {
      id: "assignment",
      moduleId: module.id,
      traineeId: "trainee",
      assignedAt: 1,
      status: "assigned",
    },
    "trainee",
  );
  const before = JSON.stringify({ module, session });
  Object.assign(record, { orderRequirement: "conditional_or_flexible", version: 2 });
  if (record.status === "configured") record.steps[0].text = "Changed";
  assert.equal(JSON.stringify({ module, session }), before);
  assert.deepEqual(regenerateConfiguredScenario(module, scenario.id, p), module);
  const edited = reviseConfiguredScenario(module, { ...scenario, title: "Manager title" })
    .scenarios[0];
  assert.equal(edited.provenance?.managerModified, true);
  assert.deepEqual(edited.provenance?.snapshot, scenario.provenance.snapshot);
});
test("manager review shows source/version/context, suppresses empty quotes and disables structured regeneration", () => {
  const source = readFileSync(new URL("../src/routes/modules.review.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("Manager-confirmed practice procedure"));
  assert.ok(source.includes("scenario.provenance.snapshot.localProcedure.appliesWhen"));
  assert.ok(source.includes('disabled={scenario.kind === "order" && !!scenario.sequence}'));
  const editor = readFileSync(
    new URL("../src/components/LocalProcedures.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(editor.includes('<option value="unassessed">Not assessed</option>'));
  assert.ok(editor.includes('<option value="required_linear">'));
});
