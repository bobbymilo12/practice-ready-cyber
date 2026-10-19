import * as changeTracking from "../src/lib/practice-change-tracking.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as managerActions from "../src/lib/manager-actions.ts";
import { empty } from "./fixtures/role-matching.ts";

const require = createRequire(import.meta.url);
function compile(
  path: string,
  imports: Record<string, any>,
  extras = "",
  globals: Record<string, any> = {},
) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8")
    .replaceAll("import.meta.env.DEV", "false")
    .replaceAll("import.meta.env.VITE_SUPABASE_URL", '"https://mock.example.test"')
    .replaceAll("import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY", '"test-key"');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports: any = {};
  new Function("require", "exports", ...Object.keys(globals), code + extras)(
    (id: string) => imports[id] ?? require(id),
    exports,
    ...Object.values(globals),
  );
  return exports;
}
const spin = async (ready: () => boolean) => {
  for (let i = 0; i < 60 && !ready(); i++) await Promise.resolve();
  assert.ok(ready(), "expected asynchronous operation to reach its next stage");
};
const elements = (node: any): any[] =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap(elements)
      : [node, ...elements(node.props?.children)];

async function harness(assigned = false, published = assigned) {
  const module = {
    id: "draft",
    title: "Practice module",
    type: "Prescriptions",
    topicKey: "prescriptions",
    published,
    createdAt: 1,
    scenarios: [
      {
        id: "q",
        kind: "mcq",
        title: "Test",
        status: "approved",
        question: "Choose",
        patientQuote: "",
        options: ["Correct", "Other"],
        correctIndex: 0,
        learningPoint: "Local guidance",
      },
    ],
  };
  const state = {
    practiceData: empty(),
    modules: [module],
    assignments: assigned
      ? [
          {
            id: "old-assignment",
            moduleId: module.id,
            traineeId: "trainee",
            assignedAt: 1,
            status: "completed",
            dueDate: "2026-11-01",
          },
        ]
      : [],
    packages: [{ id: "package", kind: "induction", moduleIds: [module.id] }],
    setupComplete: true,
    answers: {},
    emojiMarks: {},
    currentDraftId: module.id,
  };
  const trainee = {
    id: "trainee",
    name: "Starter",
    email: "starter@example.test",
    status: "active",
  };
  const account = { id: "manager", practiceId: "practice", role: "manager", name: "Manager" };
  const useApp = require("zustand").create(() => ({
    ...state,
    account: null,
    approveScenario: (moduleId: string, scenarioId: string) =>
      useApp.setState((s: any) => ({
        modules: s.modules.map((m: any) =>
          m.id === moduleId
            ? changeTracking.approveReviewedQuestion(m, scenarioId, s.practiceData)
            : m,
        ),
      })),
    trainees: [],
    results: [],
  }));
  let stored = structuredClone(state),
    version = 1;
  const requests: { body: any; resolve: (response: Response) => void }[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const backend = compile(
    "../src/lib/backend.ts",
    {
      "./manager-actions": managerActions,
      "./practice-change-tracking": changeTracking,
      "./store": { useApp, defaultPracticeData: empty() },
      "./dev-mode": { devRole: () => null },
      "./role-requests": { normaliseRoleRequestCategories: (v: unknown) => v },
      "./local-procedures": {},
      "./role-templates": { setRoleTemplates() {} },
      "@supabase/supabase-js": {
        createClient: () => ({
          auth: {
            getSession: async () => ({ data: { session: { access_token: "token" } }, error: null }),
            onAuthStateChange() {},
          },
        }),
      },
    },
    "",
    {
      window: { addEventListener() {} },
      setTimeout: (callback: () => void) => {
        const id = ++timerId;
        timers.set(id, callback);
        return id;
      },
      clearTimeout: (id: number) => timers.delete(id),
      fetch: (_: unknown, init: { body: string }) => {
        const body = JSON.parse(init.body);
        if (body.action === "load")
          return Promise.resolve(
            Response.json({ account, state: stored, version, trainees: [trainee], sessions: [] }),
          );
        assert.equal(body.action, "save-practice");
        return new Promise<Response>((resolve) => requests.push({ body, resolve }));
      },
    },
  );
  backend.initializeBackend();
  await backend.loadWorkspace();
  const succeed = (index: number) => {
    assert.equal(requests[index].body.version, version);
    const next = structuredClone(requests[index].body.state);
    next.modules = changeTracking.enforceReviewDecisions(
      stored.modules as any,
      next.modules as any,
      next.practiceData,
      { id: "manager", name: "Manager" },
      new Date().toISOString(),
      stored.practiceData,
    );
    next.modules = changeTracking.flagPracticeChanges(
      stored.practiceData,
      next.practiceData,
      next.modules as any,
    );
    stored = next;
    version++;
    requests[index].resolve(
      Response.json({
        version,
        reviewConfirmations: Object.fromEntries(
          next.modules
            .filter((m: any) => m.reviewConfirmations?.length)
            .map((m: any) => [m.id, m.reviewConfirmations]),
        ),
      }),
    );
  };
  const fail = (index: number) =>
    requests[index].resolve(Response.json({ error: "Save rejected. Try again." }, { status: 503 }));

  function ui(kind: "review" | "assign" | "trainee" | "dashboard" | "merge") {
    const states: any[] = [];
    let index = 0;
    const react = {
      useState: (initial: any) => {
        const key = index++;
        if (!(key in states)) states[key] = typeof initial === "function" ? initial() : initial;
        return [
          states[key],
          (next: any) => {
            states[key] = typeof next === "function" ? next(states[key]) : next;
          },
        ];
      },
      useRef: (initial: any) => {
        const key = index++;
        return (states[key] ??= { current: initial });
      },
      useMemo: (fn: () => unknown) => fn(),
      useEffect() {},
    };
    const connection = Object.assign((select: any) => select(backend.useConnection.getState()), {
      getState: backend.useConnection.getState,
    });
    const store = Object.assign(
      (select?: any) => (select ? select(useApp.getState()) : useApp.getState()),
      { getState: useApp.getState },
    );
    const imports: Record<string, any> = {
      react,
      "@/lib/backend": { ...backend, useConnection: connection },
      "@/lib/store": { useApp: store, RESULT_EMOJIS: [] },
      "@tanstack/react-router": {
        createFileRoute: () => (options: any) => ({
          ...options,
          useSearch: () => ({ id: "draft" }),
          useParams: () => ({ id: "trainee" }),
        }),
        useNavigate: () => async (destination: unknown) => {
          navigation.push(destination);
        },
        Link: "a",
      },
      "@/components/Shell": { Shell: "main", Card: "section", Badge: "span" },
      "@/lib/dev-procedure-diagnostics": { readProcedureDiagnostics: () => null },
      "@/lib/role-matching": {},
      "@/lib/sequence": {},
      "@/lib/practice-change-tracking": changeTracking,
      "@/lib/training": {
        assignmentProgress: () => ({ fraction: 0, status: "Not Started" }),
        primaryScenarios: (module: any) =>
          module.scenarios.filter((s: any) => s.status === "approved" && !s.followUpFor),
      },
    };
    const hook = compile("../src/hooks/use-manager-action.ts", imports);
    imports["@/hooks/use-manager-action"] = hook;
    const path =
      kind === "merge"
        ? "../src/routes/modules.merge.tsx"
        : kind === "review"
          ? "../src/routes/modules.review.tsx"
          : kind === "trainee"
            ? "../src/routes/trainees.$id.tsx"
            : "../src/routes/dashboard.tsx";
    const route = compile(
      path,
      imports,
      kind === "assign" ? "\nexports.AssignControl = AssignControl;" : "",
    );
    const navigation: unknown[] = [];
    const render = () => {
      index = 0;
      return elements(
        kind === "assign" ? route.AssignControl({ moduleId: "draft" }) : route.Route.component(),
      );
    };
    const buttons = (label: string) =>
      render().filter((n) => n.type === "button" && n.props.children === label);
    const button = (label: string) => {
      const result = buttons(label)[0];
      assert.ok(result, `missing button ${label}`);
      return result;
    };
    const alerts = () =>
      render()
        .filter((n) => n.props?.role === "alert")
        .map((n) => n.props.children)
        .join(" ");
    return { render, button, buttons, navigation, alerts };
  }
  return {
    backend,
    useApp,
    requests,
    succeed,
    fail,
    ui,
    get stored() {
      return stored;
    },
    fireAutosave: () => {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((fn) => fn());
    },
  };
}

test("publish UI waits for persistence; both publish buttons and backend retries share one operation", async () => {
  const h = await harness();
  const ui = h.ui("review");
  const buttons = ui.buttons("Publish module");
  assert.equal(buttons.length, 2);
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  await spin(() => h.requests.length === 1);
  assert.equal(h.useApp.getState().modules[0].published, false);
  assert.equal(ui.navigation.length, 0);
  assert.equal(ui.button("Publishing…").props.disabled, true);
  assert.equal(h.requests[0].body.state.modules[0].published, true);
  h.succeed(0);
  await spin(() => ui.navigation.length === 1);
  assert.equal(h.useApp.getState().modules[0].published, true);
  assert.equal(ui.alerts(), "");
});

test("failed publish stays on review, remains unpublished, and can retry without background publishing", async () => {
  const h = await harness();
  const ui = h.ui("review");
  ui.button("Publish module").props.onClick();
  await spin(() => h.requests.length === 1);
  h.fail(0);
  await spin(() => ui.alerts().includes("Save rejected"));
  assert.equal(ui.navigation.length, 0);
  assert.equal(h.useApp.getState().modules[0].published, false);
  assert.equal(ui.button("Publish module").props.disabled, false);
  h.fireAutosave();
  await Promise.resolve();
  assert.equal(h.requests.length, 1);
  ui.button("Publish module").props.onClick();
  await spin(() => h.requests.length === 2);
  h.succeed(1);
  await spin(() => ui.navigation.length === 1);
});

test("assignment UI shows Assigned only after confirmation and ignores double clicks", async () => {
  const h = await harness(false, true);
  const ui = h.ui("assign");
  ui.button("Assign to employees").props.onClick();
  const button = ui.button("Assign");
  button.props.onClick();
  button.props.onClick();
  await spin(() => h.requests.length === 1);
  assert.deepEqual(h.useApp.getState().assignments, []);
  assert.equal(ui.button("Assigning…").props.disabled, true);
  assert.equal(ui.buttons("Assigned").length, 0);
  h.succeed(0);
  await spin(() => ui.buttons("Assigned").length === 1);
  assert.equal(h.useApp.getState().assignments.length, 1);
  await h.backend.confirmManagerAction({ kind: "assign", moduleId: "draft", traineeId: "trainee" });
  assert.equal(h.requests.length, 1);
});

test("failed assignment remains available and an unrelated autosave cannot apply the rejected assignment", async () => {
  const h = await harness(false, true);
  const ui = h.ui("assign");
  ui.button("Assign to employees").props.onClick();
  ui.button("Assign").props.onClick();
  await spin(() => h.requests.length === 1);
  h.fail(0);
  await spin(() => ui.alerts().includes("Save rejected"));
  assert.deepEqual(h.useApp.getState().assignments, []);
  assert.equal(ui.buttons("Assigned").length, 0);
  assert.equal(ui.button("Assign").props.disabled, false);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, practiceName: "Edited practice" },
  }));
  h.fireAutosave();
  await spin(() => h.requests.length === 2);
  assert.deepEqual(h.requests[1].body.state.assignments, []);
  h.succeed(1);
  await spin(() => !h.backend.useConnection.getState().saving);
  assert.equal(h.stored.practiceData.practiceName, "Edited practice");
});

