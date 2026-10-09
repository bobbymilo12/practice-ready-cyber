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
  procedure.steps[0].text = "If the form is missing, ask for it.";
  assert.equal(localProcedureSequence(p), undefined);
  assert.match(inspectLocalProcedureSequences(p).reasons.join(" "), /conditional/);
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
    assert.equal(q.options[q.correctIndex], "Doctor or Practice Nurse");
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
  for (const level of ["learn", "apply"] as const) {
    const { p, procedure } = fixture();
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
          modules: [
            {
              id: "draft",
              settings: { ...modules.defaultModuleSettings(), count: 10, trainingLevel: level },
            },
          ],
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
          id: "draft",
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
      (n) => n.type === "button" && n.props.children === "Save settings and regenerate",
    );
    assert.equal(button.props.disabled, false);
    await button.props.onClick();
    assert.equal(destination.to, "/modules/review");
    assert.equal(generated.length, 10);
    assert.equal(generated.filter((s) => s.provenance?.kind === "core").length, 3);
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
  assert.match(
    procedureGenerationReport(p, "learn", 2, small).procedures.find((d) => d.requestId === "utis")!
      .allocationReason,
    /Fewer than two/,
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
