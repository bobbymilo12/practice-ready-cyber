import { approveReviewedQuestion, reviewKey } from "../src/lib/practice-change-tracking.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Run the actual Edge Function handler with a deterministic database/Auth adapter.
// No external accounts are created and no emails are sent by these tests.
const tables = {};
let user = null;
let handler;
let createUserError = null;
const deletedUsers = [];
const writes = [];
function query(table) {
  const filters = [];
  let operation = "select";
  let value;
  let single = false;
  const q = {
    select() {
      return q;
    },
    order() {
      return q;
    },
    eq(key, val) {
      filters.push([key, val]);
      return q;
    },
    update(data) {
      operation = "update";
      value = data;
      return q;
    },
    insert(data) {
      operation = "insert";
      value = data;
      return q;
    },
    delete() {
      operation = "delete";
      return q;
    },
    upsert(data) {
      operation = "upsert";
      value = data;
      return q;
    },
    single() {
      single = true;
      return q;
    },
    maybeSingle() {
      single = true;
      return q;
    },
    then(resolve) {
      const rows = (tables[table] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v));
      if (operation !== "select") writes.push({ table, operation, value, filters });
      if (operation === "delete") tables[table] = tables[table].filter((r) => !rows.includes(r));
      if (operation === "update") rows.forEach((r) => Object.assign(r, value));
      if (operation === "insert" || operation === "upsert") {
        for (const v of Array.isArray(value) ? value : [value]) {
          const existing = operation === "upsert" && tables[table].find((r) => r.id === v.id);
          const row = existing ? Object.assign(existing, v) : { version: 0, ...v };
          if (!existing) tables[table].push(row);
          rows.push(row);
        }
      }
      return Promise.resolve({ data: single ? (rows[0] ?? null) : rows, error: null }).then(
        resolve,
      );
    },
  };
  return q;
}
const mockClient = {
  from: query,
  // Mirrors the SQL functions in 202610090001_practice_tables.sql and 202610100003_practice_modules.sql.
  rpc: async (name, args) => {
    if (name === "set_staff_active") {
      const manager = tables.profiles.find(
        (p) => p.id === args.p_manager && p.role === "manager" && !p.inactive_at,
      );
      const member = tables.profiles.find(
        (p) =>
          p.id === args.p_trainee && p.practice_id === manager?.practice_id && p.role === "trainee",
      );
      const practice = tables.practices.find((p) => p.id === manager?.practice_id);
      if (!member || !practice) return { data: null, error: { message: "Staff member not found" } };
      if (practice.version !== args.p_version) return { data: null, error: null };
      if (args.p_active === !member.inactive_at) return { data: practice.version, error: null };
      member.inactive_at = args.p_active ? null : new Date().toISOString();
      if (!args.p_active)
        practice.state.assignments = practice.state.assignments.map((a) =>
          a.traineeId === member.id && !a.withdrawnAt
            ? { ...a, withdrawnAt: Date.now(), withdrawnBy: manager.id }
            : a,
        );
      return { data: ++practice.version, error: null };
    }
    const practice = tables.practices.find((p) => p.id === args.p_practice);
    if (name === "load_practice_data")
      return { data: tables.practice_data[args.p_practice] ?? null, error: null };
    if (name === "load_practice_modules")
      return { data: tables.practice_modules[args.p_practice] ?? [], error: null };
    if (practice.version !== args.p_version) return { data: null, error: null };
    const { modules, ...state } = args.p_state;
    Object.assign(practice, { state, version: practice.version + 1 });
    tables.practice_data[args.p_practice] = args.p_data;
    tables.practice_modules[args.p_practice] = modules ?? [];
    writes.push({ table: "practice_data", operation: "rpc", value: args.p_data, filters: [] });
    return { data: practice.version, error: null };
  },
  auth: {
    getUser: async () => ({ data: { user }, error: user ? null : new Error("invalid") }),
    signInWithPassword: async ({ password }) => ({
      error: password === "temporary-password" ? null : new Error("wrong"),
    }),
    admin: {
      updateUserById: async () => ({ error: null }),
      createUser: async () => {
        if (createUserError) return { data: { user: null }, error: createUserError };
        // Live Auth applies app_metadata after insert, so the signup trigger provisions a practice.
        tables.practices.push({ id: "stray", version: 1, state: {} });
        tables.profiles.push({ id: "invited", practice_id: "stray", role: "manager" });
        return { data: { user: { id: "invited" } }, error: null };
      },
      generateLink: async () => ({
        data: { properties: { action_link: "https://test.supabase.co/auth/v1/verify?token=x" } },
        error: null,
      }),
      deleteUser: async (id) => {
        deletedUsers.push(id);
        return { error: null };
      },
    },
  },
};
const testEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL || "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "test-only",
  APP_URL: process.env.APP_URL || "https://practice-ready.co.uk",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "https://practice-ready.co.uk",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "test-only",
  INVITE_FROM: process.env.INVITE_FROM || "training@practice-ready.co.uk",
};
globalThis.__practiceTestClient = mockClient;
globalThis.Deno = {
  env: {
    get: (name) => testEnv[name],
  },
  serve: (fn) => {
    handler = fn;
  },
};
const source = await readFile(
  new URL("../supabase/functions/practice-api/index.ts", import.meta.url),
  "utf8",
);
const trainingUrl = new URL("../src/lib/training.ts", import.meta.url).href;
const sdk =
  "data:text/javascript," +
  encodeURIComponent("export const createClient = () => globalThis.__practiceTestClient;");
