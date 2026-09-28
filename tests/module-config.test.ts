import assert from "node:assert/strict";
import test from "node:test";
import type { PracticeData } from "../src/lib/store.ts";
import {
  fieldsForTopic,
  selectedValues,
  selectAnswer,
  EXCLUDE_QUESTION,
  topicFields,
  moduleFacts,
  configuredScenarios,
  generateConfiguredModule,
  defaultModuleSettings,
  optionsForField,
  regenerateConfiguredScenario,
  reviseConfiguredScenario,
} from "../src/lib/module-config.ts";
import { suggestedRole, requestRoleId } from "../src/lib/role-requests.ts";
const empty = (): PracticeData => ({
  practiceName: "Test Practice",
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
  staff: [],
  rolePolicies: {
    gpsSameDay: "",
    gpsRoutine: "",
    npsSameDay: "",
    npsRoutine: "",
    nursesSameDay: "",
    nursesRoutine: "",
    hcasSameDay: "",
    hcasRoutine: "",
    pharmacistsSameDay: "",
    pharmacistsRoutine: "",
    neverPromise: "",
    phrasesUse: "",
    phrasesAvoid: "",
  },
});

test("all nine topics have their own configuration and empty information never produces invented guidance", () => {
  assert.equal(Object.keys(topicFields).length, 9);
  assert.equal(topicFields.custom, undefined);
  for (const topic of Object.keys(topicFields)) {
    assert.ok(fieldsForTopic(topic, empty()).length);
    assert.deepEqual(configuredScenarios(topic, topic, empty(), defaultModuleSettings()), []);
    const p = empty();
    p.staff = [{ id: "s", name: "Sam", role: "Reception", clinics: "" }];
    const settings = defaultModuleSettings();
    for (const f of fieldsForTopic(topic, p))
      settings.answers[f.key] = optionsForField(f, p)[0] ?? "";
    assert.ok(configuredScenarios(topic, topic, p, settings).length > 0, topic);
  }
});

test("saved information hides duplicate questions and supersedes stale module answers", () => {
  const p = empty();
  p.localConfidentiality = "Use the saved identity protocol";
  const settings = defaultModuleSettings();
  settings.answers.identity = "Full name and date of birth";
  assert.ok(!fieldsForTopic("results", p).some((f) => f.key === "identity"));
  const facts = moduleFacts("results", p, settings);
  assert.ok(facts.some((f) => f.rule === p.localConfidentiality));
  assert.ok(!JSON.stringify(facts).includes("Full name and date of birth"));
  assert.ok(!JSON.stringify(moduleFacts("vaccines", p, settings)).includes(p.localConfidentiality));
});

test("confirmed responsibilities include individual additions, exclude removals and ignore unconfirmed roles", () => {
  const p = empty(),
    role = suggestedRole("Nurse");
  role.confirmed = true;
  role.selectedRequestIds = ["vaccinations"];
  p.roleRequests = { [role.roleId]: role };
  p.staff = [
    {
      id: "s",
      name: "Sam",
      role: "Nurse",
      clinics: "Unconfirmed clinic",
      requestOverrides: { [role.roleId]: { vaccinations: false, "fit-note-requests": true } },
    },
    { id: "r", name: "Robin", role: "Nurse", clinics: "" },
  ];
  const settings = defaultModuleSettings();
  const vaccines = configuredScenarios("vaccines", "Vaccines", p, settings);
  const routing = vaccines.find((s) => s.title === "Routing: Vaccinations");
  assert.ok(routing?.kind === "mcq");
  assert.ok(routing.options[routing.correctIndex].includes("Robin"));
  assert.ok(!routing.options[routing.correctIndex].includes("Sam"));
  assert.ok(vaccines.some((s) => s.title.startsWith("Individual exception: Sam")));
  assert.ok(
    configuredScenarios("fit-notes", "Fit notes", p, settings).some((s) =>
      s.title.startsWith("Routing:"),
    ),
  );
  role.confirmed = false;
  assert.deepEqual(configuredScenarios("vaccines", "Vaccines", p, settings), []);
});

