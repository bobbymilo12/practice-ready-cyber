import assert from "node:assert/strict";
import test from "node:test";
import {
  displayLabel,
  methodQuestion,
  comparableValues,
  unconditionalMethods,
} from "../src/lib/question-quality.ts";
import {
  configuredScenarios,
  generateConfiguredModule,
  defaultModuleSettings,
  regenerateConfiguredScenario,
} from "../src/lib/module-config.ts";
import { prescriptionsFor } from "../src/lib/practice-config.ts";
import { empty } from "./fixtures/role-matching.ts";
import { suggestedRole } from "../src/lib/role-requests.ts";
import {
  evaluateAnswer,
  startSession,
  answerSession,
  advanceSession,
  submitSession,
} from "../src/lib/training.ts";
import { scenarioContent } from "../src/lib/training-content.ts";
import { recordedSourceChanges } from "../src/lib/practice-change-tracking.ts";
import { practiceQuestionPresentation } from "../src/lib/module-presentation.ts";

function practice() {
  const p = empty();
  p.prescriptionConfig = {
    ...prescriptionsFor(p),
    methods: ["nhs-app", "website", "paper"],
    turnaround: { id: "24", other: "" },
    weekends: { id: "exclude", other: "" },
    bankHolidays: { id: "exclude", other: "" },
  };
  const doctor = suggestedRole("Doctor");
  doctor.confirmed = true;
  doctor.selectedRequestIds = ["medication-reviews", "prescription-queries"];
  p.roleRequests = { [doctor.roleId]: doctor };
  return p;
}
for (const trainingLevel of ["learn", "apply"] as const) {
  test(`${trainingLevel}: real generation includes multi-select with exact-set scoring and source snapshots`, () => {
    const p = practice();
    const before = JSON.stringify(p);
    const settings = {
      ...defaultModuleSettings(),
      trainingLevel,
      count: 30,
      answers: { acute: "NHS App" },
    };
    const questions = generateConfiguredModule("prescriptions", "Prescriptions", p, settings);
    const q = questions.find((q) => q.kind === "mcq" && q.correctIndices);
    assert.ok(q?.kind === "mcq" && q.correctIndices);
    assert.equal(q.correctIndices.length, 3);
    assert.deepEqual(
      q.correctIndices.map((i) => q.options[i]).sort(),
      [
        "Submit the request through the NHS App.",
        "Submit the request through the practice website or online form.",
        "Submit the request on paper at reception.",
      ].sort(),
    );
    const correct = q.correctIndices.map(String);
    assert.equal(evaluateAnswer(q, [...correct].reverse()), true);
    assert.equal(evaluateAnswer(q, correct.slice(1)), false);
    assert.equal(
      evaluateAnswer(
        q,
        q.options.map((_, i) => String(i)),
      ),
      false,
    );
    assert.throws(() => evaluateAnswer(q, [correct[0], correct[0]]));
    assert.equal(q.provenance?.kind, "configured_fact");
    const change = {
      path: "practiceData.prescriptionConfig",
      label: "Prescriptions",
      reason: "Methods changed",
    };
    assert.deepEqual(recordedSourceChanges(q, [change]), [change]);
    const shuffled = {
      ...q,
      options: [...q.options].reverse(),
      correctIndices: q.correctIndices.map((i) => q.options.length - 1 - i),
    };
    assert.deepEqual(scenarioContent(q), scenarioContent(shuffled));
    assert.notDeepEqual(
      scenarioContent(q),
      scenarioContent({ ...q, correctIndices: [q.correctIndices[0]] }),
    );
    const module = {
      id: "m",
      type: "Prescriptions",
      topicKey: "prescriptions",
      title: "Prescriptions",
      createdAt: 1,
      published: true,
      settings,
      scenarios: [{ ...q, status: "approved" as const }],
    };
    const assignment = {
      id: "a",
      moduleId: "m",
      traineeId: "t",
      assignedAt: 1,
      status: "assigned" as const,
    };
    let session = startSession(module, assignment, "attempt");
    session = answerSession(session, correct);
    session = submitSession(advanceSession(session, module.title), module.title);
    assert.equal(session.result?.correct, 1);
    const snapshot = JSON.stringify(session);
    const regenerated = regenerateConfiguredScenario({ ...module, published: false }, q.id, p);
    assert.ok(regenerated.scenarios.some((s) => s.kind === "mcq" && s.correctIndices));
    assert.equal(JSON.stringify(session), snapshot);
    assert.equal(JSON.stringify(p), before);
  });
  test(`${trainingLevel}: role questions distinguish booking from broad responsibility`, () => {
    const qs = configuredScenarios("prescriptions", "Prescriptions", practice(), {
      ...defaultModuleSettings(),
      trainingLevel,
    });
    const review = qs.find(
      (s) => s.kind === "mcq" && s.localRoleRequestId === "medication-reviews",
    );
    assert.ok(review?.kind === "mcq");
    assert.equal(
      review.options[review.correctIndex],
      "Book the patient an appointment with a Doctor.",
    );
    const broad = qs.find(
      (s) => s.kind === "mcq" && s.localRoleRequestId === "prescription-queries",
    );
    assert.ok(broad?.kind === "mcq");
    assert.equal(broad.question, "Who has this responsibility at the practice?");
    assert.doesNotMatch(
      broad.patientQuote + broad.options[broad.correctIndex],
      /Pass|Direct|patient contacts/,
    );
  });
}
test("conditional telephone permissions never become universal methods, including phone aliases", () => {
  const p = practice();
  p.prescriptionConfig!.methods.push("telephone");
  p.prescriptionConfig!.orderingInstructions = ["Patients over 60 can order by phone."];
  for (const trainingLevel of ["learn", "apply"] as const) {
    const qs = generateConfiguredModule("prescriptions", "Prescriptions", p, {
      ...defaultModuleSettings(),
      trainingLevel,
      count: 30,
    });
    const q = qs.find((s) => s.kind === "mcq" && s.correctIndices);
    assert.ok(q?.kind === "mcq" && q.correctIndices);
    assert.ok(q.correctIndices.every((i) => !/telephone|phone/.test(q.options[i])));
    assert.ok(qs.some((s) => s.learningPoint.includes("Patients over 60 can order by phone.")));
  }
  assert.deepEqual(
    unconditionalMethods(["Telephone", "NHS App"], "Only eligible patients may use these methods."),
    [],
  );
});
test("comparable values preserve units and teaching points explain processing without pharmacy claims", () => {
  for (const value of ["24 working hours", "2 working days", "3 weeks", "15 minutes"]) {
    const result = practiceQuestionPresentation(
      "prescriptions",
      "Prescription turnaround",
      "A patient asks about processing.",
      value,
      { ...defaultModuleSettings(), trainingLevel: "learn" },
    );
    assert.equal(result.options.length, 3);
    assert.equal(result.options[0], value);
    assert.deepEqual(result.options.slice(1), comparableValues(value));
    assert.match(result.learningPoint, /usually take .* to be processed/);
    assert.doesNotMatch(result.learningPoint, /pharmacy|guidance for this request/);
  }
  assert.equal(comparableValues("Usually within two days, unless a review is needed"), undefined);
});
test("display labels preserve acronyms and avoid title-casing sentences or procedure text", () => {
  assert.equal(displayLabel("Prescription queries"), "Prescription Queries");
  assert.equal(displayLabel("Medication reviews"), "Medication Reviews");
  assert.equal(displayLabel("NHS GP HCA UTI support"), "NHS GP HCA UTI Support");
  assert.equal(
    displayLabel("What should you tell the patient?"),
    "What should you tell the patient?",
  );
  assert.equal(displayLabel("Place the sample into the box."), "Place the sample into the box.");
});