const js = ts
  .transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  .outputText.replace('"npm:@supabase/supabase-js@2.57.4"', JSON.stringify(sdk))
  .replace('"../../../src/lib/training.ts"', JSON.stringify(trainingUrl))
  .replace(
    '"../../../src/lib/staff-lifecycle.ts"',
    JSON.stringify(new URL("../src/lib/staff-lifecycle.ts", import.meta.url).href),
  )
  .replace(
    '"../../../src/lib/practice-change-tracking.ts"',
    JSON.stringify(new URL("../src/lib/practice-change-tracking.ts", import.meta.url).href),
  )
  .replace(
    '"../../../src/lib/shared-modules.ts"',
    JSON.stringify(new URL("../src/lib/shared-modules.ts", import.meta.url).href),
  )
  .replace(
    '"../../../src/lib/analytics.ts"',
    JSON.stringify(new URL("../src/lib/analytics.ts", import.meta.url).href),
  );
await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

function reset(role = "trainee", mustReset = false) {
  writes.length = 0;
  createUserError = null;
  user = { id: "alice" };
  tables.profiles = [
    {
      id: "alice",
      practice_id: "oak",
      role,
      name: "Alice",
      email: "alice@practice.test",
      must_reset_password: mustReset,
      invited_at: new Date().toISOString(),
    },
    { id: "bob", practice_id: "oak", role: "trainee", email: "bob@practice.test" },
  ];
  tables.practices = [
    {
      id: "oak",
      version: 1,
      state: {
        assignments: [
          { id: "a1", moduleId: "m1", traineeId: "alice" },
          { id: "a2", moduleId: "m2", traineeId: "bob" },
        ],
        emojiMarks: { "alice:m1:1": "👍", "bob:m2:1": "👀" },
      },
    },
  ];
  tables.practice_data = { oak: { practiceName: "Oak", privateManagerField: "internal" } };
  tables.practice_modules = {
    oak: [
      {
        id: "m1",
        title: "Booking",
        published: true,
        scenarios: [
          {
            id: "q1",
            kind: "mcq",
            options: ["Wrong", "Correct"],
            correctIndex: 1,
            status: "approved",
            title: "Booking",
          },
        ],
      },
      { id: "m2", published: true, scenarios: [] },
    ],
  };
  tables.audit_events = [];
  tables.training_sessions = [
    {
      id: "b-session",
      practice_id: "oak",
      trainee_id: "bob",
      assignment_id: "a2",
      data: { id: "b-session" },
    },
  ];
}
async function call(body, token = "test-token") {
  const response = await handler(
    new Request("https://test.supabase.co/functions/v1/practice-api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, data: await response.json() };
}

test("API rejects unauthenticated requests", async () => {
  reset();
  const r = await call({ action: "load" }, "");
  assert.equal(r.status, 401);
  assert.equal(writes.length, 0);
});
test("password-change requirement cannot be bypassed with client metadata", async () => {
  reset("trainee", true);
  const r = await call({ action: "start", assignmentId: "a1", must_reset_password: false });
  assert.equal(r.status, 403);
  const loaded = await call({ action: "load" });
  assert.deepEqual(loaded.data.state, {});
  assert.deepEqual(loaded.data.sessions, []);
});
test("trainee load filters other trainees, assignments, modules and manager details", async () => {
  reset();
  const { data } = await call({ action: "load" });
  assert.deepEqual(
    data.state.assignments.map((a) => a.id),
    ["a1"],
  );
  assert.deepEqual(
    data.state.modules.map((m) => m.id),
    ["m1"],
  );
  assert.deepEqual(
    data.trainees.map((p) => p.id),
    ["alice"],
  );
  assert.deepEqual(data.sessions, []);
  assert.equal(data.state.practiceData.privateManagerField, undefined);
  assert.equal(data.state.emojiMarks["bob:m2:1"], undefined);
});
test("trainees cannot invite, overwrite practice data, remove people or access others' assignments", async () => {
  reset();
  for (const action of ["invite", "save-practice", "remove-trainee", "delete-practice"])
    assert.equal((await call({ action, role: "manager" })).status, 403);
  assert.equal((await call({ action: "start", assignmentId: "a2", traineeId: "bob" })).status, 403);
  assert.equal(writes.length, 0);
});
test("inviting an existing manager email reports that the email is already in use", async () => {
  reset("manager");
  const r = await call({ action: "invite", name: "Replacement", email: "alice@practice.test" });
  assert.equal(r.status, 400);
  assert.equal(r.data.error, "This email is already in use and has an account.");
  assert.equal(writes.length, 0);
});
test("orphaned Auth accounts are reported separately from missing profiles", async () => {
  reset("manager");
  createUserError = { code: "email_exists", status: 422, message: "User already registered" };
  const r = await call({ action: "invite", name: "Orphan", email: "orphan@practice.test" });
  assert.equal(r.status, 400);
  assert.equal(r.data.error, "This email is already registered in Supabase Auth.");
  assert.equal(writes.length, 0);
});
test("API calculates scores itself and retrying finish does not create a second result", async () => {
  reset();
  const start = await call({ action: "start", assignmentId: "a1" });
  const sessionId = start.data.session.id;
  const args = { assignmentId: "a1", sessionId, scenarioId: "q1" };
  await call({ ...args, action: "answer", value: 0, correct: true });
  const retryAnswer = await call({ ...args, action: "answer", value: 1, correct: true });
  assert.equal(retryAnswer.data.session.answers[0].value, 0);
  assert.equal(retryAnswer.data.session.answers[0].correct, false);
  await call({ ...args, action: "continue", result: { correct: 99 } });
  const end = await call({ ...args, action: "submit", result: { correct: 99 } });
  assert.equal(end.data.session.result.correct, 0);
  const retry = await call({ ...args, action: "submit" });
  assert.equal(retry.data.session.result.completedAt, end.data.session.result.completedAt);
  assert.equal(tables.training_sessions.filter((s) => s.trainee_id === "alice").length, 1);
});
test("stale manager saves are rejected without overwriting the practice", async () => {
  reset("manager");
  tables.practices[0].state.assignments = [];
  const state = {
    ...structuredClone(tables.practices[0].state),
    practiceData: tables.practice_data.oak,
  };
  state.modules = [];
  const r = await call({ action: "save-practice", version: 0, state });
  assert.equal(r.status, 409);
  assert.equal(tables.practices[0].version, 1);
});
test("failed invitation email reports failure and preserves an account for resend", async () => {
  reset("manager");
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"message":"delivery rejected"}', { status: 422 });
  try {
    const r = await call({ action: "invite", name: "Casey", email: "casey@practice.test" });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /email could not be sent: delivery rejected/);
    assert.equal(tables.profiles.find((p) => p.id === "invited").invite_status, "failed");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("packages and module settings survive manager save and filtered trainee load", async () => {
  reset("manager");
  const state = {
    ...structuredClone(tables.practices[0].state),
    practiceData: tables.practice_data.oak,
  };
  state.modules = [structuredClone(tables.practice_modules.oak[0])];
  state.assignments = [
    { id: "bob-configured", moduleId: "m1", traineeId: "bob", packageId: "induction" },
  ];
  state.modules[0].packageId = "induction";
  state.modules[0].settings = {
    version: 1,
    answers: {},
    extra: "Confirmed process",
    length: "thorough",
    count: 22,
  };
  state.packages = [
    { id: "induction", kind: "induction", moduleIds: ["m1"] },
    { id: "private-package", kind: "custom", moduleIds: ["private-module"] },
  ];
  const saved = await call({ action: "save-practice", state, version: 1 });
  assert.equal(saved.status, 200);
  const manager = await call({ action: "load" });
  assert.deepEqual(manager.data.state.packages, state.packages);
  assert.deepEqual(manager.data.state.modules[0].settings, state.modules[0].settings);
  assert.equal(tables.practices[0].state.modules, undefined);
  assert.deepEqual(
    tables.practice_modules.oak.map((m) => m.id),
    ["m1"],
  );
  user = { id: "bob" };
  const trainee = await call({ action: "load" });
  assert.deepEqual(trainee.data.state.packages, [state.packages[0]]);
  assert.equal(trainee.data.state.assignments[0].packageId, "induction");
});

test("invitation assigns only ready induction modules and resend does not duplicate assignments", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ id: "mock-email" }), { status: 200 }),
  );
  reset("manager");
  const state = tables.practices[0].state;
  const modules = tables.practice_modules.oak;
  modules[0].settings = { version: 1, answers: {}, extra: "", length: "quick", count: 6 };
  modules.push(
    { id: "draft", published: false },
    { id: "review", published: true, needsReview: true },
  );
  state.packages = [
    { id: "induction", kind: "induction", moduleIds: ["m1", "draft", "review", "missing"] },
  ];
  for (let i = 0; i < 2; i++) {
    const response = await call({
      action: "invite",
      email: "new@practice.test",
      name: "New Starter",
      role: "Receptionist",
    });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    tables.profiles.find((p) => p.id === "invited").last_invite_at = new Date(0).toISOString();
  }
  const invitee = tables.profiles.filter((p) => p.id === "invited");
  assert.deepEqual(
    invitee.map((p) => [p.practice_id, p.role]),
    [["oak", "trainee"]],
  );
  assert.equal(
    tables.practices.find((p) => p.id === "stray"),
    undefined,
  );
  const assigned = tables.practices[0].state.assignments.filter((a) => a.packageId === "induction");
  assert.equal(assigned.length, 1);
  assert.equal(assigned[0].moduleId, "m1");
});
test("legacy remove endpoint no longer deletes staff or their history", async () => {
  reset("manager");
  const before = structuredClone(tables);
  const r = await call({ action: "remove-trainee", id: "bob" });
  assert.equal(r.status, 400);
  assert.deepEqual(tables, before);
});
test("delete-practice needs a manager and an explicit confirmation, then removes the practice", async () => {
  reset("manager");
  assert.equal((await call({ action: "delete-practice" })).status, 400);
  assert.equal(tables.practices.length, 1);
  assert.equal((await call({ action: "delete-practice", confirm: "DELETE" })).status, 200);
  assert.equal(tables.practices.length, 0);
});
test("a manager cannot remove or see trainees from another practice", async () => {
  reset("manager");
  tables.profiles.push({ id: "eve", practice_id: "elm", role: "trainee", email: "eve@elm.test" });
  assert.equal((await call({ action: "remove-trainee", id: "eve" })).status, 400);
  assert.equal(tables.practices[0].version, 1);
  const { data } = await call({ action: "load" });
  assert.ok(!data.trainees.some((t) => t.id === "eve"));
});

