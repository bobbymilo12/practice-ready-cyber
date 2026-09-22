import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSession,
  answerSession,
  assignmentProgress,
  startSession,
} from "../src/lib/training.ts";
import { practiceScenarios } from "../src/lib/practice-scenarios.ts";
import type { Assignment, Module, PracticeData, Scenario } from "../src/lib/store.ts";

const question: Scenario = {
  id: "q1",
  kind: "mcq",
  title: "Booking",
  patientQuote: "Can I book?",
  question: "What next?",
  options: ["Guess", "Check"],
  correctIndex: 1,
  learningPoint: "Check local guidance.",
  status: "approved",
};
const followup: Scenario = {
  ...question,
  id: "q2",
  followUpFor: "q1",
  title: "Booking a follow-up",
  patientQuote: "My appointment needs changing.",
};
const order: Scenario = {
  id: "q3",
  kind: "order",
  title: "Steps",
  patientQuote: "What happens?",
  question: "Order",
  steps: ["Check", "Book", "Record"],
  learningPoint: "Check first.",
  status: "approved",
};
const module: Module = {
  id: "m1",
  title: "Bookings",
  type: "Booking",
  topicKey: "booking",
  published: true,
  createdAt: 1,
  scenarios: [question, order, followup],
};
const assignment: Assignment = {
  id: "a1",
  moduleId: "m1",
  traineeId: "alice",
  assignedAt: 1,
  status: "assigned",
};

test("missed questions receive a different approved scenario and preserve the first score", () => {
  let session = startSession(module, assignment, "attempt");
  assert.deepEqual(session.queue, ["q1", "q3"]);
  session = answerSession(session, 0);
  assert.deepEqual(session.queue, ["q1", "q3", "q2"]);
  session = advanceSession(session, module.title);
  session = answerSession(session, ["Check", "Book", "Record"]);
  session = advanceSession(session, module.title);
  session = answerSession(session, 1);
  session = advanceSession(session, module.title);
  assert.equal(session.result?.correct, 1);
  assert.equal(session.result?.total, 2);
  assert.deepEqual(session.result?.wrongTitles, []);
  assert.deepEqual(session.result?.recoveredTitles, ["Booking"]);
  assert.deepEqual(session.result?.strongTitles, ["Steps"]);
  assert.equal(advanceSession(session, module.title), session);
});

test("refreshing during feedback retains the submitted answer and prevents duplicate scoring", () => {
  const saved = answerSession(startSession(module, assignment, "attempt"), 0);
  const resumed = JSON.parse(JSON.stringify(saved));
  assert.equal(resumed.answers[0].value, 0);
  assert.equal(resumed.index, 0);
  assert.equal(answerSession(resumed, 1), resumed);
  assert.equal(advanceSession(resumed, module.title).index, 1);
});

test("progress is isolated by trainee and assignment, including reassignment", () => {
  const session = answerSession(startSession(module, assignment, "attempt"), 1);
  assert.equal(assignmentProgress(assignment, [session]).status, "In Progress");
  assert.equal(assignmentProgress(assignment, [session]).fraction, 0.5);
  assert.equal(
    assignmentProgress({ ...assignment, traineeId: "bob" }, [session]).status,
    "Not Started",
  );
  assert.equal(assignmentProgress({ ...assignment, id: "redo" }, [session]).status, "Not Started");
});

test("unapproved followups never reach training", () => {
  const m = { ...module, scenarios: [question, { ...followup, status: "draft" as const }] };
  const session = answerSession(startSession(m, assignment, "attempt"), 0);
  assert.deepEqual(session.queue, ["q1"]);
  assert.deepEqual(advanceSession(session, m.title).result?.wrongTitles, ["Booking"]);
});