for (const succeeds of [true, false])
  test(`reassignment ${succeeds ? "waits for confirmation" : "preserves the previous assignment on failure"}`, async () => {
    const h = await harness(true);
    const ui = h.ui("trainee");
    const button = ui.button("Redo — reassign module");
    button.props.onClick();
    button.props.onClick();
    await spin(() => h.requests.length === 1);
    assert.equal(h.useApp.getState().assignments[0].id, "old-assignment");
    assert.equal(ui.button("Reassigning…").props.disabled, true);
    if (succeeds) h.succeed(0);
    else h.fail(0);
    await spin(() => !h.backend.useConnection.getState().managerSaving);
    await spin(() => ui.buttons("Redo — reassign module").length === 1);
    const assignment = h.useApp.getState().assignments[0];
    if (succeeds) {
      assert.notEqual(assignment.id, "old-assignment");
      assert.equal(assignment.status, "assigned");
      assert.equal(assignment.dueDate, "2026-11-01");
    } else {
      assert.equal(assignment.id, "old-assignment");
      assert.equal(assignment.status, "completed");
      assert.match(ui.alerts(), /Save rejected/);
    }
    assert.equal(h.requests.length, 1);
  });

test("backend deduplicates identical pending actions and blocks competing actions", async () => {
  const h = await harness(false, true);
  const action = { kind: "assign" as const, moduleId: "draft", traineeId: "trainee" };
  const first = h.backend.confirmManagerAction(action);
  const second = h.backend.confirmManagerAction(action);
  assert.equal(first, second);
  await assert.rejects(
    h.backend.confirmManagerAction({ kind: "delete-draft", moduleId: "draft" }),
    /Another training action/,
  );
  await spin(() => h.requests.length === 1);
  h.succeed(0);
  await Promise.all([first, second]);
  assert.equal(h.useApp.getState().assignments.length, 1);
});