test("API flags published training on practice changes and refuses a boolean-only dismissal", async () => {
  reset("manager");
  const state = structuredClone(tables.practices[0].state);
  state.modules = [structuredClone(tables.practice_modules.oak[0])];
  state.assignments = [{ id: "review-assignment", moduleId: "m1", traineeId: "bob" }];
  state.practiceData = { ...tables.practice_data.oak, hours: "07:00–19:00" };
  assert.equal((await call({ action: "save-practice", state, version: 1 })).status, 200);
  const flagged = tables.practice_modules.oak[0];
  assert.equal(flagged.needsReview, true);
  assert.match(flagged.reviewReason, /Opening hours/);
  const dismissed = structuredClone(tables.practices[0].state);
  dismissed.practiceData = tables.practice_data.oak;
  dismissed.modules = structuredClone(tables.practice_modules.oak);
  dismissed.modules[0].needsReview = false;
  const rejection = await call({ action: "save-practice", state: dismissed, version: 2 });
  assert.equal(rejection.status, 400);
  assert.match(rejection.data.error, /review decision/);
  assert.equal(tables.practice_modules.oak[0].needsReview, true);
  user = { id: "bob" };
  const start = await call({ action: "start", assignmentId: "review-assignment" });
  assert.equal(start.status, 400);
  assert.match(start.data.error, /manager review/);
});