test("length limits distinct primary scenarios, preserves recovery links and reports a finite pool without padding", () => {
  const p = empty(),
    role = suggestedRole("GP");
  role.confirmed = true;
  role.selectedRequestIds = role.categories.flatMap((c) => c.requests.map((r) => r.id));
  p.roleRequests = { [role.roleId]: role };
  p.staff = [{ id: "g", name: "Gita", role: "GP", clinics: "" }];
  const counts = [6, 12, 22, 3, 100];
  for (const count of counts) {
    const settings = { ...defaultModuleSettings(), count };
    const pool = configuredScenarios("appointment-booking", "Booking", p, settings);
    const generated = generateConfiguredModule("appointment-booking", "Booking", p, settings);
    const primary = generated.filter((s) => !s.followUpFor);
    assert.equal(primary.length, Math.min(count, pool.length));
    assert.equal(new Set(primary.map((s) => s.title)).size, primary.length);
    for (const s of primary) {
      const follow = generated.find((f) => f.followUpFor === s.id);
      if (follow) {
        assert.ok(follow.kind === "mcq" && s.kind === "mcq");
        assert.equal(follow.options[follow.correctIndex], s.options[s.correctIndex]);
      }
    }
  }
});

test("deleted contacts and cross-topic answers are excluded; settings survive JSON persistence", () => {
  const p = empty(),
    settings = defaultModuleSettings();
  settings.answers.buddy = "staff:removed";
  settings.answers.chestPain = "Invented rule";
  settings.extra = "Local orientation procedure";
  const restored = JSON.parse(JSON.stringify(settings));
  const scenarios = configuredScenarios("first-week", "First week", p, restored);
  assert.equal(scenarios.length, 1);
  assert.ok(!JSON.stringify(scenarios).includes("removed"));
  assert.ok(!JSON.stringify(scenarios).includes("Invented rule"));
  assert.ok(JSON.stringify(scenarios).includes(settings.extra));
});

test("regeneration retains settings, avoids duplicates and omits unsupported recovery questions", () => {
  const p = empty();
  p.localConfidentiality = "Check the recorded consent";
  p.dutyContact = "Duty team via internal message";
  const settings = defaultModuleSettings();
  settings.answers.release = "All result enquiries go to the reviewing clinician";
  const scenarios = generateConfiguredModule("results", "Results", p, settings);
  const module = {
    id: "m",
    type: "Results",
    title: "Results",
    topicKey: "results",
    settings,
    scenarios,
    published: true,
    createdAt: 1,
  };
  const primary = scenarios.find((s) => !s.followUpFor)!;
  const regenerated = regenerateConfiguredScenario(module, primary.id, p);
  assert.equal(regenerated.settings, settings);
  assert.equal(regenerated.needsReview, true);
  const main = regenerated.scenarios.filter((s) => !s.followUpFor);
  assert.equal(new Set(main.map((s) => s.title)).size, main.length);
  assert.ok(!regenerated.scenarios.some((s) => s.followUpFor));
  assert.ok(primary.kind === "mcq");
  const edited = { ...primary, correctIndex: 2, status: "approved" as const };
  const revised = reviseConfiguredScenario(regenerated, edited);
  assert.equal(revised.scenarios.find((s) => s.id === primary.id)?.status, "draft");
});

