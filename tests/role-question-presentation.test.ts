import assert from "node:assert/strict";
import test from "node:test";
import { practice } from "./fixtures/role-matching.ts";
import {
  roleRequestSituation,
  roleAnswerChoices,
  roleList,
  explicitSameDayBooking,
} from "../src/lib/role-question-presentation.ts";
import { bookingFor } from "../src/lib/practice-config.ts";
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
  assert.equal(roleList(["Doctor", "Practice Nurse"]), "Doctor or Practice Nurse");
  assert.equal(roleList(["A", "B", "C"]), "A, B or C");
});

test("role choices exclude every valid role and unconfirmed, archived or identity-conflicting alternatives", () => {
  const p = practice([[1], [1], [0], [0], [0], [0]]);
  const roles = Object.values(p.roleRequests!);
  roles[3].confirmed = false;
  roles[4].archived = true;
  roles[5].categories[0].requests.push({ id: "custom:uti", label: "UTIs", custom: true });
  roles[5].selectedRequestIds.push("custom:uti");
  const options = roleAnswerChoices(p, "utis", "UTIs", roles.slice(0, 2));
  assert.deepEqual(options, [
    "Test role 1 appointment or Test role 2 appointment",
    "Test role 3 appointment",
  ]);
  assert.ok(!options.slice(1).includes("Test role 1"));
  assert.ok(!options.slice(1).includes("Test role 2"));
});

test("all roles valid uses a conservative binary fallback, never fabricated roles", () => {
  const p = practice([[1], [1]]);
  assert.deepEqual(roleAnswerChoices(p, "utis", "UTIs", Object.values(p.roleRequests!)), [
    "Test role 1 appointment or Test role 2 appointment",
    "None of these practice roles handles this request.",
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
  assert.ok(uti.patientQuote.includes("booking process has confirmed an appointment is needed"));
  assert.equal(uti.question, "Who should you book the patient an appointment with?");
  assert.equal(
    uti.options[uti.correctIndex],
    "Book an appointment with the Test role 1 or the Test role 2.",
  );
  assert.deepEqual(uti.options.slice(1), [
    "Book an appointment with the Test role 3.",
    "Book an appointment with the Test role 4.",
  ]);
  assert.ok(uti.learningPoint.includes("Test role 1 or Test role 2 can handle this request"));
  assert.ok(!JSON.stringify(uti).includes("Routing:"));
  const apply = configuredScenarios("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "apply",
  });
  const same = apply.find((s) => s.kind === "mcq" && s.localRoleRequestId === "utis")!;
  if (same.kind !== "mcq") return;
  assert.notEqual(same.patientQuote, uti.patientQuote);
  assert.ok(same.patientQuote.includes("followed the practice’s booking process"));
  assert.ok(!same.title.includes("Routing:"));
});

test("Apply combines role and timing only for explicit unconditional same-day direct booking", () => {
  const p = practice([[1], [0]]);
  p.bookingConfig = bookingFor(p);
  p.bookingConfig.sameDayPathway.requestSelections = [{ requestId: "utis", labelSnapshot: "UTIs" }];
  p.bookingConfig.sameDayProcess = { id: "direct", other: "" };
  const settings = { ...defaultModuleSettings(), trainingLevel: "apply" as const };
  const question = () =>
    configuredScenarios("appointment-booking", "Booking", p, settings).find(
      (s) => s.kind === "mcq" && s.localRoleRequestId === "utis",
    );
  const timed = question();
  assert.ok(timed?.kind === "mcq");
  assert.equal(timed.question, "Which appointment should you book?");
  assert.deepEqual(timed.options, [
    "Test role 1 — same-day appointment",
    "Test role 1 — routine appointment",
    "Test role 2 — same-day appointment",
    "Test role 2 — routine appointment",
  ]);
  assert.equal(timed.correctIndex, 0);
  const original = structuredClone(p);
  for (const change of [
    () => {
      p.bookingConfig!.sameDayPathway.requestSelections = [];
    },
    () => {
      p.bookingConfig!.sameDayPathway.requestSelections![0].labelSnapshot = "Old name";
    },
    () => {
      p.bookingConfig!.sameDayProcess.id = "triage";
    },
    () => {
      p.bookingConfig!.sameDayInstruction = "Check the local instructions first.";
    },
    () => {
      p.bookingConfig!.sameDayPathway.instruction = "Additional condition";
    },
    () => {
      p.rolePolicies.gpsSameDay = "Additional role condition";
    },
    () => {
      p.staff = [
        {
          id: "person",
          name: "Test",
          role: "Test role 1",
          clinics: "",
          requestOverrides: { "role:test role 1": { utis: false } },
        },
      ];
    },
    () => {
      p.practiceRequests = { utis: { id: "utis", label: "Different request" } };
    },
  ]) {
    Object.assign(p, structuredClone(original));
    delete p.practiceRequests;
    change();
    assert.equal(explicitSameDayBooking(p, "utis", "UTIs"), false);
    assert.equal(question()?.question, "Who should you book the patient an appointment with?");
  }
  // A routine booking process alone never classifies this request as routine.
  Object.assign(p, structuredClone(original));
  delete p.practiceRequests;
  p.bookingConfig!.sameDayPathway.requestSelections = [];
  p.bookingConfig!.routineProcess = { id: "direct", other: "" };
  assert.equal(explicitSameDayBooking(p, "utis", "UTIs"), false);
});
