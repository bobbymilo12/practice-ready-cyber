import { create } from "zustand";

export type ScenarioStatus = "draft" | "approved";

export interface MCQScenario {
  kind: "mcq";
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  options: string[]; // exactly 4
  correctIndex: number; // 0..3
  learningPoint: string;
  status: ScenarioStatus;
}

export interface OrderScenario {
  kind: "order";
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  steps: string[]; // in correct order
  learningPoint: string;
  status: ScenarioStatus;
}

export type Scenario = MCQScenario | OrderScenario;

export interface Module {
  id: string;
  type: string;
  title: string;
  published: boolean;
  scenarios: Scenario[];
  createdAt: number;
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
  answers: Record<string, string>;
  currentDraftId: string | null;
  lastResult: TrainingResult | null;

  setAnswer: (key: string, value: string) => void;
  resetAnswers: () => void;
  createDraftModule: (type: string, title: string, seed: Scenario[]) => string;
  updateScenario: (moduleId: string, s: Scenario) => void;
  deleteScenario: (moduleId: string, scenarioId: string) => void;
  approveScenario: (moduleId: string, scenarioId: string) => void;
  regenerateScenario: (moduleId: string, scenarioId: string) => void;
  publishModule: (moduleId: string) => void;
  setLastResult: (r: TrainingResult) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const seededModule: Module = {
  id: "seed-1",
  type: "Appointment booking",
  title: "Appointment booking — essentials",
  published: true,
  createdAt: Date.now() - 86400000,
  scenarios: [
    {
      kind: "mcq",
      id: uid(),
      title: "Same-day appointment request",
      patientQuote: "I need to see a GP today, it's really important.",
      question: "What is the best first step?",
      options: [
        "Tell the patient no same-day slots are available and ask them to call back tomorrow.",
        "Book them into the next routine slot in two weeks without asking further questions.",
        "Ask brief triage questions per the practice protocol, then offer the appropriate route or escalate to the duty team.",
        "Transfer the call straight to a GP without checking availability.",
      ],
      correctIndex: 2,
      learningPoint:
        "Follow the local triage script before deciding availability. Never dismiss a same-day request without gathering information, and never bypass the duty process.",
      status: "approved",
    },
    {
      kind: "order",
      id: uid(),
      title: "Handling a same-day request — correct order",
      patientQuote: "I'd like to see a doctor today please.",
      question: "Put these actions in the correct order.",
      steps: [
        "Ask whether the issue is urgent and gather brief triage details.",
        "Check availability and eligibility for a same-day appointment.",
        "If no availability, seek advice from the duty team before ending the call.",
        "Document the outcome in the patient record.",
      ],
      learningPoint:
        "Same-day requests follow a fixed sequence: triage, check availability, escalate to duty if needed, then document. Skipping steps risks patient safety and audit gaps.",
      status: "approved",
    },
  ],
};

// -------- Topic-specific question banks --------
export interface SetupQuestion {
  key: string;
  q: string;
  placeholder: string;
}

const APPOINTMENT_QUESTIONS: SetupQuestion[] = [
  { key: "roles", q: "Which staff roles will use this module?", placeholder: "e.g. Reception team, new starters in first 4 weeks" },
  { key: "hours", q: "What are the practice's core appointment hours?", placeholder: "e.g. 08:00–18:30 Mon–Fri, extended access Wed evening" },
  { key: "sameDayProcess", q: "How should staff handle same-day appointment requests?", placeholder: "e.g. Triage questions → duty GP list → escalate if full" },
  { key: "urgentSymptoms", q: "Which symptoms must be escalated as urgent on the day?", placeholder: "e.g. Chest pain, stroke signs, severe breathlessness, suicidal ideation" },
  { key: "chestPain", q: "For a patient reporting chest pain, exactly what should staff do and who do they contact?", placeholder: "e.g. Advise 999 immediately, then flag duty GP and log in EMIS" },
  { key: "asthmaFollowUp", q: "Where and with whom should staff book asthma follow-up appointments?", placeholder: "e.g. Asthma-trained practice nurse, 20-min slot, within 2 working days of discharge" },
  { key: "diabetesReview", q: "How are annual diabetic reviews booked?", placeholder: "e.g. HCA for bloods first, then nurse review 2 weeks later" },
  { key: "bpChecks", q: "How should routine blood pressure checks be booked?", placeholder: "e.g. HCA 10-min slot, or self-check pod in reception" },
  { key: "childUnder5", q: "How should appointments for children under 5 be handled?", placeholder: "e.g. Always same-day, GP not ANP, safeguarding flag check" },
  { key: "mentalHealth", q: "How should mental health appointments be triaged and booked?", placeholder: "e.g. Duty GP call-back same day, mental health practitioner clinic Thu" },
  { key: "homeVisits", q: "What is the process for home visit requests?", placeholder: "e.g. Take details before 10:30, duty GP decides, log with address" },
  { key: "telephone", q: "When should staff book a telephone appointment vs face-to-face?", placeholder: "e.g. Admin/results by phone, exams and children face-to-face" },
  { key: "cancellations", q: "How should staff manage cancellations and DNAs?", placeholder: "e.g. Offer to rebook, code DNA in system, flag 3+ DNAs to manager" },
  { key: "clinicianTypes", q: "Which clinician types are available and what do they see?", placeholder: "e.g. GP, ANP (minor illness), Pharmacist (meds), Nurse, HCA" },
  { key: "neverPromise", q: "What should staff never promise to a patient booking an appointment?", placeholder: "e.g. A specific GP, a same-day slot, prescription timings" },
  { key: "tone", q: "What tone and phrases should staff use with patients?", placeholder: "e.g. 'Let me check that for you', calm, no medical opinions" },
  { key: "escalate", q: "Who should staff escalate to when unsure?", placeholder: "e.g. Duty GP, senior receptionist, practice manager" },
  { key: "localExtras", q: "Any local rules or systems staff must know?", placeholder: "e.g. PCN hub for evenings, EMIS templates, safeguarding register" },
];

const PRESCRIPTION_QUESTIONS: SetupQuestion[] = [
  { key: "roles", q: "Which staff roles will use this module?", placeholder: "e.g. Reception and prescription clerks" },
  { key: "turnaround", q: "What is the standard repeat prescription turnaround?", placeholder: "e.g. 48 working hours, longer over weekends" },
  { key: "orderingMethods", q: "How can patients order repeats?", placeholder: "e.g. NHS App, patient portal, in writing, pharmacy request" },
  { key: "noPhone", q: "Is telephone ordering allowed? If not, what should staff say?", placeholder: "e.g. Not accepted; direct to NHS App or paper slip" },
  { key: "controlled", q: "What is the process for controlled drug requests?", placeholder: "e.g. Never same-day, GP review, 28-day rule" },
  { key: "runOut", q: "A patient has run out of essential medication today — what should staff do?", placeholder: "e.g. Emergency supply protocol, duty GP triage, community pharmacy signpost" },
  { key: "acuteRequests", q: "How should acute (non-repeat) prescription requests be handled?", placeholder: "e.g. Not through repeats; book GP call-back" },
  { key: "queries", q: "How should medication queries from patients be handled?", placeholder: "e.g. Pass to practice pharmacist, not clinical advice from reception" },
  { key: "pharmacyContact", q: "How does the practice communicate with local pharmacies?", placeholder: "e.g. EPS nominated pharmacy, direct line for urgent" },
  { key: "collection", q: "Where and how do patients collect prescriptions?", placeholder: "e.g. Electronic to nominated pharmacy; paper only on request" },
  { key: "reviews", q: "How are overdue medication reviews handled?", placeholder: "e.g. Alert on system, book with pharmacist before reissue" },
  { key: "safeguarding", q: "What safeguarding flags should staff watch for in prescription requests?", placeholder: "e.g. Repeated early requests, opioids, mental health meds" },
  { key: "neverPromise", q: "What should staff never promise about prescriptions?", placeholder: "e.g. Same-day issue, that a specific GP will sign" },
  { key: "escalate", q: "Who should staff escalate prescription problems to?", placeholder: "e.g. Practice pharmacist, duty GP, prescriptions manager" },
  { key: "tone", q: "What tone and phrases should staff use?", placeholder: "e.g. Empathetic, factual, no clinical opinion" },
  { key: "localExtras", q: "Any local rules or systems staff must know?", placeholder: "e.g. High-risk medicine register, shared care protocols" },
];

const URGENT_QUESTIONS: SetupQuestion[] = [
  { key: "roles", q: "Which staff roles will use this module?", placeholder: "e.g. All reception staff, front desk and phones" },
  { key: "chestPain", q: "Exactly what should staff do if a caller reports chest pain?", placeholder: "e.g. Advise 999 immediately, stay on the line, alert duty GP" },
  { key: "stroke", q: "What should staff do for suspected stroke (FAST signs)?", placeholder: "e.g. 999 immediately, note time of onset" },
  { key: "breathing", q: "How should staff handle severe breathing difficulty?", placeholder: "e.g. 999 if unable to speak in sentences, otherwise urgent duty triage" },
  { key: "bleeding", q: "What is the process for uncontrolled bleeding?", placeholder: "e.g. 999, apply pressure advice, alert duty" },
  { key: "suicidal", q: "How should suicidal ideation calls be handled?", placeholder: "e.g. Keep patient on line, urgent duty GP, crisis team contact" },
  { key: "sepsis", q: "What sepsis red flags should staff know?", placeholder: "e.g. Confusion, mottled skin, fever + rigors, no urine 12h" },
  { key: "pregnancy", q: "Urgent symptoms in pregnancy — what should staff do?", placeholder: "e.g. Bleeding, reduced movements → maternity triage number" },
  { key: "childUnwell", q: "A parent calls about an unwell child under 2 — process?", placeholder: "e.g. Always duty GP triage same day, never routine slot" },
  { key: "collapse", q: "How should collapse or unconscious patient reports be handled?", placeholder: "e.g. 999 first, then alert clinician, stay on line" },
  { key: "inSurgery", q: "What if a patient collapses in the waiting room?", placeholder: "e.g. Emergency buzzer, nearest clinician, 999" },
  { key: "duty", q: "Who is the duty team and how are they contacted?", placeholder: "e.g. Duty GP on rota, internal Teams channel, ext 401" },
  { key: "escalate", q: "What is the escalation chain if the duty GP is unavailable?", placeholder: "e.g. Second duty, senior partner, practice manager" },
  { key: "documentation", q: "How should urgent calls be documented?", placeholder: "e.g. EMIS urgent template, timestamp, actions taken" },
  { key: "neverDo", q: "What must staff never do in an urgent situation?", placeholder: "e.g. Never give clinical advice, never book routine and hang up" },
  { key: "tone", q: "What tone should staff use in urgent calls?", placeholder: "e.g. Calm, clear, structured; do not alarm caller" },
];

const GENERIC_QUESTIONS: SetupQuestion[] = [
  { key: "roles", q: "Which staff roles will use this module?", placeholder: "e.g. New reception starters" },
  { key: "context", q: "Describe the situation this module should cover.", placeholder: "e.g. Handling test results enquiries" },
  { key: "process", q: "What is the local process staff must follow?", placeholder: "Step-by-step in your own words" },
  { key: "commonCalls", q: "What common patient scenarios should be practised?", placeholder: "e.g. Three or four real examples" },
  { key: "clinicianRoles", q: "Which clinicians or teams are involved?", placeholder: "e.g. GP, nurse, pharmacist, admin" },
  { key: "escalate", q: "When and to whom should staff escalate?", placeholder: "e.g. Duty GP if red flags" },
  { key: "neverPromise", q: "What should staff never promise or say?", placeholder: "e.g. Timings, outcomes, clinical opinions" },
  { key: "tone", q: "What tone and phrases should staff use?", placeholder: "e.g. Warm, calm, professional" },
  { key: "localExtras", q: "Any local rules the training must include?", placeholder: "e.g. System templates, safeguarding" },
];

export const TOPICS: {
  key: string;
  title: string;
  desc: string;
  questions: SetupQuestion[];
}[] = [
  {
    key: "appointment-booking",
    title: "Appointment booking",
    desc: "Routine, same-day, urgent, home visits, clinician routing.",
    questions: APPOINTMENT_QUESTIONS,
  },
  {
    key: "prescriptions",
    title: "Prescription requests",
    desc: "Repeats, acute, controlled drugs, run-out situations.",
    questions: PRESCRIPTION_QUESTIONS,
  },
  {
    key: "urgent",
    title: "Urgent symptoms & escalation",
    desc: "Chest pain, stroke, sepsis, mental health crises.",
    questions: URGENT_QUESTIONS,
  },
  {
    key: "results",
    title: "Test results & confidentiality",
    desc: "Sharing results safely and following local protocol.",
    questions: GENERIC_QUESTIONS,
  },
  {
    key: "difficult",
    title: "Difficult calls & de-escalation",
    desc: "Managing angry, distressed or complex callers.",
    questions: GENERIC_QUESTIONS,
  },
  {
    key: "first-week",
    title: "First week on reception",
    desc: "Orientation basics for a brand-new starter.",
    questions: GENERIC_QUESTIONS,
  },
  {
    key: "custom",
    title: "Custom module",
    desc: "Design a module from any local process.",
    questions: GENERIC_QUESTIONS,
  },
];

// -------- Draft generators --------
export type ScenarioFormat = "mcq" | "order" | "mixed";

const mcq = (
  title: string,
  patientQuote: string,
  question: string,
  options: string[],
  correctIndex: number,
  learningPoint: string,
): MCQScenario => ({
  kind: "mcq",
  id: uid(),
  title,
  patientQuote,
  question,
  options,
  correctIndex,
  learningPoint,
  status: "draft",
});

const order = (
  title: string,
  patientQuote: string,
  question: string,
  steps: string[],
  learningPoint: string,
): OrderScenario => ({
  kind: "order",
  id: uid(),
  title,
  patientQuote,
  question,
  steps,
  learningPoint,
  status: "draft",
});

function appointmentDrafts(): Scenario[] {
  return [
    mcq(
      "Chest pain caller",
      "I've had crushing chest pain for twenty minutes and I feel sweaty.",
      "What should the receptionist do first?",
      [
        "Book the next routine GP appointment and tell them to wait at home.",
        "Advise 999 immediately, stay on the line and alert the duty GP.",
        "Ask them to come to the surgery so a receptionist can check them.",
        "Transfer the call to the practice pharmacist for advice.",
      ],
      1,
      "Chest pain with these features is a potential emergency. Reception must never delay by booking a routine slot; follow the urgent protocol and advise 999.",
    ),
    mcq(
      "Asthma follow-up after discharge",
      "I was discharged from A&E last night after an asthma attack and told to see the GP.",
      "How should this appointment be booked?",
      [
        "Any GP telephone slot within four weeks.",
        "A 20-minute face-to-face slot with an asthma-trained nurse within 2 working days.",
        "A repeat prescription review with the pharmacist.",
        "Tell the patient to call back if symptoms return.",
      ],
      1,
      "Post-discharge asthma reviews are time-critical and must go to a trained nurse in the correct slot length, per practice protocol.",
    ),
    order(
      "Same-day appointment request — correct order",
      "I need to see someone today, I'm not feeling right.",
      "Put these actions in the correct order.",
      [
        "Ask brief triage questions to identify any red flags.",
        "Check same-day availability and clinician suitability.",
        "If no availability, seek advice from the duty team before ending the call.",
        "Document the outcome and any advice given in the patient record.",
      ],
      "Same-day requests follow a fixed sequence — triage, check, escalate if needed, then document. Missing a step risks patient safety.",
    ),
    mcq(
      "Home visit request",
      "My mum can't get out of bed, can a doctor come to the house?",
      "What is the correct process?",
      [
        "Tell them home visits are not offered any more.",
        "Book the next routine face-to-face slot for the mother.",
        "Take full details before the visit cut-off time, log the request, and pass to the duty GP to triage.",
        "Give the family the out-of-hours number and end the call.",
      ],
      2,
      "Home visit decisions are clinical. Reception collects details before the cut-off and lets the duty GP triage.",
    ),
    order(
      "Handling a home visit request — correct order",
      "Can we have a home visit today please?",
      "Order these steps correctly.",
      [
        "Take the patient's name, address, telephone number and reason for the request.",
        "Check for red-flag symptoms and escalate immediately if present.",
        "Log the request on the visit list before the daily cut-off time.",
        "Pass the request to the duty GP to triage and decide.",
      ],
      "Following this order ensures no red flags are missed and the duty GP has what they need to decide safely.",
    ),
  ];
}

function prescriptionDrafts(): Scenario[] {
  return [
    mcq(
      "Repeat prescription — 'today please'",
      "I've run out of my blood pressure tablets. Can the doctor do it today?",
      "What is the best response?",
      [
        "Promise it will be issued today.",
        "Tell the patient repeats are always 48 hours and end the call.",
        "Explain the standard turnaround, check if it is an emergency supply situation, and follow the practice protocol.",
        "Advise them to buy the tablets over the counter.",
      ],
      2,
      "Reception should never promise same-day issue. Follow the standard process, and only use the emergency supply pathway when criteria are met.",
    ),
    mcq(
      "Controlled drug request by phone",
      "Can you order my morphine over the phone please?",
      "What should the receptionist say?",
      [
        "Take the request over the phone this once.",
        "Politely explain telephone ordering is not accepted for controlled drugs and direct them to the correct route.",
        "Refuse and hang up.",
        "Tell the patient to try a different practice.",
      ],
      1,
      "Controlled drug requests must not be taken by phone. Always redirect politely to the accepted written or electronic route.",
    ),
    order(
      "Patient has run out of essential medication — correct order",
      "I've run out of my epilepsy tablets and I take one tonight.",
      "Put these actions in the correct order.",
      [
        "Confirm the medication, last dose taken and any red-flag symptoms.",
        "Check whether the patient meets the emergency supply criteria.",
        "Pass to the duty GP or practice pharmacist to authorise.",
        "Signpost the patient to the nominated pharmacy once authorised, and document the request.",
      ],
      "Emergency supplies are safe only when triaged in this order. Skipping straight to a pharmacy signpost misses clinical judgement.",
    ),
    mcq(
      "Medication query from patient",
      "Can you just tell me if I can take my tablets with paracetamol?",
      "What is the correct response?",
      [
        "Give the answer if you think you know it.",
        "Read the BNF entry to the patient.",
        "Explain reception cannot give clinical advice and pass the query to the practice pharmacist or duty GP.",
        "Tell them to phone 111.",
      ],
      2,
      "Reception must never give clinical advice, including medication interactions. Route to the pharmacist or duty GP.",
    ),
  ];
}

function urgentDrafts(): Scenario[] {
  return [
    mcq(
      "Suspected stroke",
      "My husband's face has drooped and he can't lift his arm — it just started.",
      "What should the receptionist do?",
      [
        "Book the next available GP appointment.",
        "Advise 999 immediately, note the time symptoms started, and alert the duty GP.",
        "Ask them to come straight to the surgery.",
        "Suggest they take paracetamol and call back.",
      ],
      1,
      "FAST signs are a stroke until proven otherwise. Time of onset is critical for thrombolysis — 999 immediately, never a GP slot.",
    ),
    mcq(
      "Suicidal caller",
      "I don't want to be here any more. I've been thinking about ending it.",
      "What is the best immediate action?",
      [
        "Take a message and pass to a GP tomorrow.",
        "Keep the patient on the line, alert the duty GP urgently and share crisis line details.",
        "Book the mental health practitioner's next available slot next week.",
        "End the call and email the GP.",
      ],
      1,
      "Suicidal ideation is an emergency. Never leave the caller alone; escalate to the duty GP now and share crisis contacts.",
    ),
    order(
      "Chest pain call — correct order",
      "I have severe chest pain radiating down my arm.",
      "Order these steps correctly.",
      [
        "Advise the caller to hang up and dial 999 immediately.",
        "If they insist on staying on the line, keep them on and alert the duty GP.",
        "Note their name, location and time symptoms started.",
        "Document the call and actions taken in the patient record.",
      ],
      "Getting 999 activated first is the single most time-critical step. Everything else supports that action.",
    ),
    mcq(
      "Collapse in the waiting room",
      "(A patient in the waiting room slumps to the floor and is unresponsive.)",
      "What should reception do first?",
      [
        "Ask other patients to help lift them into a chair.",
        "Sound the emergency alarm/buzzer, call the nearest clinician and dial 999.",
        "Wait to see if they wake up.",
        "Take them to a consulting room alone.",
      ],
      1,
      "In-surgery collapse is an emergency. Alarm, clinician, 999 — in that order. Never move an unconscious patient without clinical help.",
    ),
  ];
}

function genericDrafts(topicTitle: string): Scenario[] {
  return [
    mcq(
      `${topicTitle} — best first step`,
      "Can you help me please, I'm not sure who to speak to.",
      "What is the best first step for reception?",
      [
        "Guess and transfer the call.",
        "Ask brief clarifying questions and follow the practice protocol for this situation.",
        "Tell the patient to call back later.",
        "Book any available appointment to move the call on.",
      ],
      1,
      `For ${topicTitle.toLowerCase()}, staff should clarify before acting and always follow the local protocol.`,
    ),
    order(
      `${topicTitle} — handling the call in order`,
      "I've got a query, not sure if you're the right person.",
      "Put these actions in the correct order.",
      [
        "Greet the caller and identify their query.",
        "Follow the practice protocol for this situation.",
        "Escalate to the appropriate clinician or team if unsure.",
        "Document the call and outcome in the patient record.",
      ],
      "A predictable structure protects patients and the practice, and helps new starters build confidence.",
    ),
  ];
}

export function draftsForTopic(topicKey: string, format: ScenarioFormat, topicTitle: string): Scenario[] {
  let all: Scenario[];
  if (topicKey === "appointment-booking") all = appointmentDrafts();
  else if (topicKey === "prescriptions") all = prescriptionDrafts();
  else if (topicKey === "urgent") all = urgentDrafts();
  else all = genericDrafts(topicTitle);

  if (format === "mcq") return all.filter((s) => s.kind === "mcq");
  if (format === "order") {
    const orderOnly = all.filter((s) => s.kind === "order");
    return orderOnly.length ? orderOnly : all;
  }
  return all;
}

export const useApp = create<AppState>((set) => ({
  modules: [seededModule],
  answers: {},
  currentDraftId: null,
  lastResult: null,

  setAnswer: (key, value) => set((s) => ({ answers: { ...s.answers, [key]: value } })),
  resetAnswers: () => set({ answers: {} }),

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
              learningPoint:
                x.learningPoint +
                " Regenerated draft — please review before approving for staff use.",
              status: "draft",
            } as Scenario;
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
