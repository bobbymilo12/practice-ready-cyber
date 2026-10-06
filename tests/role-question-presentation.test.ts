import assert from "node:assert/strict";
import test from "node:test";
import { practice } from "./fixtures/role-matching.ts";
import {
  roleRequestSituation,
  roleAnswerChoices,
  roleList,
} from "../src/lib/role-question-presentation.ts";
import { configuredScenarios, defaultModuleSettings } from "../src/lib/module-config.ts";

test("neutral request phrasing singularises familiar labels without extra facts", () => {
  assert.equal(roleRequestSituation("UTIs"), "A patient contacts the practice about a UTI.");
  assert.equal(
    roleRequestSituation("Medication reviews"),
    "A patient contacts the practice about a medication review.",
  );
  assert.equal(
    roleRequestSituation("Cervical screening"),
    "A patient contacts the practice about cervical screening.",
  );
  assert.equal(
    roleRequestSituation("Custom procedure X"),
    "A patient contacts the practice about Custom procedure X.",
  );
  assert.equal(roleList(["Doctor", "Practice Nurse"]), "Doctor and Practice Nurse");
  assert.equal(roleList(["A", "B", "C"]), "A, B and C");
});

test("role choices exclude every valid role and unconfirmed, archived or identity-conflicting alternatives", () => {
  const p = practice([[1], [1], [0], [0], [0], [0]]);
  const roles = Object.values(p.roleRequests!);
  roles[3].confirmed = false;
  roles[4].archived = true;
  roles[5].categories[0].requests.push({ id: "custom:uti", label: "UTIs", custom: true });
  roles[5].selectedRequestIds.push("custom:uti");
  const options = roleAnswerChoices(p, "utis", "UTIs", roles.slice(0, 2));
  assert.deepEqual(options, ["Test role 1 and Test role 2", "Test role 3"]);
  assert.ok(!options.slice(1).includes("Test role 1"));
  assert.ok(!options.slice(1).includes("Test role 2"));
});

test("all roles valid uses a conservative binary fallback, never fabricated roles", () => {
  const p = practice([[1], [1]]);
  assert.deepEqual(roleAnswerChoices(p, "utis", "UTIs", Object.values(p.roleRequests!)), [
    "Test role 1 and Test role 2",
    "No role is configured to handle this request.",
  ]);
});

test("new Learn role questions use request wording, role choices and structured classification", () => {
  const p = practice([[1, 11], [1], [0], [2]]);
  const settings = { ...defaultModuleSettings(), trainingLevel: "learn" as const };
  const all = configuredScenarios("appointment-booking", "Booking", p, settings);
  const uti = all.find((s) => s.kind === "mcq" && s.localRoleRequestId === "utis")!;
  assert.equal(uti.kind, "mcq");
  if (uti.kind !== "mcq") return;
  assert.equal(uti.title, "A patient contacts the practice about a UTI");
  assert.equal(uti.patientQuote, "A patient contacts the practice about a UTI.");
  assert.equal(uti.question, "Which role(s) at this practice can handle this request?");
  assert.equal(uti.options[uti.correctIndex], "Test role 1 and Test role 2");
  assert.deepEqual(uti.options.slice(1), ["Test role 3", "Test role 4"]);
  assert.ok(
    uti.learningPoint.includes("Test role 1 and Test role 2 can handle requests about UTIs"),
  );
  assert.ok(!JSON.stringify(uti).includes("Routing:"));
  const apply = configuredScenarios("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "apply",
  });
  const same = apply.find((s) => s.kind === "mcq" && s.localRoleRequestId === "utis")!;
  if (same.kind !== "mcq") return;
  assert.notEqual(same.patientQuote, uti.patientQuote);
  assert.ok(same.patientQuote.includes("first free appointment"));
  assert.ok(!same.title.includes("Routing:"));
});
