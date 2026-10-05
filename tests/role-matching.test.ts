import { readFileSync } from "node:fs";
import { pairCards } from "../src/lib/matching-interaction.ts";
import assert from "node:assert/strict";
import test from "node:test";
import type { PracticeData } from "../src/lib/store.ts";
import type { Module, Assignment } from "../src/lib/training-types.ts";
import { suggestedRole, requestCategories } from "../src/lib/role-requests.ts";
import {
  roleMatchingScenario,
  inspectRoleMatching,
  uniqueMatching,
} from "../src/lib/role-matching.ts";
import {
  defaultModuleSettings,
  generateConfiguredModule,
  regenerateConfiguredScenario,
  reviseConfiguredScenario,
} from "../src/lib/module-config.ts";
import {
  startSession,
  answerSession,
  advanceSession,
  previousSession,
  submitSession,
  matchingFeedback,
} from "../src/lib/training.ts";

const empty = (): PracticeData => ({
  practiceName: "Test Practice",
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
  staff: [],
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
});

const ids = requestCategories.flatMap((c) => c.requests).map((r) => r.id);
function practice(groups: number[][] = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11], [0]]) {
  const roles = groups.map((indices, i) => ({
    ...suggestedRole(`Test role ${i + 1}`),
    confirmed: true,
    selectedRequestIds: indices.map((index) => ids[index]),
  }));
  return {
    ...empty(),
    practiceName: "Test practice",
    staff: [],
    roleRequests: Object.fromEntries(roles.map((r) => [r.roleId, r])),
  } as PracticeData;
}
function moduleFor(p = practice()): Module {
  const settings = { ...defaultModuleSettings(), count: 10, trainingLevel: "learn" as const };
  return {
    id: "module",
    title: "Booking",
    type: "Booking",
    topicKey: "appointment-booking",
    createdAt: 1,
    published: true,
    settings,
    scenarios: generateConfiguredModule("appointment-booking", "Booking", p, settings).map((s) => ({
      ...s,
      status: "approved" as const,
    })),
  };
}
const assignment: Assignment = {
  id: "assignment",
  traineeId: "trainee",
  moduleId: "module",
  assignedAt: 1,
  status: "assigned",
};

test("four distinct targets preferred; all presented edges preserved, including globally shared requests", () => {
  const p = practice();
  const s = roleMatchingScenario(p)!;
  assert.equal(s.items.length, 4);
  assert.equal(s.targets.length, 4);
  assert.equal(new Set(s.targets.map((t) => t.id)).size, 4);
  assert.ok(s.items.some((i) => i.id === ids[0]));
  const solution = uniqueMatching(
    s.items.map((i) => i.id),
    s.targets.map((t) => t.id),
    s.validMatches,
  )!;
  assert.ok(solution);
  assert.ok(s.items.some((item, i) => solution[item.id] !== s.targets[i].id));
  for (const item of s.items) {
    assert.deepEqual(
      s.validMatches[item.id],
      Object.values(p.roleRequests!)
        .filter(
          (r) => s.targets.some((t) => t.id === r.roleId) && r.selectedRequestIds.includes(item.id),
        )
        .map((r) => r.roleId),
    );
  }
  const again = roleMatchingScenario(p)!;
  assert.deepEqual(s.items, again.items);
  assert.deepEqual(s.targets, again.targets);
});

test("unique complete graph solution may contain multiple valid targets for one request", () => {
  const p = practice([[0], [0, 1], [2], [3]]);
  const s = roleMatchingScenario(p)!;
  assert.equal(s.items.length, 4);
  assert.equal(s.validMatches[ids[0]].length, 2);
  assert.ok(
    uniqueMatching(
      s.items.map((i) => i.id),
      s.targets.map((t) => t.id),
      s.validMatches,
    ),
  );
});

