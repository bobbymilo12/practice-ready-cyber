import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as practiceConfig from "../src/lib/practice-config.ts";
import * as config from "../src/lib/module-config.ts";
import { flagPracticeChanges } from "../src/lib/practice-change-tracking.ts";
import { empty } from "./fixtures/role-matching.ts";

const require = createRequire(import.meta.url);
const elements = (n: any): any[] =>
  !n || typeof n !== "object"
    ? []
    : Array.isArray(n)
      ? n.flatMap(elements)
      : [n, ...elements(n.props?.children)];
function load(path: string, imports: Record<string, any>) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports: any = {};
  new Function("require", "exports", js)((id: string) => imports[id] ?? require(id), exports);
  return exports;
}
test("confirmed-item editor keeps typing and editing local until Add/Save; Remove is explicit", () => {
  const state: any[] = [];
  let cursor = 0,
    items: string[] = [],
    writes = 0;
  const { ConfirmedItems } = load("../src/components/ConfirmedItems.tsx", {
    react: {
      useState(initial: any) {
        const i = cursor++;
        if (!(i in state)) state[i] = initial;
        return [state[i], (v: any) => (state[i] = v)];
      },
    },
  });
  const render = () => {
    cursor = 0;
    return elements(
      ConfirmedItems({
        label: "Instructions",
        items,
        onChange: (v: string[]) => {
          items = v;
          writes++;
        },
      }),
    );
  };
  const type = (text: string) =>
    render()
      .find((n) => n.type === "textarea")
      .props.onChange({ target: { value: text } });
  const click = (text: string) =>
    render()
      .find((n) => n.type === "button" && n.props.children === text)
      .props.onClick();
  type("Patient-provided test instruction");
  assert.equal(writes, 0);
  click("Add");
  assert.deepEqual(items, ["Patient-provided test instruction"]);
  assert.equal(render().find((n) => n.type === "textarea").props.value, "");
  type("Another confirmed instruction");
  click("Add");
  click("Edit");
  type("Replacement instruction");
  assert.equal(items[0], "Patient-provided test instruction");
  click("Save changes");
  assert.equal(items[0], "Replacement instruction");
  click("Remove");
  assert.deepEqual(items, ["Another confirmed instruction"]);
});

test("prescription and both contact editors wire the same confirmed-item control to saved data", () => {
  let p = empty();
  let saved: any;
  const { PrescriptionFields, ContactFields } = load(
    "../src/components/PracticeProcessFields.tsx",
    {
      "./ConfirmedItems": { ConfirmedItems: "confirmed-items" },
      "./SameDayRequests": { SameDayRequests: "requests" },
      "./EscalationContacts": { EscalationContacts: "contacts" },
      "@/lib/practice-config": practiceConfig,
      "@/lib/store": {
        useApp: (select: any) =>
          select({ practiceData: p, setPrescriptionConfig: (c: any) => (saved = c) }),
      },
      "@tanstack/react-router": { Link: "a" },
    },
  );
  const instruction = elements(PrescriptionFields()).find((n) => n.type === "confirmed-items");
  instruction.props.onChange(["First exact instruction", "Second exact instruction"]);
  assert.deepEqual(saved.orderingInstructions, [
    "First exact instruction",
    "Second exact instruction",
  ]);
  p = { ...p, prescriptionConfig: saved };
  assert.deepEqual(
    practiceConfig.prescriptionInstructions(p.prescriptionConfig!),
    saved.orderingInstructions,
  );
  const route = { ...practiceConfig.emptyContactRoute(), contact: { kind: "other", text: "" } };
  let next: any;
  const editor = elements(
    ContactFields({
      label: "Contact",
      value: route,
      practice: p,
      onChange: (v: any) => (next = v),
    }),
  ).find((n) => n.type === "confirmed-items");
  assert.equal(next, undefined);
  editor.props.onChange(["Test contact"]);
  assert.equal(next.contact.text, "Test contact");
  editor.props.onChange([]);
  assert.equal(next.contact.text, "");
  const { EscalationContacts } = load("../src/components/EscalationContacts.tsx", {
    "./ConfirmedItems": { ConfirmedItems: "confirmed-items" },
    "@/lib/practice-config": practiceConfig,
  });
  const multi = elements(
    EscalationContacts({
      label: "Contacts",
      value: route,
      practice: p,
      onChange: (v: any) => (next = v),
    }),
  ).find((n) => n.type === "confirmed-items");
  multi.props.onChange(["One", "Two"]);
  assert.deepEqual(
    next.contact.contacts.map((c: any) => c.text),
    ["One", "Two"],
  );
});

test("legacy prescription text remains one item; structured ordering becomes readable grounded content", () => {
  const p = empty();
  p.repeatOrderMethods = "First legacy step; second legacy step";
  const c = practiceConfig.prescriptionsFor(p);
  assert.deepEqual(practiceConfig.prescriptionInstructions(c), [p.repeatOrderMethods]);
  c.methods = ["telephone", "nhs-app"];
  c.orderingInstructions = ["Patients over 60 can order over the phone"];
  p.prescriptionConfig = c;
  const questions = config.generateConfiguredModule("prescriptions", "Prescriptions", p, {
    ...config.defaultModuleSettings(),
    trainingLevel: "learn",
  });
  const text = JSON.stringify(questions);
  assert.match(text, /Patients can order repeat prescriptions by telephone or through the NHS App/);
  assert.match(text, /Patients over 60 can order over the phone/);
  assert.doesNotMatch(text, /First legacy step|;|Apply this step/);
});

test("all predefined topics reuse shared configuration across modules and changes require review", () => {
  for (const topic of Object.keys(config.topicFields).filter((topic) => topic !== "custom")) {
    const p = empty();
    p.topicSettings = {
      [topic]: { answers: {}, extra: "Record this test request in the agreed inbox." },
    };
    const settings = { ...config.defaultModuleSettings(), trainingLevel: "learn" as const };
    const scenarios = config.generateConfiguredModule(topic, topic, p, settings);
    assert.ok(JSON.stringify(scenarios).includes("agreed inbox"), topic);
    assert.ok(!config.fieldsForTopic("prescriptions", p).some((f) => f.key === "queries"));
    const module = {
      id: topic,
      title: topic,
      type: topic,
      topicKey: topic,
      createdAt: 1,
      published: true,
      scenarios,
    };
    const next = structuredClone(p);
    next.topicSettings![topic].extra = "Use the updated test inbox.";
    const flagged = flagPracticeChanges(p, next, [module]);
    assert.ok(flagged[0].needsReview, topic);
    const regenerated = config.generateConfiguredModule(
      topic,
      topic,
      JSON.parse(JSON.stringify(next)),
      settings,
    );
    assert.ok(JSON.stringify(regenerated).includes("updated test inbox"), topic);
  }
});

test("shared rules have practice-scoped secured database write and reload support", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/202610130001_shared_topic_settings.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /add column topic_settings jsonb/);
  assert.match(sql, /p_data->'topicSettings'/);
  assert.match(sql, /'topicSettings', s.topic_settings/);
  assert.match(sql, /where s.practice_id = p_practice/);
  assert.match(sql, /from public, anon, authenticated/);
});
