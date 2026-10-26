import * as questionQuality from "../src/lib/question-quality.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as config from "../src/lib/module-config.ts";
import * as presentation from "../src/lib/module-presentation.ts";
import * as practiceConfig from "../src/lib/practice-config.ts";
import { empty, practice } from "./fixtures/role-matching.ts";

const topics = Object.keys(config.topicFields);
function settingsFor(topic: string) {
  const settings = {
    ...config.defaultModuleSettings(),
    trainingLevel: "learn" as const,
    customOptions: {} as Record<string, { id: string; label: string }[]>,
  };
  config.topicFields[topic]
    .filter((f) => !f.legacyOnly)
    .forEach((field) => {
      const option = field.options.find((o) => !field.detailOptions?.[o] && !/depends/i.test(o));
      if (option) settings.answers[field.key] = option;
    });
  settings.extra = "When unsure -> Ask the reception lead to check the " + topic + " task";
  return settings;
}

for (const topic of topics.filter((t) => t !== "appointment-booking")) {
  test(
    topic +
      ": Learn/Apply, training type and finite length affect actual generation without importing booking procedures",
    () => {
      const p = empty();
      const settings = settingsFor(topic);
      const easy = config.generateConfiguredModule(topic, topic, p, settings);
      const hard = config.generateConfiguredModule(topic, topic, p, {
        ...settings,
        difficulty: "advanced",
        trainingLevel: "apply",
      });
      assert.ok(easy.length && hard.length, topic);
      assert.ok(
        hard.every((q) => q.patientQuote.trim()),
        "Apply uses grounded situations: " + topic,
      );
      for (const questions of [easy, hard]) {
        const objectives = questions.flatMap((q) =>
          q.kind === "mcq" && q.generationObjective ? [q.generationObjective.source] : [],
        );
        assert.equal(
          new Set(objectives).size,
          objectives.length,
          "no repeated teaching objectives: " + topic,
        );
      }
      // Comparable fields may have only one defensible alternative; do not require filler.
      assert.ok(
        easy.every((s) => s.kind === "mcq" && s.options.length >= 2 && s.options.length <= 3),
      );
      assert.ok(
        hard.every((s) => s.kind === "mcq" && s.options.length >= 2 && s.options.length <= 4),
      );
      assert.ok(easy.every((q) => !/A colleague asks for help/.test(q.patientQuote)));
      assert.notDeepEqual(
        easy.map((q) => [q.patientQuote, q.question]),
        hard.map((q) => [q.patientQuote, q.question]),
      );
      assert.ok(easy.every((s) => s.question.endsWith("?")));
      assert.doesNotMatch(
        JSON.stringify([...easy, ...hard]),
        /checking the practice guidance|Routing:|Approach Doctor|Apply this step to this type|Which response best reflects/,
      );
      // Retired difficulty must not influence content, even on older saved settings.
      for (const difficulty of ["easy", "intermediate", "advanced"] as const) {
        const legacy = config.generateConfiguredModule(topic, topic, p, {
          ...settings,
          difficulty,
        });
        assert.deepEqual(
          legacy.map(({ id, ...s }) => s),
          easy.map(({ id, ...s }) => s),
        );
      }
      for (const question of [...easy, ...hard]) {
        assert.equal(question.status, "draft");
        assert.equal(question.followUpFor, undefined);
        assert.ok(question.kind === "mcq");
        assert.ok(question.options[question.correctIndex].trim());
        assert.equal(question.provenance?.kind, "configured_fact");
        const snapshot = question.provenance!.snapshot as { rule: string };
        assert.ok(
          config.moduleFacts(topic, p, settings).some((f) => f.rule === snapshot.rule),
          topic,
        );
        assert.doesNotMatch(
          question.options.join(" "),
          /Ignore|negligent|Press the patient|correcting the patient|Which response best reflects/,
        );
        assert.ok(!question.provenance || question.provenance.kind !== "sequence");
      }
      const medium = config.generateConfiguredModule(topic, topic, p, {
        ...settings,
        difficulty: "intermediate",
      });
      assert.ok(
        medium.every((s) => s.kind === "mcq" && s.options.length >= 2 && s.options.length <= 3),
      );
      for (const length of config.lengthOptions) {
        const generated = config.generateConfiguredModule(topic, topic, p, {
          ...settings,
          length: length.key,
          count: length.key === "custom" ? 1 : length.count,
        });
        assert.equal(
          generated.length,
          Math.min(easy.length, length.key === "custom" ? 1 : length.count),
        );
      }
      for (const trainingLevel of ["learn", "apply"] as const) {
        assert.deepEqual(
          config.generateConfiguredModule(topic, topic, p, {
            ...config.defaultModuleSettings(),
            trainingLevel,
            difficulty: "advanced",
          }),
          [],
        );
      }
      const module = {
        id: "m",
        title: topic,
        type: topic,
        topicKey: topic,
        published: false,
        createdAt: 1,
        settings: { ...settings, trainingLevel: "apply" as const, difficulty: "advanced" as const },
        scenarios: hard,
      };
      const regenerated = config.regenerateConfiguredScenario(module, hard[0].id, p);
      assert.equal(regenerated.scenarios.length, hard.length);
      assert.ok(
        regenerated.scenarios.every(
          (s) => s.kind === "mcq" && s.options.length >= 2 && s.options.length <= 4,
        ),
      );
    },
  );
}

