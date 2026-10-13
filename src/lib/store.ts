import { approveReviewedQuestion, flagPracticeChanges } from "./practice-change-tracking";
import type { PracticeRoleRequests } from "./role-requests";
import type { SafeguardingRoute } from "./practice-config";
import type { BookingConfig, PrescriptionConfig } from "./practice-config";
import type { AppointmentCapabilities } from "./appointment-capabilities";
import { create } from "zustand";
import {
  defaultModuleSettings,
  generateConfiguredModule,
  regenerateConfiguredScenario,
  reviseConfiguredScenario,
  type ModuleSettings,
} from "./module-config";
import { practiceScenarios } from "./practice-scenarios";

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
  role: AccountRole;
}

export type TraineeStatus = "invited" | "active";

export interface Trainee {
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

export const ROLE_OPTIONS = [
  "Doctor",
  "GP",
  "Practice Nurse",
  "ANP",
  "Nurse",
  "HCA",
  "Physio",
  "Mental Health Practitioner",
  "Nurse Practitioner",
  "Pharmacist",
  "Reception",
] as const;

export const STAFF_ROLE_OPTIONS = [
  ...ROLE_OPTIONS,
  "Doctor (GP)",
  "Senior Nurse",
  "Physiotherapist",
  "Reception / Admin lead",
  "GP Partner",
] as const;

export const RESULT_EMOJIS = ["👍", "🎉", "💪", "👀", "🔁", "⚠️"] as const;

// ------------- Practice data hub -------------
export interface StaffMember {
  id: string;
  name: string;
  role: string; // GP, ANP, Nurse Practitioner, Practice Nurse, HCA, Pharmacist, Reception
  // Historical individual information is retained; new care navigation uses practice.roleRequests.
  clinics: string;
  capabilities?: string[];
  appointmentCapabilities?: AppointmentCapabilities;
  // Sparse request-ID overrides scoped to the role; no copied defaults or automatic legacy migration.
  requestOverrides?: Record<string, Record<string, boolean>>;
  notes?: string;
}

export const STAFF_CAPABILITY_OPTIONS = [
  "Asthma reviews",
  "Diabetes reviews",
  "Cervical screening",
  "Blood pressure checks",
  "ECG",
  "Medication reviews",
  "Prescription queries",
  "Wound review",
  "Minor illness",
  "Home visits",
  "Vaccinations",
  "Crisis triage",
  "Fit notes",
  "Mental health support",
  "New patient checks",
  "Urgent same-day triage",
] as const;

export interface RolePolicies {
  gpsSameDay: string;
  gpsRoutine: string;
  npsSameDay: string;
  npsRoutine: string;
  nursesSameDay: string;
  nursesRoutine: string;
  hcasSameDay: string;
  hcasRoutine: string;
  pharmacistsSameDay: string;
  pharmacistsRoutine: string;
  neverPromise: string;
  phrasesUse: string;
  phrasesAvoid: string;
}

export interface PracticeData {
  practiceRequests?: Record<string, import("./practice-requests").PracticeRequest>;
  localProcedures?: import("./local-procedures").LocalProcedures;
  roleRequests?: Record<string, PracticeRoleRequests>;
  safeguardingRoute?: SafeguardingRoute;
  bookingConfig?: BookingConfig;
  prescriptionConfig?: PrescriptionConfig;
  practiceName: string;
  hours: string;
  address: string;
  outOfHoursTimes: string;
  sameDayReasons: string[];
  prescriptionOrdering: string;
  dutyContact: string;
  nominatedPharmacy: string;
  urgentNumbers: string;
  extras: string;
  // Repeat prescriptions — local process
  repeatOrderMethods: string;
  repeatTurnaround: string;
  repeatControlled: string;
  repeatHighRisk: string;
  repeatEmergency: string;
  // Local guidelines & protocols
  localSafeguarding: string;
  localComplaints: string;
  localDNA: string;
  localInterpreter: string;
  localConfidentiality: string;
  staff: StaffMember[];
  rolePolicies: RolePolicies;
}

export const defaultPracticeData: PracticeData = {
  practiceName: "Willow Lane Medical Practice",
  hours: "08:00–18:30 Mon–Fri, extended access Wed evenings",
  address: "14 Willow Lane, Riverbank, RB2 7QT",
  outOfHoursTimes:
    "18:30–08:00 weekdays, all weekend and bank holidays — NHS 111. PCN evening hub Tue 18:30–20:00, Sat AM 09:00–12:00.",
  sameDayReasons: [
    "Chest pain, breathlessness or stroke symptoms (999 first, then duty team)",
    "Suspected sepsis or rapidly worsening illness",
    "Child under 5 who is unwell",
    "Mental health crisis or safeguarding concern",
    "Suspected UTI in an unwell patient",
    "Acute pain that has worsened in the last 24 hours",
  ],
  prescriptionOrdering:
    "NHS App, paper slip in the reception box, or via the nominated pharmacy. Telephone requests are not accepted except through the emergency supply pathway.",
  dutyContact: "Duty GP — ext 401 / Teams channel #duty",
  nominatedPharmacy: "Willow Lane Pharmacy (EPS nominated)",
  urgentNumbers: "999 for emergencies · 111 out of hours · Local crisis team 0300 000 0000",
  extras: "PCN evening hub on Tuesdays. Safeguarding lead: Dr Patel.",
  repeatOrderMethods:
    "NHS App and paper slip in the reception box. Telephone repeat requests are NOT accepted (except emergency supply pathway).",
  repeatTurnaround:
    "Standard: 48 working hours. Add 24h after weekends / bank holidays. Urgent items flagged same day to duty pharmacist Sarah Khan.",
  repeatControlled:
    "Controlled drugs never taken by phone. 28-day rule. Must go through the named GP. Advance requests no more than 7 days early. Check ID at collection.",
  repeatHighRisk:
    "High-risk drugs (warfarin, methotrexate, lithium, DMARDs, opioids, ADHD meds) need clinician sign-off and current monitoring on file before reissue. Do NOT issue on the standard route.",
  repeatEmergency:
    "Emergency supply: confirm medication + last dose + any red-flag symptoms, check the patient meets emergency criteria, pass to duty pharmacist Sarah Khan (or duty GP if unavailable), signpost to nominated pharmacy once authorised, document fully.",
  localSafeguarding:
    "Safeguarding lead: Dr Patel. Concerns flagged same day via EMIS safeguarding template + verbal handover to Dr Patel or duty GP. Under-16 third-party requests always escalated. Any coercion cues on a call — code and escalate immediately.",
  localComplaints:
    "Verbal complaints: acknowledge, offer to escalate to practice manager, log on Datix. Written complaints: acknowledge in 3 working days, full response in 20. Never argue or promise a specific outcome.",
  localDNA:
    "Offer rebook, code DNA in EMIS, flag 3+ DNAs in 6 months to practice manager. Vulnerable / at-risk patients — welfare check task to duty GP same day.",
  localInterpreter:
    "Language Line — dial 0800 XXX XXXX, PIN on intranet. Book at time of appointment where possible. BSL via SignVideo. Never use family for clinical interpretation.",
  localConfidentiality:
    "Screen locking whenever leaving desk. No patient information discussed in the reception area. Third-party info only with written consent on file. Under-13 results to parent; 13–16 Gillick; 16+ patient only.",
  staff: [
    {
      id: "s1",
      name: "Dr Rachel Owens",
      role: "GP Partner",
      clinics: "All GP presentations, home visits lead",
      capabilities: ["Urgent same-day triage", "Home visits", "Mental health support", "Fit notes"],
    },
    {
      id: "s2",
      name: "Anna Bright",
      role: "Nurse Practitioner",
      clinics: "Minor illness, UTIs, ear infections, wound review",
      capabilities: [
        "Minor illness",
        "Wound review",
        "Urgent same-day triage",
        "New patient checks",
      ],
    },
    {
      id: "s3",
      name: "Priya Shah",
      role: "Practice Nurse (asthma & diabetes trained)",
      clinics: "Asthma reviews, diabetic annual reviews, cervical screening",
      capabilities: ["Asthma reviews", "Diabetes reviews", "Cervical screening", "Vaccinations"],
    },
    {
      id: "s4",
      name: "Marcus Lee",
      role: "HCA",
      clinics: "Blood pressure, bloods, ECG, B12 injections",
      capabilities: ["Blood pressure checks", "ECG", "Vaccinations", "New patient checks"],
    },
    {
      id: "s5",
      name: "Sarah Khan",
      role: "Practice Pharmacist",
      clinics: "Medication reviews, high-risk drug monitoring, prescription queries",
      capabilities: [
        "Medication reviews",
        "Prescription queries",
        "Mental health support",
        "Fit notes",
      ],
    },
  ],
  rolePolicies: {
    gpsSameDay:
      "Same-day with a GP: safeguarding concerns, mental health crisis, chest pain (after 999), suspected sepsis, new severe headache, suicidal ideation, cancer 2WW needing GP call, under-5 illness. When unsure — duty triage first.",
    gpsRoutine:
      "Routine with a GP: complex chronic disease reviews, GP-only medication reviews, ongoing mental health follow-up, results discussions clinician-only, HRT initiation, referral discussions, minor surgery review.",
    npsSameDay:
      "Same-day with ANP (Anna Bright): minor illness in over-5s, UTI (women 16–65 non-pregnant), ear/throat infections, wound review, simple rashes. NOT: under-5s, chest pain, mental health crisis, pregnancy issues.",
    npsRoutine:
      "Routine with ANP: minor illness follow-up, recurrent UTI review, wound review follow-up, simple skin rash review, medication review for stable minor conditions.",
    nursesSameDay:
      "Same-day with practice nurse: acute wound dressing, post-A&E asthma review (Priya — 20-min slot within 2 working days), suture / staple removal, urgent travel vaccine (if slot).",
    nursesRoutine:
      "Routine with practice nurse (Priya): asthma review, diabetic annual review (HCA bloods first, then 30-min nurse slot 2 weeks later), cervical screening, childhood imms Tue AM clinic, travel health, contraceptive follow-up.",
    hcasSameDay:
      "Same-day with HCA (Marcus): BP check, urgent bloods where a clinician has requested them, ECG for cardiology referral, simple wound dressing.",
    hcasRoutine:
      "Routine with HCA: pre-review bloods, NHS Health Check, B12 injection, BP monitoring, height / weight, phlebotomy. NOT for any new symptoms.",
    pharmacistsSameDay:
      "Same-day with pharmacist (Sarah Khan): emergency supply triage, urgent medication query, hospital discharge medication reconciliation.",
    pharmacistsRoutine:
      "Routine with pharmacist: full medication review, high-risk drug monitoring, polypharmacy review, minor medication query, interaction check.",
    neverPromise:
      "A specific GP or time · Same-day slot before checking · That results are 'fine' before a clinician has reviewed · Anything clinical (diagnosis, dose, whether medication is safe).",
    phrasesUse:
      "'I can hear this is frustrating, let me see what I can do' · 'I'll take some details and get the duty team to call you back' · 'I can't give clinical advice but I can get someone who can'.",
    phrasesAvoid:
      "'It's just a…' · 'Everyone's waiting' · 'The doctor is too busy' · 'I'm sure it's nothing' · 'You should have called earlier'.",
  },
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
    settings?: ModuleSettings,
  ) => string;
  configureModule: (id: string, settings: ModuleSettings, scenarios: Scenario[]) => void;
  updateScenario: (moduleId: string, s: Scenario) => void;
  deleteScenario: (moduleId: string, scenarioId: string) => void;
  approveScenario: (moduleId: string, scenarioId: string) => void;
  regenerateScenario: (moduleId: string, scenarioId: string) => void;
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

