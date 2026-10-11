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

for (const kind of ["delete-draft", "confirm-review"] as const)
  test(`${kind} remains unchanged after failure and applies only after a successful retry`, async () => {
    const h = await harness();
    if (kind === "confirm-review") {
      h.useApp.setState((s: any) => ({
        modules: s.modules.map((m: any) => ({ ...m, published: true, needsReview: true })),
      }));
      const save = h.backend.flushPractice();
      await spin(() => h.requests.length === 1);
      h.succeed(0);
      await save;
    }
    const offset = h.requests.length;
    const action =
      kind === "confirm-review"
        ? {
            kind,
            moduleId: "draft",
            note: "Checked the current practice rules; this module remains correct.",
            reviewKey: changeTracking.reviewKey(
              h.useApp.getState().modules[0],
              h.useApp.getState().practiceData,
            ),
          }
        : { kind, moduleId: "draft" };
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
    if (kind === "delete-draft") {
      assert.equal(h.useApp.getState().modules.length, 0);
      assert.deepEqual(h.useApp.getState().packages[0].moduleIds, []);
      assert.equal(h.useApp.getState().currentDraftId, null);
    } else assert.equal(h.useApp.getState().modules[0].needsReview, false);
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

test("review UI requires an explicit decision and saves authenticated confirmation before clearing the flag", async () => {
  const h = await harness(true);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, repeatTurnaround: "72 working hours" },
  }));
  const save = h.backend.flushPractice();
  await spin(() => h.requests.length === 1);
  h.succeed(0);
  await save;
  assert.equal(h.useApp.getState().modules[0].needsReview, true);
  const dashboard = h.ui("dashboard");
  assert.equal(dashboard.buttons("Dismiss").length, 0);
  const ui = h.ui("review");
  const button = "Confirm existing training is still correct";
  assert.equal(ui.button(button).props.disabled, true);
  ui.render()
    .find((node) => node.type === "textarea")
    .props.onChange({ target: { value: "Checked each question: no old turnaround is promised." } });
  ui.render()
    .find((node) => node.type === "input" && node.props.type === "checkbox")
    .props.onChange({ target: { checked: true } });
  const confirm = ui.button(button);
  assert.equal(confirm.props.disabled, false);
  confirm.props.onClick();
  confirm.props.onClick();
  await spin(() => h.requests.length === 2);
  assert.equal(h.useApp.getState().modules[0].needsReview, true);
  assert.equal(h.useApp.getState().modules[0].reviewConfirmations, undefined);
  assert.equal(ui.navigation.length, 0);
  h.requests[1].body.state.modules[0].reviewConfirmations[0].by = "forged";
  h.succeed(1);
  await spin(() => ui.navigation.length === 1);
  const confirmed = h.useApp.getState().modules[0];
  assert.equal(confirmed.needsReview, false);
  assert.equal(confirmed.reviewConfirmations[0].by, "manager");
  assert.equal(confirmed.reviewConfirmations[0].decision, "unchanged");
  assert.ok(
    confirmed.reviewConfirmations[0].reasons.some((reason: string) =>
      reason.includes("Prescription turnaround"),
    ),
  );
});

test("failed review confirmation retains the warning and never adds a local confirmation record", async () => {
  const h = await harness(true);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, repeatTurnaround: "72 working hours" },
  }));
  const save = h.backend.flushPractice();
  await spin(() => h.requests.length === 1);
  h.succeed(0);
  await save;
  const module = h.useApp.getState().modules[0];
  const action = {
    kind: "confirm-review",
    moduleId: module.id,
    note: "Checked all questions.",
    reviewKey: changeTracking.reviewKey(module, h.useApp.getState().practiceData),
  };
  const failed = h.backend.confirmManagerAction(action);
  await spin(() => h.requests.length === 2);
  h.fail(1);
  await assert.rejects(failed, /Save rejected/);
  assert.equal(h.useApp.getState().modules[0].needsReview, true);
  assert.equal(h.useApp.getState().modules[0].reviewConfirmations, undefined);
  const retried = h.backend.confirmManagerAction(action);
  await spin(() => h.requests.length === 3);
  h.succeed(2);
  await retried;
  assert.equal(h.useApp.getState().modules[0].reviewConfirmations.length, 1);
});

test("a new configuration change during confirmation keeps training blocked and retains the earlier decision", async () => {
  const h = await harness(true);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, repeatTurnaround: "72 working hours" },
  }));
  const save = h.backend.flushPractice();
  await spin(() => h.requests.length === 1);
  h.succeed(0);
  await save;
  const module = h.useApp.getState().modules[0];
  const action = {
    kind: "confirm-review",
    moduleId: module.id,
    note: "Checked this configuration.",
    reviewKey: changeTracking.reviewKey(module, h.useApp.getState().practiceData),
  };
  const operation = h.backend.confirmManagerAction(action);
  await spin(() => h.requests.length === 2);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, repeatTurnaround: "96 working hours" },
  }));
  h.succeed(1);
  await operation;
  assert.equal(h.useApp.getState().modules[0].needsReview, true);
  assert.equal(h.useApp.getState().modules[0].reviewConfirmations.length, 1);
  await spin(() => h.requests.length === 3);
  h.succeed(2);
  await spin(() => !h.backend.useConnection.getState().saving);
  assert.equal(h.stored.modules[0].needsReview, true);
});

test("reviewed or updated training records its decision and waits for confirmed publication", async () => {
  const h = await harness(true);
  h.useApp.setState((s: any) => ({
    practiceData: { ...s.practiceData, repeatTurnaround: "72 working hours" },
  }));
  let save = h.backend.flushPractice();
  await spin(() => h.requests.length === 1);
  h.succeed(0);
  await save;
  h.useApp.setState((s: any) => ({
    modules: s.modules.map((m: any) => ({
      ...m,
      scenarios: m.scenarios.map((q: any) => ({
        ...q,
        learningPoint: "Use the newly confirmed turnaround.",
      })),
    })),
  }));
  save = h.backend.flushPractice();
  await spin(() => h.requests.length === 2);
  h.succeed(1);
  await save;
  const ui = h.ui("review");
  ui.render()
    .find((node) => node.type === "textarea")
    .props.onChange({ target: { value: "Reviewed the updated turnaround question." } });
  ui.render()
    .find((node) => node.type === "input" && node.props.type === "checkbox")
    .props.onChange({ target: { checked: true } });
  ui.button("Publish reviewed training").props.onClick();
  await spin(() => h.requests.length === 3);
  assert.equal(h.useApp.getState().modules[0].needsReview, true);
  assert.equal(ui.navigation.length, 0);
  h.succeed(2);
  await spin(() => ui.navigation.length === 1);
  assert.equal(h.useApp.getState().modules[0].needsReview, false);
  assert.equal(h.useApp.getState().modules[0].reviewConfirmations[0].decision, "updated");
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
      assert.equal(
        review.button("Confirm existing training is still correct").props.disabled,
        true,
      );
      assert.ok(review.buttons("Publish reviewed training").length);
    }
    assert.equal(JSON.stringify(h.useApp.getState()), before);
    assert.equal(JSON.stringify(h.backend.useConnection.getState().sessions), sessions);
    assert.equal(h.requests.length, requests, "opening review sends no training or save request");
  }
});
