import { applications, explicitRules } from "../src/lib/scenario-applications.ts";
import { practiceScenarios } from "../src/lib/practice-scenarios.ts";
import assert from "node:assert/strict";
import test from "node:test";
import type { PracticeData } from "../src/lib/store.ts";
import {
  fieldsForTopic,
  questionOptions,
  questionNeedsDetails,
  extraRuleLabels,
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

test("all ten topics have their own configuration and empty information never produces invented guidance", () => {
  assert.equal(Object.keys(topicFields).length, 10);
  assert.ok(topicFields.custom.length);
  for (const topic of Object.keys(topicFields)) {
    assert.ok(fieldsForTopic(topic, empty()).length);
    assert.deepEqual(configuredScenarios(topic, topic, empty(), defaultModuleSettings()), []);
    const p = empty();
    p.staff = [{ id: "s", name: "Sam", role: "Reception", clinics: "" }];
    const settings = defaultModuleSettings();
    for (const f of fieldsForTopic(topic, p))
      settings.answers[f.key] = optionsForField(f, p)[0] ?? "";
    if (topic === "custom") settings.extra = "Open the confirmed local task form.";
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
  for (const trainingLevel of ["learn", "apply"] as const) {
    for (const difficulty of ["easy", "intermediate", "advanced"] as const) {
      const questions = generateConfiguredModule("vaccines", "Vaccines", p, {
        ...settings,
        trainingLevel,
        difficulty,
      });
      const route = questions.find((s) => s.localRoleRequestId === "vaccinations");
      assert.ok(route?.kind === "mcq");
      assert.match(
        route.options[route.correctIndex],
        trainingLevel === "learn" ? /Nurse/ : /Robin/,
      );
      if (trainingLevel === "learn")
        assert.doesNotMatch(route.options[route.correctIndex], /Robin/);
      assert.doesNotMatch(route.options[route.correctIndex], /Sam/);
      const exception = questions.find((s) => s.title.startsWith("Responsibilities For Sam"));
      assert.ok(exception?.kind === "mcq");
      assert.match(exception.options[exception.correctIndex], /excluded/);
      const added = generateConfiguredModule("fit-notes", "Fit notes", p, {
        ...settings,
        trainingLevel,
        difficulty,
      }).find((s) => !!s.localRoleRequestId);
      assert.ok(added?.kind === "mcq");
      assert.match(added.options[added.correctIndex], /Sam/);
    }
  }
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
    assert.equal(
      primary.length,
      Math.min(count, pool.length + Math.min(Math.round(count * 0.3), 10)),
    );
    assert.equal(generated.length, primary.length);
    assert.equal(new Set(primary.map((s) => s.patientQuote)).size, primary.length);
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
    (s) => s.kind === "mcq" && s.correctIndices,
  );
  assert.ok(question?.kind === "mcq" && question.correctIndices);
  assert.deepEqual(
    question.correctIndices.map((i) => question.options[i]),
    ["Submit the request through the NHS App.", "Submit the request by telephone."],
  );
  assert.ok(
    question.options
      .filter((_, i) => !question.correctIndices!.includes(i))
      .every((text) => !/telephone|NHS App/.test(text)),
  );
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
  assert.equal(main.length, 2);
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

test("all nine defaults use concrete choices and retain a topic-specific local rule entry", () => {
  const p = empty();
  for (const [topic, fields] of Object.entries(topicFields)) {
    assert.ok(extraRuleLabels[topic]);
    for (const f of fieldsForTopic(topic, p)) {
      assert.ok(f.addLabel);
      assert.ok(
        !/saved|recorded|booking team|prescription team|vaccination team|results team|responsible team/i.test(
          f.label + f.options.join(" "),
        ),
        `${topic}: ${f.key}`,
      );
    }
    const settings = defaultModuleSettings();
    settings.extra =
      "When a request arrives through our local service -> contact Alex using the internal phone";
    assert.ok(moduleFacts(topic, p, settings).some((f) => f.rule === settings.extra));
    assert.equal(
      fields.filter((f) => f.legacyOnly).length,
      topic === "appointment-booking" ? 2 : 0,
    );
  }
});

test("advice requires an actual contact and resolves renamed people without copying names", () => {
  const p = empty();
  const f = topicFields["appointment-booking"].find((f) => f.key === "unavailable")!;
  let settings = selectAnswer(
    defaultModuleSettings(),
    f,
    "Ask a specified person or role for advice",
  );
  assert.ok(questionNeedsDetails(f, settings, p));
  assert.deepEqual(moduleFacts("appointment-booking", p, settings), []);
  p.staff = [{ id: "alex", name: "Alex", role: "GP", clinics: "" }];
  settings.answerDetails = {
    unavailable: { contact: "staff:alex", instruction: "Call the internal phone." },
  };
  settings = JSON.parse(JSON.stringify(settings));
  assert.ok(!questionNeedsDetails(f, settings, p));
  assert.ok(
    moduleFacts("appointment-booking", p, settings).some(
      (f) => f.rule.includes("Alex — GP") && f.rule.includes("internal phone"),
    ),
  );
  p.staff[0].name = "Alex Smith";
  assert.ok(
    moduleFacts("appointment-booking", p, settings).some((f) => f.rule.includes("Alex Smith")),
  );
  p.staff = [];
  assert.ok(questionNeedsDetails(f, settings, p));
  assert.deepEqual(moduleFacts("appointment-booking", p, settings), []);
});

test("an unspecified local process never becomes guidance and unselected details stay inactive", () => {
  const p = empty();
  const f = topicFields.vaccines.find((f) => f.key === "clinicFull")!;
  let settings = selectAnswer(
    defaultModuleSettings(),
    f,
    "Follow another practice-specific process",
  );
  assert.ok(questionNeedsDetails(f, settings, p));
  assert.deepEqual(moduleFacts("vaccines", p, settings), []);
  settings.answerDetails = { clinicFull: { instruction: "Ask Jo to arrange a callback." } };
  assert.equal(moduleFacts("vaccines", p, settings)[0].rule, "Ask Jo to arrange a callback.");
  settings = selectAnswer(settings, f, EXCLUDE_QUESTION);
  assert.deepEqual(moduleFacts("vaccines", p, settings), []);
});

test("booking escalation is offered only when configured and uses the actual practice route", () => {
  const p = empty();
  const f = topicFields["appointment-booking"].find((f) => f.key === "unavailable")!;
  const settings = defaultModuleSettings();
  assert.ok(
    !questionOptions(f, p, settings).some((o) => o.value === "practice:booking-escalation"),
  );
  p.dutyContact = "Contact Alex via extension 123";
  assert.ok(
    questionOptions(f, p, settings).some(
      (o) =>
        o.value === "practice:booking-escalation" && o.label.includes("Alex via extension 123"),
    ),
  );
});

test("retired questions and previous answers survive reload without becoming new suggestions", () => {
  const p = empty();
  const f = topicFields["appointment-booking"].find((f) => f.key === "appointmentMode")!;
  const settings = defaultModuleSettings();
  assert.ok(!fieldsForTopic("appointment-booking", p, settings).includes(f));
  settings.answers.appointmentMode =
    "Ask the responsible clinician or team to confirm the appointment mode";
  const restored = JSON.parse(JSON.stringify(settings));
  assert.ok(fieldsForTopic("appointment-booking", p, restored).includes(f));
  assert.ok(
    questionOptions(f, p, restored).some((o) => o.value === settings.answers.appointmentMode),
  );
  assert.equal(restored.answers.appointmentMode, settings.answers.appointmentMode);
  assert.deepEqual(questionOptions(f, p, defaultModuleSettings()), []);
  const preference = topicFields["appointment-booking"].find((f) => f.key === "preference")!;
  restored.answers.preference = "Send the preference to the booking team for review";
  assert.ok(
    questionOptions(preference, p, restored).some((o) => o.value === restored.answers.preference),
  );
  assert.ok(
    !questionOptions(preference, p, defaultModuleSettings()).some((o) =>
      /booking team/.test(o.label),
    ),
  );
});

test("explicit same-day headings generate focused actions in both generation paths", () => {
  const p = empty();
  p.rolePolicies.gpsSameDay =
    "Same-day with a GP: safeguarding concerns, mental health crisis, chest pain (after 999), suspected sepsis, new severe headache, under-5 illness. When unsure — duty triage first.";
  assert.equal(explicitRules(p.rolePolicies.gpsSameDay).length, 7);
  for (const scenarios of [
    configuredScenarios("appointment-booking", "Booking", p, defaultModuleSettings()),
    practiceScenarios("appointment-booking", "Booking", p, {}),
  ]) {
    const child = scenarios.find((s) => s.patientQuote.includes("3-year-old"));
    assert.ok(child?.kind === "mcq");
    assert.equal(child.options[child.correctIndex], "Arrange a same-day GP appointment");
    assert.ok(
      !JSON.stringify(scenarios.map((s) => [s.patientQuote, s.question])).match(
        /Which response follows|recorded guidance|saved responsibilities/,
      ),
    );
    assert.ok(!child.options.some((o) => o.includes("safeguarding")));
    assert.ok(scenarios.every((s) => s.status === "draft"));
    assert.ok(!JSON.stringify(scenarios).includes("chest pain (after 999)"));
  }
});

test("grouped bullets preserve explicit relationships; ambiguous free text is not decomposed", () => {
  assert.equal(
    explicitRules(
      "Same-day GP:\n- under-5 illness\n- suspected sepsis\nWhen unsure: duty triage first",
    ).length,
    3,
  );
  for (const rule of [
    "Same-day GP: headaches, unless a clinician advises otherwise",
    "Consider headaches and fever together before deciding",
    "Same-day GP: cough or fever",
    "Same-day GP: headache. Check with someone first.",
  ]) {
    assert.deepEqual(explicitRules(rule), []);
    assert.equal(
      applications({ label: "Rule", rule, situation: "A caller needs help." })[0].rule,
      rule,
    );
  }
});

test("atomised labels become natural presentations without changing the configured action", () => {
  const rule =
    "mental health crisis -> same-day GP; chest pain (after 999) -> same-day GP; under-5 illness -> same-day GP; when unsure -> duty triage first";
  const before = rule;
  const generated = applications({ label: "Same-day requests", rule, situation: "" });
  assert.equal(generated.length, 3);
  const distress = generated.find((s) => s.situation.includes("struggling to cope"))!;
  const child = generated.find((s) => s.situation.includes("3-year-old"))!;
  assert.equal(distress.rule, "Arrange a same-day GP appointment");
  assert.equal(distress.label, "A distressed caller needs help");
  assert.ok(
    !generated.some((s) =>
      /describes the reason|after 999|Same-day requests:/.test(s.situation + s.label),
    ),
  );
  assert.ok(distress.alternatives?.includes("Contact duty triage first"));
  assert.notDeepEqual(distress.alternatives, child.alternatives);
  assert.ok(generated.every((s) => !s.alternatives?.includes(s.rule)));
  assert.equal(rule, before);
  for (const condition of [
    "chest pain (after 999)",
    "mental health crisis after assessment",
    "suspected sepsis",
    "unknown local shorthand",
  ]) {
    assert.deepEqual(
      applications({ label: "Requests", rule: `${condition} -> same-day GP`, situation: "" }),
      [],
    );
  }
});

test("structured single conditions follow the same conservative presentation rules", () => {
  assert.deepEqual(
    applications({
      label: "Same-day request",
      condition: "chest pain (after 999)",
      rule: "Reception books directly",
      situation: "",
    }),
    [],
  );
  const generated = applications({
    label: "Same-day request",
    condition: "mental health crisis",
    rule: "Clinical triage is required before booking",
    situation: "",
  });
  assert.equal(generated[0].rule, "Send the request for clinical triage before booking");
  assert.ok(generated[0].situation.includes("struggling to cope"));
});
