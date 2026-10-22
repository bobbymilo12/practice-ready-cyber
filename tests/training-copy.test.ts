import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import { applications } from "../src/lib/scenario-applications.ts";
import {
  hasFinishedCopy,
  submissionChannel,
  contactRouteCopy,
  contactChoicesCopy,
} from "../src/lib/training-copy.ts";
import {
  defaultModuleSettings,
  generateConfiguredModule,
  topicFields,
  configuredScenarios,
  regenerateConfiguredScenario,
} from "../src/lib/module-config.ts";
import { suggestedRole } from "../src/lib/role-requests.ts";
import { empty } from "./fixtures/role-matching.ts";
import { prescriptionsFor, emptyContactRoute, bookingFor } from "../src/lib/practice-config.ts";

function samplePractice() {
  // Fictional, non-clinical audit data; never inserted into a real practice.
  const p = empty();
  const doctor = suggestedRole("Doctor");
  doctor.confirmed = true;
  doctor.selectedRequestIds = doctor.categories.flatMap((c) => c.requests.map((r) => r.id));
  p.roleRequests = { [doctor.roleId]: doctor };
  p.staff = [{ id: "alex", name: "Dr Alex", role: "Doctor", clinics: "" }];
  p.prescriptionConfig = {
    ...prescriptionsFor(p),
    methods: ["telephone", "nhs-app", "website", "paper", "pharmacy"],
    orderingInstruction: "",
    orderingInstructions: ["Use the agreed test reference when recording this request."],
  };
  p.prescriptionConfig.urgentRoute = {
    source: "separate",
    route: {
      contact: { kind: "staff", staffId: "alex" },
      method: { id: "phone", other: "123" },
      instruction: "Use the test handover reference.",
    },
  };
  p.prescriptionConfig.urgentActions = ["system"];
  p.prescriptionConfig.urgentInstruction = "Record the test reference.";
  p.safeguardingRoute = {
    contact: { kind: "staff", staffId: "alex" },
    leadIds: ["alex"],
    method: { id: "person", other: "" },
    instruction: "Use the agreed test record.",
  };
  p.localSafeguarding = "Retain the additional test reference.";
  p.bookingConfig = bookingFor(p);
  p.bookingConfig.escalation = {
    contact: { kind: "staff", staffId: "alex" },
    method: { id: "phone", other: "123" },
    instruction: "",
  };
  return p;
}
function sampleSettings(topic: string) {
  const settings = defaultModuleSettings();
  for (const field of topicFields[topic].filter((f) => !f.legacyOnly)) {
    if (field.key === "queries") continue;
    if (!field.options.length) settings.answers[field.key] = "staff:alex";
    else {
      const option = field.options.find((o) => !field.detailOptions?.[o] && !/depends/i.test(o));
      if (option) settings.answers[field.key] = option;
    }
  }
  settings.extra = "Record this test request in the agreed reception inbox.";
  settings.count = 100;
  return settings;
}

test("allowed channels teach permission only, with context-specific English for every supported channel", () => {
  const channels = [
    "Telephone",
    "Practice website / online form",
    "NHS App",
    "At reception",
    "Paper request at reception",
    "Nominated pharmacy",
  ];
  for (const method of channels) {
    for (const label of [
      "How should a non-repeat prescription request be submitted?",
      "Appointment request methods",
      "How are fit note requests submitted?",
    ]) {
      const [question] = applications({
        label,
        rule: method,
        situation: "A patient asks how to submit the request.",
      });
      assert.ok(question);
      assert.match(question.rule, /^Yes, this practice accepts/);
      assert.ok(question.situation.includes(submissionChannel(method)!.phrase));
      assert.doesNotMatch(
        JSON.stringify(question),
        /Explain how|\?:|using Telephone|use Telephone|using Practice website/,
      );
      assert.ok(!question.situation.includes("appointment") || label.includes("Appointment"));
    }
  }
});
test("foundational routing prefers roles, while an individual override and a specific contact stay named", () => {
  const p = samplePractice();
  const settings = { ...sampleSettings("prescriptions"), trainingLevel: "learn" as const };
  const roleQuestion = configuredScenarios("prescriptions", "Prescriptions", p, settings).find(
    (s) => s.kind === "mcq" && s.localRoleRequestId === "prescription-queries",
  );
  assert.ok(roleQuestion?.kind === "mcq");
  assert.equal(roleQuestion.options[roleQuestion.correctIndex], "A Doctor.");
  assert.doesNotMatch(roleQuestion.options[roleQuestion.correctIndex], /Dr Alex/);
  const named = configuredScenarios("urgent", "Urgent", p, {
    ...sampleSettings("urgent"),
    trainingLevel: "learn",
  }).find((s) => s.title.includes("usual urgent contact"));
  assert.ok(named?.kind === "mcq");
  assert.match(named.options[named.correctIndex], /Contact Dr Alex/);
  const doctor = Object.values(p.roleRequests!)[0];
  p.staff[0].requestOverrides = { [doctor.roleId]: { "prescription-queries": false } };
  const exception = configuredScenarios("prescriptions", "Prescriptions", p, settings).find(
    (s) => s.title.startsWith("Responsibilities for Dr Alex") && s.title.includes("Prescription"),
  );
  assert.ok(exception?.kind === "mcq");
  assert.match(exception.options[exception.correctIndex], /excluded/);
});

