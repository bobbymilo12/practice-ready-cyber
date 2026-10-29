import { approveReviewedQuestion } from "./practice-change-tracking";
import { create } from "zustand";

import type {
  ScenarioStatus,
  MCQScenario,
  OrderScenario,
  Scenario,
  Difficulty,
  ModuleLength,
  Module,
  TrainingResult,
  Assignment,
  TrainingPackage,
} from "./training-types";
export type {
  ScenarioStatus,
  MCQScenario,
  OrderScenario,
  Scenario,
  Difficulty,
  ModuleLength,
  Module,
  TrainingResult,
  Assignment,
  TrainingPackage,
} from "./training-types";

// ------------- Accounts, trainees, assignments -------------
export type AccountRole = "manager" | "trainee";

export interface Account {
  name: string;
  email: string;
  phone: string;
  id?: string;
  practiceId?: string;
  mustResetPassword?: boolean;
  // May view analytics for every practice.
  platformAdmin?: boolean;
  role: AccountRole;
}

export type TraineeStatus = "invited" | "active";

export interface Trainee {
  inactiveAt?: string;
  id: string;
  name: string;
  email: string;
  role: string;
  status: TraineeStatus;
  invitedAt: number;
  inviteStatus?: string;
}

export const TRAINEE_ROLE_OPTIONS = [
  "Receptionist",
  "Secretary",
  "Prescription Team",
  "Care Navigator",
  "Administrator",
  "Medical Records",
  "Phlebotomist",
];

export const RESULT_EMOJIS = ["👍", "🎉", "💪", "👀", "🔁", "⚠️"] as const;

// ------------- Practice data -------------
export interface PracticeData {
  practiceName: string;
  hours: string;
  address: string;
}

export const defaultPracticeData: PracticeData = {
  practiceName: "Willow Lane Medical Practice",
  hours: "08:00–18:30 Mon–Fri, extended access Wed evenings",
  address: "14 Willow Lane, Riverbank, RB2 7QT",
};

// ------------- App state -------------
export interface AppState {
  modules: Module[];
  packages: TrainingPackage[];
  answers: Record<string, string>;
  currentDraftId: string | null;
  lastResult: TrainingResult | null;
  results: TrainingResult[];
  practiceData: PracticeData;
  account: Account | null;
  trainees: Trainee[];
  assignments: Assignment[];
  setupComplete: boolean;
  emojiMarks: Record<string, string>;

  setAnswer: (key: string, value: string) => void;
  resetAnswers: () => void;
  createDraftModule: (
    type: string,
    title: string,
    topicKey: string,
    seed: Scenario[],
    difficulty?: Difficulty,
    length?: ModuleLength,
  ) => string;
  updateScenario: (moduleId: string, s: Scenario) => void;
  deleteScenario: (moduleId: string, scenarioId: string) => void;
  approveScenario: (moduleId: string, scenarioId: string) => void;
  publishModule: (moduleId: string) => void;
  removeDraftModule: (moduleId: string) => void;
  clearReviewFlag: (moduleId: string) => void;
  setLastResult: (r: TrainingResult) => void;
  addResult: (r: TrainingResult) => void;
  mergeModules: (moduleIds: string[], title: string) => string;