test("topic facts use the relevant saved practice information and leave unrelated data out", () => {
  const p = empty();
  Object.assign(p, {
    repeatOrderMethods: "Prescription sentinel",
    localSafeguarding: "Safeguarding sentinel",
    localConfidentiality: "Confidentiality sentinel",
    localComplaints: "Complaints sentinel",
    hours: "Hours sentinel",
    localDNA: "DNA sentinel",
  });
  const expected: Record<string, string[]> = {
    prescriptions: ["Prescription"],
    urgent: ["Safeguarding"],
    results: ["Confidentiality"],
    vaccines: [],
    "fit-notes": ["Confidentiality"],
    "home-visits": [],
    difficult: ["Safeguarding", "Confidentiality", "Complaints"],
    "first-week": ["Prescription", "Safeguarding", "Confidentiality", "Hours", "DNA"],
    custom: [],
  };
  for (const [topic, names] of Object.entries(expected)) {
    const facts = config.moduleFacts(topic, p, config.defaultModuleSettings());
    const text = facts.map((f) => f.rule).join(" ");
    for (const sentinel of [
      "Prescription",
      "Safeguarding",
      "Confidentiality",
      "Complaints",
      "Hours",
      "DNA",
    ])
      assert.equal(
        text.includes(sentinel + " sentinel"),
        names.includes(sentinel),
        topic + ": " + sentinel,
      );
  }
});

const require = createRequire(import.meta.url);
const elements = (n: any): any[] =>
  !n || typeof n !== "object"
    ? []
    : Array.isArray(n)
      ? n.flatMap(elements)
      : [n, ...elements(n.props?.children)];
