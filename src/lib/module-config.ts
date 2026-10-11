import {
  inspectLocalProcedureSequences,
  localProcedureApplication,
} from "./local-procedure-sequences.ts";
import {
  roleRequestSituation,
  roleAnswerChoices,
  roleList,
  broadRequestLabel,
} from "./role-question-presentation.ts";
import { roleMatchingScenario } from "./role-matching.ts";
import {
  structuredBookingExercises,
  exerciseSignature,
  configuredBookingActions,
  localAnswerOptions,
  bookingActionKey,
  neutralLearnSituation,
} from "./appointment-local-scenarios.ts";
import { appointmentCorePool, regenerateAppointmentCore } from "./core-appointment-selection.ts";
import { legacyModuleOptions } from "./module-config-legacy.ts";
import {
  applications,
  scenarioQuestion,
  applicationMistakes,
  naturalSituation,
  explicitRules,
} from "./scenario-applications.ts";
import type { Module, PracticeData, Scenario } from "./store";
import {
  practiceSummary,
  configMissing,
  safeguardingMissing,
  sameDayGroups,
  choiceText,
  sameDayProcesses,
} from "./practice-config.ts";
import { effectiveRequestsForStaff, selectedRequests, staffForRequest } from "./role-requests.ts";

export const trainingLevelOptions = [
  {
    value: "learn",
    label: "Learn",
    description: "Build understanding of key principles and your practice’s procedures.",
    disabled: false,
  },
  {
    value: "apply",
    label: "Apply",
    description: "Use that knowledge in realistic patient situations.",
    disabled: false,
  },
  {
    value: "handle",
    label: "Handle",
    description: "Work through multi-step situations combining several decisions.",
    disabled: true,
  },
] as const;

export interface ModuleSettings {
  // Appointment Booking only; absent on legacy modules.
  trainingLevel?: "learn" | "apply";
  version: 1;
  answers: Record<string, string>;
  // Optional additions keep existing version-1 modules compatible.
  selections?: Record<string, string[]>;
  customOptions?: Record<string, { id: string; label: string }[]>;
  answerDetails?: Record<string, { contact?: string; instruction?: string }>;
  extra: string;
  length: "quick" | "standard" | "thorough" | "custom";
  count: number;
}
export interface TopicField {
  key: string;
  label: string;
  options: string[];
  multiple?: boolean;
  detailOptions?: Record<string, "contact" | "process">;
  addLabel?: string;
  legacyOnly?: boolean;
  situation?: string;
  showWhen?: (p: PracticeData, settings: ModuleSettings) => boolean;
  known?: (p: PracticeData) => string;
}
const field = (
  key: string,
  label: string,
  options: string[],
  known?: TopicField["known"],
): TopicField => ({ key, label, options, known });
const channels = ["NHS App", "Practice website / online form", "Telephone", "At reception"];
const contact = (key: string, label: string, known?: TopicField["known"]) =>
  field(key, label, [], known);
