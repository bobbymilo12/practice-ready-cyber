import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as training from "../src/lib/training.ts";
import * as sequence from "../src/lib/sequence.ts";
import type { Module, Scenario, MatchingScenario } from "../src/lib/training-types.ts";
import type { AnswerValue } from "../src/lib/training.ts";
import { sequencePreviewModule } from "./fixtures/sequence.ts";

// Exercise the actual training screen's draft/check handlers without a browser dependency.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/routes/train.tsx", import.meta.url), "utf8").replace(
  /import\.meta\.env\.DEV/g,
  "false",
);
const code =
  ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText + "\nexports.ScenarioBlock = ScenarioBlock;";
const mcq: Scenario = {
  id: "q",
  kind: "mcq",
  title: "Practice request",
  patientQuote: "A request.",
  question: "What next?",
  options: ["Wrong", "Correct"],
  correctIndex: 1,
  learningPoint: "Follow the confirmed process.",
  status: "approved",
};
const matching: MatchingScenario = {
  id: "matching",
  kind: "matching",
  title: "Roles",
  question: "Match the requests.",
  items: [
    { id: "a", label: "Request A" },
    { id: "b", label: "Request B" },
  ],
  targets: [
    { id: "x", label: "Role X", kind: "role" },
    { id: "y", label: "Role Y", kind: "role" },
  ],
  validMatches: { a: ["x"], b: ["y"] },
  pairingMode: "one_to_one",
  learningPoint: "Use the confirmed roles.",
  status: "approved",
  provenance: {
    kind: "practice_role_matching",
    generatorVersion: 2,
    level: "learn",
    source: "practice_setup",
    paths: [],
    snapshot: [],
  },
};
const legacyOrder: Scenario = {
  id: "order",
  kind: "order",
  title: "Procedure",
  patientQuote: "",
  question: "Order the steps.",
  steps: ["First", "Second", "Third"],
  learningPoint: "First, then Second, then Third.",
  status: "approved",
};
const moduleFor = (scenario: Scenario, recovery = true): Module => ({
  id: "m",
  type: "Test",
  title: "Test training",
  topicKey: "test",
  published: true,
  createdAt: 1,
  scenarios: [
    scenario,
    ...(recovery ? [{ ...scenario, id: "recovery", followUpFor: scenario.id }] : []),
  ],
});
const assignment = {
  id: "a",
  moduleId: "m",
  traineeId: "t",
  assignedAt: 1,
  status: "assigned" as const,
};
const elements = (node: any): any[] =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap(elements)
      : [node, ...elements(node.props?.children)];
function harness(scenario: Scenario, preview = false) {
  const module = moduleFor(scenario);
  let session = training.startSession(module, assignment, "attempt");
  let rejectNext = false;
  let calls = 0,
    stateIndex = 0;
  const states: any[] = [];
  const exports: any = {};
  const imports: Record<string, any> = {
    react: {
      useState: (initial: any) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [
          states[index],
          (next: any) => {
            states[index] = next;
          },
        ];
      },
    },
    "@tanstack/react-router": { createFileRoute: () => (options: unknown) => options },
    "@/components/Shell": { Card: "section" },
    "@/components/SequenceBoard": { SequenceBoard: "SequenceBoard" },
    "@/components/MatchingBoard": { MatchingBoard: "MatchingBoard" },
    "@/lib/sequence": sequence,
    "@/lib/training": training,
    "@/lib/store": {},
    "@/lib/backend": {},
  };
  new Function("require", "exports", code)((id: string) => imports[id] ?? require(id), exports);
  const render = () => {
    stateIndex = 0;
    return elements(
      exports.ScenarioBlock({
        scenario,
        answer: session.answers.find((answer) => answer.scenarioId === scenario.id),
        busy: false,
        preview,
        onAnswer: (value: AnswerValue) => {
          calls++;
          if (rejectNext) {
            rejectNext = false;
            return;
          }
          session = training.answerSession(session, value);
        },
        onContinue: () => {},
        onPrevious: () => {},
        isFirst: true,
        isLast: false,
      }),
    );
  };
  const button = (label: string) =>
    render().find((node) => node.type === "button" && node.props.children === label);
  const choice = (index: number) =>
    render().filter((node) => node.type === "button" && "aria-pressed" in node.props)[index];
  return {
    render,
    button,
    choice,
    module,
    failNextCheck: () => {
      rejectNext = true;
    },
    get session() {
      return session;
    },
    get calls() {
      return calls;
    },
  };
}