test("every topic uses the real shared creation controls and saves the selected generation settings", async () => {
  const source = readFileSync(
    new URL("../src/components/PredefinedModuleSetup.tsx", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  for (const topic of topics) {
    const states: any[] = [];
    let index = 0,
      saved: any;
    const imports: Record<string, any> = {
      react: {
        useState: (initial: any) => {
          const i = index++;
          if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
          return [
            states[i],
            (next: any) => {
              states[i] = typeof next === "function" ? next(states[i]) : next;
            },
          ];
        },
      },
      "@tanstack/react-router": { Link: "a", useNavigate: () => async () => {} },
      "./Shell": { Shell: "main", Card: "section" },
      "./PracticeProcessFields": { BookingFields: "div", PrescriptionFields: "div" },
      "./ModuleQuestion": { ModuleQuestion: "div" },
      "@/lib/dev-procedure-diagnostics": { captureProcedureDiagnostics() {} },
      "@/lib/backend": { flushPractice: async () => {} },
      "@/lib/practice-config": practiceConfig,
      "@/lib/module-config": config,
      "@/lib/store": {
        useApp: () => ({
          practiceData: topic === "appointment-booking" ? practice() : empty(),
          modules: [{ id: "draft", settings: { ...settingsFor(topic), difficulty: "advanced" } }],
          configureModule: (_id: string, settings: any, questions: any) => {
            saved = { settings, questions };
          },
        }),
      },
    };
    const exports: any = {};
    new Function("require", "exports", js)(
      (id: string) =>
        imports[id] ?? (id === "@/lib/question-quality" ? questionQuality : require(id)),
      exports,
    );
    const render = () => {
      index = 0;
      return elements(exports.PredefinedModuleSetup({ topic, title: topic, id: "draft" }));
    };
    const initial = render();
    const cta = initial.find(
      (n) => n.type === "button" && n.props.children === "Choose Training Type & Length",
    );
    const row = initial.find((n) => n.type === "div" && n.props.children === cta);
    assert.ok(row, topic + ": CTA has its own block row, separate from setup/review links");
    cta.props.onClick();
    const select = (name: string, value: string) => {
      const radio = render().find(
        (n) => n.type === "input" && n.props.name === name && n.props.value === value,
      );
      assert.ok(radio, topic + ": " + name + " " + value);
      radio.props.onChange();
    };
    select("training-level", "apply");
    assert.ok(!render().some((n) => n.props?.name === "module-difficulty"));
    const handle = render().find(
      (n) => n.props?.name === "training-level" && n.props.value === "handle",
    );
    assert.ok(handle?.props.disabled);
    select("module-length", "custom");
    render()
      .find((n) => n.type === "input" && n.props.type === "number")
      .props.onChange({ target: { value: "1" } });
    await render()
      .find((n) => n.type === "button" && n.props.children === "Save settings and regenerate")
      .props.onClick();
    assert.equal(saved.settings.trainingLevel, "apply");
    assert.equal(saved.settings.difficulty, undefined);
    assert.equal(saved.questions.length, 1);
  }
});

test("factual questions retain the decision and exact saved answer with retired difficulty metadata ignored", () => {
  const p = empty();
  p.repeatTurnaround = "72 working hours";
  for (const trainingLevel of ["learn", "apply"] as const) {
    for (const difficulty of ["easy", "intermediate", "advanced"] as const) {
      const questions = config.generateConfiguredModule("prescriptions", "Prescriptions", p, {
        ...config.defaultModuleSettings(),
        trainingLevel,
        difficulty,
      });
      if (trainingLevel === "apply") {
        assert.deepEqual(questions, [], "a turnaround fact alone cannot invent an Apply decision");
        continue;
      }
      const question = questions.find((s) => s.title === "Prescription Turnaround");
      assert.ok(question?.kind === "mcq");
      assert.match(question.question, /process(?:ing|ed)/i);
      assert.ok(question.options[question.correctIndex].includes("72 working hours"));
      assert.ok(
        question.options
          .filter((_, i) => i !== question.correctIndex)
          .every((option) => /^\d+ working hours$/.test(option)),
      );
      assert.doesNotMatch(question.patientQuote, /instructions for .*\?\./);
    }
  }
});

test("difficult-call responses use plausible communication choices and the configured best response", () => {
  const p = empty();
  p.rolePolicies.phrasesUse = "Acknowledge the concern and explain what can happen next";
  const questions = config.generateConfiguredModule("difficult", "Difficult calls", p, {
    ...config.defaultModuleSettings(),
    trainingLevel: "apply",
    difficulty: "advanced",
  });
  const question = questions.find((s) => s.title === "Responding To A Concern");
  assert.ok(question?.kind === "mcq");
  assert.equal(question.question, "What would be the best way to respond?");
  assert.equal(
    question.options[question.correctIndex],
    presentation.readableGuidance(p.rolePolicies.phrasesUse),
  );
  assert.ok(question.options.some((option) => option.includes("more slowly")));
  assert.ok(question.options.some((option) => option.includes("colleague")));
  assert.doesNotMatch(
    JSON.stringify(question),
    /Press the patient|correcting.*tone|good care navigation/,
  );
});

test("topic decisions reuse alternatives only when the configured decision itself is the same", () => {
  const alternatives = [
    "prescriptions",
    "results",
    "vaccines",
    "fit-notes",
    "home-visits",
    "first-week",
  ].map((topic) => {
    const settings = {
      ...settingsFor(topic),
      trainingLevel: "apply" as const,
      difficulty: "advanced" as const,
    };
    const question = config.generateConfiguredModule(topic, topic, empty(), settings)[0];
    assert.ok(question.kind === "mcq");
    return {
      alternatives: question.options.filter((_, i) => i !== question.correctIndex).join("|"),
      correct: question.options[question.correctIndex],
      question: question.question,
    };
  });
  for (let i = 0; i < alternatives.length; i++)
    for (let j = i + 1; j < alternatives.length; j++) {
      if (alternatives[i].alternatives === alternatives[j].alternatives) {
        if (/^Contact /.test(alternatives[i].correct) && /^Contact /.test(alternatives[j].correct))
          continue; // Same contact decision, different configured destination.
        assert.equal(alternatives[i].correct, alternatives[j].correct);
        assert.equal(alternatives[i].question, alternatives[j].question);
      }
    }
});

test("Learn groups confirmed role capabilities while Apply retains distinct patient requests, even for the same role", () => {
  const p = practice([
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8],
  ]);
  const settings = { ...config.defaultModuleSettings(), count: 100 };
  const learn = config.generateConfiguredModule("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "learn",
  });
  const apply = config.generateConfiguredModule("appointment-booking", "Booking", p, {
    ...settings,
    trainingLevel: "apply",
  });
  const capabilities = learn.filter(
    (q) => q.kind === "mcq" && q.generationObjective?.skill === "capability",
  );
  assert.equal(capabilities.length, 2);
  assert.ok(capabilities.every((q) => q.kind === "mcq" && q.correctIndices && !q.patientQuote));
  assert.ok(!learn.some((q) => q.kind === "mcq" && q.localRoleRequestId));
  const candidates = config
    .configuredScenarios("appointment-booking", "Booking", p, {
      ...settings,
      trainingLevel: "apply",
    })
    .filter((q) => q.localRoleRequestId);
  const decisions = apply.filter((q) => q.kind === "mcq" && q.localRoleRequestId);
  assert.deepEqual(
    new Set(decisions.map((q) => q.kind === "mcq" && q.localRoleRequestId)),
    new Set(candidates.map((q) => q.localRoleRequestId)),
  );
  assert.ok(decisions.length > capabilities.length);
  assert.ok(decisions.every((q) => q.patientQuote));
  for (const questions of [learn, apply]) {
    const core = questions.filter((q) => q.provenance?.kind === "core");
    assert.ok(core.length > 0);
    assert.equal(core.length, new Set(core.map((q) => q.provenance!.conceptId)).size);
    assert.ok(questions.filter((q) => q.provenance?.kind !== "core").length >= core.length);
  }
  const original = JSON.stringify(p);
  const q = capabilities[0];
  const module = {
    id: "capabilities",
    title: "Booking",
    type: "Booking",
    topicKey: "appointment-booking",
    published: false,
    createdAt: 1,
    settings: { ...settings, trainingLevel: "learn" as const },
    scenarios: learn,
  };
  const regenerated = config
    .regenerateConfiguredScenario(module, q.id, p)
    .scenarios.find((s) => s.id === q.id)!;
  assert.equal(regenerated.provenance?.kind, "configured_fact");
  assert.deepEqual(regenerated.provenance, q.provenance);
  assert.equal(JSON.stringify(p), original);
});