  // Practice setup
  completeSetup: () => void;
  setRoleRequests: (config: PracticeRoleRequests) => void;
  setSafeguardingRoute: (route: SafeguardingRoute) => void;
  setBookingConfig: (config: BookingConfig) => void;
  setPrescriptionConfig: (config: PrescriptionConfig) => void;
  setPracticeField: (
    field: keyof Omit<
      PracticeData,
      | "staff"
      | "rolePolicies"
      | "sameDayReasons"
      | "bookingConfig"
      | "prescriptionConfig"
      | "practiceRequests"
      | "localProcedures"
      | "roleRequests"
      | "safeguardingRoute"
    >,
    value: string,
  ) => void;
  setSameDayReasons: (reasons: string[]) => void;
  setRolePolicy: (field: keyof RolePolicies, value: string) => void;
  addStaff: (s: Omit<StaffMember, "id">) => void;
  updateStaff: (id: string, patch: Partial<StaffMember>) => void;
  removeStaff: (id: string) => void;
  replaceStaffName: (oldName: string, newName: string, propagate: boolean) => number;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function practiceChangePatch(
  state: Pick<AppState, "practiceData" | "modules">,
  next: PracticeData,
) {
  return {
    practiceData: next,
    modules: flagPracticeChanges(state.practiceData, next, state.modules),
  };
}

// ------------- Setup questions per topic -------------
export interface SetupQuestion {
  key: string;
  q: string;
  placeholder: string;
}

// Setup questions focus ONLY on situational specifics not already captured in the
// Data Hub / Practice Setup. Things like practice hours, clinician lists, who
// covers what, repeat prescription turnaround and controlled-drug rules are
// pulled from practiceData and do not appear here.
const GENERIC_QUESTIONS: SetupQuestion[] = [
  {
    key: "context",
    q: "Describe the exact situation this module should cover.",
    placeholder: "e.g. Handling test results enquiries by phone",
  },
  {
    key: "process",
    q: "Step-by-step: your practice's local process.",
    placeholder: "In your own words",
  },
  {
    key: "commonCalls",
    q: "Three or four real patient scenarios reception often meets.",
    placeholder: "Real examples",
  },
  {
    key: "clinicianRoles",
    q: "Which clinicians / teams are involved and their names?",
    placeholder: "e.g. Sarah Khan (pharmacist), Dr Owens (duty GP)",
  },
  {
    key: "escalate",
    q: "When and to whom should staff escalate?",
    placeholder: "e.g. Duty GP if red flags",
  },
  {
    key: "neverPromise",
    q: "What should staff never promise or say?",
    placeholder: "e.g. Clinical opinions, exact timings",
  },
  { key: "tone", q: "Tone and phrases?", placeholder: "e.g. Warm, calm, professional" },
  {
    key: "localExtras",
    q: "Local rules the module must include?",
    placeholder: "e.g. Templates, safeguarding",
  },
];

// Module catalogue. GP reception topics were removed; cybersecurity topics go here.
export const TOPICS: {
  key: string;
  title: string;
  desc: string;
  questions: SetupQuestion[];
}[] = [
  {
    key: "custom",
    title: "Custom module",
    desc: "Design a module from any local process.",
    questions: GENERIC_QUESTIONS,
  },
];

// ------------- Scenario helpers -------------
export type ScenarioFormat = "mcq" | "order" | "mixed";

export function draftsForTopic(
  topicKey: string,
  format: ScenarioFormat,
  topicTitle: string,
  difficulty: Difficulty = "easy",
  length: ModuleLength = "short",
  setupAnswers?: Record<string, string>,
): Scenario[] {
  const target = length === "long" ? 15 : length === "medium" ? 10 : 5;
  const { practiceData, answers } = useApp.getState();
  const source = practiceScenarios(topicKey, topicTitle, practiceData, setupAnswers ?? answers);
  const mainIds = new Set(
    source
      .filter((s) => !s.followUpFor)
      .slice(0, target)
      .map((s) => s.id),
  );
  return source
    .filter((s) => mainIds.has(s.followUpFor ?? s.id))
    .map((s, index): Scenario => {
      if (s.kind !== "mcq") return s;
      // Format preferences cannot supply an ordered source. Preserve eligible MCQs.
      const offset =
        difficulty === "easy" && !s.followUpFor ? 0 : Math.floor(Math.random() * s.options.length);
      return {
        ...s,
        options: [...s.options.slice(offset), ...s.options.slice(0, offset)],
        correctIndex: (s.correctIndex - offset + s.options.length) % s.options.length,
      };
    });
}

// ------------- Store -------------
const replaceInText = (text: string, from: string, to: string) => {
  if (!from) return text;
  const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return text.replace(re, to);
};

const replaceInScenario = (s: Scenario, from: string, to: string): Scenario => {
  if (s.kind === "matching" || (s.kind === "order" && s.sequence)) return s; // Preserve structured labels and source snapshot.
  const base = {
    ...s,
    title: replaceInText(s.title, from, to),
    patientQuote: replaceInText(s.patientQuote, from, to),
    question: replaceInText(s.question, from, to),
    learningPoint: replaceInText(s.learningPoint, from, to),
  };
  if (s.kind === "mcq") {
    return { ...(base as MCQScenario), options: s.options.map((o) => replaceInText(o, from, to)) };
  }
  return {
    ...(base as import("./training-types").LegacyOrderScenario),
    steps: s.steps.map((o) => replaceInText(o, from, to)),
  };
};

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