const advice = "Ask a specified person or role for advice";
const localProcess = "Follow another practice-specific process";
const bookingRoute = "practice:booking-escalation";
const q = (
  key: string,
  label: string,
  options: string[],
  known?: TopicField["known"],
): TopicField => ({
  ...field(key, label, options, known),
  detailOptions: {
    [advice]: "contact",
    [localProcess]: "process",
    "It depends on the request type": "process",
  },
  addLabel: "Add another process",
});
const methods = (key: string, label: string, options = channels): TopicField => ({
  ...q(key, label, options),
  multiple: true,
  addLabel: "Add another method",
});
export const topicFields: Record<string, TopicField[]> = {
  "appointment-booking": [
    q(
      "sameDay",
      "How are same-day appointment requests handled?",
      [
        "Reception books directly with an appropriate clinician",
        "Request goes through triage first",
        "It depends on the request",
      ],
      (p) => p.rolePolicies.gpsSameDay,
    ),
    {
      ...methods("sameDayRoutes", "Which routes are used for same-day requests?", [
        "Reception books requests that meet the practice’s same-day criteria",
        "Clinical triage before booking",
        localProcess,
      ]),
      known: (p) => p.bookingConfig?.sameDayInstruction ?? "",
      situation:
        "A colleague asks how same-day requests are handled. What routes can reception use?",
      showWhen: (p, settings) =>
        p.bookingConfig?.sameDayProcess.id === "depends" ||
        (!practiceSummary(p).rolePolicies.gpsSameDay.trim() &&
          settings.answers.sameDay === "It depends on the request"),
    },
    q("preference", "What happens if a patient requests a particular GP or clinician?", [
      "Book with the requested clinician if an appropriate appointment is available",
      "Offer another suitable clinician if the requested clinician is unavailable",
      "It depends on the request type",
      localProcess,
    ]),
    q("unavailable", "When the appropriate appointment is unavailable, what should reception do?", [
      "Offer another clinician who can handle the request",
      "Offer the next suitable appointment",
      bookingRoute,
      advice,
      localProcess,
    ]),
    q(
      "uncertain",
      "When unsure which appointment to book, what should reception do?",
      [bookingRoute, advice, localProcess],
      (p) =>
        p.bookingConfig?.sendUncertainToDutyClinician
          ? "Send to duty clinician"
          : !configMissing(p).booking.includes("Escalation contact and method")
            ? p.dutyContact
            : "",
    ),
    q("cancellation", "What should reception do when a patient cancels and asks to rebook?", [
      "Cancel the original appointment and offer another suitable appointment",
      advice,
      localProcess,
    ]),
  ],
  prescriptions: [
    methods("acute", "How should a non-repeat prescription request be submitted?"),
    contact("queries", "Who handles prescription queries?", (p) =>
      p.staff
        .filter((person) =>
          effectiveRequestsForStaff(p, person.id).some((r) => /prescription quer/i.test(r.label)),
        )
        .map((person) => `${person.name} — ${person.role}`)
        .join("; "),
    ),
    q("monitoring", "What should reception do when a medication review is overdue?", [
      "Offer a medication review appointment where the clinician has requested one",
      advice,
      localProcess,
    ]),
    q(
      "urgentRequest",
      "How should an urgent prescription request be passed on?",
      [advice, localProcess],
      (p) =>
        !configMissing(p).prescription.some((item) => item.startsWith("Urgent"))
          ? p.repeatEmergency
          : "",
    ),
    q(
      "chasing",
      "What should reception do when a prescription takes longer than the practice’s usual turnaround?",
      ["Check the request’s progress and explain any update to the patient", advice, localProcess],
    ),
    q(
      "pharmacyIssue",
      "What should reception do if a pharmacy cannot find an expected prescription?",
      [
        "Check whether the prescription has been issued and which pharmacy it was sent to",
        advice,
        localProcess,
      ],
    ),
  ],
  urgent: [
    contact("backup", "Who should reception contact if the usual urgent contact is unavailable?"),
    q("record", "Where should reception document an urgent handover?", [
      "Patient’s clinical record",
      "Clinical system task",
      localProcess,
    ]),
    methods("handover", "Which details should accompany an urgent handover?", [
      "Patient identifiers",
      "Callback number",
      "Caller’s own description of the concern",
      "Actions already taken and the time of the call",
    ]),
    q("acknowledgement", "How should reception check that an urgent handover has been received?", [
      "Confirm directly with the person receiving the handover",
      "Check that the clinical system task has been acknowledged",
      localProcess,
    ]),
  ],
  results: [
    q("release", "When may reception pass on a result?", [
      "Only when marked as reviewed and authorised for reception to share",
      "All result enquiries go to the reviewing clinician",
      localProcess,
    ]),
    q("pending", "What should reception do if a result has not yet been reviewed?", [
      "Explain that the result needs clinician review before it can be shared",
      advice,
      localProcess,
    ]),
    q(
      "identity",
      "Which identity details must be checked before sharing a result?",
      ["Full name and date of birth", "Full name, date of birth and address", localProcess],
      (p) => p.localConfidentiality,
    ),
    q(
      "followup",
      "What should reception do when a reviewed result includes a follow-up instruction?",
      ["Arrange the follow-up requested by the reviewing clinician", advice, localProcess],
    ),
    q("notReceived", "What should reception do if an expected test result has not arrived?", [
      "Check whether the result has arrived through another route, such as a letter",
      advice,
      localProcess,
    ]),
  ],
  vaccines: [
    q("eligibility", "How should reception check whether a patient can book a vaccination?", [
      "Check that the patient has been invited for the vaccination",
      "Check booking instructions provided by a clinician",
      advice,
      localProcess,
    ]),
    q("unclear", "What should reception do if vaccination booking instructions are unclear?", [
      advice,
      localProcess,
    ]),
    q(
      "clinicFull",
      "What should reception do when no suitable vaccination appointment is available?",
      [
        "Offer the next suitable vaccination appointment",
        "Use the practice’s vaccination waiting list",
        advice,
        localProcess,
      ],
    ),
    {
      ...methods("waitingList", "Which details are needed for your vaccination waiting list?", [
        "Patient identifiers",
        "Contact number",
        "Vaccination requested",
        "Patient availability",
      ]),
      showWhen: (_p, settings) =>
        settings.answers.clinicFull === "Use the practice’s vaccination waiting list",
    },
    contact("vaccineAdvice", "Who should reception contact about clinical vaccination questions?"),
  ],
  "fit-notes": [
    methods("request", "How are fit note requests submitted?"),
    q("delivery", "How are issued fit notes provided?", [
      "Secure digital message",
      "Paper collection from reception",
      "Patient chooses secure digital message or paper collection",
      localProcess,
    ]),
    q(
      "extension",
      "How are extension or backdating requests submitted for a clinician’s decision?",
      ["Use the same request pathway as a new fit note", advice, localProcess],
    ),
    q("fitNoteChase", "What should reception do when a patient chases a fit note request?", [
      "Check the request’s progress and explain any update to the patient",
      advice,
      localProcess,
    ]),
  ],
  "home-visits": [
    q("intake", "Where should reception document a home visit request?", [
      "Clinical system task",
      "Home visit request list in the clinical system",
      localProcess,
    ]),
    contact("review", "Who reviews home visit requests?"),
    q("late", "How should reception handle a home visit request later in the day?", [
      "Use the same process as other home visit requests",
      advice,
      localProcess,
    ]),
    methods("visitDetails", "Which details should reception collect for a home visit request?", [
      "Patient identifiers",
      "Current location and access information",
      "Callback number",
      "Caller’s description of the reason for the request",
    ]),
    q(
      "visitUpdate",
      "How should reception pass on new information about a pending home visit request?",
      [advice, localProcess],
    ),
  ],
  difficult: [
    contact("support", "Who supports reception with an unresolved difficult call?"),
    q(
      "complaint",
      "How can a caller make a complaint?",
      [
        "Write to the practice",
        "Submit a complaint through the practice website",
        "Make a verbal complaint for staff to document",
        localProcess,
      ],
      (p) => p.localComplaints,
    ),
    q("record", "Where should staff document a difficult-call incident?", [
      "Practice incident reporting system",
      "Patient’s clinical record",
      localProcess,
    ]),
    q(
      "phrasing",
      "How should staff acknowledge a caller’s frustration?",
      ["Acknowledge the concern and explain what can happen next", localProcess],
      (p) => p.rolePolicies.phrasesUse,
    ),
    q("unresolved", "How should an unresolved non-clinical concern be followed up?", [
      advice,
      localProcess,
    ]),
    methods(
      "incidentDetails",
      "Which details should staff include when reporting a difficult-call incident?",
      ["Date and time", "Caller’s own words where relevant", "Actions taken", "Person notified"],
    ),
  ],
  "first-week": [
    contact("buddy", "Who can the new starter go to for day-to-day support?"),
    q("supervision", "How is a new starter’s readiness to work independently checked?", [
      "A supervisor observes them handling requests and gives feedback",
      "A supervisor reviews their progress after shadowing",
      localProcess,
    ]),
    methods("shadowing", "Which activities should a new starter shadow?", [
      "Appointment requests",
      "Prescription requests",
      "Results enquiries",
      "Administrative handovers",
    ]),
    contact(
      "accessIssue",
      "Who should a new starter contact if they cannot access a required system?",
    ),
  ],
};
// Preserve previously configured optional questions without asking new managers to complete them.
topicFields["appointment-booking"].push(
  {
    ...q(
      "appointmentMode",
      "What is your process for changing an appointment between telephone and face-to-face?",
      [],
    ),
    legacyOnly: true,
    addLabel: "Add another process",
  },
  {
    ...q(
      "preferenceRoutes",
      "Which alternatives apply when a clinician preference cannot be met?",
      [],
    ),
    multiple: true,
    showWhen: (_p, settings) =>
      settings.answers.preference === "It depends on whether the request is routine or same-day",
    legacyOnly: true,
    addLabel: "Add another process",
  },
);
export const extraRuleLabels: Record<string, string> = {
  "appointment-booking": "booking",
  prescriptions: "prescription",
  urgent: "urgent handover",
  results: "test result",
  vaccines: "vaccination",
  "fit-notes": "fit note",
  "home-visits": "home visit",
  difficult: "difficult-call",
  "first-week": "induction",
};
for (const fields of Object.values(topicFields)) {
  for (const f of fields) {
    if (!f.addLabel) f.addLabel = "Add another person or role";
    if (["handover", "waitingList", "visitDetails", "incidentDetails"].includes(f.key))
      f.addLabel = "Add another detail";
    if (f.key === "shadowing") f.addLabel = "Add another activity";
  }
}
export const lengthOptions = [
  { key: "quick", label: "Quick", description: "~5 minutes · 5–7 scenarios", count: 6 },
  {
    key: "standard",
    label: "Standard — Recommended",
    description: "~10–15 minutes · 10–15 scenarios",
    count: 12,
  },
  {
    key: "thorough",
    label: "Thorough",
    description: "~20–25 minutes · 18–25 scenarios",
    count: 22,
  },
  {
    key: "custom",
    label: "Custom length",
    description: "Choose the number of scenarios",
    count: 12,
  },
] as const;
export const defaultModuleSettings = (): ModuleSettings => ({
  version: 1,
  answers: {},
  extra: "",
  length: "standard",
  count: 12,
});
export const EXCLUDE_QUESTION = "__exclude__";
export function selectedValues(f: TopicField, settings: ModuleSettings): string[] {
  const values = f.multiple
    ? (settings.selections?.[f.key] ?? [settings.answers[f.key] ?? ""])
    : [settings.answers[f.key] ?? ""];
  return [...new Set(values.filter(Boolean))];
}
export function selectAnswer(
  settings: ModuleSettings,
  f: TopicField,
  value: string,
  checked = true,
): ModuleSettings {
  if (!f.multiple) return { ...settings, answers: { ...settings.answers, [f.key]: value } };
  const previous = selectedValues(f, settings).filter((v) => v !== EXCLUDE_QUESTION && v !== value);
  const values =
    value === EXCLUDE_QUESTION
      ? checked
        ? [value]
        : []
      : checked
        ? [...previous, value]
        : previous;
  return {
    ...settings,
    answers: { ...settings.answers, [f.key]: "" },
    selections: { ...settings.selections, [f.key]: values },
  };
}
export function legacySelectedOptions(f: TopicField, settings: ModuleSettings): string[] {
  const topic = Object.keys(topicFields).find((t) => topicFields[t].includes(f));
  const previous = topic ? (legacyModuleOptions[topic]?.[f.key] ?? []) : [];
  return selectedValues(f, settings).filter(
    (value) => previous.includes(value) && !f.options.includes(value),
  );
}
export function questionOptions(f: TopicField, p: PracticeData, settings: ModuleSettings) {
  return [
    ...optionsForField(f, p).map((value) => ({ value, label: answerText(value, p) })),
    ...legacySelectedOptions(f, settings).map((value) => ({ value, label: value })),
    ...(settings.customOptions?.[f.key] ?? [])
      .filter((o) => o.id.startsWith("custom:") && o.label.trim())
      .map((o) => ({ value: o.id, label: o.label.trim() })),
  ];
}
export function configuredContacts(p: PracticeData): string[] {
  return [
    ...new Set([
      ...p.staff.filter((s) => s.name.trim()).map((s) => `staff:${s.id}`),
      ...Object.values(p.roleRequests ?? {})
        .filter((r) => r.confirmed && !r.archived)
        .map((r) => `role:${r.roleId}`),
    ]),
  ];
}
export function questionNeedsDetails(
  f: TopicField,
  settings: ModuleSettings,
  p: PracticeData,
): boolean {
  return selectedValues(f, settings).some((value) => {
    const kind = f.detailOptions?.[value],
      details = settings.answerDetails?.[f.key];
    return kind === "process"
      ? !details?.instruction?.trim()
      : kind === "contact"
        ? !configuredContacts(p).includes(details?.contact ?? "")
        : false;
  });
}
export function fieldsForTopic(
  topic: string,
  p: PracticeData,
  settings: ModuleSettings = defaultModuleSettings(),
) {
  const summary = practiceSummary(p);
  return (topicFields[topic] ?? []).filter(
    (f) =>
      (!f.legacyOnly || selectedValues(f, settings).some((v) => v !== EXCLUDE_QUESTION)) &&
      (!f.showWhen || f.showWhen(p, settings)) &&
      !f.known?.(summary)?.trim(),
  );
}
export function optionsForField(f: TopicField, p: PracticeData): string[] {
  if (f.legacyOnly) return [];
  return f.options.length
    ? f.options.filter(
        (o) =>
          o !== bookingRoute || !configMissing(p).booking.includes("Escalation contact and method"),
      )
    : configuredContacts(p);
}
export function answerText(value: string, p: PracticeData) {
  if (value === bookingRoute)
    return `Use the appointment escalation process: ${practiceSummary(p).dutyContact}`;
  if (value.startsWith("role:")) {
    const role = p.roleRequests?.[value.slice(5)];
    return role?.confirmed && !role.archived ? role.label : "";
  }
  if (!value.startsWith("staff:")) return value;
  const s = p.staff.find((s) => s.id === value.slice(6));
  return s ? `${s.name} — ${s.role}` : "";
}
interface Fact {
  condition?: string;
  label: string;
  rule: string;
  situation: string;
}
export function moduleFacts(topic: string, p: PracticeData, settings: ModuleSettings): Fact[] {
  const s = practiceSummary(p),
    facts: Fact[] = [];
  const add = (label: string, rule: string | undefined, situation: string, condition?: string) => {
    if (rule?.trim()) facts.push({ label, rule: rule.trim(), situation, condition });
  };
  const sameDayProcess = p.bookingConfig
    ? [
        choiceText(p.bookingConfig.sameDayProcess, sameDayProcesses),
        p.bookingConfig.sameDayInstruction,
      ]
        .filter(Boolean)
        .join("\n")
    : s.rolePolicies.gpsSameDay;
  const booking = ["appointment-booking", "first-week"].includes(topic);
  if (booking) {
    const methodLabels: Record<string, string> = {
      phone: "Telephone",
      online: "Practice website / online form",
      "nhs-app": "NHS App",
      reception: "At reception",
      other: p.bookingConfig?.otherRequestMethod ?? "",
    };
    add(
      "Appointment request methods",
      p.bookingConfig?.requestMethods
        ?.map((id) => methodLabels[id])
        .filter(Boolean)
        .join("; "),
      "A patient asks how to submit an appointment request. Which methods are recorded by the practice?",
    );
    add(
      "Same-day booking",
      sameDayProcess,
      "A patient asks for an appointment today. What booking process applies?",
    );
    add(
      "Routine booking",
      s.rolePolicies.gpsRoutine,
      "A patient wants a planned routine appointment. What happens next?",
    );
    add(
      "Missed appointments",
      s.localDNA,
      "A patient calls after missing an appointment. How should reception respond?",
    );
    add(
      "Interpreter support",
      s.localInterpreter,
      "A patient needs an interpreter for their appointment. What is the local process?",
    );
  }
  if (["prescriptions", "first-week"].includes(topic)) {
    add(
      "Repeat requests",
      s.prescriptionOrdering || s.repeatOrderMethods,
      "A patient needs to order their next repeat prescription. How should they submit it?",
    );
    if (!configMissing(p).prescription.includes("Prescription turnaround"))
      add(
        "Prescription turnaround",
        p.prescriptionConfig
          ? s.repeatTurnaround
              .split("\n")
              .filter(
                (line) =>
                  !line.includes("Not yet confirmed") &&
                  !/^Weekends:\s*$|^Bank holidays:\s*$/.test(line),
              )
              .join("\n")
          : s.repeatTurnaround,
        "A patient is checking when their prescription request will be ready. What information can reception give?",
      );
    if (!configMissing(p).prescription.some((x) => x.startsWith("Urgent")))
      add(
        "Urgent prescription request",
        s.repeatEmergency,
        "A patient says they have run out of medication. Which recorded process applies?",
      );
    add(
      "Controlled medication requests",
      s.repeatControlled,
      "A patient requests their controlled medication. Which local procedure applies?",
    );
    add(
      "Medication monitoring",
      s.repeatHighRisk,
      "A medication request requires monitoring. What is the recorded process?",
    );
    add(
      "Nominated pharmacy",
      s.nominatedPharmacy,
      "A patient asks about the practice’s recorded pharmacy information. What can you tell them?",
    );
  }
  if (
    ["urgent", "first-week", "difficult"].includes(topic) &&
    (!p.safeguardingRoute || !safeguardingMissing(p).length)
  )
    add(
      "Safeguarding contact",
      s.localSafeguarding,
      "A safeguarding concern has been identified. How should reception raise it locally?",
    );
  if (["results", "first-week", "difficult", "fit-notes"].includes(topic))
    add(
      "Confidentiality",
      s.localConfidentiality,
      "Someone requests information on behalf of another patient. Which local confidentiality procedure applies?",
    );
  if (["urgent", "first-week", "home-visits", "appointment-booking"].includes(topic))
    add(
      "Outside opening hours",
      s.outOfHoursTimes,
      "A caller asks how to access help outside practice opening hours. What is the recorded arrangement?",
    );
  if (topic === "urgent") {
    add(
      "Urgent contact information",
      s.urgentNumbers,
      "A colleague asks where to find the practice’s recorded urgent contact information. Which entry is recorded?",
    );
  }
  if (["urgent", "appointment-booking", "first-week"].includes(topic)) {
    const b = p.bookingConfig;
    const conditions = b
      ? [
          ...b.sameDayPathway.selected.map(
            (id) => sameDayGroups.flatMap((g) => g.options).find((o) => o.id === id)?.label ?? "",
          ),
          ...b.sameDayPathway.custom,
        ]
      : p.sameDayReasons;
    const process = sameDayProcess;
    for (const condition of conditions.filter(Boolean)) {
      if (explicitRules(condition).length) add("Same-day request", condition, "");
      else if (process && !/depends/i.test(process))
        add(`Same-day request: ${condition}`, process, "", condition);
    }
    if (b?.sameDayPathway.instruction && explicitRules(b.sameDayPathway.instruction).length)
      add(
        "Same-day request",
        b.sameDayPathway.instruction,
        "A caller needs help today. What would you do next?",
      );
  }
  if (topic === "first-week") {
    add(
      "Opening hours",
      s.hours,
      "A patient wants to plan a visit to reception. When is the practice open?",
    );
    add(
      "Practice address",
      s.address,
      "A patient asks where to attend. What is the practice address?",
    );
  }
  if (topic === "difficult") {
    add(
      "Complaints",
      s.localComplaints,
      "A caller wants to make a complaint. What process applies?",
    );
    add(
      "Supportive language",
      s.rolePolicies.phrasesUse,
      "A caller is frustrated. Which recorded wording should reception use?",
    );
    add(
      "Promises to avoid",
      s.rolePolicies.neverPromise,
      "A caller asks for a guarantee. What does the practice say reception must not promise?",
    );
  }
  if (
    ["urgent", "appointment-booking", "vaccines", "home-visits", "results", "first-week"].includes(
      topic,
    ) &&
    !configMissing(p).booking.includes("Escalation contact and method")
  )
    add(
      "Appointment escalation",
      s.dutyContact,
      "A request needs the recorded appointment escalation route. Who should reception contact and how?",
    );
  for (const f of topicFields[topic] ?? []) {
    if (f.showWhen && !f.showWhen(p, settings)) continue;
    if (f.legacyOnly && !selectedValues(f, settings).some((v) => v !== EXCLUDE_QUESTION)) continue;
    const known = f.key === "sameDay" ? sameDayProcess : f.known?.(s);
    const selected = selectedValues(f, settings);
    const options = questionOptions(f, p, settings);
    // Exclusion wins over malformed multi-select combinations. Saved setup stays authoritative.
    const choices = selected.includes(EXCLUDE_QUESTION)
      ? []
      : selected.flatMap((value) => {
          const option = options.find((o) => o.value === value);
          if (!option) return [];
          const kind = f.detailOptions?.[value],
            details = settings.answerDetails?.[f.key];
          if (kind === "process")
            return details?.instruction?.trim() ? [details.instruction.trim()] : [];
          if (kind === "contact") {
            if (!configuredContacts(p).includes(details?.contact ?? "")) return [];
            return [
              `Ask ${answerText(details!.contact!, p)} for advice${details?.instruction?.trim() ? `. ${details.instruction.trim()}` : ""}`,
            ];
          }
          return [option.label];
        });
    const rule = known || choices.join("; ");
    // A conditional branch alone is not an actionable local process.
    if (
      rule === "It depends on the request" ||
      rule === "It depends on whether the request is routine or same-day"
    )
      continue;
    const situations: Record<string, Record<string, string>> = {
      "appointment-booking": {
        unavailable:
          "The appropriate appointment is not available. The patient asks what can happen next.",
        uncertain: "You cannot confidently match the patient’s request to an appointment type.",
      },
      prescriptions: {
        acute: "A patient wants a medication that is not on their repeat list.",
        queries: "A patient has a prescription query that needs the responsible team.",
        monitoring: "The patient’s record shows an overdue medication review.",
      },
      urgent: {
        backup:
          "The recorded urgent contact is unavailable and the handover still needs attention.",
        record: "You have handled an urgent request and need to record the handover.",
      },
      results: {
        release: "A patient asks reception to tell them their test result.",
        pending: "The result the patient is asking about has not yet been reviewed.",
        identity: "A caller asks you to share their test result. You need to check identity first.",
      },
      vaccines: {
        eligibility: "A patient asks to book a vaccine. You need to confirm permission to book.",
        unclear:
          "The vaccine booking instruction is unclear and the patient is waiting for an answer.",
      },
      "fit-notes": {
        request: "A patient asks how to submit a fit note request.",
        delivery: "A fit note has been issued and the patient asks how to receive it.",
        extension: "A patient asks for a fit note extension or a change to its dates.",
      },
      "home-visits": {
        intake: "A caller requests a home visit. You need to record the request.",
        review: "A home visit request is ready for review. Who is responsible?",
        late: "A home visit request arrives after the routine visiting round.",
      },
      difficult: {
        support: "A difficult call remains unresolved and reception needs support.",
        complaint: "An unhappy caller asks to make a complaint.",
        record: "After a difficult-call incident, you need to record what happened.",
        phrasing: "A caller is frustrated and wants you to acknowledge their concern.",
      },
      "first-week": {
        buddy: "You are a new starter and need help from your named buddy.",
        supervision: "A new starter wants to begin handling requests independently.",
      },
    };
    add(f.label, rule, f.situation ?? situations[topic]?.[f.key] ?? f.label);
  }
  add(
    "Local exception",
    settings.extra,
    `A colleague asks about the additional local procedure for this topic. Which instruction has the manager recorded?`,
  );
  return facts.filter(
    (f, i) =>
      facts.findIndex(
        (other) =>
          other.rule === f.rule &&
          other.situation === f.situation &&
          other.condition === f.condition,
      ) === i,
  );
}
const relevantRequest = (topic: string, label: string) => {
  if (["appointment-booking", "first-week"].includes(topic)) return true;
  const patterns: Record<string, RegExp> = {
    prescriptions: /prescri|medication/i,
    results: /result/i,
    vaccines: /vaccin|immunis|flu|covid|shingles/i,
    "fit-notes": /fit note/i,
    "home-visits": /home visit/i,
  };
  return patterns[topic]?.test(label) ?? false;
};
export function configuredScenarios(
  topic: string,
  title: string,
  p: PracticeData,
  settings: ModuleSettings,
): Scenario[] {
  if (
    topic === "appointment-booking" &&
    settings.trainingLevel &&
    !["learn", "apply"].includes(settings.trainingLevel)
  )
    return [];
  const structuredActions =
    topic === "appointment-booking" && settings.trainingLevel
      ? configuredBookingActions(p, settings)
      : [];
  const make = (
    label: string,
    situation: string,
    answer: string,
    alternatives: string[],
    source: string,
    condition?: string,
    validActions: readonly string[] = [],
  ): Scenario => ({
    kind: "mcq",
    id: crypto.randomUUID(),
    title: label,
    patientQuote:
      topic === "appointment-booking" && settings.trainingLevel === "learn"
        ? condition
          ? neutralLearnSituation(condition)
          : label
        : naturalSituation(situation),
    question:
      topic === "appointment-booking" && settings.trainingLevel === "learn"
        ? "What should you do?"
        : scenarioQuestion(situation),
    options:
      topic === "appointment-booking" && settings.trainingLevel
        ? localAnswerOptions(
            answer,
            label,
            settings.trainingLevel,
            [...alternatives, ...applicationMistakes(situation)],
            // Only focused request->action facts compete with other configured booking actions.
            // Role responsibility questions are not appointment-authorisation questions.
            condition && /^(Arrange|Book|Send|Contact|Use|Ask)\b/i.test(answer)
              ? structuredActions.filter(
                  (action) =>
                    !validActions.some(
                      (valid) => bookingActionKey(valid) === bookingActionKey(action),
                    ),
                )
              : [],
          )
        : [
            answer,
            ...[...new Set([...alternatives, ...applicationMistakes(situation)])].filter(
              (value) => value.trim().toLowerCase() !== answer.trim().toLowerCase(),
            ),
          ].slice(0, 4),
    correctIndex: 0,
    learningPoint: source,
    status: "draft",
  });
  const fieldLabels = new Set((topicFields[topic] ?? []).map((f) => f.label));
  const facts = moduleFacts(topic, p, settings).sort(
    (a, b) =>
      Number(fieldLabels.has(b.label) || b.label === "Local exception") -
      Number(fieldLabels.has(a.label) || a.label === "Local exception"),
  );
  const factual = facts.flatMap((f) =>
    applications(f)
      .filter(
        (application) =>
          topic !== "appointment-booking" ||
          settings.trainingLevel !== "apply" ||
          !!application.followUpSituation ||
          application.rule !== f.rule,
      )
      .map((application) => ({
        ...make(
          application.label,
          application.situation,
          application.rule,
          application.alternatives ?? applicationMistakes(application.situation),
          application.feedback,
          application.condition ?? f.condition,
          application.validActions,
        ),
        followUpSituation: application.followUpSituation,
      })),
  );
  const requests = new Map<string, string>();
  for (const role of Object.values(p.roleRequests ?? {}))
    for (const r of selectedRequests(role))
      if (relevantRequest(topic, r.label)) requests.set(r.id, r.label);
  for (const person of p.staff)
    for (const r of effectiveRequestsForStaff(p, person.id))
      if (relevantRequest(topic, r.label)) requests.set(r.id, r.label);
  const routing: Scenario[] = [];
  for (const [id, label] of requests) {
    if (topic === "appointment-booking" && broadRequestLabel(label)) continue;
    const staff = staffForRequest(p, id),
      eligible = staff.filter((s) => s.canHandle);
    const roles = Object.values(p.roleRequests ?? {}).filter((role) =>
      selectedRequests(role).some((r) => r.id === id),
    );
    if (!eligible.length && !roles.length) continue;
    const names =
      topic === "appointment-booking" && settings.trainingLevel && roles.length
        ? roleList(roles.map((role) => role.label))
        : eligible.length
          ? eligible.map((s) => `${s.employee.name} (${s.role})`).join("; ")
          : roles.map((role) => role.label).join("; ");
    const roleQuestion = make(
      `Routing: ${label}`,
      topic === "appointment-booking" && settings.trainingLevel === "apply"
        ? `A patient asks about ${label.toLowerCase()} and wants to see whoever has the first free appointment. Before considering availability, you need to establish which configured role handles this request.`
        : `A patient needs help with ${label.toLowerCase()}. Who can handle this request?`,
      `Approach ${names}`,
      [
        ...(topic === "appointment-booking" && settings.trainingLevel === "apply"
          ? staff
              .filter((s) => !s.canHandle && s.individualException)
              .map((s) => `Approach ${s.employee.name} (${s.role})`)
          : []),
        ...(topic === "appointment-booking" && settings.trainingLevel === "apply"
          ? [
              "Start with the patient’s preferred role and check its responsibilities afterwards.",
              "Use the role that handled their last request before checking this request’s requirements.",
              "Find the first available appointment before checking which role handles this request.",
            ]
          : [
              "Use the clinician the patient saw last time, assuming they cover this request too.",
              "Treat the patient’s preferred clinician as confirmation they can handle the request.",
              "Choose by earliest availability before matching the request to a clinician’s responsibilities.",
            ]),
      ],
      `${names} can handle ${label.toLowerCase()} at this practice. Responsibility alone does not authorise a booking.`,
    );
    if (topic === "appointment-booking" && roleQuestion.kind === "mcq") {
      roleQuestion.localRoleRequestId = id;
      roleQuestion.title = roleRequestSituation(label).replace(/\.$/, "");
      if (!roles.length) continue; // A role-recognition exercise cannot invent a workflow for employee-only data.
      const apply = settings.trainingLevel === "apply";
      roleQuestion.patientQuote = apply
        ? `${roleRequestSituation(label)} The patient asks whether only one type of clinician can help with this request.`
        : roleRequestSituation(label);
      roleQuestion.question = apply
        ? "Which role or roles could you explain can help? Check the booking process before arranging an appointment."
        : "Who at your practice can help with this?";
      roleQuestion.options = roleAnswerChoices(p, id, label, roles);
      roleQuestion.correctIndex = 0;
      roleQuestion.learningPoint = `${roleList(roles.map((r) => r.label))} can handle this request. This identifies eligible roles; follow the practice’s booking process and any individual exceptions before arranging an appointment.`;
    }
    routing.push(roleQuestion);
    for (const exception of staff.filter((s) => s.individualException))
      routing.push(
        make(
          `Individual exception: ${exception.employee.name} · ${label}`,
          `A colleague suggests ${exception.employee.name} for ${label.toLowerCase()} based on their role title. Can they handle this request?`,
          exception.canHandle
            ? "This request is included for this employee."
            : "This request is excluded for this employee.",
          [
            exception.canHandle
              ? "This request is excluded for this employee."
              : "This request is included for this employee.",
            "Ignore the individual exception and use only the role title.",
            "Assume availability changes the employee’s responsibilities.",
          ],
          `${exception.employee.name} ${exception.canHandle ? "can" : "does not"} handle ${label.toLowerCase()} at this practice. Individual responsibilities take precedence over the shared role.`,
        ),
      );
  }
  // Interleave process and routing coverage; never pad by paraphrasing the same question.
  const pool: Scenario[] =
    topic === "appointment-booking" ? structuredBookingExercises(p, settings) : [];
  for (let i = 0; i < Math.max(factual.length, routing.length); i++) {
    const apply = topic === "appointment-booking" && settings.trainingLevel === "apply";
    if (apply && routing[i]) pool.push(routing[i]);
    if (factual[i]) pool.push(factual[i]);
    if (!apply && routing[i]) pool.push(routing[i]);
  }
  const distinct = pool.filter(
    (scenario, index) =>
      pool.findIndex(
        (other) =>
          other.kind !== "matching" &&
          scenario.kind !== "matching" &&
          other.patientQuote === scenario.patientQuote &&
          other.kind === "mcq" &&
          scenario.kind === "mcq" &&
          other.options[other.correctIndex] === scenario.options[scenario.correctIndex],
      ) === index,
  );
  if (topic === "appointment-booking" && settings.trainingLevel === "apply") {
    const recognition = new Set(
      configuredScenarios(topic, title, p, { ...settings, trainingLevel: "learn" })
        .filter((s) => s.kind === "mcq")
        .map(exerciseSignature),
    );
    return distinct.filter((s) => s.kind !== "mcq" || !recognition.has(exerciseSignature(s)));
  }
  return distinct;
}
export function configuredFollowUp(s: Scenario): Scenario | undefined {
  if (s.kind !== "mcq" || !s.followUpSituation) return undefined;
  return {
    ...s,
    id: crypto.randomUUID(),
    followUpFor: s.id,
    title: `${s.title} — follow-up`,
    patientQuote: s.followUpSituation,
    followUpSituation: undefined,
    status: "draft",
  };
}
/** Preview and generation share this finite selection; no source can pad the total. */
export function selectedModuleScenarios(
  topic: string,
  title: string,
  p: PracticeData,
  settings: ModuleSettings,
): Scenario[] {
  if (
    topic === "appointment-booking" &&
    settings.trainingLevel &&
    !["learn", "apply"].includes(settings.trainingLevel)
  )
    return [];
  const count = Number.isInteger(settings.count) ? Math.min(100, Math.max(1, settings.count)) : 12;
  const local = configuredScenarios(topic, title, p, settings);
  if (topic !== "appointment-booking") return local.slice(0, count);
  const core = appointmentCorePool({ topicKey: topic, practice: p, settings });
  const selectedCore = core.slice(0, Math.round(count * 0.3));
  const selectedLocal = local.slice(0, count - selectedCore.length);
  // Prefer a procedure for a request already selected for a weaker role-only question.
  // A confirmed procedure must not lose its slot to role recognition or matching.
  const candidates = inspectLocalProcedureSequences(p).candidates;
  const sequence =
    candidates.find((candidate) =>
      selectedLocal.some(
        (s) =>
          s.kind === "mcq" &&
          s.localRoleRequestId === candidate.provenance.snapshot.localProcedure?.requestId,
      ),
    ) ?? candidates[0];
  const replaceWithProcedure = (scenario: Scenario) => {
    const requestId = sequence?.provenance.snapshot.localProcedure?.requestId;
    const sameRequest = selectedLocal.findIndex(
      (s) => s.kind === "mcq" && s.localRoleRequestId === requestId,
    );
    const index =
      sameRequest >= 0 ? sameRequest : selectedLocal.findIndex((s, i) => i > 0 && s.kind === "mcq");
    if (index >= 0) selectedLocal.splice(index, 1, scenario);
  };
  if (settings.trainingLevel === "learn") {
    if (sequence && selectedLocal.length) {
      const requestId = sequence.provenance.snapshot.localProcedure?.requestId;
      const sameRequest = selectedLocal.findIndex(
        (s) => s.kind === "mcq" && s.localRoleRequestId === requestId,
      );
      // Even a single local slot teaches the saved procedure. Preserve the total/Core budget.
      selectedLocal.splice(sameRequest >= 0 ? sameRequest : selectedLocal.length - 1, 1, sequence);
    }
    if (selectedLocal.length >= 2) {
      const matching = roleMatchingScenario(p);
      const index = selectedLocal.findIndex((s, i) => i > 0 && s.kind === "mcq");
      const fallback = selectedLocal.findIndex((s) => s.kind === "mcq");
      if (matching && fallback >= 0)
        selectedLocal.splice(index >= 0 ? index : fallback, 1, matching);
    }
  }
  if (settings.trainingLevel === "apply" && selectedLocal.length >= 2 && sequence) {
    const application = localProcedureApplication(p, sequence);
    if (application) replaceWithProcedure(application);
  }
  // If local data is sparse, return a shorter module; do not turn it into a Core-only filler bank.
  const result: Scenario[] = [];
  let c = 0,
    l = 0;
  while (c < selectedCore.length || l < selectedLocal.length) {
    if (c < selectedCore.length) result.push(selectedCore[c++]);
    for (let i = 0; i < 2 && l < selectedLocal.length; i++) result.push(selectedLocal[l++]);
  }
  return result;
}

