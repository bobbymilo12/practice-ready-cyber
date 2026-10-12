import { bookingFor, prescriptionsFor } from "../src/lib/practice-config.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as tracking from "../src/lib/practice-change-tracking.ts";
import { managerActionPatch } from "../src/lib/manager-actions.ts";
import { practice } from "./fixtures/role-matching.ts";
import { confirmProcedure, procedureTargets } from "../src/lib/local-procedures.ts";
import { localProcedureSequence } from "../src/lib/local-procedure-sequences.ts";
import { roleMatchingScenario } from "../src/lib/role-matching.ts";
import { appointmentCorePool } from "../src/lib/core-appointment-selection.ts";
import { defaultModuleSettings, reviseConfiguredScenario } from "../src/lib/module-config.ts";
import { startSession } from "../src/lib/training.ts";
import type { AppState } from "../src/lib/store.ts";
import type { Module } from "../src/lib/training-types.ts";

const p = () => ({ ...practice(), repeatTurnaround: "48 working hours" });
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
function withProcedure() {
  const practice = p();
  const target = procedureTargets(practice).find((t) => t.id === "utis")!;
  practice.localProcedures = {
    [target.id]: confirmProcedure(
      target,
      undefined,
      {
        steps: [
          { id: "a", text: "Open the form." },
          { id: "b", text: "Record the reference." },
          { id: "c", text: "Save the form." },
        ],
        stepOrder: ["a", "b", "c"],
        orderRequirement: "required_linear",
        appliesWhen: "For this local process.",
      },
      "manager",
    ),
  };
  return practice;
}
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

