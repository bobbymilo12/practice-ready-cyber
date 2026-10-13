import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as requests from "../src/lib/practice-requests.ts";
import * as config from "../src/lib/practice-config.ts";
import { practice } from "./fixtures/role-matching.ts";
import { generateConfiguredModule, defaultModuleSettings } from "../src/lib/module-config.ts";
import type { ContactRoute } from "../src/lib/practice-config.ts";
const { practiceRequestChoices, addPracticeRequest } = requests;
const { bookingFor, routeContacts, routeText, contactMissing } = config;

test("same-day choices reuse confirmed exact role request IDs and deduplicate shared requests", () => {
  const p = practice();
  const choices = practiceRequestChoices(p);
  assert.equal(
    choices.length,
    new Set(Object.values(p.roleRequests!).flatMap((r) => r.selectedRequestIds)).size,
  );
  assert.ok(choices.some((r) => r.roles.length > 1));
  assert.ok(
    choices.every((r) =>
      Object.values(p.roleRequests!).some((role) => role.selectedRequestIds.includes(r.id)),
    ),
  );
  assert.equal(bookingFor(p).sameDayPathway.requestSelections, undefined);
});
test("added requests have stable reusable IDs, persist independently and never infer eligibility", () => {
  const p = practice();
  const next = addPracticeRequest(p, "Manager request");
  const r = Object.values(next.practiceRequests!)[0];
  assert.match(r.id, /^custom:/);
  assert.equal(r.label, "Manager request");
  assert.deepEqual(next.roleRequests, p.roleRequests);
  assert.deepEqual(bookingFor(next), bookingFor(p));
  const reloaded = JSON.parse(JSON.stringify(next));
  assert.deepEqual(practiceRequestChoices(reloaded), practiceRequestChoices(next));
  assert.deepEqual(reloaded.practiceRequests[r.id], r);
});
test("same-label custom requests remain separate; conflicting same IDs are flagged", () => {
  let p = addPracticeRequest(addPracticeRequest(practice(), "Duplicate"), "Duplicate");
  assert.equal(practiceRequestChoices(p).filter((r) => r.label === "Duplicate").length, 2);
  const role = Object.values(p.roleRequests!)[0],
    id = role.selectedRequestIds[0];
  p = {
    ...p,
    practiceRequests: { ...p.practiceRequests, [id]: { id, label: "Conflicting label" } },
  };
  assert.ok(practiceRequestChoices(p).find((r) => r.id === id)?.conflict);
});
test("legacy taxonomy IDs, custom text and instruction remain readable without migration", () => {
  const p = practice(),
    b = bookingFor(p);
  b.sameDayPathway = {
    selected: ["urinary"],
    custom: ["Existing exact wording"],
    instruction: "Existing instructions",
  };
  p.bookingConfig = b;
  const original = JSON.stringify(p);
  practiceRequestChoices(p);
  bookingFor(p);
  assert.equal(JSON.stringify(p), original);
  assert.match(
    config.practiceSummary(p).sameDayReasons.join(" "),
    /Urinary symptoms.*Existing exact wording.*Existing instructions/s,
  );
  assert.deepEqual(bookingFor(JSON.parse(original)), b);
});
test("new eligibility stays out of legacy generation; existing modules and role data stay untouched", () => {
  const p = practice(),
    next = addPracticeRequest(p, "Not a generated clinical rule");
  const r = Object.values(next.practiceRequests!)[0];
  next.bookingConfig = bookingFor(p);
  next.bookingConfig.sameDayPathway.requestSelections = [
    { requestId: r.id, labelSnapshot: r.label },
  ];
  const settings = { ...defaultModuleSettings(), count: 10, trainingLevel: "learn" as const };
  const strip = (v: unknown) =>
    JSON.stringify(v, (k, value) => (["id", "generatedAt"].includes(k) ? undefined : value));
  const baseline = { ...p, bookingConfig: bookingFor(p) };
  assert.equal(
    strip(generateConfiguredModule("appointment-booking", "Booking", baseline, settings)),
    strip(generateConfiguredModule("appointment-booking", "Booking", next, settings)),
  );
  assert.ok(!JSON.stringify(config.practiceSummary(next).sameDayReasons).includes(r.label));
  assert.equal(p.practiceRequests, undefined);
});
test("single saved contact loads without mutation; multiple contacts survive reload and resolve current names", () => {
  const p = practice(),
    role = Object.values(p.roleRequests!)[0];
  p.staff = [{ id: "staff-1", name: "Alex Example", role: role.label, clinics: "" }];
  const single: ContactRoute = {
    contact: { kind: "role", role: "Duty GP" },
    method: { id: "system", other: "" },
    instruction: "",
  };
  assert.deepEqual(routeContacts(single), [single.contact]);
  assert.equal(single.contact.kind, "role");
  const multi: ContactRoute = {
    ...single,
    contact: {
      kind: "multiple",
      contacts: [
        ...routeContacts(single),
        { kind: "role", role: "Reception Manager" },
        { kind: "role", roleId: role.roleId, role: role.label },
        { kind: "staff", staffId: "staff-1" },
      ],
    },
  };
  const saved = JSON.parse(JSON.stringify(multi));
  assert.equal(routeContacts(saved).length, 4);
  assert.equal(contactMissing(saved, p), false);
  p.staff[0].name = "Updated Person";
  role.label = "Updated Role";
  assert.match(routeText(saved, p), /Reception Manager.*Updated Role.*Updated Person/s);
  p.staff = [];
  assert.equal(contactMissing(saved, p), true);
  assert.match(routeText(saved, p), /no longer available/);
  assert.equal(contactMissing({ ...single, contact: { kind: "multiple", contacts: [] } }, p), true);
});
const require = createRequire(import.meta.url);
function component(path: string, imports: Record<string, unknown>) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, any> = {};
  new Function("require", "exports", code)((id: string) => imports[id] ?? require(id), exports);
  return exports;
}
test("compact escalation picker offers Reception Manager, configured roles, people and legacy selections", () => {
  const p = practice(),
    role = Object.values(p.roleRequests!)[0];
  p.staff = [{ id: "staff-1", name: "Alex Example", role: role.label, clinics: "" }];
  const { escalationChoices, EscalationContacts } = component(
    "../src/components/EscalationContacts.tsx",
    { "@/lib/practice-config": config, "./ConfirmedItems": { ConfirmedItems: () => null } },
  );
  const choices = escalationChoices(p);
  assert.ok(choices.some((c: any) => c.role === "Reception Manager"));
  assert.ok(choices.some((c: any) => c.roleId === role.roleId));
  assert.ok(choices.some((c: any) => c.staffId === "staff-1"));
  const route = {
    contact: { kind: "role", role: "Old custom role" },
    method: { id: "", other: "" },
    instruction: "",
  };
  let writes = 0;
  const html = renderToStaticMarkup(
    createElement(EscalationContacts, {
      label: "Contacts",
      value: route,
      practice: p,
      onChange: () => writes++,
    }),
  );
  assert.ok(html.includes("<details"));
  assert.ok(html.includes("1 selected — Old custom role"));
  assert.ok(html.includes("Reception Manager"));
  assert.equal(writes, 0);
});
test("same-day UI offers practice requests, keeps legacy choices separate and writes only on selection", () => {
  const p = practice();
  let next: any;
  const { SameDayRequests } = component("../src/components/SameDayRequests.tsx", {
    "@/lib/store": {
      useApp: (selector: any) =>
        selector({
          practiceData: p,
          setBookingConfig: (b: any) => {
            next = b;
          },
        }),
    },
    "@/lib/practice-requests": requests,
    "@/lib/practice-config": config,
    react: { useState: (value: unknown) => [value, () => {}] },
  });
  const flatten = (n: any): any[] =>
    !n || typeof n !== "object"
      ? []
      : Array.isArray(n)
        ? n.flatMap(flatten)
        : [n, ...flatten(n.props?.children)];
  const tree = flatten(SameDayRequests());
  const checks = tree.filter((n) => n.type === "input" && n.props.type === "checkbox");
  assert.equal(checks.length, practiceRequestChoices(p).length);
  assert.ok(checks.every((n) => !n.props.checked));
  assert.equal(next, undefined);
  checks[0].props.onChange({ target: { checked: true } });
  assert.deepEqual(next.sameDayPathway.requestSelections, [
    {
      requestId: practiceRequestChoices(p)[0].id,
      labelSnapshot: practiceRequestChoices(p)[0].label,
    },
  ]);
  assert.deepEqual(next.sameDayPathway.selected, []);
  const source = readFileSync(
    new URL("../src/components/PracticeProcessFields.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("Which requests may be eligible for a same-day appointment?"));
  assert.ok(
    source.includes("Select the requests your practice considers for same-day appointments."),
  );
  assert.ok(!source.includes("sameDayGroups.map"));
});
