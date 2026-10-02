import assert from "node:assert/strict";
import test from "node:test";
import { coreTrainingLibrary } from "../src/lib/core-training-library.ts";
import { generateCoreScenario } from "../src/lib/core-training-generation.ts";
import { appointmentCorePool } from "../src/lib/core-appointment-selection.ts";
import {
  defaultModuleSettings,
  topicFields,
  trainingLevelOptions,
  configuredScenarios,
  generateConfiguredModule,
  regenerateConfiguredScenario,
  reviseConfiguredScenario,
} from "../src/lib/module-config.ts";
import { suggestedRole } from "../src/lib/role-requests.ts";
import type { PracticeData, Module } from "../src/lib/store.ts";

function practice(): PracticeData {
  const role = suggestedRole("Practice Nurse");
  role.confirmed = true;
  role.selectedRequestIds = role.categories.flatMap((c) => c.requests.map((r) => r.id));
  return {
    practiceName: "Example",
    staff: [],
    roleRequests: { [role.roleId]: role },
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
  } as PracticeData;
}
function moduleWithCount(count = 10, trainingLevel?: "learn" | "apply"): Module {
  const settings = {
    ...defaultModuleSettings(),
    count,
    ...(trainingLevel ? { trainingLevel } : {}),
  };
  return {
    id: "module",
    type: "Appointment Booking",
    title: "Appointment Booking",
    topicKey: "appointment-booking",
    settings,
    published: true,
    scenarios: generateConfiguredModule(
      "appointment-booking",
      "Appointment Booking",
      practice(),
      settings,
    ),
  } as Module;
}
test("only the four approved versions and their eight recipes are production eligible", () => {
  const context = {
    topicKey: "appointment-booking",
    practice: practice(),
    settings: defaultModuleSettings(),
  };
  const approved = coreTrainingLibrary.filter((c) => c.review.status === "approved");
  assert.deepEqual(
    approved.map((c) => c.code),
    ["AB01", "AB03", "AB04", "AB15"],
  );
  for (const c of coreTrainingLibrary) {
    for (const level of ["learn", "apply"] as const) {
      assert.equal(!!generateCoreScenario(c.id, context, level).scenario, approved.includes(c));
      if (approved.includes(c))
        assert.ok(c.templates!.find((t) => t.eligibleLevels.includes(level))!.executable!.approval);
    }
  }
});
test("10/20/30 total questions deterministically target 3/6/9 Core questions", () => {
  for (const count of [10, 20, 30]) {
    const a = moduleWithCount(count),
      b = moduleWithCount(count);
    assert.equal(a.scenarios.length, count);
    assert.equal(a.scenarios.filter((s) => s.provenance).length, Math.round(count * 0.3));
    assert.deepEqual(
      a.scenarios.map(({ id, ...s }) => s),
      b.scenarios.map(({ id, ...s }) => s),
    );
    assert.equal(a.scenarios.filter((s) => !s.provenance).length, count - Math.round(count * 0.3));
    assert.ok(a.scenarios.some((s) => s.provenance?.level === "learn"));
    assert.ok(a.scenarios.some((s) => s.provenance?.level === "apply"));
    assert.equal(
      new Set(a.scenarios.filter((s) => s.provenance).map((s) => s.patientQuote)).size,
      Math.round(count * 0.3),
    );
  }
});
test("finite Core capacity falls back to local content; sparse local data is never invented", () => {
  const p = practice(),
    settings = { ...defaultModuleSettings(), count: 100 };
  const ctx = { topicKey: "appointment-booking", practice: p, settings };
  const core = appointmentCorePool(ctx);
  assert.equal(core.length, 10);
  const local = configuredScenarios(ctx.topicKey, "Booking", p, settings);
  const all = generateConfiguredModule(ctx.topicKey, "Booking", p, settings);
  assert.equal(all.filter((s) => s.provenance).length, 10);
  assert.equal(all.length, Math.min(100, 10 + local.length));
  assert.equal(new Set(core.map((s) => s.patientQuote)).size, core.length);
  p.roleRequests = {};
  const sparse = generateConfiguredModule(ctx.topicKey, "Booking", p, { ...settings, count: 10 });
  assert.equal(sparse.length, 3);
  assert.ok(sparse.every((s) => s.provenance));
});
test("Core regeneration pins concept and recipe, preserves provenance and does not duplicate", () => {
  const module = JSON.parse(JSON.stringify(moduleWithCount())) as Module;
  const original = structuredClone(module);
  const core = module.scenarios.find((s) => s.provenance)!;
  const regenerated = regenerateConfiguredScenario(module, core.id, practice());
  const replacement = regenerated.scenarios.find((s) => s.id === core.id)!;
  assert.equal(regenerated.scenarios.length, module.scenarios.length);
  assert.notEqual(replacement.patientQuote, core.patientQuote);
  assert.equal(replacement.provenance?.conceptId, core.provenance?.conceptId);
  assert.equal(replacement.provenance?.conceptVersion, core.provenance?.conceptVersion);
  assert.equal(replacement.provenance?.executableRecipeId, core.provenance?.executableRecipeId);
  assert.notEqual(replacement.provenance?.variationId, core.provenance?.variationId);
  assert.equal(replacement.status, "draft");
  assert.deepEqual(module, original);
  assert.deepEqual(JSON.parse(JSON.stringify(regenerated)), regenerated);
  const outdated = structuredClone(module);
  outdated.scenarios.find((s) => s.id === core.id)!.provenance!.conceptVersion = 0;
  assert.equal(regenerateConfiguredScenario(outdated, core.id, practice()), outdated);
  const full = moduleWithCount(100, "learn");
  const exhausted = full.scenarios.find((s) => s.provenance)!;
  assert.equal(regenerateConfiguredScenario(full, exhausted.id, practice()), full);
});
test("manual editing retains original Core origin and marks modified, including omitted incoming provenance", () => {
  const module = moduleWithCount();
  const original = module.scenarios.find((s) => s.provenance)!;
  const { provenance, ...withoutOrigin } = original;
  const edited = reviseConfiguredScenario(module, {
    ...withoutOrigin,
    patientQuote: "Manager wording",
  });
  const changed = edited.scenarios.find((s) => s.id === original.id)!;
  assert.deepEqual(changed.provenance, { ...provenance, managerModified: true });
  assert.equal(changed.status, "draft");
  assert.equal(edited.needsReview, true);
  const regenerated = regenerateConfiguredScenario(edited, changed.id, practice());
  assert.equal(
    regenerated.scenarios.find((s) => s.id === changed.id)?.provenance?.managerModified,
    undefined,
  );
});
test("other predefined modules and Custom Module do not acquire Core questions", () => {
  for (const topic of [
    ...Object.keys(topicFields).filter((t) => t !== "appointment-booking"),
    "custom",
  ]) {
    const settings = defaultModuleSettings();
    settings.extra = "Confirm the request details with the patient.";
    const result = generateConfiguredModule(topic, topic, practice(), settings);
    assert.ok(result.every((s) => !s.provenance));
  }
});