test("ambiguous complete solutions and insufficient data are rejected; three targets can qualify", () => {
  const ambiguous = practice([
    [0, 1, 2, 3],
    [0, 1, 2, 3],
    [0, 1, 2, 3],
    [0, 1, 2, 3],
  ]);
  assert.equal(inspectRoleMatching(ambiguous).diagnostic.code, "no_unique_board");
  assert.equal(roleMatchingScenario(ambiguous), undefined);
  assert.equal(roleMatchingScenario(practice([[0], [1]])), undefined);
  assert.equal(roleMatchingScenario(practice([[0], [1], []])), undefined);
  const three = roleMatchingScenario(practice([[0], [1], [2]]))!;
  assert.equal(three.items.length, 3);
  assert.equal(three.targets.length, 3);
  assert.equal(uniqueMatching(["a", "b"], ["x", "y"], { a: ["x", "y"], b: ["x", "y"] }), undefined);
});

test("diagnostics distinguish missing seed roles, confirmation and unsafe custom identities", () => {
  // The repository's development seed supplies legacy staff, but no roleRequests.
  const seed = empty();
  seed.staff = [{ id: "dev", name: "Demo", role: "Doctor", clinics: "Routing" }];
  assert.equal(inspectRoleMatching(seed).diagnostic.code, "too_few_roles");
  const p = practice();
  Object.values(p.roleRequests!)[0].confirmed = false;
  assert.equal(inspectRoleMatching(p).diagnostic.code, "unconfirmed_roles");
  const customConflict = practice([[0], [1], [2]]);
  Object.values(customConflict.roleRequests!)[0].categories[0].requests.push({
    id: "custom:duplicate",
    label: requestCategories[0].requests[0].label,
    custom: true,
  });
  assert.equal(roleMatchingScenario(customConflict), undefined);
});

test("qualifying Learn generation inserts exactly one matching in ten, retaining Core and local MCQs", () => {
  const m = moduleFor();
  assert.equal(m.scenarios.length, 10);
  assert.equal(m.scenarios.filter((s) => s.kind === "matching").length, 1);
  assert.equal(m.scenarios.filter((s) => s.provenance?.kind === "core").length, 3);
  assert.equal(m.scenarios.filter((s) => s.kind === "mcq" && !s.provenance).length, 6);
  for (const count of [3, 5, 20, 30]) {
    const all = generateConfiguredModule("appointment-booking", "Booking", practice(), {
      ...m.settings!,
      count,
    });
    assert.ok(all.length <= count);
    assert.ok(all.filter((s) => s.kind === "matching").length <= 1);
  }
  for (const trainingLevel of ["apply", undefined] as const) {
    const all = generateConfiguredModule("appointment-booking", "Booking", practice(), {
      ...m.settings!,
      trainingLevel,
    });
    assert.ok(all.every((s) => s.kind !== "matching"));
  }
  assert.ok(
    generateConfiguredModule("prescriptions", "Prescriptions", practice(), m.settings!).every(
      (s) => s.kind !== "matching",
    ),
  );
});

test("ineligible matching preserves local MCQ capacity", () => {
  const m = moduleFor(practice([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]));
  assert.equal(m.scenarios.length, 10);
  assert.equal(m.scenarios.filter((s) => s.kind === "matching").length, 0);
  assert.equal(m.scenarios.filter((s) => !s.provenance).length, 7);
});

test("pairing cards supports selecting, moving, unpairing and changing without answer keys", () => {
  let value = pairCards({}, "a", "x", true);
  assert.deepEqual(value, { a: "x" });
  value = pairCards(value, "b", "x", true);
  assert.deepEqual(value, { b: "x" });
  value = pairCards(value, "b", "y", true);
  assert.deepEqual(value, { b: "y" });
  value = pairCards(value, "b", "y", true);
  assert.deepEqual(value, {});
  assert.deepEqual(pairCards({ a: "x" }, "b", "x", false), { a: "x", b: "x" });
});