test("API authenticates review decisions, retains history and flags a subsequent change", async () => {
  reset("manager");
  const state = structuredClone(tables.practices[0].state);
  state.modules = [
    {
      ...tables.practice_modules.oak[0],
      needsReview: true,
      reviewReason: "Local process changed.",
    },
  ];
  state.assignments = [];
  state.practiceData = tables.practice_data.oak;
  assert.equal((await call({ action: "save-practice", state, version: 1 })).status, 200);
  const next = structuredClone(tables.practices[0].state);
  next.modules = structuredClone(tables.practice_modules.oak);
  next.practiceData = tables.practice_data.oak;
  next.modules[0] = next.modules[0].scenarios.reduce(
    (m, q) => approveReviewedQuestion(m, q.id, next.practiceData),
    next.modules[0],
  );
  const module = next.modules[0];
  module.reviewConfirmations = [
    {
      id: "review-decision",
      decision: "unchanged",
      note: "Checked the saved training against current local rules.",
      reviewKey: reviewKey(module, next.practiceData),
      by: "forged",
      name: "forged",
      at: "1900-01-01T00:00:00Z",
      reasons: ["forged"],
    },
  ];
  module.needsReview = false;
  const result = await call({ action: "save-practice", state: next, version: 2 });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const record = tables.practice_modules.oak[0].reviewConfirmations[0];
  assert.equal(record.by, "alice");
  assert.equal(record.name, "Alice");
  assert.notEqual(record.at, "1900-01-01T00:00:00Z");
  assert.deepEqual(record.reasons, ["Local process changed."]);
  assert.deepEqual(result.data.reviewConfirmations.m1, [record]);
  const changed = structuredClone(tables.practices[0].state);
  changed.modules = structuredClone(tables.practice_modules.oak);
  changed.practiceData = { ...tables.practice_data.oak, hours: "09:00–17:00" };
  changed.modules[0].reviewConfirmations = [];
  assert.equal((await call({ action: "save-practice", state: changed, version: 3 })).status, 200);
  assert.equal(tables.practice_modules.oak[0].needsReview, true);
  assert.deepEqual(tables.practice_modules.oak[0].reviewConfirmations, [record]);
});

