import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ScenarioStatus = "draft" | "approved";

export interface MCQScenario {
  kind: "mcq";
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  options: string[];
  correctIndex: number;
  learningPoint: string;
  status: ScenarioStatus;
}

export interface OrderScenario {
  kind: "order";
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  steps: string[];
  learningPoint: string;
  status: ScenarioStatus;
}

export type Scenario = MCQScenario | OrderScenario;

export interface Module {
  id: string;
  type: string;
  title: string;
  topicKey: string;
  published: boolean;
  scenarios: Scenario[];
  createdAt: number;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface TrainingResult {
  moduleId: string;
  moduleTitle: string;
  correct: number;
  total: number;
  wrongTitles: string[];
  completedAt: number;
  confidence?: number; // 1-5 self-report
}

// ------------- Practice data hub -------------
export interface StaffMember {
  id: string;
  name: string;
  role: string; // GP, ANP, Nurse Practitioner, Practice Nurse, HCA, Pharmacist, Reception
  clinics: string; // free-text list of what they cover
  notes?: string;
}

export interface RolePolicies {
  gps: string;
  nps: string;
  nurses: string;
  hcas: string;
  pharmacists: string;
  neverPromise: string;
  phrasesUse: string;
  phrasesAvoid: string;
}

export interface PracticeData {
  practiceName: string;
  hours: string;
  dutyContact: string;
  nominatedPharmacy: string;
  urgentNumbers: string;
  extras: string;
  staff: StaffMember[];
  rolePolicies: RolePolicies;
}

const defaultPracticeData: PracticeData = {
  practiceName: "Willow Lane Medical Practice",
  hours: "08:00–18:30 Mon–Fri, extended access Wed evenings",
  dutyContact: "Duty GP — ext 401 / Teams channel #duty",
  nominatedPharmacy: "Willow Lane Pharmacy (EPS nominated)",
  urgentNumbers: "999 for emergencies · 111 out of hours · Local crisis team 0300 000 0000",
  extras: "PCN evening hub on Tuesdays. Safeguarding lead: Dr Patel.",
  staff: [
    {
      id: "s1",
      name: "Dr Rachel Owens",
      role: "GP Partner",
      clinics: "All GP presentations, home visits lead",
    },
    {
      id: "s2",
      name: "Anna Bright",
      role: "Nurse Practitioner",
      clinics: "Minor illness, UTIs, ear infections, wound review",
    },
    {
      id: "s3",
      name: "Priya Shah",
      role: "Practice Nurse (asthma & diabetes trained)",
      clinics: "Asthma reviews, diabetic annual reviews, cervical screening",
    },
    {
      id: "s4",
      name: "Marcus Lee",
      role: "HCA",
      clinics: "Blood pressure, bloods, ECG, B12 injections",
    },
    {
      id: "s5",
      name: "Sarah Khan",
      role: "Practice Pharmacist",
      clinics: "Medication reviews, high-risk drug monitoring, prescription queries",
    },
  ],
  rolePolicies: {
    gps: "GPs see: any acute presentation, safeguarding concerns, complex chronic disease, mental health same-day, under-5 illness. Book directly with a GP for: chest pain (after 999), suspected cancer 2WW, new severe headaches, mental health crisis follow-up. Escalate to duty first when unsure.",
    nps: "Nurse Practitioners: minor illness in over-5s, UTI, ear/throat, wound review, simple rashes. NOT: under-5s, chest pain, severe mental health, complex medication reviews. If unsure — book duty triage.",
    nurses: "Practice Nurses: asthma reviews (Priya), diabetes reviews (Priya), cervical screening (Priya), childhood imms, wound dressings, BP monitoring, travel health. Not for acute illness triage.",
    hcas: "HCAs: bloods, BP checks, ECGs, B12 injections, NHS Health Checks, height/weight. Not for acute or new symptoms.",
    pharmacists: "Practice Pharmacist: medication reviews, high-risk drug monitoring, polypharmacy, minor medication queries, interactions. Escalate to GP for: dose changes on high-risk meds, controlled drug requests, new symptoms.",
    neverPromise: "A specific GP or time · Same-day slot before checking · That results are 'fine' before a clinician has reviewed · Anything clinical (diagnosis, dose, whether medication is safe).",
    phrasesUse: "'I can hear this is frustrating, let me see what I can do' · 'I'll take some details and get the duty team to call you back' · 'I can't give clinical advice but I can get someone who can'.",
    phrasesAvoid: "'It's just a…' · 'Everyone's waiting' · 'The doctor is too busy' · 'I'm sure it's nothing' · 'You should have called earlier'.",
  },
};

// ------------- App state -------------
interface AppState {
  modules: Module[];
  answers: Record<string, string>;
  currentDraftId: string | null;
  lastResult: TrainingResult | null;
  practiceData: PracticeData;

