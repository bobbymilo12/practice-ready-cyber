import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { practice } from "./fixtures/role-matching.ts";
import { requestCategories, normaliseRoleRequestCategories } from "../src/lib/role-requests.ts";
import { confirmProcedure, procedureTargets } from "../src/lib/local-procedures.ts";
import {
  localProcedureSequence,
  localProcedureApplication,
  inspectLocalProcedureSequences,
} from "../src/lib/local-procedure-sequences.ts";
import * as modules from "../src/lib/module-config.ts";
import * as config from "../src/lib/practice-config.ts";

function fixture() {
  const p = practice();
  const target = procedureTargets(p).find((t) => t.id === "utis")!;
  const procedure = confirmProcedure(
    target,
    undefined,
    {
      steps: [
        { id: "check", text: "Check if the practice form has been completed." },
        { id: "record", text: "  Record the form reference.\nKeep the original wording.  " },
        { id: "file", text: "File the completed form." },
      ],
      stepOrder: ["check", "record", "file"],
      appliesWhen: "For requests using the practice form.",
      orderRequirement: "required_linear",
    },
    "manager",
  );
  p.localProcedures = { [target.id]: procedure };
  return { p, procedure };
}
test("catalogue correction moves the existing mental-health ID and safely normalises saved standard categories", () => {
  assert.ok(
    requestCategories
      .find((c) => c.id === "minor-illness")!
      .requests.some((r) => r.id === "mental-health-appointments"),
  );
  assert.ok(
    !requestCategories
      .find((c) => c.id === "admin")!
      .requests.some((r) => r.id === "mental-health-appointments"),
  );
  const old = structuredClone(Object.values(practice().roleRequests!)[0]);
  const minor = old.categories.find((c) => c.id === "minor-illness")!;
  const r = minor.requests.find((r) => r.id === "mental-health-appointments")!;
  minor.requests = minor.requests.filter((q) => q.id !== r.id);
  old.categories.find((c) => c.id === "admin")!.requests.push(r);
  old.selectedRequestIds.push(r.id);
  const next = normaliseRoleRequestCategories(old);
  assert.deepEqual(next.selectedRequestIds, old.selectedRequestIds);
  assert.equal(next.confirmed, old.confirmed);
  assert.equal(next.categories.flatMap((c) => c.requests).filter((q) => q.id === r.id).length, 1);
  assert.ok(
    next.categories.find((c) => c.id === "minor-illness")!.requests.some((q) => q.id === r.id),
  );
  assert.deepEqual(normaliseRoleRequestCategories(next), next);
});
test("indirect if questions are not conditional steps; actual optional/conditional steps remain excluded", () => {
  const { p, procedure } = fixture();
  assert.ok(localProcedureSequence(p));
  if (procedure.status !== "configured") throw Error("fixture");
  for (const text of [
    "If the form is missing, ask for it.",
    "Ask for the form where needed.",
    "Ask for the form when appropriate.",
    "You may ask for the form.",
    "You might need to ask for the form.",
    "Use either the form or the inbox.",
    "Send the form when available.",
    "Check the inbox; otherwise ask for the form.",
  ]) {
    procedure.steps[0].text = text;
    const original = JSON.stringify(p);
    assert.equal(localProcedureSequence(p), undefined, text);
    assert.equal(localProcedureApplication(p), undefined, text);
    assert.match(inspectLocalProcedureSequences(p).reasons.join(" "), /conditional/);
    for (const trainingLevel of ["learn", "apply"] as const) {
      const generated = modules.generateConfiguredModule("appointment-booking", "Booking", p, {
        ...modules.defaultModuleSettings(),
        trainingLevel,
        count: 10,
      });
      assert.ok(!generated.some((s) => s.provenance?.kind === "sequence"), text);
    }
    assert.equal(JSON.stringify(p), original, "generation must not rewrite the saved procedure");
  }
});

