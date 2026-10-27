import assert from "node:assert/strict";
import { managerActionPatch } from "../src/lib/manager-actions.ts";
import { copyPublicModule } from "../src/lib/shared-modules.ts";
import type { Module } from "../src/lib/training-types.ts";

const source = {
  id: "src",
  type: "Topic training",
  title: "Urgent requests",
  topicKey: "urgent",
  published: true,
  visibility: "public",
  packageId: "pkg",
  createdAt: 1,
  reviewConfirmations: [
    {
      id: "r",
      decision: "updated",
      note: "",
      reviewKey: "k",
      by: "mgr-1",
      name: "Dr Real",
      at: "",
      reasons: [],
    },
  ],
  reviewedQuestions: { a: "k" },
  scenarios: [
    { id: "a", status: "approved" },
    { id: "b", status: "approved", followUpFor: "a" },
  ],
} as unknown as Module;

const copy = copyPublicModule(source, "new", 5);
assert.equal(copy.id, "new");
assert.equal(copy.published, false);
assert.equal(copy.createdAt, 5);
for (const key of [
  "visibility",
  "packageId",
  "reviewConfirmations",
  "reviewedQuestions",
  "needsReview",
])
  assert.equal(key in copy, false, `${key} must not be copied`);
assert.deepEqual(
  copy.scenarios.map((s) => [s.id, s.status, s.followUpFor]),
  [
    ["new-a", "draft", undefined],
    ["new-b", "draft", "new-a"],
  ],
);
assert.equal(source.scenarios[0].status, "approved", "source is not mutated");

const state = (modules: Module[]) =>
  ({ modules, assignments: [], packages: [], trainees: [], currentDraftId: null }) as never;
const id = { id: "x", at: 1 };
const shared = managerActionPatch(
  state([{ ...source, visibility: undefined }]),
  { kind: "share", moduleId: "src", shared: true },
  id,
);
assert.equal(shared.modules?.[0].visibility, "public");
assert.equal(
  managerActionPatch(state([source]), { kind: "share", moduleId: "src", shared: false }, id)
    .modules?.[0].visibility,
  undefined,
);
assert.throws(() =>
  managerActionPatch(
    state([{ ...source, published: false }]),
    { kind: "share", moduleId: "src", shared: true },
    id,
  ),
);
assert.throws(() =>
  managerActionPatch(
    state([{ ...source, needsReview: true }]),
    { kind: "share", moduleId: "src", shared: true },
    id,
  ),
);

const copied = managerActionPatch(
  state([source]),
  { kind: "copy", moduleId: "new", module: copy },
  id,
);
assert.deepEqual(
  copied.modules?.map((m) => m.id),
  ["src", "new"],
);
assert.deepEqual(
  managerActionPatch(state([source, copy]), { kind: "copy", moduleId: "new", module: copy }, id),
  {},
);
console.log("shared module library tests passed");
