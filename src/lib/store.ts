import { create } from "zustand";

export type ScenarioStatus = "draft" | "approved";

export interface Scenario {
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  optionA: string;
  optionB: string;
  bestAnswer: "A" | "B";
  learningPoint: string;
  status: ScenarioStatus;
}

export interface Module {
  id: string;
  type: string;
  title: string;
  published: boolean;
  scenarios: Scenario[];
  createdAt: number;
}

export interface ManagerAnswers {
  role: string;
  struggles: string;
  commonCalls: string;
  localRules: string;
  appointmentHandlers: string;
  escalate: string;
  neverPromise: string;
  tone: string;
}

export interface TrainingResult {
  moduleId: string;
  moduleTitle: string;
  correct: number;
  total: number;
  wrongTitles: string[];
  completedAt: number;
}

interface AppState {
  modules: Module[];
  answers: ManagerAnswers;
  currentDraftId: string | null;
  lastResult: TrainingResult | null;

  setAnswers: (a: Partial<ManagerAnswers>) => void;
  createDraftModule: (type: string, title: string, seed: Scenario[]) => string;
  updateScenario: (moduleId: string, s: Scenario) => void;
  deleteScenario: (moduleId: string, scenarioId: string) => void;
  approveScenario: (moduleId: string, scenarioId: string) => void;
  regenerateScenario: (moduleId: string, scenarioId: string) => void;
  publishModule: (moduleId: string) => void;
  setLastResult: (r: TrainingResult) => void;
}

const emptyAnswers: ManagerAnswers = {
  role: "",
  struggles: "",
  commonCalls: "",
  localRules: "",
  appointmentHandlers: "",
  escalate: "",
  neverPromise: "",
  tone: "",
};

const uid = () => Math.random().toString(36).slice(2, 10);

// Sample seeded published module so dashboard shows realistic state
const seededModule: Module = {
  id: "seed-1",
  type: "Appointment booking",
  title: "Appointment booking — basics",
  published: true,
  createdAt: Date.now() - 86400000,
  scenarios: [
    {
      id: uid(),
      title: "Same-day appointment request",
      patientQuote: "I need to see a GP today, it's really important.",
      question: "What is the best first step?",
      optionA: "Tell the patient no same-day slots are available and ask them to call back tomorrow.",
      optionB: "Ask brief triage questions per practice protocol and offer the appropriate appointment route or escalation.",
      bestAnswer: "B",
      learningPoint:
        "Reception staff should follow the local triage script before deciding availability. Never dismiss a request without gathering enough information.",
      status: "approved",
    },
  ],
};

export const sampleDraftScenarios = (): Scenario[] => [
  {
    id: uid(),
    title: "Repeat prescription request",
    patientQuote: "I've run out of my repeat medication. Can the doctor do it today?",
    question: "What should the receptionist do?",
    optionA: "Promise the patient it will be issued today.",
    optionB:
      "Follow the practice's repeat prescription process, explain expected timescales, and escalate if there is a clinical concern.",
    bestAnswer: "B",
    learningPoint:
      "Reception staff should avoid promising immediate prescriptions unless the practice protocol allows it. The correct response depends on the local repeat prescription process and whether the situation needs escalation.",
    status: "draft",
  },
  {
    id: uid(),
    title: "Test results enquiry",
    patientQuote: "Can you just read my blood test results out to me over the phone?",
    question: "What is the safest response?",
    optionA: "Read out the numeric values so the patient knows straight away.",
    optionB:
      "Explain the practice's process for sharing results, and book a call-back or appointment with the appropriate clinician if needed.",
    bestAnswer: "B",
    learningPoint:
      "Confidential clinical information should only be shared following the local results protocol. Reception should never interpret results.",
    status: "draft",
  },
  {
    id: uid(),
    title: "Chest pain caller",
    patientQuote: "I've had crushing chest pain for about twenty minutes and I feel sweaty.",
    question: "What should the receptionist do first?",
    optionA: "Book the next routine GP appointment and advise the patient to wait at home.",
    optionB:
      "Treat as a potential emergency: follow the practice's urgent escalation protocol and advise calling 999 where appropriate.",
    bestAnswer: "B",
    learningPoint:
      "Certain red-flag symptoms require immediate escalation. Reception staff should know the local urgent protocol and never delay by booking a routine slot.",
    status: "draft",
  },
];

export const useApp = create<AppState>((set) => ({
  modules: [seededModule],
  answers: emptyAnswers,
  currentDraftId: null,
  lastResult: null,

  setAnswers: (a) => set((s) => ({ answers: { ...s.answers, ...a } })),

  createDraftModule: (type, title, seed) => {
    const id = uid();
    set((s) => ({
      modules: [
        ...s.modules,
        { id, type, title, published: false, scenarios: seed, createdAt: Date.now() },
      ],
      currentDraftId: id,
    }));
    return id;
  },

  updateScenario: (moduleId, s) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId
          ? { ...m, scenarios: m.scenarios.map((x) => (x.id === s.id ? s : x)) }
          : m,
      ),
    })),

  deleteScenario: (moduleId, scenarioId) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId
          ? { ...m, scenarios: m.scenarios.filter((x) => x.id !== scenarioId) }
          : m,
      ),
    })),

  approveScenario: (moduleId, scenarioId) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              scenarios: m.scenarios.map((x) =>
                x.id === scenarioId ? { ...x, status: "approved" } : x,
              ),
            }
          : m,
      ),
    })),

  regenerateScenario: (moduleId, scenarioId) =>
    set((state) => ({
      modules: state.modules.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          scenarios: m.scenarios.map((x) => {
            if (x.id !== scenarioId) return x;
            return {
              ...x,
              title: x.title + " (revised)",
              patientQuote: x.patientQuote,
              learningPoint:
                x.learningPoint +
                " Regenerated draft — please review before approving for staff use.",
              status: "draft",
            };
          }),
        };
      }),
    })),

  publishModule: (moduleId) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId ? { ...m, published: true } : m,
      ),
    })),

  setLastResult: (r) => set({ lastResult: r }),
}));