test("selected Learn/Apply persists, restricts every Core recipe, and survives regeneration", () => {
  for (const level of ["learn", "apply"] as const) {
    for (const count of [10, 20, 30]) {
      const module = JSON.parse(JSON.stringify(moduleWithCount(count, level))) as Module;
      assert.equal(module.settings!.trainingLevel, level);
      assert.equal(module.scenarios.length, count);
      const core = module.scenarios.filter((s) => s.provenance);
      assert.equal(core.length, Math.round(count * 0.3));
      assert.ok(
        core.every(
          (s) => s.provenance!.level === level && s.provenance!.templateId!.includes(`.${level}.`),
        ),
      );
      for (const scenario of core) {
        const concept = coreTrainingLibrary.find((c) => c.id === scenario.provenance!.conceptId)!;
        assert.notEqual(scenario.title, concept.title);
        assert.doesNotMatch(scenario.title, /AB\d\d|core\./);
        assert.equal(scenario.provenance!.recipeVersion, 2);
      }
      const regenerated = regenerateConfiguredScenario(module, core[0].id, practice());
      assert.equal(regenerated.settings!.trainingLevel, level);
      assert.ok(
        regenerated.scenarios
          .filter((s) => s.provenance)
          .every((s) => s.provenance!.level === level),
      );
    }
  }
});
test("Apply is contextual rather than a re-labelled Learn recipe and avoids ambiguous local prose", () => {
  const learn = moduleWithCount(10, "learn"),
    apply = moduleWithCount(10, "apply");
  const learnCore = learn.scenarios.filter((s) => s.provenance),
    applyCore = apply.scenarios.filter((s) => s.provenance);
  for (let i = 0; i < learnCore.length; i++) {
    assert.equal(learnCore[i].provenance!.conceptId, applyCore[i].provenance!.conceptId);
    assert.notEqual(learnCore[i].patientQuote, applyCore[i].patientQuote);
    assert.notDeepEqual(
      learnCore[i].kind === "mcq" && learnCore[i].options,
      applyCore[i].kind === "mcq" && applyCore[i].options,
    );
  }
  const settings = {
    ...defaultModuleSettings(),
    extra: "Follow the special arrangement discussed last week.",
  };
  const p = practice();
  const baseline = configuredScenarios("appointment-booking", "Booking", p, settings);
  const applied = configuredScenarios("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "apply",
  });
  assert.ok(JSON.stringify(baseline).includes(settings.extra));
  assert.ok(!JSON.stringify(applied).includes(settings.extra));
  assert.ok(applied[0].title.startsWith("Routing:"));
});
test("legacy settings remain mixed; other topics ignore an Appointment Booking level", () => {
  const legacy = moduleWithCount();
  assert.equal(legacy.settings!.trainingLevel, undefined);
  assert.ok(legacy.scenarios.some((s) => s.provenance?.level === "learn"));
  assert.ok(legacy.scenarios.some((s) => s.provenance?.level === "apply"));
  for (const topic of Object.keys(topicFields).filter((t) => t !== "appointment-booking")) {
    const settings = { ...defaultModuleSettings(), extra: "Confirm the request with the patient." };
    const plain = generateConfiguredModule(topic, topic, practice(), settings);
    const levelled = generateConfiguredModule(topic, topic, practice(), {
      ...settings,
      trainingLevel: "apply",
    });
    assert.deepEqual(
      plain.map(({ id, ...s }) => s),
      levelled.map(({ id, ...s }) => s),
    );
  }
});