test("trainees receive availability flags but not manager review notes or audit records", async () => {
  reset();
  const module = tables.practice_modules.oak[0];
  module.needsReview = true;
  module.reviewChanges = [{ reason: "Manager review details" }];
  module.reviewConfirmations = [{ id: "decision", note: "Private manager review note" }];
  const response = await call({ action: "load" });
  assert.equal(response.data.state.modules[0].needsReview, true);
  assert.equal(response.data.state.modules[0].reviewChanges, undefined);
  assert.equal(response.data.state.modules[0].reviewConfirmations, undefined);
});

test("API retains superseded answers, blocks stale actions, and starts current training idempotently", async () => {
  reset();
  const started = await call({ action: "start", assignmentId: "a1" });
  const id = started.data.session.id;
  await call({ action: "answer", assignmentId: "a1", sessionId: id, scenarioId: "q1", value: 0 });
  const before = structuredClone(tables.training_sessions.find((s) => s.id === id).data);
  await call({ action: "load" });
  assert.equal((await call({ action: "start", assignmentId: "a1" })).data.session.id, id);
  tables.practice_modules.oak[0].scenarios[0].learningPoint = "Updated local guidance";
  for (const action of ["answer", "continue", "previous", "submit"]) {
    const blocked = await call({
      action,
      assignmentId: "a1",
      sessionId: id,
      scenarioId: "q1",
      value: 1,
    });
    assert.equal(blocked.status, 400);
    assert.match(blocked.data.error, /training has been updated/);
  }
  const fresh = await call({ action: "start", assignmentId: "a1" });
  assert.equal(fresh.status, 200);
  assert.notEqual(fresh.data.session.id, id);
  assert.equal(fresh.data.session.scenarios[0].learningPoint, "Updated local guidance");
  const archived = tables.training_sessions.find((s) => s.id === id).data;
  assert.ok(archived.supersededAt);
  const { supersededAt, ...history } = archived;
  assert.deepEqual(history, before);
  assert.equal(
    (await call({ action: "start", assignmentId: "a1" })).data.session.id,
    fresh.data.session.id,
  );
});