test("multi-select recovery resolves learning without rewriting the first committed score", () => {
  const q = generateConfiguredModule("prescriptions", "Prescriptions", practice(), {
    ...defaultModuleSettings(),
    trainingLevel: "learn",
    count: 30,
  }).find((s) => s.kind === "mcq" && s.correctIndices)!;
  assert.ok(q.kind === "mcq" && q.correctIndices);
  const module = {
    id: "m",
    title: "Methods",
    topicKey: "prescriptions",
    type: "Prescriptions",
    createdAt: 1,
    published: true,
    scenarios: [
      { ...q, status: "approved" as const },
      { ...q, id: "follow", followUpFor: q.id, status: "approved" as const },
    ],
  };
  const assignment = {
    id: "a",
    moduleId: "m",
    traineeId: "t",
    assignedAt: 1,
    status: "assigned" as const,
  };
  let s = answerSession(startSession(module, assignment, "attempt"), [String(q.correctIndices[0])]);
  assert.deepEqual(s.queue, [q.id, "follow"]);
  s = answerSession(advanceSession(s, module.title), q.correctIndices.map(String));
  s = submitSession(advanceSession(s, module.title), module.title);
  assert.equal(s.result?.correct, 0);
  assert.equal(s.result?.total, 1);
  assert.deepEqual(s.result?.wrongTitles, []);
  assert.deepEqual(s.result?.recoveredTitles, [q.title]);
});

test("method alternatives do not mark overlapping reception methods as false", () => {
  const q = methodQuestion(
    "Request methods",
    ["At reception", "NHS App", "NHS App"],
    ["Paper request at reception", "Telephone"],
    "A patient asks how to submit a request.",
  );
  assert.ok(q?.correctIndices);
  assert.equal(q.correctIndices.length, 2);
  assert.ok(!q.options.some((o) => /on paper/.test(o)));
});