test("pending configuration edits are flushed before publishing and use the confirmed version", async () => {
  const h = await harness();
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, practiceName: "Local edit" },
  }));
  const operation = h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" });
  await spin(() => h.requests.length === 1);
  assert.equal(h.requests[0].body.state.modules[0].published, false);
  assert.equal(h.requests[0].body.state.practiceData.practiceName, "Local edit");
  h.succeed(0);
  await spin(() => h.requests.length === 2);
  assert.equal(h.requests[1].body.version, 2);
  assert.equal(h.requests[1].body.state.modules[0].published, true);
  assert.equal(h.useApp.getState().modules[0].published, false);
  h.succeed(1);
  await operation;
});

test("ordinary debounced saving stays functional during and after a confirmed action", async () => {
  const h = await harness();
  const operation = h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" });
  await spin(() => h.requests.length === 1);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, practiceName: "Edited while publishing" },
  }));
  h.fireAutosave();
  assert.equal(h.requests.length, 1);
  h.succeed(0);
  await operation;
  await spin(() => h.requests.length === 2);
  assert.equal(h.useApp.getState().practiceData.practiceName, "Edited while publishing");
  assert.equal(h.requests[1].body.state.practiceData.practiceName, "Edited while publishing");
  assert.equal(h.requests[1].body.state.modules[0].published, true);
  h.succeed(1);
  await spin(() => !h.backend.useConnection.getState().saving);
  h.useApp.setState((s: any) => ({ practiceData: { ...s.practiceData, hours: "09:00–17:00" } }));
  h.fireAutosave();
  await spin(() => h.requests.length === 3);
  h.succeed(2);
  await spin(() => !h.backend.useConnection.getState().saving);
  assert.equal(h.stored.practiceData.hours, "09:00–17:00");
});