test("MCQ edits are drafts; wrong then correct before Check records a correct first response", () => {
  const h = harness(mcq);
  h.choice(0).props.onClick();
  assert.equal(h.calls, 0);
  assert.deepEqual(h.session.answers, []);
  assert.deepEqual(h.session.queue, [mcq.id]);
  assert.equal(h.button("Continue →").props.disabled, true);
  h.choice(1).props.onClick();
  assert.equal(h.calls, 0);
  h.button("Check answer").props.onClick();
  assert.equal(h.calls, 1);
  assert.equal(h.session.answers[0].value, 1);
  assert.equal(h.session.answers[0].correct, true);
  assert.deepEqual(h.session.queue, [mcq.id]);
  assert.equal(h.button("Continue →").props.disabled, false);
  assert.equal(h.choice(0).props.disabled, true);
  assert.ok(!h.button("Check answer"));
  assert.equal(
    training.submitSession(training.advanceSession(h.session, h.module.title), h.module.title)
      .result?.correct,
    1,
  );
});

test("incorrect Check locks the first response, schedules recovery once and survives reload/retry", () => {
  const h = harness(mcq);
  h.choice(0).props.onClick();
  h.button("Check answer").props.onClick();
  assert.ok(h.render().some((node) => node.props?.children === "Incorrect."));
  let session = JSON.parse(JSON.stringify(h.session));
  assert.deepEqual(session.queue, [mcq.id, "recovery"]);
  const recorded = JSON.stringify(session);
  session = training.answerSession(session, 1);
  session = training.answerSession(session, 0);
  assert.equal(JSON.stringify(session), recorded);
  session = training.advanceSession(session, h.module.title);
  session = training.answerSession(session, 1);
  session = training.submitSession(
    training.advanceSession(session, h.module.title),
    h.module.title,
  );
  assert.equal(session.result?.correct, 0);
  assert.equal(session.result?.total, 1);
  assert.deepEqual(session.result?.recoveredTitles, [mcq.title]);
  assert.equal(session.result?.scoreBasis, "first_committed");
});

test("matching pair edits do not score or recover until the whole answer is checked", () => {
  const h = harness(matching);
  const board = () => h.render().find((node) => node.type === "MatchingBoard");
  board().props.onChange({ a: "x" });
  assert.equal(h.button("Check answer").props.disabled, true);
  assert.throws(() => training.answerSession(h.session, { a: "x" }), /Match every/);
  board().props.onChange({ a: "y", b: "x" });
  assert.equal(h.calls, 0);
  assert.deepEqual(h.session.queue, [matching.id]);
  board().props.onChange({ a: "x", b: "y" });
  h.button("Check answer").props.onClick();
  assert.equal(h.session.answers[0].correct, true);
  assert.equal(board().props.disabled, true);
  assert.deepEqual(h.session.queue, [matching.id]);
  const wrong = training.answerSession(training.startSession(h.module, assignment, "wrong"), {
    a: "y",
    b: "x",
  });
  assert.deepEqual(wrong.queue, [matching.id, "recovery"]);
  assert.deepEqual(training.answerSession(wrong, { a: "x", b: "y" }), wrong);
});

test("structured ordering movements remain drafts until Check answer", () => {
  const scenario = sequencePreviewModule().scenarios[0];
  assert.ok(scenario.kind === "order" && scenario.sequence);
  const h = harness(scenario);
  const board = () => h.render().find((node) => node.type === "SequenceBoard");
  board().props.onChange([...scenario.sequence.correctOrder].reverse());
  assert.equal(h.calls, 0);
  assert.deepEqual(h.session.answers, []);
  assert.deepEqual(h.session.queue, [scenario.id]);
  board().props.onChange(scenario.sequence.correctOrder);
  h.button("Check answer").props.onClick();
  assert.equal(h.session.answers[0].correct, true);
  assert.equal(board().props.disabled, true);
  assert.deepEqual(h.session.queue, [scenario.id]);
});

test("legacy ordering arrows edit locally and Check commits one complete order", () => {
  const h = harness(legacyOrder);
  const arrow = (label: string) => h.render().find((node) => node.props?.["aria-label"] === label);
  arrow("Move step 3 up").props.onClick();
  arrow("Move step 2 up").props.onClick();
  assert.equal(h.calls, 0);
  assert.deepEqual(h.session.answers, []);
  h.button("Check answer").props.onClick();
  assert.equal(h.calls, 1);
  assert.equal(h.session.answers[0].correct, true);
  assert.equal(arrow("Move step 2 up").props.disabled, true);
});