test("unanswered, invalid and unavailable module operations fail", () => {
  const session = startSession(module, assignment, "attempt");
  assert.throws(() => advanceSession(session, module.title), /Answer/);
  assert.throws(() => answerSession(session, -1), /Choose/);
  assert.throws(() => answerSession(session, 5), /Choose/);
  assert.throws(() => startSession({ ...module, published: false }, assignment, "attempt"));
  assert.throws(() => startSession({ ...module, needsReview: true }, assignment, "attempt"));
  const next = advanceSession(answerSession(session, 1), module.title);
  assert.throws(() => answerSession(next, ["Check", "Check", "Record"]), /Arrange/);
});

test("completion and an optional retake do not erase the achievement", () => {
  let session = startSession({ ...module, scenarios: [question] }, assignment, "attempt");
  session = advanceSession(answerSession(session, 1), module.title);
  const retake = startSession(module, assignment, "retake");
  assert.equal(assignmentProgress(assignment, [session, retake]).status, "Completed");
  assert.equal(assignmentProgress(assignment, [session, retake]).fraction, 1);
});

test("generated scenarios quote actual practice rules and clinicians, with draft followups", () => {
  const practice = {
    practiceName: "Oak Practice",
    prescriptionOrdering: "Use Oak's portal",
    repeatTurnaround: "Three working days",
    staff: [{ id: "staff", name: "Alex Green", role: "Pharmacist", clinics: "Medication queries" }],
    rolePolicies: {},
    sameDayReasons: [],
  } as unknown as PracticeData;
  const scenarios = practiceScenarios("prescriptions", "Prescriptions", practice, {
    runOut: "Contact Alex on extension 123",
  });
  assert.ok(scenarios.every((s) => s.status === "draft"));
  assert.ok(scenarios.some((s) => s.learningPoint.includes("Oak's portal")));
  assert.ok(scenarios.some((s) => s.learningPoint.includes("Alex Green")));
  assert.ok(scenarios.some((s) => s.learningPoint.includes("extension 123")));
  for (const s of scenarios.filter((s) => s.followUpFor)) {
    const primary = scenarios.find((p) => p.id === s.followUpFor)!;
    assert.ok(primary);
    assert.notEqual(primary.patientQuote, s.patientQuote);
  }
});