export function generateConfiguredModule(
  topic: string,
  title: string,
  p: PracticeData,
  settings: ModuleSettings,
): Scenario[] {
  return selectedModuleScenarios(topic, title, p, settings).flatMap((s, index) => {
    const offset = s.kind === "mcq" ? index % s.options.length : 0;
    const primary: Scenario =
      s.kind === "mcq"
        ? {
            ...s,
            options: [...s.options.slice(offset), ...s.options.slice(0, offset)],
            correctIndex: (s.correctIndex - offset + s.options.length) % s.options.length,
          }
        : s;
    // Appointment Booking's selected length is the total stored question count.
    // Existing recovery questions in saved modules and other topics are unchanged.
    const follow = topic === "appointment-booking" ? undefined : configuredFollowUp(primary);
    return follow ? [primary, follow] : [primary];
  });
}

export function reviseConfiguredScenario(module: Module, scenario: Scenario): Module {
  return {
    ...module,
    needsReview: module.published || module.needsReview,
    // An edit can change the underlying rule. Remove dependent recovery questions;
    // regenerating from configuration can safely produce a new pair.
    scenarios: module.scenarios
      .filter((current) => current.followUpFor !== scenario.id)
      .map((current): Scenario => {
        if (current.id !== scenario.id || current.kind !== scenario.kind) return current;
        if (current.kind === "mcq" && current.provenance?.kind === "sequence") {
          return {
            ...structuredClone(current),
            title: scenario.title,
            question: scenario.question,
            learningPoint: scenario.learningPoint,
            managerNote: scenario.managerNote,
            status: "draft",
            provenance: { ...structuredClone(current.provenance), managerModified: true },
          };
        }
        if (current.kind === "order" && current.sequence) {
          return {
            ...structuredClone(current),
            title: scenario.title,
            question: scenario.question,
            learningPoint: scenario.learningPoint,
            managerNote: scenario.managerNote,
            status: "draft",
            provenance: { ...structuredClone(current.provenance), managerModified: true },
          };
        }
        if (scenario.kind === "order" && scenario.sequence) return current;
        if (current.kind === "matching") {
          return {
            ...structuredClone(current),
            title: scenario.title,
            question: scenario.question,
            learningPoint: scenario.learningPoint,
            managerNote: scenario.managerNote,
            status: "draft",
            provenance: { ...structuredClone(current.provenance), managerModified: true },
          };
        }
        if (scenario.kind === "matching") return current;
        return {
          ...scenario,
          status: "draft",
          ...(current.provenance?.kind === "core"
            ? { provenance: { ...structuredClone(current.provenance), managerModified: true } }
            : {}),
          ...(scenario.kind === "mcq" ? { followUpSituation: undefined } : {}),
        };
      }),
  };
}