test("legacy complete answers are retained and incomplete matching remains checkable", () => {
  const module = moduleFor(matching, false);
  let session = training.startSession(module, assignment, "legacy");
  delete session.answerFlow;
  session.answers = [
    { scenarioId: matching.id, value: { a: "x" }, correct: false, title: matching.title },
  ];
  assert.equal(training.committedAnswer(session, matching), undefined);
  assert.equal(training.assignmentProgress(assignment, [session]).fraction, 0);
  assert.throws(() => training.advanceSession(session, module.title), /Check answer/);
  session = training.answerSession(session, { a: "x", b: "y" });
  const saved = JSON.stringify(session);
  assert.equal(JSON.stringify(training.answerSession(session, { a: "y", b: "x" })), saved);
  session = training.submitSession(training.advanceSession(session, module.title), module.title);
  assert.equal(session.result?.correct, 1);
  assert.equal(session.result?.scoreBasis, undefined);
  assert.deepEqual(training.submitSession(session, module.title), session);
});

test("manager preview checks and shows feedback without recording trainee results", () => {
  const h = harness(mcq, true);
  h.choice(1).props.onClick();
  h.button("Check answer").props.onClick();
  assert.equal(h.calls, 0);
  assert.ok(h.render().some((node) => node.props?.children === "Correct."));
  assert.equal(h.button("Continue →").props.disabled, false);
  assert.deepEqual(h.session.answers, []);
});

test("failed persistence keeps the draft editable and Check can be retried", () => {
  const h = harness(mcq);
  h.choice(1).props.onClick();
  h.failNextCheck();
  h.button("Check answer").props.onClick();
  assert.deepEqual(h.session.answers, []);
  assert.deepEqual(h.session.queue, [mcq.id]);
  assert.equal(h.choice(1).props["aria-pressed"], true);
  assert.equal(h.choice(0).props.disabled, false);
  assert.equal(h.button("Continue →").props.disabled, true);
  h.button("Check answer").props.onClick();
  assert.equal(h.session.answers[0].correct, true);
});

test("a known incomplete legacy matching response cannot leave premature pending recovery", () => {
  const module = moduleFor(matching);
  let session = training.startSession(module, assignment, "legacy-partial");
  delete session.answerFlow;
  session.answers = [
    { scenarioId: matching.id, title: matching.title, value: { a: "x" }, correct: false },
  ];
  session.queue.push("recovery");
  const correct = training.answerSession(session, { a: "x", b: "y" });
  assert.deepEqual(correct.queue, [matching.id]);
  const wrong = training.answerSession(session, { a: "y", b: "x" });
  assert.deepEqual(wrong.queue, [matching.id, "recovery"]);
});

