import { flagPracticeChanges } from "./practice-change-tracking";
import { managerActionKey, managerActionPatch, type ManagerAction } from "./manager-actions";
import { normaliseRoleRequestCategories } from "./role-requests";
import { validateLocalProcedures, procedureTargets, type LocalProcedure } from "./local-procedures";
import { setRoleTemplates, type RoleTemplate } from "./role-templates";
import { devRole, leaveDevSession } from "./dev-mode";
import { createClient } from "@supabase/supabase-js";
import { create } from "zustand";
import { defaultPracticeData, useApp, type Account, type AppState, type Trainee } from "./store";
import type { TrainingSession } from "./training";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const placeholderConfig = (value: string | undefined) =>
  !value || /YOUR_PROJECT|YOUR_PUBLIC_PUBLISHABLE_KEY/i.test(value);
export const configured = Boolean(url && key && !placeholderConfig(url) && !placeholderConfig(key));
export const supabase =
  configured && !(import.meta.env.DEV && devRole()) ? createClient(url, key) : null;

export type PracticeState = Pick<
  AppState,
  | "modules"
  | "packages"
  | "assignments"
  | "practiceData"
  | "setupComplete"
  | "emojiMarks"
  | "answers"
  | "currentDraftId"
>;
export type Snapshot = {
  account: Account;
  state: Partial<PracticeState>;
  version: number;
  trainees: Trainee[];
  sessions: TrainingSession[];
  roleTemplates?: RoleTemplate[];
};
export const useConnection = create<{
  recoveryUserId: string | null;
  ready: boolean;
  loading: boolean;
  saving: boolean;
  managerSaving: boolean;
  error: string;
  sessions: TrainingSession[];
}>(() => ({
  recoveryUserId: null,
  ready: false,
  loading: true,
  saving: false,
  managerSaving: false,
  error: "",
  sessions: [],
}));
// Capture verified recovery events immediately, including before the auth screen mounts.
// This flag is UI state only; Supabase verifies the recovery token and password update.
supabase?.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY")
    useConnection.setState({ recoveryUserId: session?.user.id ?? null });
  if (event === "SIGNED_OUT") useConnection.setState({ recoveryUserId: null });
});
let managerOperation: { key: string; promise: Promise<void> } | null = null;
let version = 0;
let applying = false;
let dirty = false;
let saving: Promise<void> | null = null;
let generation = 0;
let started = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
const practiceState = (s: AppState): PracticeState => ({
  modules: s.modules,
  packages: s.packages,
  assignments: s.assignments,
  practiceData: s.practiceData,
  setupComplete: s.setupComplete,
  emojiMarks: s.emojiMarks,
  answers: s.answers,
  currentDraftId: s.currentDraftId,
});

export function emptyPractice() {
  return {
    ...Object.fromEntries(Object.keys(defaultPracticeData).map((k) => [k, ""])),
    practiceName: "Your practice",
    staff: [],
    sameDayReasons: [],
    rolePolicies: Object.fromEntries(
      Object.keys(defaultPracticeData.rolePolicies).map((k) => [k, ""]),
    ),
  } as unknown as AppState["practiceData"];
}