test("module topic selection explains inherent practice information use without an adaptation choice", () => {
  const source = readFileSync(new URL("../src/routes/modules.create.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: any = {};
  const imports: Record<string, any> = {
    react: { useState: () => ["", () => {}] },
    "@tanstack/react-router": {
      createFileRoute: () => (options: unknown) => options,
      Link: "a",
      useNavigate: () => () => {},
    },
    "@/components/Shell": { Shell: "main" },
    "@/lib/store": {
      TOPICS: [{ key: "appointment-booking", title: "Appointment booking", desc: "Booking" }],
    },
  };
  new Function("require", "exports", code)((id: string) => imports[id] ?? require(id), exports);
  const { renderToStaticMarkup } = require("react-dom/server");
  const html = renderToStaticMarkup(exports.Route.component());
  assert.match(html, /We use your practice’s configured information and procedures/);
  assert.doesNotMatch(html, /adapt information|adapt procedures|type="checkbox"/i);
});

test("UTI procedure teaches reception actions without assigning them to the clinically responsible roles", () => {
  // Fictional practice configuration: actions are test inputs, not suggested clinical guidance.
  const p = practice();
  const roles = Object.values(p.roleRequests!);
  roles[0].label = "Doctor";
  roles[1].label = "Practice Nurse";
  roles[0].selectedRequestIds.push("utis");
  const target = procedureTargets(p).find((t) => t.id === "utis")!;
  const record = confirmProcedure(
    target,
    undefined,
    {
      steps: [
        { id: "leave", text: "Tell the patient where to leave the sample." },
        {
          id: "process",
          text: "The Practice Nurse processes the sample using the local procedure.",
        },
        { id: "ask", text: "Ask the patient to provide a urine sample." },
        { id: "book", text: "Book the patient into the practice’s urine-dipping process." },
      ],
      stepOrder: ["ask", "book", "leave", "process"],
      appliesWhen: "For requests following this confirmed sample process.",
      orderRequirement: "required_linear",
    },
    "manager",
  );
  if (record.status !== "configured") throw Error("fixture");
  p.localProcedures = { utis: record };
  const original = JSON.stringify(p);
  for (const trainingLevel of ["learn", "apply"] as const) {
    const settings = { ...modules.defaultModuleSettings(), trainingLevel, count: 10 };
    const recognition = modules
      .configuredScenarios("appointment-booking", "Booking", p, settings)
      .find((s) => s.kind === "mcq" && s.localRoleRequestId === "utis");
    assert.ok(recognition?.kind === "mcq");
    assert.equal(
      recognition.options[recognition.correctIndex],
      "Doctor appointment or Practice Nurse appointment",
    );
    assert.ok(!recognition.options.some((option) => /book|sample/i.test(option)));

    const generated = modules.generateConfiguredModule(
      "appointment-booking",
      "Booking",
      p,
      settings,
    );
    const exercise = generated.find((s) => s.provenance?.kind === "sequence");
    assert.ok(exercise);
    assert.equal(exercise.status, "draft");
    assert.deepEqual(exercise.provenance?.snapshot.localProcedure, record);
    assert.ok(!generated.some((s) => s.kind === "mcq" && s.localRoleRequestId === "utis"));
    if (trainingLevel === "learn") {
      assert.ok(exercise.kind === "order" && exercise.sequence);
      assert.deepEqual(exercise.sequence.correctOrder, record.stepOrder);
      assert.deepEqual(
        exercise.sequence.steps.map((s) => s.label),
        record.steps.map((s) => s.text),
      );
      assert.match(exercise.question, /handling this request at reception/);
    } else {
      assert.ok(exercise.kind === "mcq");
      assert.equal(exercise.question, "As the receptionist, what should you do first?");
      assert.equal(
        exercise.options[exercise.correctIndex],
        "Ask the patient to provide a urine sample.",
      );
      assert.deepEqual([...exercise.options].sort(), record.steps.map((s) => s.text).sort());
      assert.ok(
        !exercise.options.some((option) =>
          /Ask (?:the )?(?:Doctor|Practice Nurse) to provide/.test(option),
        ),
      );
    }
  }
  assert.equal(JSON.stringify(p), original);
  delete p.localProcedures;
  const generated = modules.generateConfiguredModule("appointment-booking", "Booking", p, {
    ...modules.defaultModuleSettings(),
    trainingLevel: "apply",
    count: 10,
  });
  assert.ok(!generated.some((s) => s.provenance?.kind === "sequence"));
  assert.doesNotMatch(JSON.stringify(generated), /urine sample|urine-dipping/);
});
test("Apply uses only authored first/later steps and freezes their procedure snapshot", () => {
  const { p, procedure } = fixture();
  const s = localProcedureApplication(p)!;
  assert.equal(s.kind, "mcq");
  if (procedure.status !== "configured") throw Error("fixture");
  assert.deepEqual(
    s.options,
    procedure.stepOrder.map((id) => procedure.steps.find((s) => s.id === id)!.text),
  );
  assert.equal(s.options[s.correctIndex], procedure.steps[0].text);
  assert.ok(s.patientQuote.includes(procedure.appliesWhen));
  const snapshot = JSON.stringify(s);
  procedure.steps[0].text = "Changed";
  procedure.orderRequirement = "unassessed";
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(localProcedureApplication(p), undefined);
});
test("eligible roles remain alternatives without contact/booking authority; umbrella queries are omitted", () => {
  const { p } = fixture();
  const roles = Object.values(p.roleRequests!);
  roles[0].label = "Doctor";
  roles[1].label = "Practice Nurse";
  roles[0].selectedRequestIds.push("medication-reviews", "prescription-queries");
  roles[1].selectedRequestIds.push("medication-reviews", "prescription-queries");
  for (const trainingLevel of ["learn", "apply"] as const) {
    const questions = modules.configuredScenarios("appointment-booking", "Booking", p, {
      ...modules.defaultModuleSettings(),
      trainingLevel,
    });
    assert.ok(
      !questions.some((s) => s.kind === "mcq" && s.localRoleRequestId === "prescription-queries"),
    );
    const q = questions.find(
      (s) => s.kind === "mcq" && s.localRoleRequestId === "medication-reviews",
    )!;
    assert.ok(q.kind === "mcq");
    assert.equal(q.options[q.correctIndex], "Doctor appointment or Practice Nurse appointment");
    const visible = JSON.stringify(
      questions.map((s) => ({
        title: s.title,
        quote: s.kind !== "matching" && s.patientQuote,
        question: s.question,
        options: s.kind === "mcq" && s.options,
      })),
    );
    assert.ok(
      !/configured role|configured responsibility|configuration record|Approach Doctor|sequencing eligibility/i.test(
        visible,
      ),
    );
    assert.ok(!q.options.some((o) => /book|contact|approach/i.test(o)));
  }
});

const require = createRequire(import.meta.url);
test("real module-builder Generate handler carries saved procedures into Learn and Apply drafts", async () => {
  const source = readFileSync(
    new URL("../src/components/PredefinedModuleSetup.tsx", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  for (const { level, count, sparse } of [
    { level: "learn", count: 1, sparse: false },
    { level: "learn", count: 3, sparse: false },
    { level: "learn", count: 4, sparse: false },
    { level: "learn", count: 10, sparse: false },
    { level: "learn", count: modules.defaultModuleSettings().count, sparse: true },
    { level: "apply", count: 10, sparse: false },
  ] as const) {
    const { p, procedure } = fixture();
    if (sparse) {
      // A real practice may have confirmed only one responsibility so far.
      const role = Object.values(p.roleRequests!)[0];
      role.selectedRequestIds = ["utis"];
      p.roleRequests = { [role.roleId]: role };
    }
    let generated: any[] = [],
      destination: any;
    const states: any[] = [];
    let index = 0;
    const exports: any = {};
    const imports: Record<string, any> = {
      react: {
        useState: (initial: any) => {
          const i = index++;
          if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
          return [
            states[i],
            (next: any) => {
              states[i] = typeof next === "function" ? next(states[i]) : next;
            },
          ];
        },
      },
      "@tanstack/react-router": {
        Link: "a",
        useNavigate: () => async (to: any) => {
          destination = to;
        },
      },
      "./Shell": { Shell: "main", Card: "section" },
      "./PracticeProcessFields": { BookingFields: "div", PrescriptionFields: "div" },
      "./ModuleQuestion": { ModuleQuestion: "div" },
      "@/lib/dev-procedure-diagnostics": { captureProcedureDiagnostics: () => {} },
      "@/lib/backend": { flushPractice: async () => {} },
      "@/lib/practice-config": config,
      "@/lib/module-config": modules,
      "@/lib/store": {
        useApp: () => ({
          practiceData: p,
          modules: sparse
            ? []
            : [
                {
                  id: "draft",
                  settings: { ...modules.defaultModuleSettings(), count, trainingLevel: level },
                },
              ],
          createDraftModule: (_title: string, _type: string, _topic: string, scenarios: any[]) => {
            generated = scenarios;
            return "created-draft";
          },
          configureModule: (_id: string, _settings: unknown, scenarios: any[]) => {
            generated = scenarios;
          },
        }),
      },
    };
    new Function("require", "exports", code)((id: string) => imports[id] ?? require(id), exports);
    const elements = (n: any): any[] =>
      !n || typeof n !== "object"
        ? []
        : Array.isArray(n)
          ? n.flatMap(elements)
          : [n, ...elements(n.props?.children)];
    const render = () => {
      index = 0;
      return elements(
        exports.PredefinedModuleSetup({
          topic: "appointment-booking",
          title: "Booking",
          id: sparse ? "" : "draft",
        }),
      );
    };
    const initial = render();
    const visible = JSON.stringify(
      initial.map((n) => n.props.children),
      (_, v) => (typeof v === "function" ? undefined : v),
    );
    assert.ok(visible.includes("Built from your practice setup"));
    assert.ok(
      !/View saved practice information|View relevant responsibilities|View \/ edit procedures/.test(
        visible,
      ),
    );
    initial
      .find((n) => n.type === "button" && n.props.children === "Choose module length →")
      .props.onClick();
    const button = render().find(
      (n) =>
        n.type === "button" &&
        n.props.children === (sparse ? "Create module" : "Save settings and regenerate"),
    );
    assert.equal(button.props.disabled, false);
    await button.props.onClick();
    assert.equal(destination.to, "/modules/review");
    assert.equal(generated.length, sparse ? Math.round(count * 0.3) + 1 : count);
    assert.equal(
      generated.filter((s) => s.provenance?.kind === "core").length,
      Math.round(count * 0.3),
    );
    const q = generated.find((s) => s.provenance?.kind === "sequence");
    assert.ok(q, "the real save handler must include the Local Procedure");
    assert.ok(!generated.some((s) => s.kind === "mcq" && s.localRoleRequestId === "utis"));
    assert.equal(q.kind, level === "learn" ? "order" : "mcq");
    assert.equal(q.provenance.sourceVersion, procedure.version);
    assert.deepEqual(q.provenance.snapshot.localProcedure, procedure);
    if (q.kind === "order") {
      assert.deepEqual(q.sequence.correctOrder, ["check", "record", "file"]);
      assert.deepEqual(
        q.sequence.steps.map((s: any) => s.label),
        procedure.status === "configured" && procedure.steps.map((s) => s.text),
      );
    } else
      assert.equal(q.options[q.correctIndex], "Check if the practice form has been completed.");
  }
});

test("generation diagnostics report every saved procedure and exact allocation constraints", async () => {
  const { procedureGenerationReport } =
    await import("../src/lib/procedure-generation-diagnostics.ts");
  const { p } = fixture();
  const target = procedureTargets(p).find((t) => t.id !== "utis")!;
  p.localProcedures![target.id] = confirmProcedure(
    target,
    undefined,
    {
      steps: [
        { id: "a", text: "Open the form." },
        { id: "b", text: "Record the reference." },
        { id: "c", text: "Close the form." },
      ],
      stepOrder: ["a", "b", "c"],
      appliesWhen: "",
      orderRequirement: "unassessed",
    },
    "manager",
  );
  const settings = {
    ...modules.defaultModuleSettings(),
    count: 10,
    trainingLevel: "learn" as const,
  };
  const result = modules.generateConfiguredModule("appointment-booking", "Booking", p, settings);
  const report = procedureGenerationReport(p, "learn", 10, result);
  assert.equal(report.procedures.length, 2);
  assert.equal(report.procedures.find((d) => d.requestId === "utis")!.allocated, true);
  const excluded = report.procedures.find((d) => d.requestId === target.id)!;
  assert.equal(excluded.eligible, false);
  assert.match(excluded.reason, /order has not been confirmed/);
  const frozen = JSON.stringify(report);
  p.localProcedures![target.id].version += 1;
  assert.equal(JSON.stringify(report), frozen);
  const small = modules.generateConfiguredModule("appointment-booking", "Booking", p, {
    ...settings,
    count: 2,
  });
  assert.equal(
    procedureGenerationReport(p, "learn", 2, small).procedures.find((d) => d.requestId === "utis")!
      .allocationReason,
    "Allocated",
  );
});

test("new Appointment Booking wording avoids abstract configuration questions", () => {
  const { p } = fixture();
  for (const trainingLevel of ["learn", "apply"] as const) {
    const questions = modules.configuredScenarios("appointment-booking", "Booking", p, {
      ...modules.defaultModuleSettings(),
      trainingLevel,
    });
    const visible = questions
      .map((s) =>
        JSON.stringify({
          title: s.title,
          question: s.question,
          situation: s.kind === "mcq" ? s.patientQuote : "",
        }),
      )
      .join(" ");
    assert.doesNotMatch(
      visible,
      /configured role|Reception is unsure which procedure applies|Which action matches this practice’s procedure for this request/,
    );
  }
});

test("booking action requires explicit request procedure; general routine booking does not authorise a particular request", () => {
  const { p } = fixture();
  const role = Object.values(p.roleRequests!)[0];
  role.selectedRequestIds.push("medication-reviews");
  const target = procedureTargets(p).find((t) => t.id === "medication-reviews")!;
  const settings = {
    ...modules.defaultModuleSettings(),
    trainingLevel: "apply" as const,
    count: 10,
  };
  // An independently known routine pathway cannot classify a medication review as routine.
  p.bookingConfig = { ...config.bookingFor(p), routineProcess: { id: "direct" } };
  const membership = modules
    .configuredScenarios("appointment-booking", "Booking", p, settings)
    .find((s) => s.kind === "mcq" && s.localRoleRequestId === target.id);
  assert.ok(membership?.kind === "mcq");
  assert.doesNotMatch(membership.options[membership.correctIndex], /book/i);
  const action = `Book an appointment with ${role.label}.`;
  p.localProcedures = {
    [target.id]: confirmProcedure(
      target,
      undefined,
      {
        steps: [
          { id: "book", text: action },
          { id: "record", text: "Record the booking reference." },
          { id: "confirm", text: "Confirm the booking details with the patient." },
        ],
        stepOrder: ["book", "record", "confirm"],
        appliesWhen: "For this confirmed booking process.",
        orderRequirement: "required_linear",
      },
      "manager",
    ),
  };
  const generated = modules.generateConfiguredModule("appointment-booking", "Booking", p, settings);
  const exercise = generated.find((s) => s.provenance?.kind === "sequence");
  assert.ok(exercise?.kind === "mcq");
  assert.equal(exercise.options[exercise.correctIndex], action);
});
