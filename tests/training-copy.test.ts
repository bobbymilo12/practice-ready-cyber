import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import { applications } from "../src/lib/scenario-applications.ts";
import { hasFinishedCopy, submissionChannel } from "../src/lib/training-copy.ts";
import {
  defaultModuleSettings,
  generateConfiguredModule,
  topicFields,
  configuredScenarios,
} from "../src/lib/module-config.ts";
import { suggestedRole } from "../src/lib/role-requests.ts";
import { empty } from "./fixtures/role-matching.ts";
import { prescriptionsFor } from "../src/lib/practice-config.ts";

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
  assert.equal(roleQuestion.options[roleQuestion.correctIndex], "Pass the query to a Doctor.");
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
