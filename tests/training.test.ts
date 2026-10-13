import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSession,
  previousSession,
  answerSession,
  assignmentProgress,
  startSession,
  submitSession,
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
  session = submitSession(session, module.title);
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
  const changed = answerSession(resumed, 1);
  assert.equal(changed.answers.length, 1);
  assert.equal(changed.answers[0].value, 0);
  assert.equal(changed.answers[0].correct, false);
  assert.deepEqual(changed, resumed);
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
  const review = advanceSession(session, m.title);
  assert.equal(review.review, true);
  assert.deepEqual(submitSession(review, m.title).result?.wrongTitles, ["Booking"]);
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
  session = submitSession(session, module.title);
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
  assert.ok(!configMissing(p).booking.includes("Escalation contact and method"));
  assert.ok(!configMissing(p).prescription.includes("Urgent prescription contact and method"));
  const drafts = practiceScenarios("appointment-booking", "Bookings", p, {
    sameDayProcess: "STALE answer",
    dutyTeam: "STALE answer",
  });
  assert.ok(!JSON.stringify(drafts).includes("STALE"));
  // A job title alone must not introduce a clinical capability.
  assert.ok(!JSON.stringify(drafts).includes("Medication review"));
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
  assert.deepEqual(p.bookingConfig.sameDayPathway.selected, []);
  p.bookingConfig.sameDayPathway.selected.push("infection");
  assert.deepEqual(bookingFor(blankPractice()).sameDayPathway.selected, []);
  p.bookingConfig.sameDayPathway.selected = [];
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

test("team review uses shared roles rather than inferred individual defaults", () => {
  const p = blankPractice();
  const person = {
    id: "np",
    name: "Catherine",
    role: "Nurse Practitioner",
    clinics: "Legacy clinic",
    appointmentCapabilities: { defaults: roleCapabilities("Nurse Practitioner"), overrides: {} },
  };
  assert.match(teamReviewSummary(person, p), /needs review/);
  const role = suggestedRole(person.role);
  role.confirmed = true;
  role.selectedRequestIds = ["chest-infections"];
  p.roleRequests = { [role.roleId]: role };
  assert.match(teamReviewSummary(person, p), /1 shared requests selected/);
  assert.equal(person.clinics, "Legacy clinic");
});

import {
  suggestedRole,
  requestRoleId,
  rolesForRequest,
  requestsForStaff,
  routingForRequest,
} from "../src/lib/role-requests.ts";
test("role requests share stable identities and require local confirmation without changing legacy staff", () => {
  const p = blankPractice();
  const before = JSON.stringify(p.staff);
  const role = suggestedRole("Nurse Practitioner");
  assert.equal(requestRoleId(" nurse  practitioner "), role.roleId);
  assert.deepEqual(role.selectedRequestIds, []);
  role.selectedRequestIds = ["chest-infections"];
  p.roleRequests = { [role.roleId]: role };
  assert.equal(rolesForRequest(p, "chest-infections").length, 0);
  role.confirmed = true;
  assert.equal(
    rolesForRequest(JSON.parse(JSON.stringify(p)), "chest-infections")[0].roleId,
    role.roleId,
  );
  assert.equal(JSON.stringify(p.staff), before);
  assert.deepEqual(suggestedRole("Nurse Practitioner").selectedRequestIds, []);
});