export async function api<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (import.meta.env.DEV && devRole()) {
    const { devApi } = await import("./dev-backend");
    return (await devApi(action, body)) as T;
  }
  if (!supabase)
    throw new Error("PracticeReady is not connected yet. Complete the Supabase setup first.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please log in to continue.");
  const response = await fetch(`${url}/functions/v1/practice-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ ...body, action }),
    signal: AbortSignal.timeout(25000),
  });
  const payload = await response
    .json()
    .catch(() => ({ error: "The service is unavailable. Please try again." }));
  if (!response.ok || payload.error)
    throw new Error(payload.error || "Could not save. Please try again.");
  return payload;
}

function clearWorkspace() {
  applying = true;
  useApp.setState({
    account: null,
    modules: [],
    packages: [],
    assignments: [],
    trainees: [],
    results: [],
    lastResult: null,
    answers: {},
    currentDraftId: null,
    practiceData: emptyPractice(),
    setupComplete: false,
    emojiMarks: {},
  });
  applying = false;
  dirty = false;
  useConnection.setState({ sessions: [], ready: false, error: "", saving: false });
}

let loadingWorkspace: Promise<void> | null = null;
export function loadWorkspace(): Promise<void> {
  if (managerOperation) return managerOperation.promise.catch(() => {}).then(() => loadWorkspace());
  if (loadingWorkspace) return loadingWorkspace;
  loadingWorkspace = fetchWorkspace().finally(() => {
    loadingWorkspace = null;
  });
  return loadingWorkspace;
}
async function fetchWorkspace() {
  const ticket = generation;
  useConnection.setState({
    loading: devRole() ? !useConnection.getState().ready : true,
    error: "",
  });
  try {
    const snapshot = await api<Snapshot>("load");
    if (ticket !== generation) return;
    applying = true;
    if (snapshot.roleTemplates) setRoleTemplates(snapshot.roleTemplates);
    version = snapshot.version;
    const marks = snapshot.state.emojiMarks ?? {};
    const results = snapshot.sessions
      .flatMap((s) =>
        s.result
          ? [
              {
                ...s.result,
                emoji: marks[`${s.result.traineeId}:${s.result.moduleId}:${s.result.completedAt}`],
              },
            ]
          : [],
      )
      .sort((a, b) => b.completedAt - a.completedAt);
    useApp.setState({
      ...snapshot.state,
      packages: snapshot.state.packages ?? [],
      practiceData: {
        ...emptyPractice(),
        ...snapshot.state.practiceData,
        ...(snapshot.state.practiceData?.roleRequests
          ? {
              roleRequests: Object.fromEntries(
                Object.entries(snapshot.state.practiceData.roleRequests).map(([id, role]) => [
                  id,
                  normaliseRoleRequestCategories(role),
                ]),
              ),
            }
          : {}),
      },
      account: snapshot.account,
      trainees: snapshot.trainees,
      results,
      lastResult: results.find((r) => r.traineeId === snapshot.account.id) ?? null,
    });
    applying = false;
    dirty = false;
    useConnection.setState({ sessions: snapshot.sessions, ready: true, loading: false });
  } catch (error) {
    applying = false;
    if (ticket === generation)
      useConnection.setState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load your practice.",
      });
    throw error;
  }
}

export async function flushPractice() {
  if (saving) return saving;
  if (!dirty) return;
  const ticket = generation;
  saving = (async () => {
    useConnection.setState({ saving: true, error: "" });
    try {
      while (dirty && ticket === generation) {
        dirty = false;
        const state = practiceState(useApp.getState());
        const result = await api<{ version: number }>("save-practice", { state, version });
        if (ticket !== generation) return;
        version = result.version;
      }
    } catch (error) {
      dirty = true;
      useConnection.setState({
        error:
          error instanceof Error ? error.message : "Your changes have not saved. Please retry.",
      });
      throw error;
    } finally {
      saving = null;
      useConnection.setState({ saving: false });
    }
  })();
  return saving;
}

/** Consequential manager actions stay outside visible state until persistence is confirmed. */
export function confirmManagerAction(action: ManagerAction): Promise<void> {
  const key = managerActionKey(action);
  if (managerOperation)
    return managerOperation.key === key
      ? managerOperation.promise
      : Promise.reject(new Error("Another training action is saving. Wait for it to finish."));
  const ticket = generation;
  const accountId = useApp.getState().account?.id;
  const identity = { id: crypto.randomUUID(), at: Date.now() };
  useConnection.setState({ managerSaving: true });
  const promise = Promise.resolve()
    .then(async () => {
      while (saving || dirty) await flushPractice();
      if (
        ticket !== generation ||
        useApp.getState().account?.id !== accountId ||
        !useConnection.getState().ready ||
        useApp.getState().account?.role !== "manager"
      )
        throw new Error("Please log in as a manager before saving this action.");
      const current = useApp.getState();
      const patch = managerActionPatch(current, action, identity);
      if (!Object.keys(patch).length) return;
      const state = { ...practiceState(current), ...patch };
      const request = (async () => {
        useConnection.setState({ saving: true });
        const result = await api<{
          version: number;
          reviewConfirmations?: Record<string, AppState["modules"][number]["reviewConfirmations"]>;
        }>("save-practice", { state, version });
        if (ticket !== generation || useApp.getState().account?.id !== accountId)
          throw new Error("Your session changed. Reopen the practice to check the saved action.");
        if (!Number.isInteger(result.version) || result.version <= version)
          throw new Error(
            "Save confirmation was incomplete. Reload your practice to check the action.",
          );
        version = result.version;
        applying = true;
        try {
          useApp.setState((latest) => {
            const patch = managerActionPatch(latest, action, identity, current);
            if (patch.modules && result.reviewConfirmations)
              patch.modules = patch.modules.map((module) =>
                result.reviewConfirmations?.[module.id]
                  ? { ...module, reviewConfirmations: result.reviewConfirmations[module.id] }
                  : module,
              );
            return patch;
          });
        } finally {
          applying = false;
        }
      })();
      saving = request;
      try {
        await request;
      } finally {
        if (saving === request) saving = null;
        if (ticket === generation) {
          useConnection.setState({ saving: false });
          if (dirty) void flushPractice().catch(() => {});
        }
      }
    })
    .finally(() => {
      if (managerOperation?.promise === promise) managerOperation = null;
      useConnection.setState({ managerSaving: false });
    });
  managerOperation = { key, promise };
  return promise;
}

/** Persist first: failed saves never replace confirmed procedure records in the store. */
export async function saveLocalProcedures(
  updates: LocalProcedure[],
  expectedVersions: Record<string, number>,
) {
  while (saving || dirty) await flushPractice();
  const current = useApp.getState();
  if (!useConnection.getState().ready || current.account?.role !== "manager")
    throw new Error("Please log in as a manager before saving.");
  const targets = procedureTargets(current.practiceData);
  const records = { ...current.practiceData.localProcedures };
  for (const record of updates) {
    if ((records[record.requestId]?.version ?? 0) !== expectedVersions[record.requestId])
      throw new Error("This procedure has changed. Cancel and reopen it before saving.");
    if (
      !targets.some(
        (t) =>
          t.id === record.requestId && !t.conflict && t.label === record.requestLabelAtConfirmation,
      )
    )
      throw new Error("This request has changed. Review the practice roles before saving.");
    records[record.requestId] = record;
  }
  validateLocalProcedures(records);
  if (!updates.length) return;
  const ticket = generation;
  const state = practiceState(current);
  state.practiceData = { ...state.practiceData, localProcedures: records };
  state.modules = flagPracticeChanges(current.practiceData, state.practiceData, state.modules);
  saving = (async () => {
    useConnection.setState({ saving: true, error: "" });
    try {
      const result = await api<{ version: number }>("save-practice", { state, version });
      if (ticket !== generation)
        throw new Error("Your session changed. Reopen the practice to check the saved procedure.");
      version = result.version;
      applying = true;
      try {
        useApp.setState((s) => {
          const practiceData = { ...s.practiceData, localProcedures: records };
          return {
            practiceData,
            modules: flagPracticeChanges(current.practiceData, practiceData, s.modules),
          };
        });
      } finally {
        applying = false;
      }
    } catch (error) {
      if (ticket === generation)
        useConnection.setState({
          error: error instanceof Error ? error.message : "Could not save procedures.",
        });
      throw error;
    } finally {
      saving = null;
      if (ticket === generation) {
        useConnection.setState({ saving: false });
        if (dirty) void flushPractice().catch(() => {});
      }
    }
  })();
  return saving;
}

export function initializeBackend() {
  if (started) return;
  started = true;
  clearWorkspace();
  useApp.subscribe((state, previous) => {
    if (applying || !useConnection.getState().ready || state.account?.role !== "manager") return;
    if (state.practiceData !== previous.practiceData) {
      const modules = flagPracticeChanges(previous.practiceData, state.practiceData, state.modules);
      if (modules !== state.modules) {
        applying = true;
        try {
          useApp.setState({ modules });
        } finally {
          applying = false;
        }
      }
    }
    if (
      state.modules !== previous.modules ||
      state.packages !== previous.packages ||
      state.assignments !== previous.assignments ||
      state.answers !== previous.answers ||
      state.currentDraftId !== previous.currentDraftId ||
      state.practiceData !== previous.practiceData ||
      state.setupComplete !== previous.setupComplete ||
      state.emojiMarks !== previous.emojiMarks
    ) {
      dirty = true;
      clearTimeout(flushTimer);
      flushTimer = setTimeout(() => void flushPractice().catch(() => {}), 800);
    }
  });
  if (import.meta.env.DEV && devRole()) {
    void loadWorkspace().catch(() => {});
    return;
  }
  if (!supabase) {
    useConnection.setState({ loading: false });
    return;
  }
  let userId: string | undefined;
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user.id === userId && useConnection.getState().ready) return;
    userId = session?.user.id;
    generation++;
    loadingWorkspace = null;
    clearWorkspace();
    if (!session) {
      useConnection.setState({ loading: false });
      return;
    }
    // Defer Supabase calls until its auth callback has released the auth lock.
    setTimeout(() => {
      if (!useConnection.getState().ready) void loadWorkspace().catch(() => {});
    }, 0);
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty || saving) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}

export async function signOut() {
  await flushPractice();
  if (import.meta.env.DEV && devRole()) {
    leaveDevSession();
    return;
  }
  const { error } = await supabase!.auth.signOut();
  if (error) throw error;
  generation++;
  clearWorkspace();
  useConnection.setState({ loading: false });
}

export async function trainingAction(action: string, body: Record<string, unknown>) {
  const { session } = await api<{ session: TrainingSession }>(action, body);
  useConnection.setState((s) => ({
    sessions: [...s.sessions.filter((x) => x.id !== session.id), session],
  }));
  if (session.result)
    useApp.setState((s) => ({
      lastResult: session.result!,
      results: [session.result!, ...s.results.filter((r) => r.attemptId !== session.id)],
    }));
  return session;
}

/** Permanently erase a deactivated person's login and profile. Their training rows stay, unlinked. */
export async function eraseStaff(id: string) {
  await api("erase-staff", { id, confirm: "ERASE" });
  await loadWorkspace();
}

/** Confirm membership changes before replacing the visible workspace. */
export async function setStaffActive(id: string, active: boolean) {
  await flushPractice();
  await api("set-staff-active", { id, active });
  try {
    await loadWorkspace();
  } catch {
    throw new Error("The staff change was saved. Reload to see the updated team.");
  }
}