test("updated modules retain completed results without creating a repeat assignment", async () => {
  reset();
  const started = await call({ action: "start", assignmentId: "a1" });
  const args = { assignmentId: "a1", sessionId: started.data.session.id, scenarioId: "q1" };
  await call({ ...args, action: "answer", value: 1 });
  await call({ ...args, action: "continue" });
  await call({ ...args, action: "submit" });
  const historical = structuredClone(tables.training_sessions.find((s) => s.id === args.sessionId));
  const assignments = structuredClone(tables.practices[0].state.assignments);
  tables.practice_modules.oak[0].scenarios[0].learningPoint = "Updated content";
  const loaded = await call({ action: "load" });
  assert.equal(loaded.status, 200);
  assert.deepEqual(
    tables.training_sessions.find((s) => s.id === args.sessionId),
    historical,
  );
  assert.deepEqual(tables.practices[0].state.assignments, assignments);
  assert.equal(tables.training_sessions.filter((s) => s.trainee_id === "alice").length, 1);
});

test("staff deactivation and reactivation preserve history and do not restore withdrawn workload", async () => {
  reset("manager");
  tables.practice_modules.oak[1].scenarios = structuredClone(
    tables.practice_modules.oak[0].scenarios,
  );
  const history = structuredClone(tables.training_sessions);
  const otherAssignment = structuredClone(tables.practices[0].state.assignments[0]);
  assert.equal((await call({ action: "set-staff-active", id: "bob", active: false })).status, 200);
  const inactive = tables.profiles.find((p) => p.id === "bob");
  assert.ok(inactive.inactive_at);
  assert.ok(tables.practices[0].state.assignments[1].withdrawnAt);
  assert.deepEqual(tables.training_sessions, history);
  assert.deepEqual(tables.practices[0].state.assignments[0], otherAssignment);
  const loaded = await call({ action: "load" });
  assert.ok(loaded.data.trainees.find((t) => t.id === "bob").inactiveAt);
  const next = {
    ...structuredClone(tables.practices[0].state),
    modules: tables.practice_modules.oak,
    practiceData: tables.practice_data.oak,
  };
  next.assignments.push({ id: "new", traineeId: "bob", moduleId: "m2" });
  const rejected = await call({
    action: "save-practice",
    state: next,
    version: tables.practices[0].version,
  });
  assert.equal(rejected.status, 400);
  assert.match(rejected.data.error, /Inactive staff/);
  user = { id: "bob" };
  assert.equal((await call({ action: "load" })).status, 403);
  assert.equal((await call({ action: "start", assignmentId: "a2" })).status, 403);
  user = { id: "alice" };
  assert.equal((await call({ action: "set-staff-active", id: "bob", active: true })).status, 200);
  assert.equal(inactive.inactive_at, null);
  assert.ok(tables.practices[0].state.assignments[1].withdrawnAt);
  assert.deepEqual(tables.training_sessions, history);
  assert.deepEqual(
    tables.audit_events.map((e) => [e.practice_id, e.actor_id, e.action, e.target_id]),
    [
      ["oak", "alice", "staff.deactivated", "bob"],
      ["oak", "alice", "staff.reactivated", "bob"],
    ],
  );
  user = { id: "bob" };
  assert.equal((await call({ action: "start", assignmentId: "a2" })).status, 403);
});

