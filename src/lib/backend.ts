import { devRole, leaveDevSession } from "./dev-mode";
import { createClient } from "@supabase/supabase-js";
import { create } from "zustand";
import { defaultPracticeData, useApp, type Account, type AppState, type Trainee } from "./store";
import type { TrainingSession } from "./training";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
export const supabase =
  configured && !(import.meta.env.DEV && devRole()) ? createClient(url, key) : null;

export type PracticeState = Pick<
  AppState,
  | "modules"
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
};
export const useConnection = create<{
  ready: boolean;
  loading: boolean;
  saving: boolean;
  error: string;
  sessions: TrainingSession[];
}>(() => ({
  ready: false,
  loading: true,
  saving: false,
  error: "",
  sessions: [],
}));
let version = 0;
let applying = false;
let dirty = false;
let saving: Promise<void> | null = null;
let generation = 0;
let started = false;
const practiceState = (s: AppState): PracticeState => ({
  modules: s.modules,
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
  const payload = await response.json();
  if (!response.ok || payload.error)
    throw new Error(payload.error || "Could not save. Please try again.");
  return payload;
}

function clearWorkspace() {
  applying = true;
  useApp.setState({
    account: null,
    modules: [],
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
      practiceData: { ...emptyPractice(), ...snapshot.state.practiceData },
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

export function initializeBackend() {
  if (started) return;
  started = true;
  clearWorkspace();
  useApp.subscribe((state, previous) => {
    if (applying || !useConnection.getState().ready || state.account?.role !== "manager") return;
    if (
      state.modules !== previous.modules ||
      state.assignments !== previous.assignments ||
      state.answers !== previous.answers ||
      state.currentDraftId !== previous.currentDraftId ||
      state.practiceData !== previous.practiceData ||
      state.setupComplete !== previous.setupComplete ||
      state.emojiMarks !== previous.emojiMarks
    ) {
      dirty = true;
      void flushPractice().catch(() => {});
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

export function readLegacyPractice(): Partial<PracticeState> | null {
  try {
    const old = JSON.parse(localStorage.getItem("practice-ready-store") ?? "null")?.state;
    if (!old?.practiceData || !Array.isArray(old.modules)) return null;
    return {
      practiceData: {
        ...emptyPractice(),
        ...old.practiceData,
        rolePolicies: { ...emptyPractice().rolePolicies, ...old.practiceData.rolePolicies },
      },
      modules: old.modules.map((m: AppState["modules"][number]) => ({
        ...m,
        published: Boolean(
          m.published && m.scenarios.length && m.scenarios.every((s) => s.status === "approved"),
        ),
      })),
      setupComplete: Boolean(old.setupComplete),
    };
  } catch {
    return null;
  }
}
export async function importLegacyPractice() {
  const current = useApp.getState();
  if (current.account?.role !== "manager" || current.modules.length)
    throw new Error("Import is only available for an empty manager workspace.");
  const legacy = readLegacyPractice();
  if (!legacy) throw new Error("No saved demo practice was found on this browser.");
  useApp.setState(legacy);
  await flushPractice();
}