// Structured setup must preserve legacy text and resolve shared references at read time.
import {
  bookingFor,
  prescriptionsFor,
  practiceSummary,
  configMissing,
} from "../src/lib/practice-config.ts";
const blankPractice = (): PracticeData => ({
  practiceName: "Oak",
  hours: "",
  address: "",
  outOfHoursTimes: "",
  sameDayReasons: [],
  prescriptionOrdering: "",
  dutyContact: "",
  nominatedPharmacy: "",
  urgentNumbers: "",
  extras: "",
  repeatOrderMethods: "",
  repeatTurnaround: "",
  repeatControlled: "",
  repeatHighRisk: "",
  repeatEmergency: "",
  localSafeguarding: "",
  localComplaints: "",
  localDNA: "",
  localInterpreter: "",
  localConfidentiality: "",
  staff: [{ id: "s1", name: "Sarah Khan", role: "Pharmacist", clinics: "" }],
  rolePolicies: { gpsSameDay: "", gpsRoutine: "" } as PracticeData["rolePolicies"],
});
test("legacy migration preserves distinct ordering instructions and does not infer clinical or calendar rules", () => {
  const p = blankPractice();
  p.sameDayReasons = ["Local emergency and pathway guidance"];
  p.dutyContact = "Call the duty team on 123";
  p.prescriptionOrdering = "Use the portal";
  p.repeatOrderMethods = "No phone ordering";
  p.repeatTurnaround = "Allow extra time after bank holidays";
  p.repeatEmergency = "Contact local pharmacy team";
  const b = bookingFor(p),
    c = prescriptionsFor(p);
  assert.deepEqual(b.sameDayPathway.selected, []);
  assert.equal(b.sameDayPathway.instruction, p.sameDayReasons[0]);
  assert.equal(c.weekends.id, "unconfirmed");
  assert.equal(c.bankHolidays.id, "unconfirmed");
  assert.equal(c.turnaround.id, "");
  assert.equal(c.urgentRoute.source, "separate");
  const summary = practiceSummary({ ...p, bookingConfig: b, prescriptionConfig: c });
  assert.ok(summary.prescriptionOrdering.includes("Use the portal"));
  assert.ok(summary.prescriptionOrdering.includes("No phone ordering"));
  assert.ok(summary.repeatTurnaround.includes(p.repeatTurnaround));
  assert.equal(summary.repeatEmergency, p.repeatEmergency);
  assert.deepEqual(practiceSummary(p), p);
});
test("structured summaries follow renamed staff and shared escalation, never stale text", () => {
  const p = blankPractice();
  p.bookingConfig = bookingFor(p);
  p.prescriptionConfig = prescriptionsFor(p);
  p.bookingConfig.escalation = {
    contact: { kind: "staff", staffId: "s1" },
    method: { id: "phone", other: "123" },
    instruction: "",
  };
  p.dutyContact = "STALE contact";
  p.repeatEmergency = "STALE process";
  p.rolePolicies.gpsSameDay = "STALE booking";
  p.staff[0].name = "Sarah New";
  let summary = practiceSummary(p);
  assert.ok(summary.dutyContact.includes("Sarah New"));
  assert.ok(summary.repeatEmergency.includes("Sarah New"));
  assert.ok(summary.repeatEmergency.includes("123"));
  assert.ok(!JSON.stringify(summary.rolePolicies).includes("STALE"));
  assert.deepEqual(configMissing(p), { booking: [], prescription: [] });
  const drafts = practiceScenarios("appointment-booking", "Bookings", p, {
    sameDayProcess: "STALE answer",
    dutyTeam: "STALE answer",
  });
  assert.ok(!JSON.stringify(drafts).includes("STALE"));
  assert.ok(JSON.stringify(drafts).includes("Medication review"));
  p.bookingConfig.escalation.method.other = "456";
  summary = practiceSummary(p);
  assert.ok(summary.repeatEmergency.includes("456"));
  p.staff = [];
  assert.ok(configMissing(p).booking.includes("Escalation contact and method"));
  assert.ok(configMissing(p).prescription.includes("Urgent prescription contact and method"));
  assert.ok(practiceSummary(p).dutyContact.includes("no longer available"));
});
test("new setup defaults are independent snapshots, and custom choices require details", () => {
  const p = blankPractice();
  p.bookingConfig = bookingFor(p);
  p.prescriptionConfig = prescriptionsFor(p);
  assert.ok(p.bookingConfig.sameDayPathway.selected.includes("infection"));
  p.bookingConfig.sameDayPathway.selected = [];
  assert.ok(bookingFor(blankPractice()).sameDayPathway.selected.length > 0);
  p.prescriptionConfig.methods = ["other"];
  p.prescriptionConfig.turnaround = { id: "other", other: "" };
  const missing = configMissing(p);
  assert.ok(missing.booking.includes("Same-day pathway criteria"));
  assert.ok(missing.prescription.includes("Prescription ordering"));
  assert.ok(missing.prescription.includes("Prescription turnaround"));
  assert.deepEqual(bookingFor(JSON.parse(JSON.stringify(p))), p.bookingConfig);
});

import { switchUrgentRoute, configReview } from "../src/lib/practice-config.ts";
import { teamReviewSummary } from "../src/lib/practice-setup.ts";
import { roleCapabilities } from "../src/lib/appointment-capabilities.ts";