  setAnswer: (key: string, value: string) => void;
  resetAnswers: () => void;
  createDraftModule: (type: string, title: string, topicKey: string, seed: Scenario[]) => string;
  updateScenario: (moduleId: string, s: Scenario) => void;
  deleteScenario: (moduleId: string, scenarioId: string) => void;
  approveScenario: (moduleId: string, scenarioId: string) => void;
  regenerateScenario: (moduleId: string, scenarioId: string) => void;
  publishModule: (moduleId: string) => void;
  setLastResult: (r: TrainingResult) => void;

  // Practice data
  setPracticeField: (field: keyof Omit<PracticeData, "staff">, value: string) => void;
  addStaff: (s: Omit<StaffMember, "id">) => void;
  updateStaff: (id: string, patch: Partial<StaffMember>) => void;
  removeStaff: (id: string) => void;
  replaceStaffName: (oldName: string, newName: string, propagate: boolean) => number;
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ------------- Setup questions per topic -------------
export interface SetupQuestion {
  key: string;
  q: string;
  placeholder: string;
}

const APPOINTMENT_QUESTIONS: SetupQuestion[] = [
  { key: "hours", q: "What are the practice's core appointment hours and any extended access clinics?", placeholder: "e.g. 08:00–18:30 Mon–Fri; extended access Wed 18:30–20:00" },
  { key: "clinicianList", q: "List every clinician who takes appointments and what they see.", placeholder: "e.g. Dr Owens (GP – all); Anna Bright (ANP – minor illness, UTIs); Priya Shah (Practice Nurse – asthma & diabetes)" },
  { key: "npEligibility", q: "Which Nurse Practitioners / ANPs do you have and what appointment types are they eligible to take?", placeholder: "e.g. Anna Bright – minor illness in over-2s, UTI, ear infection; NOT chest pain, NOT under-2s" },
  { key: "asthmaTrained", q: "Which nurses run asthma clinics and how long is a post-A&E asthma review slot?", placeholder: "e.g. Priya Shah – 20-min slot, within 2 working days of discharge" },
  { key: "diabetesTrained", q: "Which nurses do diabetic checks and how is an annual review structured?", placeholder: "e.g. Priya Shah – HCA bloods first, nurse review 2 weeks later, 30-min slot" },
  { key: "hcaTasks", q: "Which HCAs are available and what appointment types can they do?", placeholder: "e.g. Marcus Lee – BP checks, bloods, ECG, B12; 10-min slots" },
  { key: "sameDayProcess", q: "Step-by-step: how does your practice handle a same-day appointment request?", placeholder: "e.g. Ask triage questions from script → check duty list → book duty or escalate" },
  { key: "urgentSymptoms", q: "Which symptoms must reception treat as same-day urgent, and who do they route to?", placeholder: "e.g. Chest pain → 999 + duty GP; suspected stroke → 999; suicidal ideation → duty GP now" },
  { key: "under5", q: "How are appointments for children under 5 handled and which clinicians can see them?", placeholder: "e.g. Always same-day; GP only, not ANP; check safeguarding flags" },
  { key: "mentalHealth", q: "How are mental health appointments booked? Any dedicated practitioner?", placeholder: "e.g. Duty GP triage same day; MH practitioner clinic Thu; crisis line for emergencies" },
  { key: "homeVisits", q: "Home visits: cut-off time, who decides, what details must reception take?", placeholder: "e.g. Requests before 10:30; duty GP triages; take name, address, phone, reason" },
  { key: "telephone", q: "When do you book telephone vs face-to-face, and are there video slots?", placeholder: "e.g. Admin/results by phone; exams and children F2F; video for follow-ups" },
  { key: "cancelDNA", q: "How are cancellations, DNAs and repeated no-shows handled?", placeholder: "e.g. Offer rebook, code DNA in EMIS, flag 3+ DNAs to manager" },
  { key: "neverPromise", q: "What must reception never promise to a patient booking an appointment?", placeholder: "e.g. A specific GP, a same-day slot, a call-back time" },
  { key: "escalate", q: "Who is on the escalation ladder when reception is unsure?", placeholder: "e.g. Duty GP → senior receptionist → practice manager" },
  { key: "localExtras", q: "Any local systems, templates or extras staff must know?", placeholder: "e.g. EMIS same-day template, PCN evening hub, interpreter service" },
];

const PRESCRIPTION_QUESTIONS: SetupQuestion[] = [
  { key: "turnaround", q: "What is your standard repeat prescription turnaround?", placeholder: "e.g. 48 working hours, longer after weekends and bank holidays" },
  { key: "orderMethods", q: "Exactly how can patients order repeats (and what is NOT accepted)?", placeholder: "e.g. NHS App, patient portal, paper slip in the box; telephone ordering NOT accepted" },
  { key: "pharmacist", q: "Who is your practice pharmacist and what queries route to them?", placeholder: "e.g. Sarah Khan – medication reviews, interactions, high-risk drug monitoring" },
  { key: "nominatedPharmacies", q: "Which pharmacies are you set up with by default and how are urgent items handled?", placeholder: "e.g. Willow Lane Pharmacy (EPS default); Boots High St for urgent same-day" },
  { key: "controlled", q: "How are controlled drug requests handled? What must reception never do?", placeholder: "e.g. Never accept by phone, 28-day rule, GP review required" },
  { key: "runOut", q: "A patient has run out of essential medication today — exact steps and who authorises?", placeholder: "e.g. Confirm med and last dose, check emergency supply criteria, pass to duty pharmacist Sarah Khan or duty GP" },
  { key: "highRisk", q: "List medications that require extra caution or clinician sign-off before reissue.", placeholder: "e.g. Warfarin, methotrexate, lithium, opioids, DMARDs" },
  { key: "acute", q: "How are acute (non-repeat) prescription requests handled?", placeholder: "e.g. Not through repeats — book duty GP call-back or pharmacist review" },
  { key: "reviewsOverdue", q: "How do staff handle overdue medication reviews?", placeholder: "e.g. Alert on system, book with Sarah Khan (pharmacist) before reissue" },
  { key: "safeguarding", q: "What safeguarding flags in prescription requests must reception escalate?", placeholder: "e.g. Repeated early requests, opioid escalation, mental health med queries from third parties" },
  { key: "queries", q: "Which medication queries can reception answer vs must route on?", placeholder: "e.g. Timings/collection = reception; interactions/side effects = pharmacist; dose change = duty GP" },
  { key: "neverPromise", q: "What should staff never promise about prescriptions?", placeholder: "e.g. Same-day issue, that a specific GP will sign, exact pharmacy timings" },
  { key: "escalate", q: "Escalation chain for prescription problems?", placeholder: "e.g. Pharmacist Sarah Khan → duty GP → prescriptions manager" },
  { key: "localExtras", q: "Local rules, shared care protocols, or systems staff must know?", placeholder: "e.g. Shared care with mental health team, high-risk register in EMIS" },
];

const URGENT_QUESTIONS: SetupQuestion[] = [
  { key: "chestPain", q: "Exact reception response to a caller reporting chest pain — words and actions.", placeholder: "e.g. 'Please hang up and dial 999 now, I'll alert a GP' — flag duty GP, log time" },
  { key: "stroke", q: "Response to FAST signs (face, arm, speech, time)?", placeholder: "e.g. 999 immediately; note time of onset; alert duty GP" },
  { key: "breathing", q: "Response to severe breathing difficulty?", placeholder: "e.g. 999 if unable to speak full sentences; otherwise urgent duty GP triage" },
  { key: "bleeding", q: "Response to uncontrolled bleeding?", placeholder: "e.g. 999, advise pressure with clean cloth, alert duty" },
  { key: "suicidal", q: "Response to a caller expressing suicidal thoughts — do NOT hang up.", placeholder: "e.g. Keep on line, urgent duty GP, share crisis line 0300 000 0000" },
  { key: "sepsis", q: "Sepsis red flags reception should recognise?", placeholder: "e.g. New confusion, mottled skin, fever + rigors, no urine in 12h" },
  { key: "pregnancy", q: "Urgent symptoms in pregnancy and where to route them?", placeholder: "e.g. Bleeding / reduced movements → maternity triage number" },
  { key: "childUnder2", q: "Unwell child under 2 — who takes the call and what slot type?", placeholder: "e.g. Always duty GP same-day; never ANP; never routine" },
  { key: "collapseCall", q: "Caller reports someone has collapsed at home — what does reception do?", placeholder: "e.g. 999 first, keep them on line for CPR instructions, alert clinician" },
  { key: "collapseSurgery", q: "Patient collapses in the waiting room — exact sequence?", placeholder: "e.g. Emergency buzzer, nearest clinician, 999, do not move" },
  { key: "dutyTeam", q: "Who is the duty team today and how do reception contact them?", placeholder: "e.g. Duty GP on rota — Teams #duty, ext 401" },
  { key: "escalate", q: "Escalation if the duty GP is unreachable?", placeholder: "e.g. Second duty → senior partner → practice manager" },
  { key: "documentation", q: "How must urgent calls be documented in EMIS/SystmOne?", placeholder: "e.g. Urgent template, timestamp, actions taken, patient words in quotes" },
  { key: "neverDo", q: "What must reception never do during an urgent call?", placeholder: "e.g. Never give clinical advice, never book routine and end call, never leave line if suicidal" },
];

const RESULTS_QUESTIONS: SetupQuestion[] = [
  { key: "whoReleases", q: "Which clinicians release results and how do reception know status?", placeholder: "e.g. Duty GP each morning; results flagged as N/A/A/UA in EMIS" },
  { key: "canShare", q: "Which results can reception read to a patient and which must a clinician give?", placeholder: "e.g. Reception may say 'normal, no action'; abnormal / new diagnosis = clinician only" },
  { key: "identity", q: "How do staff verify patient identity before sharing results?", placeholder: "e.g. Full name, DOB, first line of address" },
  { key: "thirdParty", q: "Third-party requests (family, carer) — what is allowed?", placeholder: "e.g. Only with written consent on file; safeguarding check for under-16s" },
  { key: "urgent", q: "How are urgent / abnormal results flagged and escalated?", placeholder: "e.g. Abnormal → duty GP call within 24h; critical → same day" },
  { key: "childrenResults", q: "Rules for children's or teenager's results?", placeholder: "e.g. Under 13 to parent; 13–16 Gillick; 16+ patient only" },
  { key: "systemSteps", q: "Steps in EMIS/SystmOne when reception passes on a result.", placeholder: "e.g. Open patient record → results tab → template → task GP" },
  { key: "escalate", q: "Escalation route if unsure?", placeholder: "e.g. Duty GP > practice manager" },
  { key: "neverDo", q: "What must reception never do with results?", placeholder: "e.g. Never share by voicemail, never guess normal, never interpret abnormal" },
  { key: "tone", q: "What tone and phrasing works well?", placeholder: "e.g. 'Your result is with the doctor for review, they'll call you if action is needed'" },
];

const DIFFICULT_QUESTIONS: SetupQuestion[] = [
  { key: "commonTriggers", q: "What are the common triggers for angry calls at your practice?", placeholder: "e.g. Long waits, no same-day slot, prescription delays" },
  { key: "descalation", q: "Preferred de-escalation phrases?", placeholder: "e.g. 'I can hear this is frustrating, let me see what I can do'" },
  { key: "abuse", q: "Zero-tolerance line — when does a call get ended and how?", placeholder: "e.g. Swearing / threats — warn once, end call, log incident" },
  { key: "callback", q: "When should reception offer a call-back vs stay on the line?", placeholder: "e.g. Call-back if resolving needs another team; stay on line if distress or safety" },
  { key: "escalate", q: "Who does reception hand a distressed caller to?", placeholder: "e.g. Senior receptionist, duty GP, practice manager" },
  { key: "safeguarding", q: "Safeguarding cues in difficult calls (DA, coercion, self-harm)?", placeholder: "e.g. Third-party in room, coded language, requesting a doctor to 'get out'" },
  { key: "log", q: "How are difficult calls logged and reviewed?", placeholder: "e.g. Incident log + Datix, weekly manager review" },
  { key: "neverDo", q: "What must staff never do in a difficult call?", placeholder: "e.g. Never match the caller's tone, never make promises, never hang up on distress" },
  { key: "tone", q: "Tone rules?", placeholder: "e.g. Calm, low pace, short sentences, name the emotion" },
];

const FIRST_WEEK_QUESTIONS: SetupQuestion[] = [
  { key: "systems", q: "Which systems will the new starter use in week 1?", placeholder: "e.g. EMIS Web, Docman, Accurx, NHS App admin, Teams" },
  { key: "buddy", q: "Who is the buddy / senior receptionist they should sit with?", placeholder: "e.g. Jenna R. mornings, Tomek P. afternoons" },
  { key: "shadow", q: "What should they shadow before taking calls solo?", placeholder: "e.g. 2 days on reception, 1 day on prescriptions, 1 day on results" },
  { key: "phrasesGreet", q: "Standard greeting and hold phrases?", placeholder: "e.g. 'Good morning, Willow Lane, how can I help?'" },
  { key: "confidentiality", q: "Confidentiality basics they must know on day 1?", placeholder: "e.g. Screen locking, no info to third parties, no info in waiting room" },
  { key: "safeguarding", q: "What safeguarding basics does day 1 need to cover?", placeholder: "e.g. Who is safeguarding lead, how to flag a concern" },
  { key: "escalate", q: "When to stop and ask for help — worked examples?", placeholder: "e.g. Anything urgent, anything about a child, any complaint" },
  { key: "neverDo", q: "Common week-1 mistakes to prevent?", placeholder: "e.g. Booking chest pain into routine, sharing results without ID check" },
];

const GENERIC_QUESTIONS: SetupQuestion[] = [
  { key: "context", q: "Describe the exact situation this module should cover.", placeholder: "e.g. Handling test results enquiries by phone" },
  { key: "process", q: "Step-by-step: your practice's local process.", placeholder: "In your own words" },
  { key: "commonCalls", q: "Three or four real patient scenarios reception often meets.", placeholder: "Real examples" },
  { key: "clinicianRoles", q: "Which clinicians / teams are involved and their names?", placeholder: "e.g. Sarah Khan (pharmacist), Dr Owens (duty GP)" },
  { key: "escalate", q: "When and to whom should staff escalate?", placeholder: "e.g. Duty GP if red flags" },
  { key: "neverPromise", q: "What should staff never promise or say?", placeholder: "e.g. Clinical opinions, exact timings" },
  { key: "tone", q: "Tone and phrases?", placeholder: "e.g. Warm, calm, professional" },
  { key: "localExtras", q: "Local rules the module must include?", placeholder: "e.g. Templates, safeguarding" },
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
    questions: RESULTS_QUESTIONS,
  },
  {
    key: "difficult",
    title: "Difficult calls & de-escalation",
    desc: "Managing angry, distressed or complex callers.",
    questions: DIFFICULT_QUESTIONS,
  },
  {
    key: "first-week",
    title: "First week on reception",
    desc: "Orientation basics for a brand-new starter.",
    questions: FIRST_WEEK_QUESTIONS,
  },
  {
    key: "custom",
    title: "Custom module",
    desc: "Design a module from any local process.",
    questions: GENERIC_QUESTIONS,
  },
];

// ------------- Scenario helpers -------------
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

// ------------- Scenario pools per topic (bigger, so regenerate works) -------------
function appointmentPool(): Scenario[] {
  return [
    mcq(
      "Chest pain caller",
      "I've had crushing chest pain for twenty minutes and I feel sweaty.",
      "What should the receptionist do first?",
      [
        "Book the next routine GP appointment.",
        "Advise 999 immediately, stay on the line and alert the duty GP.",
        "Ask them to come to the surgery so a receptionist can check them.",
        "Transfer the call to the practice pharmacist for advice.",
      ],
      1,
      "Chest pain with these features is a potential emergency. Reception must never delay by booking a routine slot; follow the urgent protocol and advise 999.",
    ),
    mcq(
      "Asthma follow-up after A&E",
      "I was discharged from A&E last night after an asthma attack and told to see the GP.",
      "How should this be booked?",
      [
        "Any GP telephone slot within four weeks.",
        "A 20-minute face-to-face slot with the asthma-trained nurse within 2 working days.",
        "A repeat prescription review with the pharmacist.",
        "Tell the patient to call back if symptoms return.",
      ],
      1,
      "Post-discharge asthma reviews are time-critical and must go to a trained nurse in the correct slot length.",
    ),
    mcq(
      "Nurse practitioner triage — cough in a 3-year-old",
      "My son is 3 and has a bad cough, can he see the nurse practitioner today?",
      "What is correct?",
      [
        "Book with the ANP — she sees all minor illness.",
        "Under-5s are not seen by the ANP for illness — book same-day with a GP and check safeguarding flags.",
        "Tell them to try again tomorrow.",
        "Book a routine GP in two weeks.",
      ],
      1,
      "Under-5s with new illness go to a GP, not the ANP, and same-day. Always check safeguarding flags.",
    ),
    mcq(
      "Home visit request",
      "My mum can't get out of bed, can a doctor come to the house?",
      "What is the correct process?",
      [
        "Tell them home visits are not offered any more.",
        "Book the next routine face-to-face slot.",
        "Take full details before the visit cut-off, log the request and pass to the duty GP to triage.",
        "Give the family the out-of-hours number and end the call.",
      ],
      2,
      "Home visit decisions are clinical. Reception collects details before the cut-off and lets the duty GP triage.",
    ),
    mcq(
      "Diabetic annual review booking",
      "I've had a text saying I'm due my diabetic review.",
      "How is this booked?",
      [
        "One 10-minute slot with the GP.",
        "HCA slot for bloods first, then a 30-min nurse review two weeks later with the diabetes-trained nurse.",
        "Book straight in with the pharmacist.",
        "Nurse review only — no bloods needed.",
      ],
      1,
      "Annual diabetic reviews are two-stage: HCA bloods, then a trained nurse for the review. This ensures results are back in time.",
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
      "Same-day requests follow a fixed sequence — triage, check, escalate if needed, then document.",
    ),
    order(
      "Home visit request — correct order",
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
    order(
      "Booking a post-A&E asthma review — correct order",
      "A&E said I need to see the GP after my asthma attack.",
      "Put the booking steps in the correct order.",
      [
        "Confirm the discharge date and any medication changes.",
        "Check the asthma-trained nurse's clinic within 2 working days.",
        "Book a 20-minute face-to-face slot in that clinic.",
        "Task the nurse with the discharge summary before the appointment.",
      ],
      "The nurse must have the discharge summary in hand before the review — booking without it is a safety gap.",
    ),
    mcq(
      "Mental health same-day",
      "I really need to speak to someone today, I'm not coping.",
      "What is the best route?",
      [
        "Offer a routine GP in three weeks.",
        "Duty GP triage call-back same day; share the crisis line if they can't wait.",
        "Suggest they try 111.",
        "Book the next mental health practitioner slot with no triage.",
      ],
      1,
      "Mental health same-day calls always go through duty triage. Crisis line details are a safety net, not a substitute.",
    ),
    mcq(
      "Telephone vs face-to-face",
      "Can I just have a phone call about my back pain?",
      "What is right?",
      [
        "Book phone — patient preference decides.",
        "New back pain needs a face-to-face for examination; offer the next appropriate slot.",
        "Refuse to book anything.",
        "Book them with the HCA.",
      ],
      1,
      "Examinations need face-to-face. Phone appointments are for admin, results and follow-ups.",
    ),
  ];
}

function prescriptionPool(): Scenario[] {
  return [
    mcq(
      "Repeat prescription — 'today please'",
      "I've run out of my blood pressure tablets. Can the doctor do it today?",
      "What is the best response?",
      [
        "Promise it will be issued today.",
        "Tell the patient repeats are always 48 hours and end the call.",
        "Explain the standard turnaround, check if it's an emergency supply situation, and follow protocol.",
        "Advise them to buy the tablets over the counter.",
      ],
      2,
      "Never promise same-day issue. Follow the standard process, and only use the emergency supply pathway when criteria are met.",
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
      "Controlled drug requests must not be taken by phone. Always redirect politely to the accepted route.",
    ),
    mcq(
      "Medication query — interaction",
      "Can you just tell me if I can take my tablets with paracetamol?",
      "What is correct?",
      [
        "Give the answer if you think you know it.",
        "Read the BNF entry to the patient.",
        "Explain reception cannot give clinical advice and pass the query to the practice pharmacist.",
        "Tell them to phone 111.",
      ],
      2,
      "Reception must never give clinical advice, including interactions. Route to the practice pharmacist.",
    ),
    mcq(
      "Overdue medication review",
      "The pharmacy said my tablets weren't issued.",
      "Check the record — the review is overdue. What now?",
      [
        "Issue it anyway to avoid the patient running out.",
        "Explain the review is overdue, book with the practice pharmacist before it can be reissued.",
        "Tell them to buy them over the counter.",
        "Send it to a different pharmacy.",
      ],
      1,
      "Overdue reviews must be completed before reissue. The pharmacist is the right route.",
    ),
    mcq(
      "High-risk drug — warfarin",
      "Can I get my warfarin issued today, my INR was fine last week.",
      "What is correct?",
      [
        "Issue it as a repeat straight away.",
        "Check it needs GP or pharmacist sign-off and current INR on file, then route accordingly.",
        "Refuse.",
        "Send to any pharmacy.",
      ],
      1,
      "Warfarin is a high-risk drug and needs clinician sign-off with recent INR before reissue.",
    ),
    order(
      "Patient run out of essential medication — correct order",
      "I've run out of my epilepsy tablets and I take one tonight.",
      "Put the actions in the correct order.",
      [
        "Confirm the medication, last dose taken and any red-flag symptoms.",
        "Check whether the patient meets the emergency supply criteria.",
        "Pass to the duty pharmacist or duty GP to authorise.",
        "Signpost the patient to the nominated pharmacy once authorised, and document the request.",
      ],
      "Emergency supplies are safe only when triaged in this order.",
    ),
    order(
      "Routine repeat request via NHS App — correct order",
      "My app shows the request went through, but the pharmacy hasn't got it.",
      "Order the reception steps.",
      [
        "Verify the patient's identity and check the request in EMIS.",
        "Confirm the nominated pharmacy is correct.",
        "Check whether the item is on repeat and not awaiting review.",
        "If everything is in order, task the prescriptions team to re-send via EPS.",
      ],
      "Following this sequence protects against wrong-patient issue and missed reviews.",
    ),
    mcq(
      "Third-party request",
      "I'm calling for my dad — can you order his tablets?",
      "What is correct?",
      [
        "Order them, third parties can request.",
        "Confirm consent is on file for that person; if not, decline and ask the patient to request.",
        "Refuse all third-party requests.",
        "Ask them to bring ID next time.",
      ],
      1,
      "Third-party requests need recorded consent. Without it, decline politely and ask the patient to order directly.",
    ),
    mcq(
      "Safeguarding flag — early request",
      "This is the third time this month you're asking for tramadol early.",
      "What should reception do?",
      [
        "Issue and note it.",
        "Do not issue; flag to the duty GP or pharmacist as a safeguarding / dependency concern.",
        "Refuse and hang up.",
        "Ask another receptionist to issue it.",
      ],
      1,
      "Repeated early opioid requests are a red flag. Route to clinician, do not issue.",
    ),
  ];
}

function urgentPool(): Scenario[] {
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
      "FAST signs are a stroke until proven otherwise. Time of onset is critical for thrombolysis.",
    ),
    mcq(
      "Suicidal caller",
      "I don't want to be here any more. I've been thinking about ending it.",
      "What is the best immediate action?",
      [
        "Take a message and pass to a GP tomorrow.",
        "Keep the patient on the line, alert the duty GP urgently and share crisis line details.",
        "Book the mental health practitioner's next slot next week.",
        "End the call and email the GP.",
      ],
      1,
      "Suicidal ideation is an emergency. Never leave the caller alone; escalate to the duty GP now.",
    ),
    mcq(
      "Collapse in the waiting room",
      "(A patient in the waiting room slumps to the floor and is unresponsive.)",
      "What should reception do first?",
      [
        "Ask other patients to help lift them into a chair.",
        "Sound the emergency buzzer, call the nearest clinician and dial 999.",
        "Wait to see if they wake up.",
        "Take them to a consulting room alone.",
      ],
      1,
      "In-surgery collapse is an emergency. Alarm, clinician, 999 — in that order.",
    ),
    mcq(
      "Sepsis red flags",
      "My gran's confused, cold hands, hasn't passed urine all day, has a temperature.",
      "What is right?",
      [
        "Book a routine GP for tomorrow.",
        "Advise 999 or ED now, alert the duty GP — these are sepsis red flags.",
        "Suggest paracetamol and fluids.",
        "Book with the ANP.",
      ],
      1,
      "New confusion + no urine + fever is sepsis until proven otherwise. Do not route to a routine slot.",
    ),
    mcq(
      "Reduced fetal movements",
      "I'm 32 weeks pregnant and the baby hasn't moved much today.",
      "What is correct?",
      [
        "Book a midwife appointment next week.",
        "Direct them to maternity triage immediately per local number.",
        "Reassure and end the call.",
        "Book duty GP.",
      ],
      1,
      "Reduced movements always go to maternity triage, never to routine or GP.",
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
      "Getting 999 activated first is the single most time-critical step.",
    ),
    order(
      "Suicidal caller — correct order",
      "I don't want to be here any more.",
      "Put the reception actions in order.",
      [
        "Stay on the line and acknowledge how they feel calmly.",
        "Take name and location without leaving silence.",
        "Alert the duty GP for an immediate call-back.",
        "Share the crisis line and only end the call once support is in place.",
      ],
      "Never leave a suicidal caller alone. Structure protects both them and you.",
    ),
    mcq(
      "Unwell baby",
      "My 6-month-old is floppy, won't feed and feels hot.",
      "What is right?",
      [
        "Book routine for tomorrow.",
        "Same-day duty GP triage now — never routine or ANP for under-2s with these signs.",
        "Suggest calpol.",
        "Book with the practice nurse.",
      ],
      1,
      "Under-2s with red-flag signs always go to duty GP same-day.",
    ),
  ];
}