test("delete-draft remains unchanged after failure and applies only after a successful retry", async () => {
  const h = await harness();
  const offset = h.requests.length;
  const action = { kind: "delete-draft", moduleId: "draft" };
  const original = JSON.stringify(h.useApp.getState().modules);
  const failed = h.backend.confirmManagerAction(action);
  await spin(() => h.requests.length === offset + 1);
  assert.equal(JSON.stringify(h.useApp.getState().modules), original);
  h.fail(offset);
  await assert.rejects(failed, /Save rejected/);
  assert.equal(JSON.stringify(h.useApp.getState().modules), original);
  const retried = h.backend.confirmManagerAction(action);
  await spin(() => h.requests.length === offset + 2);
  h.succeed(offset + 1);
  await retried;
  assert.equal(h.useApp.getState().modules.length, 0);
  assert.deepEqual(h.useApp.getState().packages[0].moduleIds, []);
  assert.equal(h.useApp.getState().currentDraftId, null);
});

test("a failure while flushing ordinary edits never sends the consequential action", async () => {
  const h = await harness();
  h.useApp.setState((s: any) => ({ practiceData: { ...s.practiceData, hours: "New hours" } }));
  const operation = h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" });
  await spin(() => h.requests.length === 1);
  h.fail(0);
  await assert.rejects(operation, /Save rejected/);
  assert.equal(h.requests.length, 1);
  assert.equal(h.useApp.getState().modules[0].published, false);
  assert.equal(h.useApp.getState().practiceData.hours, "New hours");
  const retry = h.backend.flushPractice();
  await spin(() => h.requests.length === 2);
  assert.equal(h.requests[1].body.state.modules[0].published, false);
  h.succeed(1);
  await retry;
});

test("reload waits for a pending consequential action rather than replacing its baseline", async () => {
  const h = await harness();
  const operation = h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" });
  await spin(() => h.requests.length === 1);
  let reloaded = false;
  const reload = h.backend.loadWorkspace().then(() => {
    reloaded = true;
  });
  await Promise.resolve();
  assert.equal(reloaded, false);
  h.succeed(0);
  await Promise.all([operation, reload]);
  assert.equal(h.useApp.getState().modules[0].published, true);
});