test("custom options only become guidance when explicitly selected, and cannot leak between questions", () => {
  const p = empty();
  for (const [topic, fields] of Object.entries(topicFields)) {
    const f = fields.find((f) => !f.showWhen)!;
    let settings = defaultModuleSettings();
    settings.customOptions = {
      [f.key]: [
        { id: "custom:local", label: "Use the local review inbox" },
        { id: "custom:unused", label: "An unselected local alternative" },
      ],
    };
    assert.deepEqual(moduleFacts(topic, p, settings), []);
    settings = selectAnswer(settings, f, "custom:local");
    settings = JSON.parse(JSON.stringify(settings));
    const generated = configuredScenarios(topic, topic, p, settings);
    assert.ok(JSON.stringify(generated).includes("Use the local review inbox"), topic);
    assert.ok(!JSON.stringify(generated).includes("An unselected local alternative"), topic);
    const another = fields.find((other) => !other.showWhen && other.key !== f.key)!;
    settings = selectAnswer(settings, f, EXCLUDE_QUESTION);
    settings = selectAnswer(settings, another, "custom:local");
    assert.deepEqual(moduleFacts(topic, p, settings), []);
  }
});

test("multi-select preserves legacy answers, has exclusive exclusion and never marks a selected route as incorrect", () => {
  const p = empty();
  const f = topicFields.prescriptions.find((f) => f.key === "acute")!;
  let settings = defaultModuleSettings();
  settings.answers.acute = "NHS App";
  assert.deepEqual(selectedValues(f, settings), ["NHS App"]);
  settings = selectAnswer(settings, f, "Telephone");
  const question = configuredScenarios("prescriptions", "Prescriptions", p, settings).find(
    (s) => s.title === `${f.label}: NHS App`,
  )!;
  assert.ok(question.kind === "mcq");
  assert.equal(
    question.options[question.correctIndex],
    "Explain how to submit the request using NHS App",
  );
  assert.ok(!question.options.slice(1).includes("Telephone"));
  settings = selectAnswer(settings, f, EXCLUDE_QUESTION);
  assert.deepEqual(moduleFacts("prescriptions", p, settings), []);
  settings = selectAnswer(settings, f, "At reception");
  assert.deepEqual(selectedValues(f, settings), ["At reception"]);
  settings = selectAnswer(settings, f, "At reception", false);
  assert.deepEqual(selectedValues(f, settings), []);
  assert.deepEqual(moduleFacts("prescriptions", p, settings), []);
});

test("conditional questions and retained answers are active only for the selected or saved branch", () => {
  const p = empty();
  let settings = defaultModuleSettings();
  const parent = topicFields["appointment-booking"].find((f) => f.key === "sameDay")!;
  const child = topicFields["appointment-booking"].find((f) => f.key === "sameDayRoutes")!;
  settings = selectAnswer(settings, child, "Clinical triage before booking");
  assert.ok(!fieldsForTopic("appointment-booking", p, settings).includes(child));
  assert.deepEqual(moduleFacts("appointment-booking", p, settings), []);
  settings = selectAnswer(settings, parent, "It depends on the request");
  assert.ok(fieldsForTopic("appointment-booking", p, settings).includes(child));
  assert.ok(
    moduleFacts("appointment-booking", p, settings).some(
      (f) => f.rule === "Clinical triage before booking",
    ),
  );
  settings = selectAnswer(settings, parent, EXCLUDE_QUESTION);
  assert.deepEqual(moduleFacts("appointment-booking", p, settings), []);
  p.rolePolicies.gpsSameDay = "Use the saved same-day booking procedure";
  assert.ok(!fieldsForTopic("appointment-booking", p, settings).includes(parent));
  assert.ok(!fieldsForTopic("appointment-booking", p, settings).includes(child));
  assert.ok(
    moduleFacts("appointment-booking", p, settings).some(
      (f) => f.rule === p.rolePolicies.gpsSameDay,
    ),
  );
});

test("a selected custom answer is never also offered as an incorrect alternative", () => {
  const p = empty();
  const settings = defaultModuleSettings();
  settings.customOptions = {
    chasing: [
      {
        id: "custom:collision",
        label: "Promise that the prescription will be issued immediately.",
      },
    ],
  };
  settings.answers.chasing = "custom:collision";
  const scenario = configuredScenarios("prescriptions", "Prescriptions", p, settings)[0];
  assert.ok(scenario.kind === "mcq");
  assert.equal(scenario.options.length, 4);
  assert.equal(new Set(scenario.options).size, 4);
  assert.equal(scenario.options[scenario.correctIndex], settings.customOptions.chasing[0].label);
});