function genericPool(topicTitle: string): Scenario[] {
  return [
    mcq(
      `${topicTitle} — clarify before acting`,
      "Can you help me please, I'm not sure who to speak to.",
      "What is the best first step?",
      [
        "Guess and transfer the call.",
        "Ask brief clarifying questions and follow the practice protocol.",
        "Tell the patient to call back later.",
        "Book any available appointment to move the call on.",
      ],
      1,
      `For ${topicTitle.toLowerCase()}, staff should clarify before acting and follow local protocol.`,
    ),
    mcq(
      `${topicTitle} — escalate correctly`,
      "I'm not happy with the response I'm getting.",
      "What should reception do?",
      [
        "Argue their position.",
        "Acknowledge the concern and offer to escalate to a senior receptionist or manager.",
        "Hang up.",
        "Book a GP without asking.",
      ],
      1,
      "Escalation is always available. Offer it early rather than defending a decision.",
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
      "A predictable structure protects patients and the practice.",
    ),
  ];
}

function poolForTopic(topicKey: string, topicTitle: string): Scenario[] {
  if (topicKey === "appointment-booking") return appointmentPool();
  if (topicKey === "prescriptions") return prescriptionPool();
  if (topicKey === "urgent") return urgentPool();
  return genericPool(topicTitle);
}