test("relative lengths and Custom describe targets, never promised numerical ranges", () => {
  assert.deepEqual(
    config.lengthOptions.map((o) => o.description),
    ["Short refresher", "Balanced training", "Most comprehensive", "Choose your target length"],
  );
  assert.ok(
    config.lengthOptions.every((o) => !/\d|minutes|questions/.test(o.label + o.description)),
  );
  const p = empty();
  const settings = {
    ...config.defaultModuleSettings(),
    trainingLevel: "learn" as const,
    length: "custom" as const,
    count: 100,
    extra: "When unsure -> Ask the reception lead to check the task",
  };
  const questions = config.generateConfiguredModule("custom", "Custom", p, settings);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].provenance?.kind, "configured_fact");
});

test("allocation retains separate named staff exceptions and capability questions keep review provenance", async () => {
  const { recordedSourceChanges } = await import("../src/lib/practice-change-tracking.ts");
  const { evaluateAnswer } = await import("../src/lib/training.ts");
  const p = practice([[0, 1, 2]]);
  const role = Object.values(p.roleRequests!)[0];
  p.staff = ["Alex", "Sam"].map((name) => ({
    id: name,
    name,
    role: role.label,
    clinics: "",
    requestOverrides: { [role.roleId]: { [role.selectedRequestIds[0]]: false } },
  }));
  for (const trainingLevel of ["learn", "apply"] as const) {
    const questions = config.generateConfiguredModule("appointment-booking", "Booking", p, {
      ...config.defaultModuleSettings(),
      trainingLevel,
      count: 100,
    });
    const exceptions = questions.filter(
      (q) => q.kind === "mcq" && q.generationObjective?.skill === "exception",
    );
    assert.equal(exceptions.length, 2);
    assert.ok(exceptions.some((q) => q.title.includes("Alex")));
    assert.ok(exceptions.some((q) => q.title.includes("Sam")));
    if (trainingLevel === "learn") {
      const capability = questions.find(
        (q) => q.kind === "mcq" && q.generationObjective?.skill === "capability",
      );
      assert.ok(capability?.kind === "mcq" && capability.correctIndices);
      assert.equal(evaluateAnswer(capability, capability.correctIndices.map(String)), true);
      assert.equal(
        evaluateAnswer(capability, capability.correctIndices.slice(1).map(String)),
        false,
      );
      assert.equal(
        recordedSourceChanges(capability, [
          {
            path: "practiceData.roleRequests",
            label: "Role responsibilities",
            reason: "Responsibilities changed",
          },
        ]).length,
        1,
      );
    }
  }
});