test("separate urgent contact survives shared mode and JSON persistence without affecting active summaries", () => {
  const p = blankPractice();
  p.bookingConfig = bookingFor(p);
  p.bookingConfig.escalation = {
    contact: { kind: "role", role: "Duty GP" },
    method: { id: "teams", other: "" },
    instruction: "",
  };
  p.prescriptionConfig = prescriptionsFor(p);
  const separate = {
    source: "separate" as const,
    route: {
      contact: { kind: "staff" as const, staffId: "s1" },
      method: { id: "phone", other: "789" },
      instruction: "Local contact detail",
    },
  };
  const before = JSON.stringify(separate);
  p.prescriptionConfig.urgentRoute = switchUrgentRoute(separate, true);
  const saved = JSON.parse(JSON.stringify(p)) as PracticeData;
  assert.ok(practiceSummary(saved).repeatEmergency.includes("Duty GP"));
  assert.ok(!practiceSummary(saved).repeatEmergency.includes("789"));
  assert.ok(!practiceSummary(saved).repeatEmergency.includes("Local contact detail"));
  assert.deepEqual(switchUrgentRoute(saved.prescriptionConfig!.urgentRoute, false), separate);
  assert.equal(JSON.stringify(separate), before);
  assert.equal(switchUrgentRoute({ source: "appointment" }, false).source, "separate");
  assert.deepEqual(configReview(saved).prescription.instructions, []);
});

test("review separates text-only legacy guidance, unconfirmed calendars and structured selections without changing saved data", () => {
  const p = blankPractice();
  p.dutyContact = "Call the duty team";
  p.rolePolicies.gpsSameDay = "Follow our old local pathway";
  p.repeatTurnaround = "Follow the posted turnaround";
  p.repeatEmergency = "Contact local clinician";
  const before = JSON.stringify(p);
  let review = configReview(p);
  assert.ok(review.booking.textOnly.includes("Appointment escalation contact and method"));
  assert.ok(review.booking.textOnly.includes("Same-day booking process"));
  assert.ok(review.prescription.textOnly.includes("Prescription turnaround"));
  assert.ok(review.prescription.textOnly.includes("Urgent prescription contact and method"));
  assert.ok(review.prescription.unconfirmed.includes("Weekend turnaround rules"));
  assert.ok(review.prescription.unconfirmed.includes("Bank-holiday turnaround rules"));
  assert.equal(JSON.stringify(p), before);
  p.bookingConfig = bookingFor(p);
  p.bookingConfig.sameDayProcess = { id: "direct", other: "" };
  review = configReview(p);
  assert.ok(!review.booking.textOnly.includes("Same-day booking process"));
  assert.ok(review.booking.instructions.includes("Same-day booking process"));
  assert.equal(p.bookingConfig.sameDayInstruction, p.rolePolicies.gpsSameDay);
  p.prescriptionConfig = prescriptionsFor(p);
  p.prescriptionConfig.weekends = { id: "exclude", other: "" };
  p.prescriptionConfig.bankHolidays = { id: "other", other: "" };
  assert.ok(!configReview(p).prescription.unconfirmed.includes("Weekend turnaround rules"));
  assert.ok(configReview(p).prescription.unconfirmed.includes("Bank-holiday turnaround rules"));
  p.prescriptionConfig.bankHolidays.other = "Follow the local holiday rota";
  assert.ok(!configReview(p).prescription.unconfirmed.includes("Bank-holiday turnaround rules"));
});

test("team review shows effective clinician overrides and retains older responsibilities separately", () => {
  const person = {
    id: "np",
    name: "Alex",
    role: "Nurse Practitioner",
    clinics: "Local clinic",
    capabilities: ["Additional responsibility"],
    appointmentCapabilities: {
      defaults: roleCapabilities("Nurse Practitioner"),
      overrides: { "breast-examination": false, "medication-review": true },
    },
  };
  const summary = teamReviewSummary(person);
  assert.ok(summary.includes("Appointment types (9 selected)"));
  assert.ok(summary.includes("Medication review"));
  assert.ok(!summary.includes("Breast examination"));
  assert.ok(summary.includes("Local clinic, Additional responsibility"));
  assert.ok(
    teamReviewSummary({ id: "gp", name: "GP", role: "GP", clinics: "" }).includes(
      "Appointment types (7 selected)",
    ),
  );
  assert.equal(
    teamReviewSummary({ id: "r", name: "Receptionist", role: "Reception", clinics: "Front desk" }),
    "Receptionist · Reception: Front desk",
  );
  assert.ok(
    teamReviewSummary({
      ...person,
      appointmentCapabilities: { defaults: {}, overrides: {} },
    }).includes("None selected"),
  );
});