test("late confirmations cannot mutate a different account's workspace", async () => {
  const h = await harness();
  const operation = h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" });
  await spin(() => h.requests.length === 1);
  h.backend.useConnection.setState({ ready: false });
  h.useApp.setState({ account: { id: "other", role: "manager" }, modules: [] });
  h.succeed(0);
  await assert.rejects(operation, /session changed/);
  assert.deepEqual(h.useApp.getState().modules, []);
  assert.equal(h.useApp.getState().account.id, "other");
});

test("an incomplete save acknowledgement cannot make a staged action appear successful", async () => {
  const h = await harness();
  const operation = h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" });
  await spin(() => h.requests.length === 1);
  h.requests[0].resolve(Response.json({}));
  await assert.rejects(operation, /confirmation was incomplete/);
  assert.equal(h.useApp.getState().modules[0].published, false);
});

test("publishing preserves edits made during the request and does not publish those newer edits as reviewed", async () => {
  const h = await harness();
  const operation = h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" });
  await spin(() => h.requests.length === 1);
  h.useApp.setState((s: any) => ({
    modules: s.modules.map((m: any) => ({ ...m, title: "Newer title" })),
  }));
  h.succeed(0);
  await operation;
  assert.equal(h.useApp.getState().modules[0].title, "Newer title");
  assert.equal(h.useApp.getState().modules[0].needsReview, true);
  await spin(() => h.requests.length === 2);
  h.succeed(1);
  await spin(() => !h.backend.useConnection.getState().saving);
});

for (const succeeds of [true, false])
  test(`merge ${succeeds ? "confirms before navigation" : "keeps draft creation out of local state after rejection"}`, async () => {
    const h = await harness();
    h.useApp.setState((s: any) => ({
      modules: [...s.modules, { ...s.modules[0], id: "second", title: "Second module" }],
    }));
    const initialSave = h.backend.flushPractice();
    await spin(() => h.requests.length === 1);
    h.succeed(0);
    await initialSave;
    const ui = h.ui("merge");
    const checkboxes = ui
      .render()
      .filter((node) => node.type === "input" && node.props.type === "checkbox");
    checkboxes.forEach((node) => node.props.onChange());
    const button = ui.button("Merge into one module");
    button.props.onClick();
    button.props.onClick();
    await spin(() => h.requests.length === 2);
    assert.equal(h.useApp.getState().modules.length, 2);
    assert.equal(ui.navigation.length, 0);
    assert.equal(ui.button("Merging…").props.disabled, true);
    if (succeeds) {
      h.succeed(1);
      await spin(() => ui.navigation.length === 1);
      assert.equal(h.useApp.getState().modules.length, 3);
      const merged = h.useApp.getState().modules[2];
      assert.equal(merged.published, false);
      assert.equal(merged.scenarios.length, 1); // Existing deduplication behaviour is retained.
      assert.equal((ui.navigation[0] as any).search.id, merged.id);
    } else {
      h.fail(1);
      await spin(() => ui.alerts().includes("Save rejected"));
      assert.equal(ui.navigation.length, 0);
      assert.equal(h.useApp.getState().modules.length, 2);
      h.fireAutosave();
      await Promise.resolve();
      assert.equal(h.requests.length, 2);
      ui.button("Merge into one module").props.onClick();
      await spin(() => h.requests.length === 3);
      h.succeed(2);
      await spin(() => ui.navigation.length === 1);
      assert.equal(h.useApp.getState().modules.length, 3);
    }
  });

