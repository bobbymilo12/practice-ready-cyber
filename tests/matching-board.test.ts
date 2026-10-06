import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { pairCards } from "../src/lib/matching-interaction.ts";
import { roleMatchingScenario, uniqueMatching } from "../src/lib/role-matching.ts";
import { practice } from "./fixtures/role-matching.ts";

// Render the actual TSX component without a browser or a new test dependency.
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL("../src/components/MatchingBoard.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const component: Record<string, any> = {};
new Function("require", "exports", compiled)(
  (id: string) => (id === "@/lib/matching-interaction" ? { pairCards } : require(id)),
  component,
);

test("actual board renders two columns, eight keyboard buttons and saved pairs without answer feedback", () => {
  const board = roleMatchingScenario(practice())!;
  const solution = uniqueMatching(
    board.items.map((i) => i.id),
    board.targets.map((t) => t.id),
    board.validMatches,
  )!;
  const render = (value: Record<string, string>, disabled = false) =>
    renderToStaticMarkup(
      createElement(component.MatchingBoard, {
        items: board.items,
        targets: board.targets,
        value,
        oneToOne: true,
        disabled,
        onChange: () => {},
      }),
    );
  const empty = render({});
  assert.equal((empty.match(/<button/g) ?? []).length, 8);
  assert.ok(empty.includes("grid-cols-2"));
  assert.ok(empty.includes('type="button"'));
  assert.ok(empty.includes("0 of 4 pairs selected"));
  assert.ok(!empty.includes("<select"));
  const selected = render(solution);
  assert.ok(!selected.includes("Paired with"));
  assert.equal((selected.match(/aria-label="Pair [1-4]"/g) ?? []).length, 8);
  for (let i = 1; i <= 4; i++)
    assert.equal((selected.match(new RegExp(`aria-label="Pair ${i}"`, "g")) ?? []).length, 2);
  assert.ok(!selected.includes("min-h-24"));
  assert.ok(selected.includes('class="sr-only"'));
  assert.ok(selected.includes("4 of 4 pairs selected"));
  const wrong = Object.fromEntries(
    board.items.map((item, index) => [
      item.id,
      solution[board.items[(index + 1) % board.items.length].id],
    ]),
  );
  for (const markup of [empty, selected, render(wrong)]) {
    assert.ok(!/correct|incorrect|validMatches|learningPoint/i.test(markup));
    assert.ok(markup.includes('aria-live="polite"'));
  }
  assert.equal((render(solution, true).match(/disabled=""/g) ?? []).length, 8);
});