const audit: any[] = [];
test("all ten topics pass shared copy checks in Learn and Apply and expose only configured facts", () => {
  for (const topic of Object.keys(topicFields)) {
    const p = samplePractice();
    for (const trainingLevel of ["learn", "apply"] as const) {
      const settings = { ...sampleSettings(topic), trainingLevel };
      const questions = generateConfiguredModule(topic, topic, p, settings);
      assert.ok(questions.length, topic);
      for (const q of questions) {
        assert.ok(hasFinishedCopy(q), topic + ": " + q.title);
        assert.doesNotMatch(q.title, /\?:|^Routing:/);
        assert.doesNotMatch(
          JSON.stringify(q),
          /Explain how to submit the request using|using Telephone|using Practice website \/ online form|\[object Object\]/,
        );
      }
      audit.push({ topic, trainingLevel, questions });
    }
  }
  if (process.env.COPY_AUDIT_PATH)
    writeFileSync(process.env.COPY_AUDIT_PATH, JSON.stringify(audit, null, 2));
});
test("final guard rejects known unfinished templates without rewriting exact procedure content", () => {
  const q: any = {
    kind: "mcq",
    title: "Submitting?: Telephone",
    patientQuote: "",
    question: "",
    options: ["using Telephone"],
    correctIndex: 0,
    learningPoint: "",
  };
  assert.equal(hasFinishedCopy(q), false);
  const exact: any = {
    kind: "order",
    sequence: { steps: [{ id: "s", label: "Exact configured instruction; retain this order." }] },
  };
  const before = structuredClone(exact);
  assert.equal(hasFinishedCopy(exact), true);
  assert.deepEqual(exact, before);
});

test("every applicable Learn topic uses role actions, and explicit contacts are not generalised", () => {
  for (const topic of Object.keys(topicFields)) {
    const p = samplePractice();
    const settings = { ...sampleSettings(topic), trainingLevel: "learn" as const };
    const questions = configuredScenarios(topic, topic, p, settings);
    const routing = questions.filter((q) => q.kind === "mcq" && q.localRoleRequestId);
    if (
      [
        "appointment-booking",
        "prescriptions",
        "results",
        "vaccines",
        "fit-notes",
        "first-week",
      ].includes(topic)
    )
      assert.ok(routing.length, topic);
    for (const q of routing) {
      assert.ok(q.kind === "mcq");
      assert.match(q.options[q.correctIndex], /Doctor/);
      assert.doesNotMatch(q.options[q.correctIndex], /Dr Alex/);
      assert.match(q.options[q.correctIndex], /^(Book (?:the patient )?an appointment|A Doctor\.)/);
    }
    // Query coverage must not be duplicated by the old staff-derived setup field.
    if (topic === "prescriptions")
      assert.ok(!questions.some((q) => q.title === "Who handles prescription queries?"));
  }
  const p = samplePractice();
  const doctor = Object.values(p.roleRequests!)[0];
  doctor.selectedRequestIds = doctor.selectedRequestIds.filter(
    (id) => id !== "prescription-queries",
  );
  p.staff[0].requestOverrides = { [doctor.roleId]: { "prescription-queries": true } };
  const questions = configuredScenarios("prescriptions", "Prescriptions", p, {
    ...defaultModuleSettings(),
    trainingLevel: "learn",
  });
  const added = questions.find(
    (q) => q.kind === "mcq" && q.localRoleRequestId === "prescription-queries",
  );
  assert.ok(added?.kind === "mcq");
  assert.match(added.options[added.correctIndex], /Dr Alex/);
});

test("mixed channel lists teach allowed methods separately from additional guidance", () => {
  const questions = applications({
    label: "How should a non-repeat prescription request be submitted?",
    rule: "Telephone; NHS App; Include the agreed request reference.",
    situation: "A patient asks about submitting a prescription request.",
  });
  assert.equal(questions.length, 3);
  assert.match(questions[0].rule, /accepts these requests by telephone/);
  assert.match(questions[1].rule, /accepts these requests through the NHS App/);
  assert.equal(questions[2].rule, "Include the agreed request reference.");
  assert.doesNotMatch(JSON.stringify(questions), /Explain how|using Telephone|\?:/);
});