async function flushReview(h: Awaited<ReturnType<typeof harness>>) {
  const index = h.requests.length;
  const save = h.backend.flushPractice();
  await spin(() => h.requests.length === index + 1);
  h.succeed(index);
  await save;
}
function approveAll(h: Awaited<ReturnType<typeof harness>>) {
  h.useApp.setState((s: any) => ({
    modules: s.modules.map((m: any) =>
      m.scenarios.reduce(
        (module: any, q: any) =>
          changeTracking.approveReviewedQuestion(module, q.id, s.practiceData),
        m,
      ),
    ),
  }));
}
async function flaggedReview() {
  const h = await harness(true);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, repeatTurnaround: "72 working hours" },
  }));
  await flushReview(h);
  return h;
}
test("review UI requires question approval, not notes or checkboxes, and waits for publication", async () => {
  const h = await flaggedReview();
  const ui = h.ui("review");
  assert.equal(ui.buttons("Confirm existing training is still correct").length, 0);
  assert.ok(!ui.render().some((n) => n.type === "input" && n.props.type === "checkbox"));
  assert.ok(!ui.render().some((n) => n.type === "textarea"));
  assert.equal(ui.button("Publish reviewed module").props.disabled, true);
  await assert.rejects(
    h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" }),
    /Approve/,
  );
  const card = ui.render().find((n) => typeof n.type === "function" && n.props.scenario);
  assert.equal(card.props.reviewRequired, true);
  const approve = elements(card.type(card.props)).find(
    (n) => n.type === "button" && n.props.children === "Approve",
  );
  assert.equal(approve.props.disabled, false);
  approve.props.onClick();
  await flushReview(h);
  assert.equal(ui.button("Publish reviewed module").props.disabled, false);
  const index = h.requests.length;
  const publish = ui.button("Publish reviewed module");
  publish.props.onClick();
  publish.props.onClick();
  await spin(() => h.requests.length === index + 1);
  assert.equal(h.useApp.getState().modules[0].needsReview, true);
  assert.equal(ui.navigation.length, 0);
  h.requests[index].body.state.modules[0].reviewConfirmations[0].by = "forged";
  h.succeed(index);
  await spin(() => ui.navigation.length === 1);
  const module = h.useApp.getState().modules[0];
  assert.equal(module.needsReview, false);
  assert.equal(module.reviewConfirmations[0].by, "manager");
  assert.equal(module.reviewConfirmations[0].decision, "updated");
  assert.equal(module.reviewConfirmations[0].note, "");
});
test("failed reviewed publication preserves pause and approvals for retry", async () => {
  const h = await flaggedReview();
  approveAll(h);
  await flushReview(h);
  const action = { kind: "publish", moduleId: "draft" };
  let index = h.requests.length;
  const failed = h.backend.confirmManagerAction(action);
  await spin(() => h.requests.length === index + 1);
  h.fail(index);
  await assert.rejects(failed, /Save rejected/);
  assert.equal(h.useApp.getState().modules[0].needsReview, true);
  assert.equal(h.useApp.getState().modules[0].reviewConfirmations, undefined);
  index = h.requests.length;
  const retry = h.backend.confirmManagerAction(action);
  await spin(() => h.requests.length === index + 1);
  h.succeed(index);
  await retry;
  assert.equal(h.useApp.getState().modules[0].needsReview, false);
});
test("practice changes during reviewed publication keep the module paused and invalidate approvals", async () => {
  const h = await flaggedReview();
  approveAll(h);
  await flushReview(h);
  const index = h.requests.length;
  const operation = h.backend.confirmManagerAction({ kind: "publish", moduleId: "draft" });
  await spin(() => h.requests.length === index + 1);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, repeatTurnaround: "96 working hours" },
  }));
  h.succeed(index);
  await operation;
  const state = h.useApp.getState();
  assert.equal(state.modules[0].needsReview, true);
  assert.ok(changeTracking.pendingQuestionReviews(state.modules[0], state.practiceData).length);
  await spin(() => h.requests.length === index + 2);
  h.succeed(index + 1);
  await spin(() => !h.backend.useConnection.getState().saving);
  assert.equal(h.stored.modules[0].needsReview, true);
});

test("dashboard opens published modules in scrollable manager review without attempts or progress writes", async () => {
  for (const needsReview of [true, false]) {
    const h = await harness(false, true);
    h.useApp.setState((s: any) => ({
      modules: s.modules.map((m: any) => ({
        ...m,
        needsReview,
        reviewReason: needsReview
          ? "UTI Local Procedure changed.\nBooking instructions changed."
          : undefined,
        scenarios: [
          ...m.scenarios,
          { ...m.scenarios[0], id: "second", question: "Second question" },
        ],
      })),
    }));
    const before = JSON.stringify(h.useApp.getState());
    const sessions = JSON.stringify(h.backend.useConnection.getState().sessions);
    const requests = h.requests.length;
    const dashboard = h.ui("dashboard");
    const open = dashboard.render().find((n) => n.type === "a" && n.props.children === "Open →");
    assert.equal(open.props.to, "/modules/review");
    assert.deepEqual(open.props.search, { id: "draft" });
    const review = h.ui("review");
    const nodes = review.render();
    const cards = nodes.filter((n) => typeof n.type === "function" && n.props.scenario);
    assert.equal(cards.length, 2, "all questions appear together");
    const renderedCards = cards.flatMap((card) => elements(card.type(card.props)));
    const text = JSON.stringify([...nodes, ...renderedCards].map((n) => n.props.children));
    assert.match(text, /Review training/);
    assert.match(text, /Best answer/);
    assert.match(text, /Correct/);
    assert.match(text, /Second question/);
    assert.doesNotMatch(text, /Check answer/);
    if (needsReview) {
      assert.match(text, /Needs review — training paused/);
      assert.match(text, /UTI Local Procedure changed/);
      assert.match(text, /Booking instructions changed/);
      assert.equal(review.buttons("Confirm existing training is still correct").length, 0);
      assert.ok(review.buttons("Publish reviewed module").length);
    }
    assert.equal(JSON.stringify(h.useApp.getState()), before);
    assert.equal(JSON.stringify(h.backend.useConnection.getState().sessions), sessions);
    assert.equal(h.requests.length, requests, "opening review sends no training or save request");
  }
});