export function draftsForTopic(topicKey: string, format: ScenarioFormat, topicTitle: string): Scenario[] {
  const all = poolForTopic(topicKey, topicTitle).slice(0, 5);
  if (format === "mcq") return all.filter((s) => s.kind === "mcq").slice(0, 4);
  if (format === "order") {
    const orderOnly = all.filter((s) => s.kind === "order");
    return orderOnly.length ? orderOnly.slice(0, 3) : all.slice(0, 3);
  }
  return all;
}

// ------------- Seeded example module -------------
const seededModule: Module = {
  id: "seed-1",
  type: "Appointment booking",
  topicKey: "appointment-booking",
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
        "Follow the local triage script before deciding availability. Never dismiss a same-day request, and never bypass the duty process.",
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
        "Same-day requests follow a fixed sequence: triage, check, escalate to duty if needed, then document.",
      status: "approved",
    },
  ],
};

// ------------- Store -------------
const replaceInText = (text: string, from: string, to: string) => {
  if (!from) return text;
  const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return text.replace(re, to);
};

const replaceInScenario = (s: Scenario, from: string, to: string): Scenario => {
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
  return { ...(base as OrderScenario), steps: s.steps.map((o) => replaceInText(o, from, to)) };
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      modules: [seededModule],
      answers: {},
      currentDraftId: null,
      lastResult: null,
      practiceData: defaultPracticeData,

      setAnswer: (key, value) => set((s) => ({ answers: { ...s.answers, [key]: value } })),
      resetAnswers: () => set({ answers: {} }),

      createDraftModule: (type, title, topicKey, seed) => {
        const id = uid();
        set((s) => ({
          modules: [
            ...s.modules,
            { id, type, title, topicKey, published: false, scenarios: seed, createdAt: Date.now() },
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
        set((state) => {
          const mod = state.modules.find((m) => m.id === moduleId);
          if (!mod) return state;
          const current = mod.scenarios.find((x) => x.id === scenarioId);
          if (!current) return state;
          const pool = poolForTopic(mod.topicKey, mod.title);
          const usedTitles = new Set(mod.scenarios.map((s) => s.title));
          const sameKind = pool.filter(
            (p) => p.kind === current.kind && !usedTitles.has(p.title),
          );
          const anyKind = pool.filter((p) => !usedTitles.has(p.title));
          const pick =
            sameKind[Math.floor(Math.random() * sameKind.length)] ??
            anyKind[Math.floor(Math.random() * anyKind.length)] ??
            pool[Math.floor(Math.random() * pool.length)];
          if (!pick) return state;
          const replacement: Scenario = { ...pick, id: current.id, status: "draft" };
          return {
            modules: state.modules.map((m) =>
              m.id === moduleId
                ? {
                    ...m,
                    scenarios: m.scenarios.map((x) => (x.id === scenarioId ? replacement : x)),
                  }
                : m,
            ),
          };
        }),

      publishModule: (moduleId) =>
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === moduleId ? { ...m, published: true } : m,
          ),
        })),

      setLastResult: (r) => set({ lastResult: r }),

      setPracticeField: (field, value) =>
        set((state) => ({ practiceData: { ...state.practiceData, [field]: value } })),

      addStaff: (s) =>
        set((state) => ({
          practiceData: {
            ...state.practiceData,
            staff: [...state.practiceData.staff, { ...s, id: uid() }],
          },
        })),

      updateStaff: (id, patch) =>
        set((state) => ({
          practiceData: {
            ...state.practiceData,
            staff: state.practiceData.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
          },
        })),

      removeStaff: (id) =>
        set((state) => ({
          practiceData: {
            ...state.practiceData,
            staff: state.practiceData.staff.filter((s) => s.id !== id),
          },
        })),

      replaceStaffName: (oldName, newName, propagate) => {
        const trimmedOld = oldName.trim();
        const trimmedNew = newName.trim();
        if (!trimmedOld || !trimmedNew) return 0;
        let touched = 0;
        set((state) => {
          const staff = state.practiceData.staff.map((s) =>
            s.name.trim().toLowerCase() === trimmedOld.toLowerCase()
              ? { ...s, name: trimmedNew }
              : s,
          );
          if (!propagate) {
            return { practiceData: { ...state.practiceData, staff } };
          }
          const modules = state.modules.map((m) => {
            const scenarios = m.scenarios.map((sc) => {
              const next = replaceInScenario(sc, trimmedOld, trimmedNew);
              if (JSON.stringify(next) !== JSON.stringify(sc)) touched += 1;
              return next;
            });
            return { ...m, scenarios };
          });
          return { practiceData: { ...state.practiceData, staff }, modules };
        });
        return touched;
      },
    }),
    { name: "practice-ready-store" },
  ),
);