test("structured booking processes provide distinct Learn/Apply exercises without any team names", () => {
  const p = practice();
  p.staff = [];
  p.bookingConfig = {
    version: 1,
    sameDayProcess: { id: "triage", other: "" },
    routineProcess: { id: "direct", other: "" },
    sameDayInstruction: "",
    routineInstruction: "",
    sameDayPathway: { selected: [], custom: [], instruction: "" },
    sendUncertainToDutyClinician: false,
    escalation: {
      contact: { kind: "role", role: "Duty clinician" },
      method: { id: "person", other: "" },
      instruction: "",
    },
  };
  const settings = { ...defaultModuleSettings(), count: 10 };
  const learn = generateConfiguredModule("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "learn",
  });
  const apply = generateConfiguredModule("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "apply",
  });
  assert.equal(apply.length, 10);
  assert.equal(apply.filter((s) => s.provenance).length, 3);
  assert.equal(apply.filter((s) => !s.provenance).length, 7);
  for (const title of [
    "An eligible same-day request",
    "A routine booking request",
    "An unclear booking route",
  ]) {
    const l = learn.find((s) => s.title === title)!,
      a = apply.find((s) => s.title === title)!;
    assert.ok(l?.kind === "mcq" && a?.kind === "mcq");
    assert.equal(l.options[l.correctIndex], a.options[a.correctIndex]);
    assert.notEqual(l.patientQuote, a.patientQuote);
    assert.match(l.question, /procedure/);
    assert.match(a.question, /do next/);
  }
  const sig = (s: (typeof apply)[number]) =>
    s.kind === "mcq" ? JSON.stringify([s.patientQuote, s.question, s.options[s.correctIndex]]) : "";
  const recognition = new Set(learn.map(sig));
  assert.ok(apply.every((s) => !recognition.has(sig(s))));
  const rolesOnly = configuredScenarios("appointment-booking", "Booking", practice(), {
    ...settings,
    trainingLevel: "apply",
  });
  assert.ok(
    rolesOnly.some((s) => s.kind === "mcq" && s.options[s.correctIndex].includes("Practice Nurse")),
  );
  p.bookingConfig.sameDayInstruction = "Only in the circumstances discussed in the meeting";
  p.bookingConfig.escalation.instruction = "Only if the additional condition applies";
  const qualified = configuredScenarios("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "apply",
  });
  assert.ok(
    !qualified.some(
      (s) => s.title === "An eligible same-day request" || s.title === "An unclear booking route",
    ),
  );
  delete p.bookingConfig;
  p.roleRequests = {};
  assert.deepEqual(
    configuredScenarios("appointment-booking", "Booking", p, {
      ...settings,
      trainingLevel: "apply",
    }),
    [],
  );
});