test("merge requires fresh approval for paused sources, even when duplicated by approved content", () => {
  const question = {
    id: "q",
    kind: "mcq" as const,
    title: "Same title",
    patientQuote: "A request",
    question: "What next?",
    options: ["A", "B"],
    correctIndex: 0,
    learningPoint: "Saved guidance",
    status: "approved" as const,
  };
  const module = {
    id: "m",
    title: "Module",
    type: "Test",
    topicKey: "custom",
    published: true,
    createdAt: 1,
    scenarios: [question],
  };
  const paused = { ...module, id: "paused", needsReview: true };
  const state: any = {
    modules: [module, paused],
    assignments: [],
    packages: [],
    practiceData: empty(),
  };
  const patch = managerActions.managerActionPatch(
    state,
    { kind: "merge", moduleId: "merged", moduleIds: ["m", "paused"], title: "Combined" },
    { id: "op", at: 1 },
  );
  const merged = patch.modules!.at(-1)!;
  assert.equal(merged.scenarios.length, 1);
  assert.equal(merged.scenarios[0].status, "draft");
  assert.equal(question.status, "approved");
  const next = { ...state, ...patch };
  assert.throws(
    () =>
      managerActions.managerActionPatch(
        next,
        { kind: "publish", moduleId: "merged" },
        { id: "publish", at: 2 },
      ),
    /Approve every scenario/,
  );
  next.modules = next.modules.map((m: any) =>
    m.id === "merged"
      ? { ...m, scenarios: m.scenarios.map((s: any) => ({ ...s, status: "approved" })) }
      : m,
  );
  assert.equal(
    managerActions
      .managerActionPatch(next, { kind: "publish", moduleId: "merged" }, { id: "publish", at: 2 })
      .modules!.at(-1)!.published,
    true,
  );
});

test("merge keeps different answers/guidance and provenance, deduplicates equivalent questions and rewires recovery", () => {
  const q: any = {
    id: "q",
    kind: "mcq",
    title: "Same",
    question: "What next?",
    patientQuote: "Request",
    options: ["A", "B"],
    correctIndex: 0,
    learningPoint: "Guidance",
    status: "approved",
    provenance: {
      kind: "core",
      inputs: [
        { source: "practice_setup", paths: ["practiceData.repeatTurnaround"], snapshot: "48" },
      ],
    },
  };
  const follow = { ...q, id: "follow", followUpFor: "q", title: "Follow-up" };
  const first: any = {
    id: "one",
    title: "One",
    topicKey: "prescriptions",
    published: true,
    scenarios: [q, follow],
  };
  const second = {
    ...first,
    id: "two",
    scenarios: [
      structuredClone(q),
      { ...follow, id: "follow2" },
      { ...q, id: "different-answer", correctIndex: 1 },
      { ...q, id: "different-guidance", learningPoint: "Other guidance" },
      { ...q, id: "different-source", localRoleRequestId: "another-request" },
    ],
  };
  const state: any = { modules: [first, second], assignments: [], packages: [] };
  const merged = managerActions
    .managerActionPatch(
      state,
      { kind: "merge", moduleId: "merged", moduleIds: ["one", "two"], title: "Combined" },
      { id: "op", at: 1 },
    )
    .modules!.at(-1)!;
  assert.equal(merged.scenarios.length, 5);
  assert.ok(
    merged.scenarios.some((s) => s.kind === "mcq" && s.localRoleRequestId === "another-request"),
  );
  assert.deepEqual(merged.scenarios[0].provenance, q.provenance);
  assert.equal(merged.scenarios[1].followUpFor, merged.scenarios[0].id);
  const before = empty();
  const after = { ...before, repeatTurnaround: "Updated" };
  const flagged = changeTracking.flagPracticeChanges(before, after, [
    { ...merged, published: true },
  ])[0];
  assert.equal(flagged.needsReview, true);
  assert.ok(
    changeTracking.recordedSourceChanges(flagged.scenarios[0], flagged.reviewChanges!).length,
  );
});

