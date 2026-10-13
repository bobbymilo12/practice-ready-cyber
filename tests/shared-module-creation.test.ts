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
    .filter((field) => !field.legacyOnly)
    .forEach((field, i) => {
      const id = "custom:task-" + i;
      settings.customOptions[field.key] = [
        { id, label: "Open the " + topic + " task form " + i + " and record the reference." },
      ];
      settings.answers[field.key] = id;
    });
  settings.extra = "Check the " + topic + " handover reference.";
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
      assert.ok(easy.every((s) => s.kind === "mcq" && s.options.length === 3));
      assert.ok(hard.every((s) => s.kind === "mcq" && s.options.length === 4));
      assert.notEqual(easy[0].patientQuote, hard[0].patientQuote);
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
        assert.match(question.options[question.correctIndex], new RegExp(topic));
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
      assert.ok(medium.every((s) => s.kind === "mcq" && s.options.length === 3));
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
      assert.ok(regenerated.scenarios.every((s) => s.kind === "mcq" && s.options.length === 4));
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
    new Function("require", "exports", js)((id: string) => imports[id] ?? require(id), exports);
    const render = () => {
      index = 0;
      return elements(exports.PredefinedModuleSetup({ topic, title: topic, id: "draft" }));
    };
    render()
      .find((n) => n.type === "button" && n.props.children === "Choose training type + length")
      .props.onClick();
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
      const question = questions.find((s) => s.title === "Prescription turnaround");
      assert.ok(question?.kind === "mcq");
      assert.match(question.question, /information|tell|ready|turnaround/i);
      assert.ok(question.options[question.correctIndex].includes("72 working hours"));
      assert.ok(
        question.options
          .filter((_, i) => i !== question.correctIndex)
          .every((option) => !/\d|same.day|routine|clinical/i.test(option)),
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
  const question = questions.find((s) => s.title === "Supportive language");
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

test("topic decision frames do not reuse identical alternatives across every topic", () => {
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
    return question.options.filter((_, i) => i !== question.correctIndex).join("|");
  });
  assert.equal(new Set(alternatives).size, alternatives.length);
});