test("routing joins a practice request to confirmed roles and all employees without copying scope", () => {
  const p = blankPractice();
  p.staff = [
    {
      id: "c",
      name: "Catherine",
      role: "Nurse Practitioner",
      clinics: "Old clinic",
      capabilities: ["Old note"],
    },
    { id: "s", name: "Sarah", role: " nurse practitioner ", clinics: "" },
    { id: "e", name: "Emily", role: "Nurse Practitioner", clinics: "" },
    { id: "gp", name: "Dr Example", role: "GP", clinics: "" },
    { id: "hca", name: "Jo", role: "HCA", clinics: "" },
    { id: "n", name: "Robin", role: "Practice Nurse", clinics: "" },
  ];
  const originalStaff = JSON.stringify(p.staff);
  p.roleRequests = {};
  for (const [label, request] of [
    ["Nurse Practitioner", "chest-infections"],
    ["GP", "chest-infections"],
    ["HCA", "blood-tests"],
    ["Practice Nurse", "blood-tests"],
  ]) {
    const role = suggestedRole(label);
    assert.deepEqual(role.selectedRequestIds, []);
    role.selectedRequestIds = [request];
    role.confirmed = true;
    p.roleRequests[role.roleId] = role;
  }
  assert.deepEqual(requestsForStaff(p, "c"), requestsForStaff(p, "s"));
  assert.equal(routingForRequest(p, "Chest infection").length, 2);
  assert.equal(routingForRequest(p, "chest-infections")[0].employees.length, 3);
  assert.deepEqual(
    routingForRequest(p, "Blood test").map((r) => r.role),
    ["HCA", "Practice Nurse"],
  );
  const np = p.roleRequests[requestRoleId("Nurse Practitioner")];
  np.selectedRequestIds = ["asthma-reviews"];
  assert.deepEqual(requestsForStaff(p, "e"), ["asthma-reviews"]);
  const serialized = JSON.parse(JSON.stringify(p));
  assert.deepEqual(
    routingForRequest(serialized, "Asthma review")[0].employees.map((s) => s.id),
    ["c", "s", "e"],
  );
  const drafts = practiceScenarios("first-week", "Reception", p, {});
  assert.ok(
    drafts.some(
      (s) => s.learningPoint.includes("Catherine") && s.learningPoint.includes("Asthma reviews"),
    ),
  );
  assert.ok(
    !drafts.some(
      (s) => s.learningPoint.includes("Old clinic") || s.learningPoint.includes("Old note"),
    ),
  );
  np.confirmed = false;
  assert.deepEqual(requestsForStaff(p, "c"), []);
  assert.equal(routingForRequest(p, "Asthma review").length, 0);
  assert.equal(JSON.stringify(p.staff), originalStaff);
});

import {
  withRequestOverride,
  resetRequestOverride,
  resetAllRequestOverrides,
  staffForRequest,
} from "../src/lib/role-requests.ts";
test("employee exceptions are sparse, inherit live defaults and support reset, custom requests and role changes", () => {
  const p = blankPractice();
  const role = suggestedRole("Nurse Practitioner");
  role.confirmed = true;
  role.selectedRequestIds = ["breast-examination", "chest-infections"];
  role.categories[1].requests.push({
    id: "custom:clinic",
    label: "Specialist diabetes clinic",
    custom: true,
  });
  p.roleRequests = { [role.roleId]: role };
  p.staff = [
    {
      id: "c",
      name: "Catherine",
      role: role.label,
      clinics: "Legacy information",
      notes: "Keep this note",
    },
    { id: "s", name: "Sarah", role: role.label, clinics: "" },
  ];
  assert.deepEqual(requestsForStaff(p, "c"), requestsForStaff(p, "s"));
  p.staff[0] = withRequestOverride(p.staff[0], role, "breast-examination", false);
  p.staff[0] = withRequestOverride(p.staff[0], role, "custom:clinic", true);
  assert.deepEqual(p.staff[0].requestOverrides, {
    [role.roleId]: { "breast-examination": false, "custom:clinic": true },
  });
  assert.equal(p.staff[1].requestOverrides, undefined);
  assert.deepEqual(
    staffForRequest(p, "Breast examination").map((s) => [s.employee.name, s.canHandle]),
    [
      ["Catherine", false],
      ["Sarah", true],
    ],
  );
  assert.equal(rolesForRequest(p, "custom:clinic").length, 0);
  assert.deepEqual(
    routingForRequest(p, "Specialist diabetes clinic")[0].employees.map((s) => s.name),
    ["Catherine"],
  );
  assert.equal(routingForRequest(p, "Specialist diabetes clinic")[0].practiceDefault, false);
  role.selectedRequestIds = ["breast-examination", "asthma-reviews"];
  for (const id of ["c", "s"]) {
    assert.ok(!requestsForStaff(p, id).includes("chest-infections"));
    assert.ok(requestsForStaff(p, id).includes("asthma-reviews"));
  }
  // Even if a role edit makes the exception equal to the default, retain explicit intent.
  role.selectedRequestIds = [];
  assert.equal(p.staff[0].requestOverrides?.[role.roleId]["breast-examination"], false);
  role.selectedRequestIds = ["breast-examination"];
  assert.ok(!requestsForStaff(p, "c").includes("breast-examination"));
  p.staff[0] = resetRequestOverride(p.staff[0], role.roleId, "breast-examination");
  assert.ok(requestsForStaff(p, "c").includes("breast-examination"));
  assert.deepEqual(p.staff[0].requestOverrides, { [role.roleId]: { "custom:clinic": true } });
  const saved = JSON.parse(JSON.stringify(p));
  assert.deepEqual(requestsForStaff(saved, "c"), requestsForStaff(p, "c"));
  const scenarios = practiceScenarios("first-week", "Reception", p, {});
  assert.ok(
    scenarios.some(
      (s) =>
        s.learningPoint.includes("Catherine") &&
        s.learningPoint.includes("Specialist diabetes clinic"),
    ),
  );
  assert.ok(
    !scenarios.some(
      (s) =>
        s.learningPoint.includes("Sarah") && s.learningPoint.includes("Specialist diabetes clinic"),
    ),
  );
  p.staff[0].role = "HCA";
  assert.deepEqual(requestsForStaff(p, "c"), []);
  p.staff[0].role = role.label;
  assert.ok(requestsForStaff(p, "c").includes("custom:clinic"));
  role.categories[1].requests = role.categories[1].requests.filter((r) => r.id !== "custom:clinic");
  assert.ok(!requestsForStaff(p, "c").includes("custom:clinic"));
  assert.equal(p.staff[0].requestOverrides?.[role.roleId]["custom:clinic"], true);
  p.staff[0] = resetAllRequestOverrides(p.staff[0]);
  assert.equal(p.staff[0].requestOverrides, undefined);
  assert.deepEqual(requestsForStaff(p, "c"), requestsForStaff(p, "s"));
  assert.equal(p.staff[0].clinics, "Legacy information");
  assert.equal(p.staff[0].notes, "Keep this note");
  assert.equal(
    withRequestOverride(p.staff[0], role, "breast-examination", true).requestOverrides,
    undefined,
  );
});