test("manager trainee page distinguishes replaced unfinished training from retained older completions", async () => {
  const training = await import("../src/lib/training.ts");
  const question: any = {
    id: "q",
    kind: "mcq",
    title: "Test",
    question: "What next?",
    patientQuote: "Request",
    options: ["A", "B"],
    correctIndex: 0,
    learningPoint: "Old guidance",
    status: "approved",
  };
  const original: any = {
    id: "m",
    title: "Module",
    type: "Test",
    topicKey: "custom",
    published: true,
    scenarios: [question],
  };
  const assignment: any = { id: "a", traineeId: "t", moduleId: "m", status: "assigned" };
  const old = training.startSession(original, assignment, "old");
  const current = { ...original, scenarios: [{ ...question, learningPoint: "Updated guidance" }] };
  const state: any = {
    trainees: [{ id: "t", name: "Test trainee", status: "active" }],
    modules: [current],
    results: [],
    assignments: [assignment],
    packages: [],
  };
  const connection: any = { sessions: [old] };
  const page = compile(
    "../src/routes/trainees.$id.tsx",
    {
      "@/hooks/use-manager-action": { useManagerAction: () => ({ saving: false }) },
      "@tanstack/react-router": {
        createFileRoute: () => () => ({ useParams: () => ({ id: "t" }) }),
        Link: "a",
      },
      "@/components/Shell": { Shell: "main", Card: "section", Badge: "span" },
      "@/lib/backend": { useConnection: (select: any) => select(connection) },
      "@/lib/training": training,
      "@/lib/store": { useApp: (select: any) => select(state), RESULT_EMOJIS: [] },
    },
    "\nexports.TraineeDetail = TraineeDetail;",
  );
  assert.match(JSON.stringify(page.TraineeDetail()), /trainee needs to start the updated training/);
  const completed = training.submitSession(
    training.advanceSession(training.answerSession(old, 0), original.title),
    original.title,
  );
  connection.sessions = [completed];
  state.results = [completed.result];
  const output = JSON.stringify(page.TraineeDetail());
  assert.match(output, /Completed before the training was updated/);
  assert.match(output, /no repeat has been assigned automatically/);
  assert.doesNotMatch(output, /trainee needs to start/);
});

test("assignment choices exclude inactive staff and withdrawn work is shown only as trainee history", async () => {
  const training = await import("../src/lib/training.ts");
  const assignment: any = {
    id: "a",
    moduleId: "m",
    traineeId: "t",
    withdrawnAt: 123,
    status: "assigned",
  };
  const state: any = {
    account: { id: "t" },
    practiceData: { practiceName: "Test" },
    trainees: [
      { id: "active", name: "Active person" },
      { id: "inactive", name: "Inactive person", inactiveAt: "2026-10-19" },
    ],
    assignments: [assignment],
    modules: [{ id: "m", title: "Historical module", published: true, scenarios: [] }],
    packages: [],
    emojiMarks: {},
  };
  const connection: any = {
    sessions: [
      {
        id: "attempt",
        assignmentId: "a",
        traineeId: "t",
        result: { moduleId: "m", moduleTitle: "Historical module", total: 1, correct: 1 },
      },
    ],
  };
  const imports: any = {
    react: { useState: () => [true, () => {}] },
    "@/hooks/use-manager-action": { useManagerAction: () => ({ saving: false }) },
    "@tanstack/react-router": { createFileRoute: () => () => ({}), Link: "a" },
    "@/components/Shell": { Shell: "main", Card: "section", Badge: "span" },
    "@/lib/backend": { useConnection: (select: any) => select(connection) },
    "@/lib/training": training,
    "@/lib/store": { useApp: (select?: any) => (select ? select(state) : state) },
  };
  const dashboard = compile(
    "../src/routes/dashboard.tsx",
    imports,
    "\nexports.AssignControl = AssignControl;",
  );
  const choices = JSON.stringify(dashboard.AssignControl({ moduleId: "m" }));
  assert.match(choices, /Active person/);
  assert.doesNotMatch(choices, /Inactive person/);
  const staff = compile("../src/routes/staff.tsx", imports, "\nexports.Staff = Staff;");
  const screen = JSON.stringify(staff.Staff());
  assert.match(screen, /Withdrawn training/);
  assert.match(screen, /View completed result/);
  assert.doesNotMatch(screen, /Start module|Continue module|Practise again/);
});
