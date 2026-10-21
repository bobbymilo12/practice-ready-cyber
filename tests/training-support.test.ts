import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { traineeSupport, currentCompletedAttempts } from "../src/lib/training-support.ts";
import { startSession, answerSession, advanceSession, submitSession } from "../src/lib/training.ts";
import type { Module, Assignment } from "../src/lib/training-types.ts";

const trainee = { id: "t", name: "Jamie", email: "jamie@example.test", status: "active" as const };
const module: Module = {
  id: "m",
  title: "Bookings",
  type: "Booking",
  topicKey: "booking",
  published: true,
  createdAt: 1,
  scenarios: [
    {
      id: "q",
      kind: "mcq",
      title: "Booking requests",
      patientQuote: "A request",
      question: "What next?",
      options: ["Check", "Guess"],
      correctIndex: 0,
      learningPoint: "Check saved guidance.",
      status: "approved",
    },
  ],
};
const assignment: Assignment = {
  id: "a",
  moduleId: "m",
  traineeId: "t",
  assignedAt: 1,
  status: "assigned",
};
function completed(id: string, correct: boolean, time: number, confidence?: number) {
  const session = submitSession(
    advanceSession(
      answerSession(startSession(module, assignment, id), correct ? 0 : 1),
      module.title,
    ),
    module.title,
  );
  session.result!.completedAt = time;
  session.result!.confidence = confidence;
  return session;
}
const support = (
  sessions: any[],
  assignments = [assignment],
  modules = [module],
  person = trainee,
) => traineeSupport(person, assignments, modules, sessions);

test("latest unresolved answers surface; a later resolved attempt clears old mistakes", () => {
  const old = completed("old", false, 1);
  assert.equal(support([old])[0].reasons[0].kind, "unresolved");
  const latest = completed("new", true, 2);
  old.updatedAt = 99999;
  assert.equal(currentCompletedAttempts(assignment, module, [old, latest])[0].id, "new");
  assert.deepEqual(support([old, latest]), []);
});
test("repeated difficulty requires unresolved titles in both latest completed attempts", () => {
  assert.equal(
    support([completed("a", false, 1), completed("b", false, 2)])[0].reasons[0].kind,
    "repeated",
  );
  assert.equal(
    support([completed("a", false, 1), completed("b", true, 2), completed("c", false, 3)])[0]
      .reasons[0].kind,
    "unresolved",
  );
});
test("confidence uses latest recorded response only; missing confidence is not low confidence", () => {
  for (const value of [1, 2])
    assert.equal(support([completed("a", true, 1, value)])[0].reasons[0].kind, "confidence");
  for (const value of [undefined, 3, 4, 5])
    assert.deepEqual(support([completed("a", true, 1, 1), completed("b", true, 2, value)]), []);
});
test("withdrawn assignments and inactive staff are excluded", () => {
  const sessions = [completed("a", false, 1, 1)];
  assert.deepEqual(support(sessions, [{ ...assignment, withdrawnAt: 2 }]), []);
  assert.deepEqual(
    support(sessions, [assignment], [module], { ...trainee, inactiveAt: "2026-10-19" } as any),
    [],
  );
});
test("updated unfinished training needs action only until updated training starts", () => {
  const old = { ...startSession(module, assignment, "old"), supersededAt: 2 };
  const updated = {
    ...module,
    scenarios: module.scenarios.map((q) => ({ ...q, learningPoint: "Changed guidance" })),
  };
  assert.equal(support([old], [assignment], [updated])[0].reasons[0].kind, "updated");
  assert.deepEqual(
    support([old, startSession(updated, assignment, "new")], [assignment], [updated]),
    [],
  );
  assert.deepEqual(support([completed("old", false, 1, 1)], [assignment], [updated]), []);
});
test("reassignment does not inherit old difficulties and stops needing start action once started", () => {
  const next = { ...assignment, id: "new-assignment" };
  const old = completed("old", false, 1, 1);
  assert.deepEqual(
    support([old], [next])[0].reasons.map((r) => r.kind),
    ["reassigned"],
  );
  assert.deepEqual(support([old, startSession(module, next, "new")], [next]), []);
  assert.deepEqual(support([]), []);
});
test("an ongoing retry keeps latest completed support visible, with an in-progress qualifier", () => {
  const sessions = [completed("old", false, 1), startSession(module, assignment, "retry")];
  const before = JSON.stringify(sessions);
  assert.equal(support(sessions)[0].practising, true);
  assert.equal(JSON.stringify(sessions), before);
});
test("paused unfinished work is a manager action; older completions alone do not require repeat", () => {
  const paused = { ...module, needsReview: true };
  assert.equal(support([], [assignment], [paused])[0].reasons[0].kind, "paused");
  assert.deepEqual(support([completed("old", true, 1)], [assignment], [paused]), []);
});
test("support is based on unresolved learning, never a score cutoff", () => {
  const recovered = completed("recovered", false, 1, 3);
  recovered.result!.wrongTitles = [];
  recovered.result!.recoveredTitles = ["Booking requests"];
  assert.equal(recovered.result!.correct, 0);
  assert.deepEqual(support([recovered]), []);
  const unresolved = completed("unresolved", false, 1);
  unresolved.result!.correct = 99;
  unresolved.result!.total = 100;
  assert.equal(support([unresolved])[0].reasons[0].kind, "unresolved");
});
test("dashboard links each support row to the correct trainee and has an honest empty state", () => {
  const require = createRequire(import.meta.url);
  const code = ts.transpileModule(
    readFileSync(new URL("../src/components/NeedsSupport.tsx", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  const exports: any = {};
  new Function("require", "exports", code)(
    (id: string) =>
      ({
        "@tanstack/react-router": { Link: "a" },
        "./Shell": { Card: "section" },
        "@/lib/training-support": { traineeSupport },
      })[id] ?? require(id),
    exports,
  );
  const props = {
    trainees: [trainee],
    assignments: [assignment],
    modules: [module],
    sessions: [completed("a", false, 1)],
  };
  const tree = exports.NeedsSupport(props);
  const nodes = (n: any): any[] =>
    Array.isArray(n)
      ? n.flatMap(nodes)
      : n && typeof n === "object"
        ? [n, ...nodes(n.props?.children)]
        : [];
  const link = nodes(tree).find((n) => n.type === "a");
  assert.equal(link.props.to, "/trainees/$id");
  assert.deepEqual(link.props.params, { id: trainee.id });
  assert.match(JSON.stringify(tree), /Bookings/);
  assert.match(
    JSON.stringify(exports.NeedsSupport({ ...props, sessions: [] })),
    /No current support signals/,
  );
  assert.equal(
    nodes(
      exports.NeedsSupport({ ...props, trainees: [{ ...trainee, inactiveAt: "2026-10-19" }] }),
    ).filter((n) => n.type === "a").length,
    0,
  );
});