test("structured urgent routes, named safeguarding leads and legacy instructions survive in readable copy", () => {
  for (const trainingLevel of ["learn", "apply"] as const) {
    const p = samplePractice();
    const before = JSON.stringify(p);
    const settings = { ...defaultModuleSettings(), trainingLevel, count: 100 };
    for (const topic of ["prescriptions", "first-week"]) {
      const q = generateConfiguredModule(topic, topic, p, settings).find(
        (q) => q.title === "Urgent Prescription Request",
      );
      assert.ok(q?.kind === "mcq");
      assert.match(q.options[q.correctIndex], /Contact Dr Alex \(Doctor\) by telephone on 123/);
      assert.match(q.options[q.correctIndex], /Send an urgent request through the clinical system/);
      assert.match(q.options[q.correctIndex], /Record the test reference/);
      assert.doesNotMatch(JSON.stringify(q), /Phone\/extension|Internal clinical system\/message/);
      const module = {
        id: "test",
        title: topic,
        type: topic,
        topicKey: topic,
        createdAt: 1,
        published: false,
        scenarios: [q],
        settings,
      };
      const regenerated = regenerateConfiguredScenario(module, q.id, p);
      assert.ok(regenerated.scenarios.every(hasFinishedCopy));
    }
    for (const topic of ["urgent", "first-week", "difficult"]) {
      const q = generateConfiguredModule(topic, topic, p, settings).find(
        (q) => q.title === "Safeguarding Contact",
      );
      assert.ok(q?.kind === "mcq");
      assert.match(q.options[q.correctIndex], /Dr Alex/);
      assert.match(q.options[q.correctIndex], /Retain the additional test reference/);
    }
    assert.equal(JSON.stringify(p), before);
    // Only the active route is used; the saved inactive prescription contact is not leaked.
    p.bookingConfig = bookingFor(p);
    p.bookingConfig.escalation = {
      contact: { kind: "other", text: "Test reception lead" },
      method: { id: "person", other: "" },
      instruction: "",
    };
    p.prescriptionConfig!.urgentRoute = {
      source: "appointment",
      previousSeparateRoute: {
        contact: { kind: "other", text: "Inactive contact" },
        method: { id: "person", other: "" },
        instruction: "",
      },
    };
    const q = generateConfiguredModule("prescriptions", "Prescriptions", p, settings).find(
      (q) => q.title === "Urgent Prescription Request",
    );
    assert.ok(q?.kind === "mcq");
    assert.match(q.options[q.correctIndex], /Contact Test reception lead in person/);
    assert.doesNotMatch(JSON.stringify(q), /Inactive contact/);
  }
});

test("detail lists preserve acronym casing and contact lists remain complete sentences", () => {
  const details = applications({
    label: "Which details should accompany an urgent handover?",
    rule: "NHS App reference; Callback number",
    situation: "You need to hand over a request. What should be included?",
  });
  assert.match(details[0].rule, /NHS App reference/);
  assert.doesNotMatch(JSON.stringify(details), /nhs app|nHS App|;|included\? A colleague/);
  const p = samplePractice();
  p.staff.push({ id: "morgan", name: "Morgan Example", role: "Practice Manager", clinics: "" });
  const settings = {
    ...defaultModuleSettings(),
    trainingLevel: "learn" as const,
    answers: { backup: "staff:alex" },
  };
  const q = configuredScenarios("urgent", "Urgent", p, settings).find((q) =>
    q.title.includes("usual urgent contact"),
  );
  assert.ok(q?.kind === "mcq");
  assert.equal(q.options[q.correctIndex], "Contact Dr Alex (Doctor).");
  assert.equal(
    contactChoicesCopy(["Dr Alex — Doctor", "Morgan Example — Practice Manager"]),
    "Contact Dr Alex (Doctor) or Morgan Example (Practice Manager).",
  );
  assert.equal(
    contactRouteCopy(
      { ...emptyContactRoute(), instruction: "Use the configured test handover." },
      p,
    ),
    "Use the configured test handover.",
  );
});

test("copy guard covers authored MCQs too, while preserving exact local procedures", () => {
  const broken: any = {
    kind: "mcq",
    title: "Channel",
    patientQuote: "A patient asks whether they can use Telephone.",
    question: "What should you tell them?",
    options: ["Telephone", "Other"],
    learningPoint: "Known method",
    provenance: { kind: "core" },
  };
  assert.equal(hasFinishedCopy(broken), false);
  const exact = { ...broken, provenance: { kind: "sequence" } };
  const before = JSON.stringify(exact);
  assert.equal(hasFinishedCopy(exact), true);
  assert.equal(JSON.stringify(exact), before);
});

test("Appointment Booking Core and local escalation render the same structured method without altering evidence", () => {
  const p = samplePractice();
  const before = JSON.stringify(p);
  for (const trainingLevel of ["learn", "apply"] as const) {
    const questions = generateConfiguredModule("appointment-booking", "Booking", p, {
      ...sampleSettings("appointment-booking"),
      trainingLevel,
    });
    const support = questions.filter(
      (q) => q.kind === "mcq" && q.options.some((o) => /Contact Dr Alex.*telephone/.test(o)),
    );
    assert.ok(support.length, trainingLevel);
    for (const q of support) {
      assert.ok(q.kind === "mcq");
      assert.doesNotMatch(
        q.options.join(" "),
        /Phone\/extension|Internal clinical system\/message| — /,
      );
      if (q.provenance?.kind === "core") {
        const binding = q.provenance.inputs.find((i) => i.bindingId === "escalation_routes");
        if (binding) {
          assert.equal((binding.snapshot as any).method, "Phone/extension");
          assert.equal((binding.snapshot as any).phone, "123");
        }
      }
    }
  }
  assert.equal(JSON.stringify(p), before);
});