test("Learn samples capabilities without padding omitted responsibilities or limiting Apply coverage", () => {
  const p = practice([[0, 1, 2, 3, 4, 5, 6, 10, 14]]);
  const role = Object.values(p.roleRequests!)[0];
  const before = JSON.stringify(p);
  const settings = {
    ...config.defaultModuleSettings(),
    trainingLevel: "learn" as const,
    count: 100,
  };
  for (const topic of ["appointment-booking", "first-week"]) {
    const questions = config.generateConfiguredModule(topic, topic, p, settings);
    const capabilities = questions.filter(
      (q) => q.kind === "mcq" && q.generationObjective?.skill === "capability",
    );
    assert.equal(capabilities.length, 1, "no duplicate capability questions to cover omissions");
    const q = capabilities[0];
    assert.ok(q.kind === "mcq" && q.correctIndices);
    assert.equal(q.options.length, 6);
    assert.equal(q.correctIndices.length, 4);
    const correct = q.correctIndices.map((i) => q.options[i]);
    const catalog = role.categories.flatMap((c) => c.requests);
    const selected = catalog.filter((r) => role.selectedRequestIds.includes(r.id));
    for (const [i, option] of q.options.entries()) {
      const request = catalog.find((r) => r.label === option);
      assert.ok(request, "every choice comes from the existing responsibility catalogue");
      assert.equal(role.selectedRequestIds.includes(request.id), q.correctIndices.includes(i));
    }
    for (const category of role.categories
      .filter((c) => c.requests.some((r) => role.selectedRequestIds.includes(r.id)))
      .slice(0, 4)) {
      assert.ok(
        category.requests.some((r) => correct.includes(r.label)),
        "sample across categories when available",
      );
    }
    const omitted = selected.filter((r) => !correct.includes(r.label));
    assert.ok(omitted.length > 0);
    assert.ok(
      omitted.every((r) => !q.options.includes(r.label) && !q.learningPoint.includes(r.label)),
    );
    assert.match(q.question, /Which of these requests/);
    assert.match(q.learningPoint, /Among the requests shown/);
    assert.match(q.learningPoint, /selection of the role’s responsibilities/);
    assert.match(q.learningPoint, /Check individual staff exceptions/);
    assert.deepEqual((q.provenance!.snapshot as any).role, role, "retain the full source snapshot");
    assert.ok(
      !questions.some((q) => q.kind === "mcq" && q.localRoleRequestId),
      "do not backfill omitted capabilities with routing questions",
    );
    assert.ok(questions.length < settings.count);
    const apply = config.generateConfiguredModule(topic, topic, p, {
      ...settings,
      trainingLevel: "apply",
    });
    for (const request of omitted) {
      const decision = apply.find((q) => q.kind === "mcq" && q.localRoleRequestId === request.id);
      assert.ok(
        decision?.kind === "mcq" && decision.patientQuote,
        "Apply retains the distinct patient problem",
      );
      assert.ok(decision.options[decision.correctIndex].includes(role.label));
    }
  }
  assert.equal(JSON.stringify(p), before);
});
