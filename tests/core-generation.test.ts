import assert from "node:assert/strict";
import test from "node:test";
import { coreTrainingLibrary } from "../src/lib/core-training-library.ts";
import { createCoreGenerator, generateCoreScenario, resolveCoreBinding, resolveCoreEligibility } from "../src/lib/core-training-generation.ts";
import type { CoreGenerationContext } from "../src/lib/core-training-generation.ts";
import type { CoreTrainingConcept } from "../src/lib/core-training-types.ts";
import type { PracticeData } from "../src/lib/store.ts";
import { defaultModuleSettings } from "../src/lib/module-config.ts";
import { suggestedRole } from "../src/lib/role-requests.ts";

// TEST ONLY: synthetic editorial records exercise draft fixtures without approving the real library.
// This harness is never imported by application code; production has no allowDraft switch.
function fixture(index = 0): CoreTrainingConcept {
  const c = structuredClone(coreTrainingLibrary[index]);
  const record = { by: "Test fixture only", on: "2026-09-29" };
  return { ...c, review: { status: "approved", review: record, approval: record },
    sources: c.sources.map(s => ({ ...s, assessment: { status: "content_reviewed", review: record } })) as unknown as CoreTrainingConcept["sources"] };
}
function context(): CoreGenerationContext {
  const role = suggestedRole("Practice Nurse");
  role.confirmed = true;
  role.selectedRequestIds = [role.categories[0].requests[0].id];
  return {
    topicKey: "appointment-booking", settings: defaultModuleSettings(),
    practice: {
      staff: [{ id: "employee-1", name: "Alex Example", role: role.label, requestOverrides: { [role.roleId]: { [role.selectedRequestIds[0]]: false } } }],
      roleRequests: { [role.roleId]: role },
      bookingConfig: {
        version: 1, sameDayProcess: { id: "triage", other: "" }, routineProcess: { id: "direct", other: "" },
        sameDayInstruction: "", routineInstruction: "", sameDayPathway: { selected: [], custom: [], instruction: "" },
        sendUncertainToDutyClinician: false,
        escalation: { contact: { kind: "staff", staffId: "employee-1" }, method: { id: "person", other: "" }, instruction: "" }
      }
    } as unknown as PracticeData
  };
}
test("approved concepts resolve; all real draft examples remain production-ineligible", () => {
  for (let i = 0; i < 3; i++) {
    const c = fixture(i);
    assert.ok(createCoreGenerator([c])(c.id, context(), "learn").scenario);
    assert.equal(generateCoreScenario(c.id, context(), "learn").scenario, undefined);
    assert.equal(coreTrainingLibrary[i].review.status, "draft");
  }
  const c = fixture();
  assert.equal(resolveCoreEligibility(c, context(), "apply", "single_choice").eligible, true);
  for (const status of ["draft", "reviewed", "retired"] as const) {
    const unapproved = { ...c, review: { status } } as CoreTrainingConcept;
    assert.equal(resolveCoreEligibility(unapproved, context(), "learn", "single_choice").eligible, false);
  }
  assert.equal(resolveCoreEligibility({ ...c, sources: coreTrainingLibrary[0].sources }, context(), "learn", "single_choice").eligible, false);
});
test("required data fails closed; optional absent module selection is safe", () => {
  const c = fixture(), ctx = context();
  delete ctx.practice.bookingConfig;
  assert.equal(createCoreGenerator([c])(c.id, ctx, "apply").scenario, undefined);
  const optional = fixture(1);
  const result = createCoreGenerator([optional])(optional.id, ctx, "apply");
  assert.ok(result.scenario);
  assert.deepEqual(result.scenario.provenance?.inputs, []);
  const info = fixture(2);
  assert.equal(createCoreGenerator([info])(info.id, context(), "apply").scenario, undefined);
});
test("level, topic, interaction and recipe prerequisites are explicit", () => {
  const c = fixture(), ctx = context();
  for (const interaction of ["multi_select", "sequence"] as const)
    assert.equal(resolveCoreEligibility(c, ctx, "learn", interaction).eligible, false);
  assert.equal(resolveCoreEligibility(c, ctx, "handle", "single_choice").eligible, false);
  assert.equal(resolveCoreEligibility({ ...c, levels: undefined }, ctx, "learn", "single_choice").eligible, false);
  assert.equal(resolveCoreEligibility(c, { ...ctx, topicKey: "custom" }, "learn", "single_choice").eligible, false);
  const malformed = { ...c, levels: { apply: { recipe: "booking_support", bindings: [] } } } as CoreTrainingConcept;
  assert.equal(resolveCoreEligibility(malformed, ctx, "apply", "single_choice").eligible, false);
  const wrongSource = { ...c, localBindings: c.localBindings.map(b => ({ ...b, source: "module_setup" as const })) };
  assert.equal(resolveCoreEligibility(wrongSource, ctx, "apply", "single_choice").eligible, false);
});
test("responsibilities reuse confirmed role defaults and existing employee exceptions", () => {
  const ctx = context();
  const input = resolveCoreBinding("effective_role_responsibilities", ctx)!;
  const data = input.snapshot as { roles: { requests: unknown[] }[]; employees: { requests: unknown[] }[] };
  assert.equal(data.roles[0].requests.length, 1);
  assert.equal(data.employees[0].requests.length, 0);
  Object.values(ctx.practice.roleRequests!)[0].confirmed = false;
  assert.equal(resolveCoreBinding("configured_roles", ctx), undefined);
  assert.equal(resolveCoreBinding("effective_role_responsibilities", ctx), undefined);
});
test("no free-text inference, invented urgency/suitability or fallback for broken contacts", () => {
  const ctx = context(), c = fixture();
  ctx.settings.extra = "Invented emergency clinic must see every patient today";
  ctx.practice.localConfidentiality = "Invented confidential checklist";
  ctx.settings.answers.preference = "Invented emergency clinic";
  assert.equal(resolveCoreBinding("clinician_preference", ctx), undefined);
  assert.equal(resolveCoreBinding("information_handling_rules", ctx), undefined);
  const result = createCoreGenerator([c])(c.id, ctx, "apply").scenario!;
  assert.ok(result.options[0].includes("Alex Example"));
  assert.doesNotMatch(JSON.stringify(result), /Invented|emergency clinic/);
  ctx.practice.staff = [];
  assert.equal(resolveCoreBinding("escalation_routes", ctx), undefined);
  assert.equal(createCoreGenerator([c])(c.id, ctx, "apply").scenario, undefined);
  const restricted = { ...c, mustNotAssume: [...c.mustNotAssume, { id: "unsupported-new-rule", description: "Needs new enforcement" }] } as CoreTrainingConcept;
  assert.equal(resolveCoreEligibility(restricted, context(), "learn", "single_choice").eligible, false);
  assert.equal(resolveCoreEligibility({ ...c, sensitivity: "safety_critical" }, context(), "learn", "single_choice").eligible, false);
  assert.equal(resolveCoreEligibility({ ...c, mustNotAssume: [c.mustNotAssume[0]] }, context(), "learn", "single_choice").eligible, false);
  const qualified = context();
  qualified.practice.bookingConfig!.sameDayInstruction = "Only under a specific condition";
  assert.equal(resolveCoreBinding("booking_pathways", qualified), undefined);
  qualified.practice.bookingConfig!.escalation.instruction = "Only under a specific condition";
  assert.equal(resolveCoreBinding("escalation_routes", qualified), undefined);
});
test("explicit predefined module selections resolve without interpreting custom prose", () => {
  const ctx = context();
  ctx.settings.answers.preference = "Book with the requested clinician if an appropriate appointment is available";
  assert.deepEqual(resolveCoreBinding("clinician_preference", ctx)?.snapshot, { preference: "requested_if_available" });
  const c = fixture(1);
  assert.equal(createCoreGenerator([c])(c.id, ctx, "apply").scenario?.provenance?.inputs[0].source, "module_setup");
});
test("provenance pins concept/recipe version and independent structured input snapshots", () => {
  const ctx = context(), c = fixture();
  const generate = createCoreGenerator([c]);
  const scenario = generate(c.id, ctx, "apply").scenario!;
  const saved = JSON.stringify(scenario);
  ctx.practice.staff[0].name = "Changed Name";
  (c as { version: number }).version = 99;
  assert.equal(JSON.stringify(scenario), saved);
  assert.equal(generate(c.id, ctx, "apply").scenario?.provenance?.conceptVersion, 1);
  const restored = JSON.parse(saved);
  assert.equal(restored.provenance.conceptId, c.id);
  assert.equal(restored.provenance.conceptVersion, 1);
  assert.equal(restored.provenance.recipeVersion, 1);
  assert.ok(restored.provenance.inputs.every((i: { paths: string[] }) => i.paths.length));
  const legacy = { ...scenario };
  delete legacy.provenance;
  assert.equal(JSON.parse(JSON.stringify(legacy)).kind, "mcq");
});
