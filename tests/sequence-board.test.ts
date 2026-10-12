import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { moveSequence } from "../src/lib/sequence.ts";
import { sequencePreviewModule } from "./fixtures/sequence.ts";
import { startSession, answerSession } from "../src/lib/training.ts";
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL("../src/components/SequenceBoard.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
function load(react = require("react")) {
  const exports: Record<string, any> = {};
  new Function("require", "exports", compiled)(
    (id: string) =>
      id === "@/lib/sequence" ? { moveSequence } : id === "react" ? react : require(id),
    exports,
  );
  return exports.SequenceBoard;
}
test("rendered cards have drag support and keyboard controls, without answer-key or correctness output", () => {
  const scenario = sequencePreviewModule().scenarios[0];
  if (scenario.kind !== "order" || !scenario.sequence) throw new Error("fixture");
  const html = renderToStaticMarkup(
    createElement(load(), {
      steps: scenario.sequence.steps,
      value: scenario.sequence.presentationOrder,
      disabled: false,
      onChange: () => {},
    }),
  );
  assert.equal((html.match(/<li/g) ?? []).length, 4);
  assert.equal((html.match(/<button/g) ?? []).length, 8);
  assert.ok(html.includes('draggable="true"'));
  assert.ok(html.includes("Move step 1 up"));
  assert.ok(!/correct|incorrect|Select this order/.test(html));
  assert.ok(!source.includes("correctOrder"));
});
test("arrow and drop handlers edit a draft with stable IDs; only checking records an answer", () => {
  const module = sequencePreviewModule();
  const scenario = module.scenarios[0];
  if (scenario.kind !== "order" || !scenario.sequence) throw new Error("fixture");
  let session = startSession(
    module,
    { id: "a", moduleId: module.id, traineeId: "t", assignedAt: 1, status: "assigned" },
    "s",
  );
  const states: unknown[] = [];
  let index = 0,
    saves = 0;
  const Board = load({
    useRef: () => ({ current: {} }),
    useState: (initial: unknown) => {
      const key = index++;
      if (!(key in states)) states[key] = initial;
      return [
        states[key],
        (next: unknown) => {
          states[key] = next;
        },
      ];
    },
  });
  let value = [...scenario.sequence.presentationOrder];
  const render = (disabled = false) => {
    index = 0;
    return Board({
      steps: scenario.sequence!.steps,
      value,
      disabled,
      onChange: (next: string[]) => {
        saves++;
        // Match the training screen: board movements only update a local draft.
        value = next;
      },
    });
  };
  const elements = (node: any): any[] =>
    !node || typeof node !== "object"
      ? []
      : Array.isArray(node)
        ? node.flatMap(elements)
        : [node, ...elements(node.props?.children)];
  let tree = elements(render());
  tree.find((e) => e.props?.["aria-label"] === "Move step 1 down").props.onClick();
  assert.equal(saves, 1);
  assert.deepEqual(session.answers, []);
  tree = elements(render());
  tree.filter((e) => e.type === "li")[0].props.onDragStart({ dataTransfer: { setData() {} } });
  tree = elements(render());
  tree.filter((e) => e.type === "li")[3].props.onDrop({ preventDefault() {} });
  assert.equal(saves, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(session)).answers, []);
  tree = elements(render(true));
  tree.find((e) => e.props?.["aria-label"] === "Move step 1 down").props.onClick();
  assert.equal(saves, 2);
  session = answerSession(session, value);
  assert.deepEqual(session.answers[0].value, value);
});
