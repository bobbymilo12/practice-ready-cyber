import assert from "node:assert/strict";
import test from "node:test";
import { CORE_MODULES, withCoreModules, withoutCoreModules } from "../src/lib/core-modules.ts";
import { orderKey } from "../src/lib/sequence.ts";
import { evaluateAnswer, startSession } from "../src/lib/training.ts";
import type { Module, Scenario } from "../src/lib/training-types.ts";

const rightAnswer = (s: Scenario) =>
  s.kind === "mcq"
    ? s.correctIndices
      ? s.correctIndices.map(String)
      : s.correctIndex
    : s.kind === "matching"
      ? Object.fromEntries(s.items.map((i) => [i.id, s.validMatches[i.id][0]]))
      : orderKey(s);

for (const module of CORE_MODULES) {
  test(`${module.id} is published, approved and answerable`, () => {
    assert.equal(module.core, true);
    assert.equal(module.published, true);
    const ids = new Set(module.scenarios.map((s) => s.id));
    assert.equal(ids.size, module.scenarios.length, "scenario ids are unique");
    for (const s of module.scenarios) {
      assert.equal(s.status, "approved", s.id);
      assert.ok(s.learningPoint.trim(), s.id);
      if (s.followUpFor) assert.ok(ids.has(s.followUpFor), `${s.id} parent exists`);
      if (s.kind === "matching")
        for (const i of s.items)
          for (const t of s.validMatches[i.id] ?? [])
            assert.ok(
              s.targets.some((target) => target.id === t),
              `${s.id} target ${t}`,
            );
      assert.equal(evaluateAnswer(s, rightAnswer(s)), true, `${s.id} correct answer scores`);
      if (s.kind === "mcq" && !s.correctIndices)
        assert.equal(evaluateAnswer(s, (s.correctIndex + 1) % s.options.length), false, s.id);
    }
    const session = startSession(
      module,
      { id: "a", traineeId: "t", moduleId: module.id, assignedAt: 0, status: "assigned" },
      "s",
    );
    assert.ok(session.queue.length > 0);
  });
}

test("core modules replace stored copies and are never saved", () => {
  const own: Module = { ...CORE_MODULES[0], id: "own", core: undefined, title: "Own" };
  const tampered: Module = { ...CORE_MODULES[0], title: "Edited by a practice" };
  const merged = withCoreModules([own, tampered]);
  assert.deepEqual(
    merged.map((m) => m.title),
    ["Own", CORE_MODULES[0].title],
  );
  assert.deepEqual(
    withoutCoreModules(merged).map((m) => m.id),
    ["own"],
  );
  // Strip by id too, in case a client drops the core flag.
  assert.deepEqual(withoutCoreModules([{ ...tampered, core: undefined }]), []);
});