import {
  safeguardingFor,
  safeguardingNames,
  safeguardingMissing,
} from "../src/lib/practice-config.ts";
import { setupSteps, setupMissing } from "../src/lib/practice-setup.ts";
import { practiceRoles } from "../src/lib/role-requests.ts";
test("four steps retain legacy roles, exceptions and safeguarding contacts without guessing names", () => {
  const p = blankPractice();
  assert.deepEqual(setupSteps, ["Practice", "Roles", "Team", "Review"]);
  p.safeguardingRoute = {
    contact: { kind: "role", role: "Duty GP" },
    method: { id: "phone", other: "123" },
    instruction: "Preserve this instruction",
  };
  const old = JSON.stringify(p);
  assert.deepEqual(safeguardingFor(p).leadIds, []);
  assert.ok(safeguardingMissing(p).some((m) => m.includes("named")));
  assert.equal(setupMissing(p).length, 4);
  assert.ok(practiceRoles(p).some((r) => r.roleId === requestRoleId(p.staff[0].role)));
  assert.equal(JSON.stringify(p), old);
  p.safeguardingRoute.contact = { kind: "staff", staffId: p.staff[0].id };
  assert.deepEqual(safeguardingFor(p).leadIds, [p.staff[0].id]);
  p.safeguardingRoute = { ...safeguardingFor(p), leadIds: [p.staff[0].id] };
  p.staff[0].name = "Sarah Renamed";
  p.staff[0].role = "Practice Manager";
  assert.deepEqual(safeguardingNames(p), ["Sarah Renamed — Practice Manager"]);
  assert.ok(practiceSummary(p).localSafeguarding.includes("Sarah Renamed"));
  p.staff = [];
  assert.ok(safeguardingMissing(p).some((m) => m.includes("no longer available")));
  assert.ok(safeguardingNames(p)[0].includes("Needs review"));
  assert.equal(p.safeguardingRoute.instruction, "Preserve this instruction");
});
test("removing an unused practice role archives its categories and selections for restoration", () => {
  const p = blankPractice();
  const role = suggestedRole("Custom local role");
  role.confirmed = true;
  role.selectedRequestIds = ["blood-tests"];
  p.roleRequests = { [role.roleId]: role };
  const before = JSON.stringify(role.categories);
  role.archived = true;
  assert.ok(!practiceRoles(p).some((r) => r.roleId === role.roleId));
  assert.deepEqual(rolesForRequest(p, "blood-tests"), []);
  role.archived = false;
  assert.ok(practiceRoles(p).some((r) => r.roleId === role.roleId));
  assert.equal(JSON.stringify(role.categories), before);
  assert.deepEqual(role.selectedRequestIds, ["blood-tests"]);
});