  // Accounts & team
  removeTrainee: (id: string) => void;
  activateTrainee: (id: string) => void;
  assignModule: (
    traineeId: string,
    moduleId: string,
    dueDate?: string,
    status?: Assignment["status"],
  ) => void;
  reassignModule: (traineeId: string, moduleId: string) => void;
  unassignModule: (traineeId: string, moduleId: string) => void;
  markResult: (traineeId: string, moduleId: string, completedAt: number, emoji: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ------------- Store -------------
export const useApp = create<AppState>()((set, get) => ({
  modules: [],
  packages: [],
  answers: {},
  currentDraftId: null,
  lastResult: null,
  results: [],
  practiceData: defaultPracticeData,
  account: null,
  trainees: [],
  assignments: [],
  setupComplete: false,
  emojiMarks: {},

  setAnswer: (key, value) => set((s) => ({ answers: { ...s.answers, [key]: value } })),
  resetAnswers: () => set({ answers: {} }),

  createDraftModule: (type, title, topicKey, seed, difficulty, length) => {
    const id = uid();
    set((s) => ({
      modules: [
        ...s.modules,
        {
          id,
          type,
          title,
          topicKey,
          published: false,
          scenarios: seed,
          createdAt: Date.now(),
          difficulty,
          length,
        },
      ],
      currentDraftId: id,
    }));
    return id;
  },

  updateScenario: (moduleId, scenario) =>
    set((state) => ({
      modules: state.modules.map((module) =>
        module.id !== moduleId
          ? module
          : {
              ...module,
              needsReview: module.published || module.needsReview,
              scenarios: module.scenarios.map((current) =>
                current.id === scenario.id ? scenario : current,
              ),
            },
      ),
    })),

  deleteScenario: (moduleId, scenarioId) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              needsReview: m.published || m.needsReview,
              scenarios: m.scenarios.filter(
                (x) => x.id !== scenarioId && x.followUpFor !== scenarioId,
              ),
            }
          : m,
      ),
    })),

  approveScenario: (moduleId, scenarioId) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId ? approveReviewedQuestion(m, scenarioId, state.practiceData) : m,
      ),
    })),

  publishModule: (moduleId) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId &&
        !m.needsReview &&
        m.scenarios.length > 0 &&
        m.scenarios.every((s) => s.status === "approved")
          ? { ...m, published: true, needsReview: false }
          : m,
      ),
    })),

  removeDraftModule: (moduleId) =>
    set((state) => {
      const module = state.modules.find((m) => m.id === moduleId);
      if (!module || module.published) return state;
      return {
        modules: state.modules.filter((m) => m.id !== moduleId),
        assignments: state.assignments.filter((a) => a.moduleId !== moduleId),
        packages: state.packages.map((p) => ({
          ...p,
          moduleIds: p.moduleIds.filter((id) => id !== moduleId),
        })),
        currentDraftId: state.currentDraftId === moduleId ? null : state.currentDraftId,
      };
    }),

  setLastResult: (r) => set({ lastResult: r }),

  addResult: (r) =>
    set((state) => {
      const acc = state.account;
      const traineeId =
        r.traineeId ??
        state.trainees.find((t) => t.email.toLowerCase() === (acc?.email ?? "").toLowerCase())
          ?.id ??
        (acc?.role === "trainee" ? `self:${acc.email.toLowerCase()}` : "self:demo");
      const enriched: TrainingResult = {
        ...r,
        traineeId,
        traineeName: r.traineeName ?? acc?.name ?? "Demo trainee",
      };
      return { results: [enriched, ...state.results].slice(0, 200), lastResult: enriched };
    }),

  mergeModules: (moduleIds, title) => {
    const id = uid();
    set((state) => {
      const chosen = state.modules.filter((m) => moduleIds.includes(m.id));
      const scenarios: Scenario[] = [];
      const seen = new Set<string>();
      chosen.forEach((m, mi) => {
        m.scenarios.forEach((s, si) => {
          const key = s.title + s.question;
          if (seen.has(key)) return;
          seen.add(key);
          scenarios.push({
            ...s,
            id: `${id}-${mi}-${s.id}`,
            followUpFor: s.followUpFor ? `${id}-${mi}-${s.followUpFor}` : undefined,
          });
        });
      });
      return {
        modules: [
          ...state.modules,
          {
            id,
            type: "Merged module",
            title,
            topicKey: chosen[0]?.topicKey ?? "custom",
            published: false,
            scenarios,
            createdAt: Date.now(),
          },
        ],
        currentDraftId: id,
      };
    });
    return id;
  },

  removeTrainee: () => {
    throw new Error("Use the confirmed Deactivate action to preserve staff history.");
  },

  activateTrainee: (id) =>
    set((state) => ({
      trainees: state.trainees.map((t) =>
        t.id === id ? { ...t, status: "active" as TraineeStatus } : t,
      ),
    })),

  assignModule: (traineeId, moduleId, dueDate, status = "assigned") =>
    set((state) =>
      state.assignments.some((a) => a.traineeId === traineeId && a.moduleId === moduleId)
        ? state
        : {
            assignments: [
              ...state.assignments,
              {
                id: uid(),
                traineeId,
                moduleId,
                assignedAt: Date.now(),
                dueDate,
                status,
              },
            ],
          },
    ),

  reassignModule: (traineeId, moduleId) =>
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.traineeId === traineeId && a.moduleId === moduleId
          ? { ...a, id: uid(), assignedAt: Date.now(), status: "assigned" as const }
          : a,
      ),
    })),

  unassignModule: () => {
    throw new Error("Use the confirmed Withdraw assignment action to preserve history.");
  },

  markResult: (traineeId, moduleId, completedAt, emoji) =>
    set((state) => ({
      results: state.results.map((r) =>
        r.traineeId === traineeId && r.moduleId === moduleId && r.completedAt === completedAt
          ? { ...r, emoji: r.emoji === emoji ? undefined : emoji }
          : r,
      ),
      emojiMarks: {
        ...state.emojiMarks,
        [`${traineeId}:${moduleId}:${completedAt}`]: emoji,
      },
    })),

  clearReviewFlag: () => {
    throw new Error(
      "Record a confirmed manager review decision instead of dismissing this warning.",
    );
  },
}));