export function regenerateConfiguredScenario(
  module: Module,
  scenarioId: string,
  practice: PracticeData,
): Module {
  const current = module.scenarios.find((s) => s.id === scenarioId);
  // Procedure-based exercises keep their immutable source; new modules use updated knowledge.
  if (current?.provenance?.kind === "sequence") return module;
  if (!module.settings) return module;
  if (!current) return module;
  if (current.kind === "matching") {
    // Re-presentation uses the original evidence; live setup cannot rewrite this question.
    return {
      ...module,
      needsReview: module.published || module.needsReview,
      scenarios: module.scenarios.map((s) =>
        s.id === scenarioId
          ? {
              ...structuredClone(current),
              items: [...current.items.slice(1), current.items[0]],
              status: "draft" as const,
            }
          : s,
      ),
    };
  }
  if (current.provenance) {
    if (current.kind !== "mcq") return module;
    const replacement = regenerateAppointmentCore(
      current,
      module.scenarios.filter((s) => s.kind !== "matching"),
      {
        topicKey: module.topicKey,
        practice,
        settings: module.settings,
      },
    );
    if (!replacement) return module;
    return {
      ...module,
      needsReview: module.published || module.needsReview,
      scenarios: module.scenarios.map((s) => (s.id === scenarioId ? replacement : s)),
    };
  }
  if (current.followUpFor) {
    const primary = module.scenarios.find((s) => s.id === current.followUpFor);
    const follow = primary && configuredFollowUp(primary);
    return follow ? reviseConfiguredScenario(module, { ...follow, id: current.id }) : module;
  }
  const pool = configuredScenarios(module.topicKey, module.type, practice, module.settings);
  const primaryTitle = current.title;
  const used = new Set(
    module.scenarios.filter((s) => s.id !== scenarioId && !s.followUpFor).map((s) => s.title),
  );
  const pick =
    pool.find((s) => !used.has(s.title) && s.title !== current.title) ??
    pool.find((s) => s.title === primaryTitle);
  if (!pick) return module;
  const replacement: Scenario = { ...pick, id: current.id };
  const follow =
    module.topicKey === "appointment-booking" ? undefined : configuredFollowUp(replacement);
  return {
    ...module,
    needsReview: module.published || module.needsReview,
    scenarios: [
      ...module.scenarios
        .filter((s) => s.followUpFor !== scenarioId)
        .map((s) => (s.id === scenarioId ? replacement : s)),
      ...(follow ? [follow] : []),
    ],
  };
}