for (const [label, edit] of [
  [
    "booking rules",
    (n: any) => {
      n.rolePolicies.gpsRoutine = "Use the local request inbox.";
    },
  ],
  [
    "prescription process",
    (n: any) => {
      n.repeatTurnaround = "72 working hours";
    },
  ],
  [
    "roles",
    (n: any) => {
      Object.values(n.roleRequests).forEach((r: any) => {
        r.selectedRequestIds = [];
      });
    },
  ],
  [
    "staff exception",
    (n: any) => {
      n.staff = [
        {
          id: "employee",
          name: "Reception colleague",
          role: "Test role 1",
          clinics: "",
          requestOverrides: { "role:test role 1": { utis: false } },
        },
      ];
    },
  ],
  [
    "staff removal",
    (n: any) => {
      n.staff = [];
    },
  ],
  [
    "safeguarding",
    (n: any) => {
      n.localSafeguarding = "Use the updated safeguarding handover.";
    },
  ],
  [
    "request catalogue",
    (n: any) => {
      n.practiceRequests = { custom: { id: "custom", label: "Local request" } };
    },
  ],
] as const)
  test(`${label} flags published legacy training across packages without changing questions`, () => {
    const before = p();
    before.staff = [
      { id: "employee", name: "Reception colleague", role: "Test role 1", clinics: "" },
    ];
    const next = structuredClone(before);
    edit(next);
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

test("procedure evidence identifies the exact request while legacy modules receive conservative review", () => {
  const before = withProcedure();
  const sequence = localProcedureSequence(before)!;
  const module = {
    ...legacy("procedure"),
    scenarios: [{ ...sequence, status: "approved" as const }],
  };
  const next = structuredClone(before);
  const record = next.localProcedures!.utis;
  if (record.status !== "configured") throw Error("fixture");
  record.steps[0].text = "Open the updated form.";
  record.version++;
  const flagged = tracking.flagPracticeChanges(before, next, [module, legacy()]);
  assert.ok(flagged.every((m) => m.needsReview));
  assert.match(flagged[0].reviewReason!, /Local procedure: UTIs/);
  const unrelated = structuredClone(before);
  const target = procedureTargets(before).find((t) => t.id !== "utis")!;
  unrelated.localProcedures![target.id] = confirmProcedure(target, undefined, null, "manager");
  assert.equal(tracking.flagPracticeChanges(before, unrelated, [module])[0], module);
  const metadataOnly = structuredClone(before);
  metadataOnly.localProcedures!.utis.version++;
  metadataOnly.localProcedures!.utis.confirmedAt = "2026-10-11T12:00:00Z";
  assert.equal(tracking.flagPracticeChanges(before, metadataOnly, [module])[0], module);
});

test("declared role sources react to role changes; approved core without local inputs stays available", () => {
  const before = p();
  const matching = roleMatchingScenario(before)!;
  const core = appointmentCorePool({
    topicKey: "appointment-booking",
    practice: before,
    settings: defaultModuleSettings(),
  })[0];
  assert.ok(core?.provenance?.kind === "core" && !core.provenance.inputs.length);
  const modules = [
    { ...legacy("matching"), scenarios: [{ ...matching, status: "approved" as const }] },
    { ...legacy("core"), scenarios: [{ ...core, status: "approved" as const }] },
  ];
  const next = structuredClone(before);
  Object.values(next.roleRequests!)[0].confirmed = false;
  const result = tracking.flagPracticeChanges(before, next, modules);
  assert.equal(result[0].needsReview, true);
  assert.equal(result[1], modules[1]);
  const manual = {
    ...modules[1],
    scenarios: [{ ...core, provenance: { ...core.provenance!, managerModified: true } }],
  } as Module;
  assert.equal(tracking.flagPracticeChanges(before, next, [manual])[0].needsReview, true);
});

test("no-op edits don't flag; reasons accumulate with readable turnaround values and preserve prior decisions", () => {
  const before = p();
  const modules = [legacy()];
  assert.equal(tracking.flagPracticeChanges(before, structuredClone(before), modules), modules);
  const next = {
    ...before,
    prescriptionConfig: { turnaround: { id: "48", other: "" } },
  } as ReturnType<typeof p>;
  const updated = structuredClone(next);
  updated.prescriptionConfig!.turnaround.id = "72";
  const flagged = tracking.flagPracticeChanges(next, updated, modules);
  assert.match(flagged[0].reviewReason!, /48 working hours.*72 working hours/);
  const more = { ...updated, hours: "09:00–17:00" };
  const again = tracking.flagPracticeChanges(updated, more, flagged);
  assert.equal(again[0].reviewChanges?.length, 2);
  assert.match(again[0].reviewReason!, /Opening hours/);
  assert.equal(tracking.flagPracticeChanges(updated, more, again), again);
});

test("review flags block new and resumed training until a recorded explicit decision", () => {
  const before = p(),
    next = { ...before, repeatTurnaround: "72 working hours" };
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
    next = { ...before, repeatTurnaround: "72 working hours" };
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
  const future = { ...next, repeatTurnaround: "96 working hours" };
  const flagged = tracking.flagPracticeChanges(next, future, stamped)[0];
  assert.equal(flagged.needsReview, true);
  assert.equal(flagged.reviewConfirmations!.length, 1);
});

test("actual store setters cover staff overrides, roles, bookings and prescriptions; raw dismissal is rejected", () => {
  const require = createRequire(import.meta.url);
  const source = readFileSync(new URL("../src/lib/store.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: any = {};
  const imports: Record<string, any> = {
    "./practice-change-tracking": tracking,
    "./module-config": { reviseConfiguredScenario },
    "./practice-scenarios": {},
  };
  new Function("require", "exports", code)((id: string) => imports[id] ?? require(id), exports);
  const store = exports.useApp;
  const reset = () => store.setState({ practiceData: p(), modules: [legacy()], packages: [] });
  reset();
  store.getState().setPracticeField("repeatTurnaround", "72 working hours");
  assert.equal(store.getState().modules[0].needsReview, true);
  reset();
  store.getState().setBookingConfig(bookingFor(p()));
  assert.equal(store.getState().modules[0].needsReview, true);
  reset();
  store.getState().setPrescriptionConfig(prescriptionsFor(p()));
  assert.equal(store.getState().modules[0].needsReview, true);
  reset();
  store.getState().setRoleRequests({ ...Object.values(p().roleRequests!)[0], confirmed: false });
  assert.equal(store.getState().modules[0].needsReview, true);
  reset();
  store.getState().addStaff({ name: "New colleague", role: "Test role 1", clinics: "" });
  let employee = store.getState().practiceData.staff[0];
  store.setState({ modules: [legacy()] });
  store
    .getState()
    .updateStaff(employee.id, { requestOverrides: { "role:test role 1": { utis: false } } });
  assert.equal(store.getState().modules[0].needsReview, true);
  store.setState({ modules: [legacy()] });
  store.getState().removeStaff(employee.id);
  assert.equal(store.getState().modules[0].needsReview, true);
  const required = tracking.pendingQuestionReviews(
    store.getState().modules[0],
    store.getState().practiceData,
  );
  assert.ok(required.length);
  required.forEach((id) => store.getState().approveScenario("standalone", id));
  assert.deepEqual(
    tracking.pendingQuestionReviews(store.getState().modules[0], store.getState().practiceData),
    [],
  );
  assert.equal(store.getState().modules[0].needsReview, true);
  assert.throws(() => store.getState().clearReviewFlag("standalone"), /decision/);
  store.getState().publishModule("standalone");
  assert.equal(store.getState().modules[0].needsReview, true);
});

test("modified core in a merged module retains provenance and switches to conservative practice review", () => {
  const require = createRequire(import.meta.url);
  const code = ts.transpileModule(
    readFileSync(new URL("../src/lib/store.ts", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  const exports: any = {};
  const imports: Record<string, any> = {
    "./practice-change-tracking": tracking,
    "./module-config": { reviseConfiguredScenario },
    "./practice-scenarios": {},
  };
  new Function("require", "exports", code)((id: string) => imports[id] ?? require(id), exports);
  const practice = p();
  const core = appointmentCorePool({
    topicKey: "appointment-booking",
    practice,
    settings: defaultModuleSettings(),
  })[0];
  const module = {
    ...legacy("merged"),
    type: "Merged module",
    scenarios: [{ ...core, status: "approved" as const }],
  };
  exports.useApp.setState({ practiceData: practice, modules: [module] });
  exports.useApp
    .getState()
    .updateScenario(module.id, { ...module.scenarios[0], question: "Manager-modified wording" });
  const edited = exports.useApp.getState().modules[0];
  assert.equal(edited.scenarios[0].provenance.managerModified, true);
  const next = { ...practice, hours: "Changed opening hours" };
  assert.equal(
    tracking.flagPracticeChanges(practice, next, [{ ...edited, needsReview: false }])[0]
      .needsReview,
    true,
  );
});

test("missing or ambiguous binding metadata requires conservative review rather than guessing", () => {
  const before = p(),
    after = { ...before, hours: "Changed hours" };
  const core = appointmentCorePool({
    topicKey: "appointment-booking",
    practice: before,
    settings: defaultModuleSettings(),
  })[0];
  for (const inputs of [
    undefined,
    [null],
    [{ source: "practice_setup", paths: [] }],
    [{ source: "practice_setup", paths: [42] }],
  ]) {
    const module = {
      ...legacy("ambiguous"),
      scenarios: [{ ...core, provenance: { ...core.provenance, inputs } }],
    } as unknown as Module;
    assert.equal(tracking.flagPracticeChanges(before, after, [module])[0].needsReview, true);
  }
});

test("question review highlights require recorded source links; unknown dependencies stay module-level", () => {
  const sequence = localProcedureSequence(withProcedure())!;
  const changes = [
    {
      path: "practiceData.localProcedures[utis]",
      label: "UTI",
      reason: "UTI Local Procedure changed.",
    },
    {
      path: "practiceData.localProcedures[other]",
      label: "Other",
      reason: "Other procedure changed.",
    },
    { path: "practiceData.hours", label: "Hours", reason: "Opening hours changed." },
  ];
  assert.deepEqual(tracking.recordedSourceChanges(sequence, changes), [changes[0]]);
  assert.deepEqual(tracking.recordedSourceChanges(legacy().scenarios[0], changes), []);
  assert.deepEqual(
    tracking.recordedSourceChanges(
      {
        ...sequence,
        provenance: { ...sequence.provenance, managerModified: true },
      },
      changes,
    ),
    [],
  );
  const matching = roleMatchingScenario(p())!;
  const roleChanges = [
    {
      path: matching.provenance.paths[0],
      label: "Role",
      reason: "Role responsibilities changed.",
    },
  ];
  assert.deepEqual(tracking.recordedSourceChanges(matching, roleChanges), roleChanges);
});

test("reliable source links require targeted approval; missing provenance requires broader review", () => {
  const practice = withProcedure();
  const sequence = { ...localProcedureSequence(practice)!, status: "approved" as const };
  const core = appointmentCorePool({
    topicKey: "appointment-booking",
    practice,
    settings: defaultModuleSettings(),
  })[0];
  core.status = "approved";
  const original = { ...legacy(), scenarios: [sequence, core] };
  const next = structuredClone(practice);
  if (next.localProcedures!.utis.status !== "configured") throw Error("fixture");
  next.localProcedures!.utis.steps[0].text = "Open the updated form.";
  let flagged = tracking.flagPracticeChanges(practice, next, [original])[0];
  assert.deepEqual(tracking.questionReviewScope(flagged), { broad: false, ids: [sequence.id] });
  assert.deepEqual(tracking.pendingQuestionReviews(flagged, next), [sequence.id]);
  flagged = tracking.approveReviewedQuestion(flagged, sequence.id, next);
  assert.deepEqual(tracking.pendingQuestionReviews(flagged, next), []);
  assert.equal(flagged.needsReview, true, "approval alone does not resume training");
  const edited = {
    ...flagged,
    scenarios: flagged.scenarios.map((q) =>
      q.id === sequence.id ? { ...q, question: "Edited question" } : q,
    ),
  };
  assert.deepEqual(tracking.pendingQuestionReviews(edited, next), [sequence.id]);
  const anotherChange = { ...next, hours: "Changed hours" };
  assert.ok(tracking.pendingQuestionReviews(flagged, anotherChange).length);
  const removed = { ...flagged, scenarios: [core] };
  assert.deepEqual(tracking.pendingQuestionReviews(removed, next), []);
  const broader = { ...flagged, scenarios: [...flagged.scenarios, ...legacy("unknown").scenarios] };
  assert.equal(tracking.questionReviewScope(broader).broad, true);
  assert.ok(tracking.pendingQuestionReviews(broader, next).includes(core.id));
  const repeated = tracking.flagPracticeChanges(practice, next, [flagged])[0];
  assert.equal(
    repeated.reviewedQuestions,
    undefined,
    "a fresh source change cannot reuse old approvals",
  );
  assert.throws(
    () =>
      tracking.enforceReviewDecisions(
        [broader],
        [
          {
            ...broader,
            needsReview: false,
            reviewConfirmations: [
              {
                id: "bypass",
                decision: "updated",
                note: "",
                reviewKey: tracking.reviewKey(broader, next),
                by: "manager",
                name: "Manager",
                at: "",
                reasons: [],
              },
            ],
          },
        ],
        next,
        { id: "manager", name: "Manager" },
        new Date().toISOString(),
      ),
    /Approve/,
  );
});