test("explicit rule lists become focused applications with distinct supported follow-ups", () => {
  const p = empty();
  p.sameDayReasons = [
    "under-5 illness -> same-day GP; suspected sepsis -> same-day GP; when unsure -> duty triage",
  ];
  const scenarios = generateConfiguredModule("urgent", "Urgent", p, defaultModuleSettings());
  const main = scenarios.filter((s) => !s.followUpFor);
  assert.equal(main.length, 3);
  for (const scenario of main) {
    assert.ok(scenario.kind === "mcq");
    assert.ok(!scenario.options[scenario.correctIndex].includes(";"));
    assert.ok(
      !/recorded|saved|according to your practice/i.test(scenario.patientQuote + scenario.question),
    );
    assert.ok(!/booking team|promise a same-day|any free slot/i.test(JSON.stringify(scenario)));
  }
  const child = main.find((s) => s.patientQuote.includes("3-year-old"))!;
  const follow = scenarios.find((s) => s.followUpFor === child.id)!;
  assert.ok(follow.patientQuote.includes("comes to reception"));
  assert.ok(child.kind === "mcq" && follow.kind === "mcq");
  assert.equal(child.options[child.correctIndex], follow.options[follow.correctIndex]);
  assert.equal(scenarios.filter((s) => s.followUpFor).length, 1);
  const module = {
    id: "m",
    type: "Urgent",
    title: "Urgent",
    topicKey: "urgent",
    settings: defaultModuleSettings(),
    scenarios,
    published: false,
    createdAt: 1,
  };
  const refreshed = regenerateConfiguredScenario(module, follow.id, p);
  assert.equal(
    refreshed.scenarios.find((s) => s.id === follow.id)?.patientQuote,
    follow.patientQuote,
  );
  const revised = reviseConfiguredScenario(module, {
    ...child,
    options: ["Manager changed this rule", ...child.options.slice(1)],
    correctIndex: 0,
  });
  assert.ok(!revised.scenarios.some((s) => s.followUpFor === child.id));
});

test("unselected setup choices cannot invent local teams in distractors", () => {
  const settings = defaultModuleSettings();
  settings.answers.preference = topicFields["appointment-booking"].find(
    (f) => f.key === "preference",
  )!.options[0];
  const scenarios = configuredScenarios("appointment-booking", "Booking", empty(), settings);
  assert.ok(scenarios.length);
  assert.ok(!JSON.stringify(scenarios).includes("booking team"));
});

test("structured same-day criteria stay separate and use the configured process", () => {
  const p = empty();
  p.bookingConfig = {
    version: 1,
    sameDayPathway: { selected: ["unwell-child", "urinary"], custom: [], instruction: "" },
    sameDayProcess: { id: "triage", other: "" },
    sameDayInstruction: "",
    sendUncertainToDutyClinician: false,
    escalation: {
      contact: { kind: "unconfirmed" },
      method: { id: "", other: "" },
      instruction: "",
    },
    routineProcess: { id: "", other: "" },
    routineInstruction: "",
  };
  p.sameDayReasons = ["Stale legacy criteria"];
  const settings = defaultModuleSettings();
  settings.answers.sameDay = "Stale direct booking";
  const scenarios = configuredScenarios("urgent", "Urgent", p, settings);
  assert.equal(scenarios.length, 2);
  for (const s of scenarios) {
    assert.ok(s.kind === "mcq");
    assert.equal(s.options[s.correctIndex], "Send the request for clinical triage before booking");
  }
  assert.ok(!JSON.stringify(scenarios).includes("Stale"));
});