import { roleTemplates, roleTemplateForName } from "../src/lib/role-templates.ts";
import {
  initialiseRoleFromTemplate,
  roleConfigurationStatus,
  roleToAdd,
  matchesRoleTemplate,
  selectedRequests,
} from "../src/lib/role-requests.ts";
test("common role library has stable distinct identities and never promotes placeholder clinical scope", () => {
  assert.equal(new Set(roleTemplates.map((t) => t.id)).size, roleTemplates.length);
  assert.notEqual(roleTemplateForName("ANP")?.id, roleTemplateForName("Nurse Practitioner")?.id);
  assert.equal(roleTemplateForName("GP")?.id, "gp");
  for (const template of roleTemplates) {
    const role = initialiseRoleFromTemplate(template);
    assert.equal(role.template?.id, template.id);
    assert.equal(role.confirmed, false);
    assert.deepEqual(selectedRequests(role), []);
    if (template.suggestions.status === "awaiting-review") {
      assert.deepEqual(role.selectedRequestIds, []);
      assert.equal(roleConfigurationStatus(role), "Needs review");
    }
  }
});
test("reviewed templates create independent practice copies; updates and restores never overwrite local choices", () => {
  // Synthetic test fixture: this is not a released clinical selection dataset.
  const template = structuredClone(roleTemplates[0]);
  template.suggestions = { status: "reviewed", selectedRequestIds: ["blood-tests"] };
  const role = initialiseRoleFromTemplate(template);
  assert.deepEqual(role.selectedRequestIds, ["blood-tests"]);
  assert.equal(roleConfigurationStatus(role), "Suggested setup ready");
  assert.deepEqual(selectedRequests(role), []); // Must still be confirmed locally.
  const other = initialiseRoleFromTemplate(template);
  role.categories[0].requests[0].label = "Local wording";
  role.selectedRequestIds.push("ecg");
  assert.deepEqual(other.selectedRequestIds, ["blood-tests"]);
  assert.notEqual(other.categories[0].requests[0].label, "Local wording");
  const p = blankPractice();
  role.confirmed = true;
  role.archived = true;
  p.roleRequests = { [role.roleId]: role };
  template.version = 2;
  template.label = "Updated display name";
  template.suggestions.selectedRequestIds = [];
  const restored = roleToAdd(p, "GP", template);
  assert.deepEqual(restored, { ...role, archived: false });
  assert.equal(restored.template?.version, 1);
  assert.equal(roleConfigurationStatus(restored), "Configured");
  assert.ok(matchesRoleTemplate(restored, template));
  assert.equal(
    roleConfigurationStatus({ ...restored, confirmed: false, suggestionsEdited: true }),
    "Needs review",
  );
  template.suggestions.selectedRequestIds = ["invalid-request-id"];
  assert.throws(() => initialiseRoleFromTemplate(template), /Unknown request ID/);
});
test("adding library roles preserves older custom data, aliases and role-scoped employee overrides", () => {
  const p = blankPractice();
  const old = suggestedRole("GP");
  old.confirmed = true;
  old.categories.push({
    id: "local-category",
    label: "Local",
    custom: true,
    requests: [{ id: "local-request", label: "Local request", custom: true }],
  });
  old.selectedRequestIds = ["local-request"];
  p.roleRequests = { [old.roleId]: old };
  p.staff[0].role = "GP";
  p.staff[0].requestOverrides = { [old.roleId]: { "local-request": false } };
  const before = JSON.stringify(p);
  assert.deepEqual(roleToAdd(p, "Doctor"), { ...old, archived: false });
  assert.deepEqual(requestsForStaff(p, p.staff[0].id), []);
  assert.equal(JSON.stringify(p), before);
  const custom = roleToAdd(p, "Our local role");
  assert.equal(custom.template, undefined);
});

test("previous navigation retains immutable committed MCQ and ordering answers through reload and submission", () => {
  let s = startSession(module, assignment, "navigation");
  assert.equal(previousSession(s).index, 0);
  s = advanceSession(answerSession(s, 1), module.title);
  s = answerSession(s, ["Record", "Book", "Check"]);
  s = previousSession(JSON.parse(JSON.stringify(s)));
  assert.equal(s.index, 0);
  assert.equal(s.answers.find((a) => a.scenarioId === "q1")?.value, 1);
  s = answerSession(s, 0);
  s = answerSession(s, 1);
  assert.equal(s.answers.filter((a) => a.scenarioId === "q1").length, 1);
  s = advanceSession(s, module.title);
  assert.deepEqual(s.answers.find((a) => a.scenarioId === "q3")?.value, [
    "Record",
    "Book",
    "Check",
  ]);
  s = advanceSession(answerSession(s, order.kind === "order" ? order.steps : []), module.title);
  s = submitSession(s, module.title);
  assert.equal(s.result?.correct, 1);
  assert.equal(s.result?.total, 2);
  assert.equal(previousSession(s), s);
  assert.throws(() => answerSession(s, 0), /complete/);
});
