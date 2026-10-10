import * as changeTracking from "../src/lib/practice-change-tracking.ts";
import * as managerActions from "../src/lib/manager-actions.ts";
import { normaliseRoleRequestCategories } from "../src/lib/role-requests.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as procedures from "../src/lib/local-procedures.ts";
import { practice, empty } from "./fixtures/role-matching.ts";
import { generateConfiguredModule, defaultModuleSettings } from "../src/lib/module-config.ts";
import type { LocalProcedure } from "../src/lib/local-procedures.ts";

const {
  procedureTargets,
  procedureDraft,
  addProcedureStep,
  removeProcedureStep,
  moveProcedureStep,
  confirmProcedure,
  confirmVisibleWithoutProcedures,
  validateLocalProcedures,
} = procedures;
const p = practice();
const target = procedureTargets(p)[0];
function saved(): LocalProcedure {
  const draft = addProcedureStep(procedureDraft(), "step-one");
  draft.steps[0].text = "  If needed, use the manager's specified form.\nKeep this wording.  ";
  draft.appliesWhen = "Only when requested.";
  draft.orderRequirement = "conditional_or_flexible";
  return confirmProcedure(target, undefined, draft, "manager");
}
test("shared standard IDs give one target; distinct custom UUIDs never merge by label", () => {
  const targets = procedureTargets(p);
  assert.equal(new Set(targets.map((t) => t.id)).size, targets.length);
  assert.ok(targets.some((t) => t.roles.length === 2));
  const custom = structuredClone(p);
  Object.values(custom.roleRequests!)
    .slice(0, 2)
    .forEach((r, i) => {
      r.categories[0].requests.push({ id: `custom:uuid-${i}`, label: "Same label", custom: true });
      r.selectedRequestIds.push(`custom:uuid-${i}`);
    });
  assert.equal(procedureTargets(custom).filter((t) => t.label === "Same label").length, 2);
});
test("only active confirmed roles supply targets; conflicting labels cannot be confirmed", () => {
  const altered = structuredClone(p);
  Object.values(altered.roleRequests!).forEach((r) => (r.confirmed = false));
  assert.deepEqual(procedureTargets(altered), []);
  assert.throws(() => confirmProcedure({ ...target, conflict: true }, undefined, null, "manager"));
});
test("absent, explicitly none, and configured remain distinct; reads never confirm negatives", () => {
  const before = JSON.stringify(p);
  procedureTargets(p);
  procedureDraft();
  procedureDraft(saved());
  assert.equal(JSON.stringify(p), before);
  assert.equal(p.localProcedures, undefined);
  const none = confirmProcedure(target, undefined, null, "manager");
  assert.equal(none.status, "no_specific_procedure");
  assert.ok(!("steps" in none));
  assert.equal(saved().status, "configured");
});
test("explicit save of visible unchecked requests leaves hidden, selected and saved requests alone", () => {
  const targets = procedureTargets(p);
  const data = { ...p, localProcedures: { [target.id]: saved() } };
  const scope = targets.slice(0, 4).map((t) => t.id);
  const results = confirmVisibleWithoutProcedures(data, scope, [targets[1].id], "manager");
  assert.deepEqual(
    results.map((r) => r.requestId),
    scope.slice(2),
  );
  assert.ok(results.every((r) => r.status === "no_specific_procedure"));
  assert.equal(data.localProcedures[target.id].status, "configured");
});
test("draft editing, reordering, removing and cancellation preserve saved IDs/text/version", () => {
  const record = saved(),
    original = structuredClone(record);
  let draft = addProcedureStep(procedureDraft(record), "step-two");
  draft.steps[1].text = "Second manager-authored step.";
  draft = moveProcedureStep(draft, "step-two", -1);
  assert.deepEqual(draft.stepOrder, ["step-two", "step-one"]);
  draft = removeProcedureStep(draft, "step-one");
  assert.deepEqual(
    draft.steps.map((s) => s.id),
    ["step-two"],
  );
  assert.deepEqual(record, original); // Dropping the draft is cancellation.
  const next = confirmProcedure(target, record, draft, "manager");
  assert.equal(next.id, record.id);
  assert.equal(next.version, 2);
  assert.equal(next.history?.[0].version, 1);
  assert.deepEqual(confirmProcedure(target, record, procedureDraft(record), "manager"), record);
});
test("exact manager wording, explicit ordering and flexible procedures survive JSON persistence", () => {
  const record = saved();
  const reloaded = JSON.parse(JSON.stringify({ [target.id]: record }));
  validateLocalProcedures(reloaded);
  assert.deepEqual(reloaded[target.id], record);
  assert.equal(
    reloaded[target.id].steps[0].text,
    "  If needed, use the manager's specified form.\nKeep this wording.  ",
  );
  assert.equal(reloaded[target.id].orderRequirement, "conditional_or_flexible");
});
test("knowledge can exceed five steps; invalid or incomplete ordered content is rejected", () => {
  let draft = procedureDraft();
  for (let i = 0; i < 7; i++) {
    draft = addProcedureStep(draft, `step-${i}`);
    draft.steps[i].text = `Manager step ${i}`;
  }
  const record = confirmProcedure(target, undefined, draft, "manager");
  validateLocalProcedures({ [target.id]: record });
  for (const changed of [
    { ...record, stepOrder: [] },
    { ...record, steps: [{ id: "x", text: " " }] },
    { ...record, status: "no_specific_procedure" },
    { ...record, version: 0 },
  ])
    assert.throws(() => validateLocalProcedures({ [target.id]: changed }));
  validateLocalProcedures(undefined);
});
test("removing a procedure's active request preserves its record; replacing with none preserves history", () => {
  const record = saved();
  const orphan = { ...empty(), localProcedures: { [target.id]: record } };
  assert.deepEqual(procedureTargets(orphan), []);
  validateLocalProcedures(orphan.localProcedures);
  assert.deepEqual(orphan.localProcedures[target.id], record);
  const none = confirmProcedure(target, record, null, "manager");
  assert.equal(none.version, 2);
  assert.equal(none.history?.[0].status, "configured");
  assert.ok(!("steps" in none));
});
test("Local Procedures do not supply any generated scenarios or alter Core/matching/local selection", () => {
  const settings = { ...defaultModuleSettings(), trainingLevel: "learn" as const, count: 10 };
  const before = generateConfiguredModule("appointment-booking", "Booking", p, settings);
  const after = generateConfiguredModule(
    "appointment-booking",
    "Booking",
    { ...p, localProcedures: { [target.id]: saved() } },
    settings,
  );
  const normalise = (v: unknown) =>
    JSON.stringify(v, (key, value) => (["id", "generatedAt"].includes(key) ? undefined : value));
  assert.equal(normalise(after), normalise(before));
});