test("erasing a person needs a manager, a deactivated member and typed confirmation", async () => {
  reset();
  assert.equal((await call({ action: "erase-staff", id: "bob", confirm: "ERASE" })).status, 403);
  reset("manager");
  deletedUsers.length = 0;
  assert.equal((await call({ action: "erase-staff", id: "bob", confirm: "ERASE" })).status, 400);
  assert.equal((await call({ action: "set-staff-active", id: "bob", active: false })).status, 200);
  assert.equal((await call({ action: "erase-staff", id: "bob" })).status, 400);
  assert.equal((await call({ action: "erase-staff", id: "bob", confirm: "ERASE" })).status, 200);
  assert.deepEqual(deletedUsers, ["bob"]);
  assert.equal(tables.audit_events.at(-1).action, "staff.erased");
  assert.equal(
    (await call({ action: "erase-staff", id: "external", confirm: "ERASE" })).status,
    400,
  );
});

test("staff lifecycle is restricted to managers and their own practice", async () => {
  reset();
  assert.equal((await call({ action: "set-staff-active", id: "bob", active: false })).status, 403);
  reset("manager");
  tables.profiles.push({ id: "external", practice_id: "elsewhere", role: "trainee" });
  assert.equal(
    (await call({ action: "set-staff-active", id: "external", active: false })).status,
    400,
  );
  assert.equal(
    (await call({ action: "set-staff-active", id: "alice", active: false })).status,
    400,
  );
  assert.equal(tables.practices[0].version, 1);
});

test("withdrawn assignments retain attempts, cannot be resumed, and cannot be silently reopened", async () => {
  reset();
  tables.practice_modules.oak[1].scenarios = structuredClone(
    tables.practice_modules.oak[0].scenarios,
  );
  const started = await call({ action: "start", assignmentId: "a1" });
  await call({
    action: "answer",
    assignmentId: "a1",
    sessionId: started.data.session.id,
    scenarioId: "q1",
    value: 1,
  });
  const history = structuredClone(tables.training_sessions);
  tables.profiles.push({ id: "manager", practice_id: "oak", role: "manager" });
  user = { id: "manager" };
  const next = {
    ...structuredClone(tables.practices[0].state),
    modules: tables.practice_modules.oak,
    practiceData: tables.practice_data.oak,
  };
  next.assignments[0].withdrawnAt = Date.now();
  assert.equal((await call({ action: "save-practice", state: next, version: 1 })).status, 200);
  assert.deepEqual(tables.training_sessions, history);
  const reopen = structuredClone(next);
  delete reopen.assignments[0].withdrawnAt;
  assert.equal((await call({ action: "save-practice", state: reopen, version: 2 })).status, 400);
  user = { id: "alice" };
  assert.equal((await call({ action: "start", assignmentId: "a1" })).status, 403);
  assert.equal(
    (await call({ action: "submit", assignmentId: "a1", sessionId: started.data.session.id }))
      .status,
    403,
  );
  assert.deepEqual(tables.training_sessions, history);
});