test("results identify first-committed scores and label legacy scores without rewriting them", () => {
  const source = readFileSync(new URL("../src/routes/results.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const scoreBasis of [undefined, "first_committed"] as const) {
    const result = {
      moduleId: "m",
      moduleTitle: "Training",
      correct: 0,
      total: 1,
      wrongTitles: [],
      completedAt: 1,
      traineeId: "t",
      scoreBasis,
    };
    const before = JSON.stringify(result);
    const state = {
      account: { id: "t", role: "trainee" },
      lastResult: result,
      assignments: [],
      modules: [],
    };
    const imports: Record<string, any> = {
      react: { useState: (initial: unknown) => [initial, () => {}] },
      "@tanstack/react-router": { createFileRoute: () => (options: unknown) => options, Link: "a" },
      "@/components/Shell": { Shell: "main", Card: "section", Badge: "span" },
      "@/lib/sequence": sequence,
      "@/lib/training": training,
      "@/lib/store": { useApp: (select: any) => select(state) },
      "@/lib/backend": { useConnection: (select: any) => select({ sessions: [] }) },
    };
    const exports: any = {};
    new Function("require", "exports", compiled)(
      (id: string) => imports[id] ?? require(id),
      exports,
    );
    const html = require("react-dom/server").renderToStaticMarkup(exports.Route.component());
    assert.ok(html.includes(scoreBasis ? "First-answer score" : "Recorded-answer score"));
    assert.ok(
      html.includes(
        scoreBasis ? "first checked answer" : "earlier selections cannot be reconstructed",
      ),
    );
    assert.equal(JSON.stringify(result), before);
  }
});

test("an incorrect checked ordering response schedules recovery once and freezes its snapshot", () => {
  const scenario = sequencePreviewModule().scenarios[0];
  assert.ok(scenario.kind === "order" && scenario.sequence);
  const h = harness(scenario);
  const wrong = [...scenario.sequence.correctOrder].reverse();
  h.render()
    .find((node) => node.type === "SequenceBoard")
    .props.onChange(wrong);
  h.button("Check answer").props.onClick();
  assert.equal(h.session.answers[0].correct, false);
  assert.deepEqual(h.session.queue, [scenario.id, "recovery"]);
  const saved = JSON.stringify(h.session);
  wrong.reverse();
  const retried = training.answerSession(h.session, scenario.sequence.correctOrder);
  assert.equal(JSON.stringify(retried), saved);
});

test("training screen offers updated content without resuming or rewriting the old attempt", async () => {
  const oldModule = moduleFor(mcq, false);
  const old = training.answerSession(training.startSession(oldModule, assignment, "old"), 0);
  const history = structuredClone(old);
  const current = { ...oldModule, scenarios: [{ ...mcq, learningPoint: "Updated guidance" }] };
  const state: any = {
    account: { id: "t", role: "trainee" },
    assignments: [assignment],
    modules: [current],
    practiceData: { practiceName: "Test" },
  };
  const connection = { sessions: [old] };
  let index = 0;
  const values: any[] = [];
  let starts = 0;
  const exports: any = {};
  const imports: any = {
    react: {
      useState(initial: any) {
        const slot = index++;
        if (!(slot in values)) values[slot] = typeof initial === "function" ? initial() : initial;
        return [
          values[slot],
          (value: any) => {
            values[slot] = value;
          },
        ];
      },
    },
    "@tanstack/react-router": {
      createFileRoute: () => (options: any) => options,
      useNavigate: () => async () => {},
    },
    "@/components/Shell": { Shell: "main", Card: "section" },
    "@/components/SequenceBoard": { SequenceBoard: "SequenceBoard" },
    "@/components/MatchingBoard": { MatchingBoard: "MatchingBoard" },
    "@/lib/sequence": sequence,
    "@/lib/training": training,
    "@/lib/store": { useApp: () => state },
    "@/lib/backend": {
      useConnection: (select: any) => select(connection),
      trainingAction: async (action: string) => {
        assert.equal(action, "start");
        starts++;
        return training.startSession(current, assignment, "new");
      },
    },
  };
  new Function("require", "exports", code + "\nexports.Training = Training;")(
    (id: string) => imports[id] ?? require(id),
    exports,
  );
  const render = () => {
    index = 0;
    return elements(exports.Training({ id: "m" }));
  };
  const initial = render();
  assert.equal(starts, 0);
  const start = initial.find(
    (n) => n.type === "button" && n.props.children === "Start updated training",
  );
  assert.ok(start);
  start.props.onClick();
  await Promise.resolve();
  await Promise.resolve();
  const screen = render();
  const question = screen.find((n) => n.props?.scenario?.id === "q");
  assert.equal(question.props.scenario.learningPoint, "Updated guidance");
  assert.equal(starts, 1);
  assert.deepEqual(old, history);
});

test("multi-select edits stay draft, exact-set Check commits once and all correct choices appear in feedback", () => {
  const question: Scenario = {
    ...mcq,
    options: ["First method", "Second method", "Unsupported method"],
    correctIndex: 0,
    correctIndices: [0, 1],
  };
  const h = harness(question);
  h.choice(2).props.onClick();
  h.choice(2).props.onClick();
  h.choice(0).props.onClick();
  assert.equal(h.calls, 0);
  assert.deepEqual(h.session.queue, [question.id]);
  h.choice(1).props.onClick();
  h.button("Check answer").props.onClick();
  assert.equal(h.calls, 1);
  assert.equal(h.session.answers[0].correct, true);
  assert.deepEqual(h.session.answers[0].value, ["0", "1"]);
  assert.match(JSON.stringify(h.render()), /First method; Second method/);
  assert.equal(h.choice(2).props.disabled, true);
  const wrong = harness(question);
  wrong.choice(0).props.onClick();
  wrong.button("Check answer").props.onClick();
  assert.equal(wrong.session.answers[0].correct, false);
  assert.deepEqual(wrong.session.queue, [question.id, "recovery"]);
  assert.deepEqual(
    training.answerSession(wrong.session, ["0", "1"]).answers,
    wrong.session.answers,
  );
});
