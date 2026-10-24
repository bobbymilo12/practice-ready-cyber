import assert from "node:assert/strict";
import test from "node:test";
import {
  displayLabel,
  methodQuestion,
  comparableValues,
  unconditionalMethods,
  conditionalMethodQuestions,
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
        "Ask the patient to submit the request through the NHS App.",
        "Ask the patient to submit the request through the practice website or online form.",
        "Ask the patient to submit the request on paper at reception.",
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
    assert.equal(broad, undefined, "A broad responsibility is not a routing decision");
    assert.doesNotMatch(review.patientQuote, /booking process has confirmed/);
    assert.match(review.patientQuote, /arrange a medication review/);
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

test("conditional age permission reaches the final module with all applicable methods and exact boundary scoring", () => {
  const p = practice();
  p.prescriptionConfig!.orderingInstructions = [
    "Telephone ordering is available for patients aged 60 and over.",
    "Include the patient's full name and date of birth.",
  ];
  const before = JSON.stringify(p);
  for (const trainingLevel of ["learn", "apply"] as const) {
    const qs = generateConfiguredModule("prescriptions", "Prescriptions", p, {
      ...defaultModuleSettings(),
      trainingLevel,
      count: 100,
    });
    const eligible = qs.find((q) => /60-year-old/.test(q.patientQuote));
    const below = qs.find((q) => /59-year-old/.test(q.patientQuote));
    const general = qs.find((q) => q.kind === "mcq" && q.correctIndices && !q.patientQuote);
    for (const [q, expected] of [
      [eligible, 4],
      [below, 3],
      [general, 3],
    ] as const) {
      assert.ok(q?.kind === "mcq" && q.correctIndices);
      assert.equal(q.correctIndices.length, expected);
      const correct = q.correctIndices.map((i) => q.options[i]);
      assert.equal(
        correct.some((s) => /telephone/.test(s)),
        q === eligible,
      );
      assert.ok(correct.every((s) => /^Ask the patient to submit/.test(s)));
      assert.equal(evaluateAnswer(q, q.correctIndices.map(String)), true);
      assert.equal(evaluateAnswer(q, q.correctIndices.slice(1).map(String)), false);
      assert.equal(q.provenance?.kind, "configured_fact");
      assert.deepEqual(
        recordedSourceChanges(q, [
          { path: "practiceData.prescriptionConfig", label: "Methods", reason: "Age changed" },
        ]).length,
        1,
      );
    }
  }
  assert.equal(JSON.stringify(p), before);
});

test("repeat methods do not supply a non-repeat pathway; explicit non-repeat methods keep their own scope", () => {
  for (const trainingLevel of ["learn", "apply"] as const) {
    const p = practice();
    const settings = { ...defaultModuleSettings(), trainingLevel, count: 100 };
    const visible = (qs: any[]) =>
      qs
        .map((q) => [q.title, q.patientQuote, q.question, q.options, q.learningPoint])
        .flat(Infinity)
        .join(" ");
    assert.doesNotMatch(
      visible(generateConfiguredModule("prescriptions", "Prescriptions", p, settings)),
      /non-repeat|not on their repeat/,
    );
    settings.answers.acute = "Telephone";
    const acute = generateConfiguredModule("prescriptions", "Prescriptions", p, settings).filter(
      (q) => /non-repeat/i.test(q.title),
    );
    assert.equal(acute.length, 1);
    assert.ok(acute[0].kind === "mcq");
    assert.match(acute[0].options[acute[0].correctIndex], /telephone/);
    assert.doesNotMatch(visible(acute), /NHS App|website|paper at reception/);
  }
});

test("direct Learn facts need no scenario; unsupported facts and ambiguous conditions never pad a module", () => {
  const p = practice();
  const qs = generateConfiguredModule("prescriptions", "Prescriptions", p, {
    ...defaultModuleSettings(),
    trainingLevel: "learn",
    count: 100,
  });
  const turnaround = qs.find((q) => /Turnaround/.test(q.title));
  assert.ok(turnaround);
  assert.equal(turnaround.patientQuote, "");
  assert.match(turnaround.question, /routine prescription request.*processed/);
  assert.ok(qs.length < 100);
  for (const instruction of [
    "Telephone only if appropriate.",
    "Telephone ordering is available for patients aged 60 and over, unless a review is needed.",
    "Patients aged 60 and over can order by telephone. Only after approval.",
  ]) {
    p.prescriptionConfig!.orderingInstructions = [instruction];
    p.prescriptionConfig!.methods.push("telephone");
    const generated = generateConfiguredModule("prescriptions", "Prescriptions", p, {
      ...defaultModuleSettings(),
      trainingLevel: "apply",
      count: 100,
    });
    assert.ok(!generated.some((q) => /year-old/.test(q.patientQuote)));
    assert.ok(
      generated
        .filter((q) => q.kind === "mcq" && q.correctIndices)
        .every(
          (q) =>
            q.kind === "mcq" && q.correctIndices!.every((i) => !/telephone/.test(q.options[i])),
        ),
    );
  }
  assert.deepEqual(
    generateConfiguredModule("custom", "Custom", empty(), {
      ...defaultModuleSettings(),
      trainingLevel: "learn",
      count: 100,
      extra: "Use the usual method, depending on circumstances.",
    }),
    [],
  );
});

test("shared Apply decisions need the supplied situation while Learn asks direct practice knowledge", () => {
  const cases = [
    ["results", "release", "Only when marked as reviewed and authorised for reception to share"],
    ["vaccines", "eligibility", "Check that the patient has been invited for the vaccination"],
    ["fit-notes", "delivery", "Secure digital message"],
    ["home-visits", "intake", "Clinical system task"],
    [
      "first-week",
      "supervision",
      "A supervisor observes them handling requests and gives feedback",
    ],
  ];
  for (const [topic, key, value] of cases) {
    const settings = { ...defaultModuleSettings(), answers: { [key]: value } };
    const learn = generateConfiguredModule(topic, topic, empty(), {
      ...settings,
      trainingLevel: "learn",
    })[0];
    const apply = generateConfiguredModule(topic, topic, empty(), {
      ...settings,
      trainingLevel: "apply",
    })[0];
    assert.ok(learn?.kind === "mcq" && apply?.kind === "mcq", topic);
    assert.equal(learn.patientQuote, "", topic);
    assert.ok(apply.patientQuote.length > 0, topic);
    assert.notEqual(learn.question, apply.question, topic);
    assert.equal(learn.options[learn.correctIndex], apply.options[apply.correctIndex], topic);
    assert.doesNotMatch(apply.options.join(" "), /previous experience|last similar enquiry/);
  }
});

test("conditional methods share the parser across topics without transferring a repeat permission to non-repeat requests", () => {
  const methods = ["NHS App", "Paper request at reception"];
  const rule = "Patients aged 60 and over can order repeat prescriptions by telephone.";
  assert.equal(
    conditionalMethodQuestions("Non-repeat prescription requests", methods, rule).length,
    0,
  );
  assert.equal(conditionalMethodQuestions("Fit note requests", methods, rule).length, 0);
  const qs = conditionalMethodQuestions(
    "Fit note requests",
    methods,
    "Telephone ordering is available for patients aged 60 and over.",
  );
  assert.equal(qs.length, 2);
  assert.ok(qs.every((q) => /fit note request/.test(q.patientQuote)));
  assert.equal(qs[0].correctIndices!.length, 3);
  assert.equal(qs[1].correctIndices!.length, 2);
  assert.ok(
    conditionalMethodQuestions(
      "Repeat requests",
      ["Telephone", "Paper request at reception"],
      "Patients aged 60 and over can order repeat prescriptions through the NHS App.",
    ).length,
  );
});

test("regeneration retains a question's recorded decision when several questions share a concise heading", () => {
  const settings = {
    ...defaultModuleSettings(),
    trainingLevel: "learn" as const,
    answers: {
      release: "All result enquiries go to the reviewing clinician",
      identity: "Full name and date of birth",
    },
  };
  const p = empty();
  const scenarios = generateConfiguredModule("results", "Results", p, settings);
  const identity = scenarios.find((q) => /identity details/.test(q.question))!;
  assert.ok(identity);
  assert.ok(scenarios.filter((q) => q.title === identity.title).length > 1);
  const module = {
    id: "m",
    type: "Results",
    topicKey: "results",
    title: "Results",
    createdAt: 1,
    published: false,
    settings,
    scenarios,
  };
  const before = JSON.stringify(module);
  const regenerated = regenerateConfiguredScenario(module, identity.id, p);
  const updated = regenerated.scenarios.find((q) => q.id === identity.id)!;
  assert.equal(updated.question, identity.question);
  assert.equal(updated.kind, "mcq");
  assert.equal(
    updated.kind === "mcq" && updated.options[updated.correctIndex],
    "Full name and date of birth.",
  );
  assert.equal(JSON.stringify(module), before);
});