  createDraftModule: (type, title, topicKey, seed, difficulty, length, settings) => {
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
          settings,
        },
      ],
      currentDraftId: id,
    }));
    return id;
  },

  configureModule: (id, settings, scenarios) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === id
          ? {
              ...m,
              settings,
              difficulty: settings.difficulty ?? m.difficulty,
              scenarios,
              needsReview: m.published || m.needsReview,
            }
          : m,
      ),
    })),

  updateScenario: (moduleId, scenario) =>
    set((state) => ({
      modules: state.modules.map((module) =>
        module.id !== moduleId
          ? module
          : module.settings ||
              module.scenarios.some(
                (current) => current.id === scenario.id && !!current.provenance,
              ) ||
              (scenario.kind === "order" && scenario.sequence)
            ? reviseConfiguredScenario(module, scenario)
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

  regenerateScenario: (moduleId, scenarioId) =>
    set((state) => {
      const mod = state.modules.find((m) => m.id === moduleId);
      if (!mod) return state;
      if (
        mod.settings ||
        (mod.needsReview &&
          mod.scenarios.some(
            (s) =>
              s.id === scenarioId && (s.provenance?.kind === "sequence" || s.kind === "matching"),
          ))
      )
        return {
          modules: state.modules.map((m) =>
            m.id === moduleId ? regenerateConfiguredScenario(m, scenarioId, state.practiceData) : m,
          ),
        };
      const current = mod.scenarios.find((x) => x.id === scenarioId);
      if (!current || (current.kind === "order" && current.sequence)) return state;
      const pool = practiceScenarios(
        mod.topicKey,
        mod.title,
        state.practiceData,
        state.answers,
      ).filter((s) => !s.followUpFor);
      const usedTitles = new Set(mod.scenarios.map((s) => s.title));
      const sameKind = pool.filter((p) => p.kind === current.kind && !usedTitles.has(p.title));
      const anyKind = pool.filter((p) => !usedTitles.has(p.title));
      const pick =
        sameKind[Math.floor(Math.random() * sameKind.length)] ??
        anyKind[Math.floor(Math.random() * anyKind.length)] ??
        pool[Math.floor(Math.random() * pool.length)];
      if (!pick) return state;
      const replacement: Scenario = {
        ...pick,
        id: current.id,
        followUpFor: current.followUpFor,
        status: "draft",
      };
      return {
        modules: state.modules.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                needsReview: m.published || m.needsReview,
                scenarios: m.scenarios
                  .filter((x) => x.followUpFor !== scenarioId)
                  .map((x) => (x.id === scenarioId ? replacement : x)),
              }
            : m,
        ),
      };
    }),

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

  removeTrainee: (id) =>
    set((state) => ({
      trainees: state.trainees.filter((t) => t.id !== id),
      assignments: state.assignments.filter((a) => a.traineeId !== id),
    })),

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

  unassignModule: (traineeId, moduleId) =>
    set((state) => ({
      assignments: state.assignments.filter(
        (a) => !(a.traineeId === traineeId && a.moduleId === moduleId),
      ),
    })),

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

  completeSetup: () => set({ setupComplete: true }),

  setSameDayReasons: (reasons) =>
    set((state) => practiceChangePatch(state, { ...state.practiceData, sameDayReasons: reasons })),

  clearReviewFlag: () => {
    throw new Error(
      "Record a confirmed manager review decision instead of dismissing this warning.",
    );
  },

  setRoleRequests: (config) =>
    set((s) =>
      practiceChangePatch(s, {
        ...s.practiceData,
        roleRequests: { ...s.practiceData.roleRequests, [config.roleId]: config },
      }),
    ),
  setSafeguardingRoute: (safeguardingRoute) =>
    set((s) => practiceChangePatch(s, { ...s.practiceData, safeguardingRoute })),
  setBookingConfig: (bookingConfig) =>
    set((s) => practiceChangePatch(s, { ...s.practiceData, bookingConfig })),
  setPrescriptionConfig: (prescriptionConfig) =>
    set((s) => practiceChangePatch(s, { ...s.practiceData, prescriptionConfig })),
  setPracticeField: (field, value) =>
    set((s) => practiceChangePatch(s, { ...s.practiceData, [field]: value })),
  setRolePolicy: (field, value) =>
    set((s) =>
      practiceChangePatch(s, {
        ...s.practiceData,
        rolePolicies: { ...s.practiceData.rolePolicies, [field]: value },
      }),
    ),
  addStaff: (person) =>
    set((s) =>
      practiceChangePatch(s, {
        ...s.practiceData,
        staff: [...s.practiceData.staff, { ...person, id: uid() }],
      }),
    ),
  updateStaff: (id, patch) =>
    set((s) =>
      practiceChangePatch(s, {
        ...s.practiceData,
        staff: s.practiceData.staff.map((person) =>
          person.id === id ? { ...person, ...patch } : person,
        ),
      }),
    ),
  removeStaff: (id) =>
    set((s) =>
      practiceChangePatch(s, {
        ...s.practiceData,
        staff: s.practiceData.staff.filter((person) => person.id !== id),
      }),
    ),

  replaceStaffName: (oldName, newName, propagate) => {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedOld || !trimmedNew) return 0;
    let touched = 0;
    set((state) => {
      const staff = state.practiceData.staff.map((s) =>
        s.name.trim().toLowerCase() === trimmedOld.toLowerCase() ? { ...s, name: trimmedNew } : s,
      );
      if (!propagate) {
        return practiceChangePatch(state, { ...state.practiceData, staff });
      }
      const modules = state.modules.map((m) => {
        let moduleTouched = false;
        const scenarios = m.scenarios.map((sc) => {
          const next = replaceInScenario(sc, trimmedOld, trimmedNew);
          if (JSON.stringify(next) !== JSON.stringify(sc)) {
            touched += 1;
            moduleTouched = true;
          }
          return next;
        });
        return moduleTouched
          ? {
              ...m,
              scenarios,
              needsReview: true,
              reviewReason: `Staff changed: "${trimmedOld}" → "${trimmedNew}". Re-check scenarios still reflect current practice.`,
            }
          : { ...m, scenarios };
      });
      return practiceChangePatch({ ...state, modules }, { ...state.practiceData, staff });
    });
    return touched;
  },
}));