test("Handle remains a disabled UI choice and cannot produce Appointment Booking training", () => {
  const handle = trainingLevelOptions.find((l) => l.value === "handle")!;
  assert.equal(handle.disabled, true);
  assert.ok(trainingLevelOptions.filter((l) => l.value !== "handle").every((l) => !l.disabled));
  const settings = { ...defaultModuleSettings(), trainingLevel: "handle" } as unknown as ReturnType<
    typeof defaultModuleSettings
  >;
  assert.deepEqual(
    generateConfiguredModule("appointment-booking", "Booking", practice(), settings),
    [],
  );
  for (const c of coreTrainingLibrary) {
    assert.equal(
      generateCoreScenario(
        c.id,
        { topicKey: "appointment-booking", practice: practice(), settings },
        "handle",
      ).scenario,
      undefined,
    );
  }
});

test("local Learn states the request directly, keeping natural titles and distinct Apply situations", () => {
  const p = practice();
  p.roleRequests = {};
  p.rolePolicies.gpsSameDay =
    "Same-day with a GP: mental health crisis, new severe headache, under-5 illness. When unsure — duty triage first.";
  const settings = defaultModuleSettings();
  const learn = configuredScenarios("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "learn",
  });
  const apply = configuredScenarios("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "apply",
  });
  assert.ok(learn.every((s) => !s.patientQuote.startsWith("Request:")));
  const child = learn.find((s) => s.title === "An unwell young child");
  assert.equal(child?.patientQuote, "The practice is contacted about illness in a child under 5.");
  assert.ok(!child?.patientQuote.includes("3-year-old"));
  for (const [title, request] of [
    ["A distressed caller needs help", "mental health crisis"],
    ["A new concern over the phone", "new severe headache"],
  ]) {
    const l = learn.find((s) => s.title === title),
      a = apply.find((s) => s.title === title);
    assert.ok(l?.kind === "mcq" && a?.kind === "mcq");
    assert.equal(l.patientQuote, `A patient contacts the practice about a ${request}.`);
    assert.doesNotMatch(
      l.patientQuote,
      /Request:|phone|calls|in.person|today|yesterday|distressed|cope|urgent|emergency/i,
    );
    assert.match(l.question, /practice’s procedure/);
    assert.doesNotMatch(l.patientQuote, /new receptionist|handles a|asks how/);
    assert.match(a.patientQuote, /^A patient calls/);
    assert.equal(l.options[l.correctIndex], a.options[a.correctIndex]);
    assert.notDeepEqual(new Set(l.options), new Set(a.options));
  }
});

test("local choices use only explicit unqualified booking actions and vary deterministically", () => {
  const p = practice();
  p.bookingConfig = {
    version: 1,
    sameDayProcess: { id: "triage", other: "" },
    routineProcess: { id: "direct", other: "" },
    sameDayInstruction: "",
    routineInstruction: "",
    sameDayPathway: { selected: [], custom: [], instruction: "" },
    sendUncertainToDutyClinician: false,
    escalation: {
      contact: { kind: "role", role: "Duty clinician" },
      method: { id: "person", other: "" },
      instruction: "",
    },
  };
  const settings = defaultModuleSettings();
  const get = (level: "learn" | "apply") =>
    configuredScenarios("appointment-booking", "Booking", p, { ...settings, trainingLevel: level });
  const learn = get("learn"),
    apply = get("apply");
  const titles = [
    "An eligible same-day request",
    "A routine booking request",
    "An unclear booking route",
  ];
  const sets: string[] = [];
  for (const title of titles) {
    const l = learn.find((s) => s.title === title)!,
      a = apply.find((s) => s.title === title)!;
    assert.ok(l.kind === "mcq" && a.kind === "mcq");
    assert.equal(l.options[l.correctIndex], a.options[a.correctIndex]);
    assert.notDeepEqual(new Set(l.options), new Set(a.options));
    assert.deepEqual(a, { ...get("apply").find((s) => s.title === title)!, id: a.id });
    assert.doesNotMatch(l.patientQuote, /new receptionist|handles a/);
    assert.ok(a.options.some((o) => /clinical triage/.test(o)));
    assert.ok(a.options.some((o) => /Book the routine/.test(o)));
    sets.push(JSON.stringify(a.options.slice(1).sort()));
  }
  assert.equal(new Set(sets).size, 3);
  p.bookingConfig.routineProcess = { id: "other", other: "Invented booking team" };
  p.bookingConfig.escalation.instruction = "Use the hidden custom department";
  const withoutRoutes = get("apply").find((s) => s.title === titles[0])!;
  assert.ok(withoutRoutes.kind === "mcq");
  assert.doesNotMatch(
    JSON.stringify(withoutRoutes.options),
    /routine appointment|Duty clinician|Invented|hidden custom department/,
  );
});