// Exercise the real backend save coordinator and mock API with an in-memory browser storage.
const require = createRequire(import.meta.url);
function compile(path: string, imports: Record<string, unknown>) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8")
    .replaceAll("import.meta.env.DEV", "true")
    .replaceAll("import.meta.env.VITE_SUPABASE_URL", '""')
    .replaceAll("import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY", '""');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports: Record<string, any> = {};
  new Function("require", "exports", code)((id: string) => imports[id] ?? require(id), exports);
  return exports;
}
test("save/reload uses whole-practice storage; failed/stale saves leave confirmed records and sessions untouched", async () => {
  const state = {
    practiceData: p,
    modules: [{ id: "existing", published: true, scenarios: [] }],
    packages: [],
    assignments: [],
    setupComplete: true,
    emojiMarks: {},
    answers: {},
    currentDraftId: null,
  };
  let stored = JSON.stringify({
    state,
    trainees: [],
    sessions: [{ id: "session", traineeId: "other", answers: {} }],
    version: 1,
  });
  let fail = false;
  Object.assign(globalThis, {
    sessionStorage: {
      getItem: () => stored,
      setItem: (_: string, value: string) => {
        if (fail) throw new Error("Storage unavailable");
        stored = value;
      },
    },
    window: { location: { search: "" } },
  });
  const { create } = require("zustand");
  const useApp = create(() => ({ ...state, account: null }));
  const store = { useApp, defaultPracticeData: empty() };
  const dev = compile("../src/lib/dev-backend.ts", {
    "./practice-change-tracking.ts": changeTracking,
    "./store": store,
    "./dev-mode": { devRole: () => "manager" },
    "./local-procedures.ts": procedures,
    "./practice-scenarios": {},
    "./training": {},
  });
  const backend = compile("../src/lib/backend.ts", {
    "./practice-change-tracking": changeTracking,
    "./manager-actions": managerActions,
    "./role-requests": { normaliseRoleRequestCategories },
    "./store": store,
    "./dev-mode": { devRole: () => "manager" },
    "./local-procedures": procedures,
    "./role-templates": { setRoleTemplates() {} },
    "./dev-backend": dev,
  });
  backend.initializeBackend();
  await backend.loadWorkspace();
  const record = saved();
  fail = true;
  await assert.rejects(
    backend.saveLocalProcedures([record], { [target.id]: 0 }),
    /Storage unavailable/,
  );
  assert.equal(useApp.getState().practiceData.localProcedures, undefined);
  assert.equal(useApp.getState().modules[0].needsReview, undefined);
  fail = false;
  await backend.saveLocalProcedures([record], { [target.id]: 0 });
  assert.equal(useApp.getState().practiceData.localProcedures[target.id].version, 1);
  await backend.loadWorkspace();
  assert.deepEqual(useApp.getState().practiceData.localProcedures[target.id], record);
  const data = JSON.parse(stored);
  assert.equal(data.state.modules[0].needsReview, true);
  assert.deepEqual(data.state.modules[0].scenarios, state.modules[0].scenarios);
  assert.deepEqual(data.sessions, [{ id: "session", traineeId: "other", answers: {} }]);
  await assert.rejects(backend.saveLocalProcedures([record], { [target.id]: 0 }), /has changed/);
  const draft = procedureDraft(record);
  draft.steps[0].text = "Changed wording";
  const revised = confirmProcedure(target, record, draft, "manager");
  fail = true;
  await assert.rejects(backend.saveLocalProcedures([revised], { [target.id]: 1 }));
  assert.deepEqual(useApp.getState().practiceData.localProcedures[target.id], record);
  fail = false;
  await backend.saveLocalProcedures([revised], { [target.id]: 1 });
  await backend.loadWorkspace();
  assert.deepEqual(useApp.getState().practiceData.localProcedures[target.id], revised);
  assert.deepEqual(JSON.parse(stored).sessions, data.sessions);
});
test("Practice Setup and Data Hub reuse one central editor; reopening restores compact records without writes", () => {
  const data = {
    practiceData: { ...p, localProcedures: { [target.id]: saved() } },
    account: { id: "manager" },
  };
  let saves = 0;
  const { LocalProcedures } = compile("../src/components/LocalProcedures.tsx", {
    "@/lib/store": {
      useApp: (selector?: (v: unknown) => unknown) => (selector ? selector(data) : data),
    },
    "@/lib/backend": {
      saveLocalProcedures: () => {
        saves++;
      },
    },
    "@/lib/local-procedures": procedures,
  });
  const html = renderToStaticMarkup(createElement(LocalProcedures));
  assert.ok(html.includes("Procedure configured · 1 step"));
  assert.ok(html.includes("View/Edit"));
  assert.ok(html.includes("Not reviewed"));
  assert.equal(saves, 0);
  for (const path of ["../src/routes/practice.setup.tsx", "../src/routes/data-hub.tsx"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.ok(source.includes("<LocalProcedures />"));
  }
  const api = readFileSync(
    new URL("../supabase/functions/practice-api/index.ts", import.meta.url),
    "utf8",
  );
  assert.ok(api.includes("validateLocalProcedures(next.practiceData.localProcedures)"));
});

test("editor selection/cancellation is draft-only and save feedback waits for persistence", async () => {
  const data = { practiceData: structuredClone(p), account: { id: "manager" } };
  type Bag = unknown[];
  const parent: Bag = [];
  let active = parent,
    index = 0,
    writes = 0;
  let complete: () => void = () => {};
  let rejectSave: (error: Error) => void = () => {};
  const react = {
    useState: (initial: unknown) => {
      const bag = active,
        key = index++;
      if (!(key in bag)) bag[key] = typeof initial === "function" ? initial() : initial;
      return [
        bag[key],
        (next: unknown) => {
          bag[key] = typeof next === "function" ? next(bag[key]) : next;
        },
      ];
    },
  };
  const { LocalProcedures } = compile("../src/components/LocalProcedures.tsx", {
    react,
    "@/lib/store": {
      useApp: (selector?: (v: unknown) => unknown) => (selector ? selector(data) : data),
    },
    "@/lib/local-procedures": procedures,
    "@/lib/backend": {
      saveLocalProcedures: (updates: LocalProcedure[]) => {
        writes++;
        return new Promise<void>((resolve, reject) => {
          rejectSave = reject;
          complete = () => {
            data.practiceData.localProcedures = Object.fromEntries(
              updates.map((r) => [r.requestId, r]),
            );
            resolve();
          };
        });
      },
    },
  });
  const nodes = (n: any): any[] =>
    !n || typeof n !== "object"
      ? []
      : Array.isArray(n)
        ? n.flatMap(nodes)
        : [n, ...nodes(n.props?.children)];
  const render = (component = LocalProcedures, props = {}, bag = parent) => {
    active = bag;
    index = 0;
    return nodes(component(props));
  };
  const button = (tree: any[], text: string) =>
    tree.find((n) => n.type === "button" && n.props.children === text);
  let tree = render();
  tree.find((n) => n.type === "input" && n.props.type === "checkbox").props.onChange();
  tree = render();
  let editor = tree.find((n) => typeof n.type === "function");
  let child: Bag = [];
  let form = render(editor.type, editor.props, child);
  assert.equal(form.find((n) => n.type === "textarea").props.rows, 1);
  assert.ok(form.find((n) => n.type === "textarea").props.placeholder.includes(target.label));
  assert.equal(form.find((n) => n.type === "textarea").props.value, "");
  button(form, "+ Add step").props.onClick();
  form = render(editor.type, editor.props, child);
  button(form, "+ Add step").props.onClick();
  form = render(editor.type, editor.props, child);
  assert.deepEqual(
    form
      .filter((n) => n.type === "textarea")
      .slice(0, 3)
      .map((n) => n.props.placeholder),
    [
      `e.g. What should reception do first for this request: ${target.label}?`,
      "e.g. What happens next?",
      "e.g. What should reception do after that?",
    ],
  );
  form.find((n) => n.props?.["aria-label"] === "Remove step 3").props.onClick();
  form = render(editor.type, editor.props, child);
  form.find((n) => n.props?.["aria-label"] === "Remove step 2").props.onClick();
  form = render(editor.type, editor.props, child);
  button(form, "Save procedure").props.onClick();
  await new Promise(setImmediate);
  assert.equal(writes, 0, "placeholders do not turn blank drafts into saved content");
  form = render(editor.type, editor.props, child);

  form
    .find((n) => n.type === "textarea")
    .props.onChange({ target: { value: "Exact manager wording" } });
  form = render(editor.type, editor.props, child);
  button(form, "Cancel").props.onClick();
  assert.equal(writes, 0);
  assert.equal(data.practiceData.localProcedures, undefined);
  tree = render();
  tree.find((n) => n.type === "input" && n.props.type === "checkbox").props.onChange();
  editor = render().find((n) => typeof n.type === "function");
  child = [];
  form = render(editor.type, editor.props, child);
  assert.equal(form.find((n) => n.type === "textarea").props.value, "");
  form
    .find((n) => n.type === "textarea")
    .props.onChange({ target: { value: "Exact manager wording" } });
  form = render(editor.type, editor.props, child);
  button(form, "Save procedure").props.onClick();
  assert.equal(writes, 1);
  assert.equal(data.practiceData.localProcedures, undefined);
  assert.ok(!render().some((n) => n.props?.role === "status"));
  rejectSave(new Error("Connection unavailable"));
  await new Promise(setImmediate);
  form = render(editor.type, editor.props, child);
  assert.ok(
    form.some((n) => n.props?.role === "alert" && n.props.children === "Connection unavailable"),
  );
  assert.equal(data.practiceData.localProcedures, undefined);
  button(form, "Save procedure").props.onClick();
  complete();
  await new Promise(setImmediate);
  assert.ok(
    render().some(
      (n) => n.props?.role === "status" && n.props.children === "Local procedures saved.",
    ),
  );
  assert.equal(data.practiceData.localProcedures![target.id].status, "configured");
  assert.ok(!JSON.stringify(data.practiceData.localProcedures).includes("e.g."));
  const savedRecord = data.practiceData.localProcedures![target.id];
  assert.ok(savedRecord.status === "configured");
  assert.equal(savedRecord.steps[0].text, "Exact manager wording");
});

test("eight-step navigation preserves legacy URL destinations and keeps Procedures optional", async () => {
  const { setupSteps, setupSearch, setupMissing } = await import("../src/lib/practice-setup.ts");
  assert.deepEqual(setupSteps, [
    "Practice",
    "Roles",
    "Team",
    "Bookings",
    "Procedures",
    "Prescriptions",
    "Safety",
    "Review",
  ]);
  for (let old = 0; old <= 6; old++) {
    const result = setupSearch({ step: old });
    assert.equal(result.step, old < 4 ? old : old + 1);
    assert.deepEqual(setupSearch(result), result, "normalised URLs are idempotent");
  }
  for (let step = 0; step < 8; step++) assert.equal(setupSearch({ step, flow: 2 }).step, step);
  assert.equal(setupSearch({ step: -1 }).step, 0);
  assert.equal(setupSearch({ step: 99, flow: 2 }).step, 7);
  const before = JSON.stringify(p);
  assert.deepEqual(setupMissing(p)[4], []);
  assert.equal(JSON.stringify(p), before);
  const route = readFileSync(new URL("../src/routes/practice.setup.tsx", import.meta.url), "utf8");
  assert.ok(route.includes("validateSearch: setupSearch"));
  assert.ok(route.includes("{step === 4 && <LocalProcedures />}"));
  assert.ok(route.includes("search: { step: next, flow: 2 }"));
  assert.ok(route.includes("step === 7) store.completeSetup(true)"));
});

test("Appointment Booking has a compact central summary, with no editor or duplicated procedure storage", () => {
  const source = readFileSync(
    new URL("../src/components/PredefinedModuleSetup.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(!source.includes("<LocalProcedures"));
  assert.ok(source.includes("Built from your practice setup"));
  assert.ok(!source.includes("View / edit procedures"));
  assert.ok(source.includes("generateConfiguredModule"));
  assert.ok(source.includes("practiceData"));
  const hub = readFileSync(new URL("../src/routes/data-hub.tsx", import.meta.url), "utf8");
  assert.ok(hub.includes("<LocalProcedures />"));
  assert.ok(hub.replace(/\s+/g, " ").includes("These can be reused in training."));
});