test("partial answers save; one-to-one validated; navigation and submission retain one-board scoring", () => {
  const s = roleMatchingScenario(practice([[0], [0, 1], [2], [3]]))!;
  const m = { ...moduleFor(), scenarios: [{ ...s, status: "approved" as const }] };
  let session = startSession(m, assignment, "attempt");
  const solution = uniqueMatching(
    s.items.map((i) => i.id),
    s.targets.map((t) => t.id),
    s.validMatches,
  )!;
  session = answerSession(session, { [s.items[0].id]: solution[s.items[0].id] });
  session = JSON.parse(JSON.stringify(session));
  assert.throws(() => advanceSession(session, m.title), /Match every/);
  assert.throws(() =>
    answerSession(session, { [s.items[0].id]: s.targets[0].id, [s.items[1].id]: s.targets[0].id }),
  );
  assert.throws(() => answerSession(session, { invented: "unknown" }));
  const answers = { ...solution, [ids[0]]: solution[ids[1]], [ids[1]]: solution[ids[0]] };
  session = answerSession(session, answers);
  session = previousSession(advanceSession(session, m.title));
  assert.deepEqual(session.answers[0].value, answers);
  assert.equal(matchingFeedback(s, answers).filter((i) => i.correct).length, 3);
  session = submitSession(advanceSession(session, m.title), m.title);
  assert.equal(session.result!.total, 1);
  assert.equal(session.result!.correct, 0);
  let correct = answerSession(startSession(m, assignment, "b"), solution);
  correct = submitSession(advanceSession(correct, m.title), m.title);
  assert.equal(correct.result!.correct, 1);
});

test("legacy reusable-target matching stays valid; every configured edge is recognised", () => {
  const s = roleMatchingScenario(practice())!;
  delete s.pairingMode;
  s.validMatches = Object.fromEntries(s.items.map((i) => [i.id, s.targets.map((t) => t.id)]));
  const m = { ...moduleFor(), scenarios: [{ ...s, status: "approved" as const }] };
  const answers = Object.fromEntries(s.items.map((i) => [i.id, s.targets[0].id]));
  let session = answerSession(startSession(m, assignment, "a"), answers);
  session = submitSession(advanceSession(session, m.title), m.title);
  assert.equal(session.result!.correct, 1);
});

test("snapshot survives later setup edits, regeneration, manager edits and JSON persistence", () => {
  const p = practice();
  const m = moduleFor(p);
  const s = m.scenarios.find((q) => q.kind === "matching")!;
  const original = JSON.parse(JSON.stringify(s));
  const attempt = startSession(m, assignment, "a");
  Object.values(p.roleRequests!).forEach((r) => {
    r.selectedRequestIds = [];
    r.label = "Changed";
  });
  assert.deepEqual(JSON.parse(JSON.stringify(s)), original);
  const regenerated = regenerateConfiguredScenario(m, s.id, p).scenarios.find(
    (q) => q.id === s.id,
  )!;
  assert.deepEqual(regenerated.provenance, original.provenance);
  const edited = reviseConfiguredScenario(m, { ...s, title: "Updated title" }).scenarios.find(
    (q) => q.id === s.id,
  )!;
  assert.equal(edited.provenance!.managerModified, true);
  s.targets[0].label = "Later module edit";
  assert.deepEqual(
    attempt.scenarios.find((q) => q.id === s.id),
    original,
  );
});

test("card UI uses keyboard buttons, has no correctness data/selectors, and review labels matching", () => {
  const board = readFileSync(
    new URL("../src/components/MatchingBoard.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(board.includes("<button"));
  assert.ok(board.includes("aria-pressed="));
  assert.ok(board.includes('aria-live="polite"'));
  assert.ok(!board.includes("<select"));
  assert.ok(!board.includes("validMatches") && !board.includes("matchingFeedback"));
  const train = readFileSync(new URL("../src/routes/train.tsx", import.meta.url), "utf8");
  assert.ok(train.includes("<MatchingBoard"));
  const review = readFileSync(new URL("../src/routes/modules.review.tsx", import.meta.url), "utf8");
  assert.match(review, /scenario.kind === "matching"\s*\? "Matching"/);
  assert.ok(review.includes("Board pair:"));
});
