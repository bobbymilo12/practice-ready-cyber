import {
  displayLabel,
  methodQuestion,
  conditionalMethodQuestions,
  responsibilityAction,
  unconditionalMethods,
} from "./question-quality.ts";
import {
  submissionChannel,
  requestSubject,
  configuredAnswer,
  readableList,
  roleDestination,
  hasFinishedCopy,
  contactRouteCopy,
  contactMethodCopy,
  contactChoicesCopy,
  urgentPrescriptionCopy,
} from "./training-copy.ts";
import { practiceQuestionPresentation } from "./module-presentation.ts";
import {
  inspectLocalProcedureSequences,
  localProcedureApplication,
} from "./local-procedure-sequences.ts";
import {
  roleRequestSituation,
  roleAnswerChoices,
  explicitSameDayBooking,
  roleList,
  broadRequestLabel,
} from "./role-question-presentation.ts";
import { roleMatchingScenario } from "./role-matching.ts";
import {
  structuredBookingExercises,
  localAnswerOptions,
  neutralLearnSituation,
  configuredBookingActions,
  exerciseSignature,
  bookingActionKey,
} from "./appointment-local-scenarios.ts";
import { appointmentCorePool, regenerateAppointmentCore } from "./core-appointment-selection.ts";
import { legacyModuleOptions } from "./module-config-legacy.ts";
import { applications, naturalSituation, explicitRules } from "./scenario-applications.ts";
import type { Module, PracticeData, Scenario } from "./store";
import type { MCQScenario } from "./training-types";
import {
  practiceSummary,
  prescriptionInstructions,
  prescriptionMethods,
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
  // Optional on legacy modules.
  trainingLevel?: "learn" | "apply";
  /** Legacy metadata only; ignored by generation. */
  difficulty?: import("./training-types").Difficulty;
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
export type PracticeTopicSettings = Pick<
  ModuleSettings,
  "answers" | "selections" | "customOptions" | "answerDetails" | "extra"
>;
export function effectiveTopicSettings(
  topic: string,
  p: PracticeData,
  settings: ModuleSettings,
): ModuleSettings {
  return topic !== "custom" && p.topicSettings?.[topic]
    ? { ...settings, ...p.topicSettings[topic] }
    : settings;
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
topicFields.custom = [
  {
    ...q("process", "What should staff do for the main task?", [localProcess]),
    addLabel: "Add a confirmed instruction",
    situation: "A colleague asks you to handle the task covered by this module.",
  },
  {
    ...q("exception", "What should staff do when the usual process cannot be followed?", [
      localProcess,
    ]),
    addLabel: "Add a confirmed instruction",
    situation: "The usual process for this task cannot be followed.",
  },
];
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
  custom: "custom process",
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
  { key: "quick", label: "Quick", description: "Short refresher", count: 6 },
  {
    key: "standard",
    label: "Standard — Recommended",
    description: "Balanced training",
    count: 12,
  },
  {
    key: "thorough",
    label: "Thorough",
    description: "Most comprehensive",
    count: 22,
  },
  {
    key: "custom",
    label: "Custom",
    description: "Choose your target length",
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
      !(topic === "prescriptions" && f.key === "queries") &&
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
  settings = effectiveTopicSettings(topic, p, settings);
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
      p.prescriptionConfig
        ? [
            (() => {
              return p
                .prescriptionConfig!.methods.map((id) =>
                  id === "other"
                    ? p.prescriptionConfig!.otherMethod
                    : (prescriptionMethods.find((m) => m.id === id)?.label ?? ""),
                )
                .filter(Boolean)
                .join("; ");
            })(),
            ...prescriptionInstructions(p.prescriptionConfig),
          ]
            .filter(Boolean)
            .join("; ")
        : s.prescriptionOrdering || s.repeatOrderMethods,
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
        "A patient asks how long prescription requests usually take to be processed. What should you tell them?",
      );
    if (!configMissing(p).prescription.some((x) => x.startsWith("Urgent")))
      add(
        "Urgent prescription request",
        urgentPrescriptionCopy(p),
        "Once a prescription request has been identified as urgent, who should reception contact and how?",
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
      p.safeguardingRoute
        ? contactRouteCopy(
            {
              ...p.safeguardingRoute,
              ...(p.safeguardingRoute.leadIds
                ? {
                    contact: {
                      kind: "multiple",
                      contacts: p.safeguardingRoute.leadIds.map((staffId) => ({
                        kind: "staff",
                        staffId,
                      })),
                    } as const,
                  }
                : {}),
            },
            p,
          )
        : s.localSafeguarding,
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
      p.bookingConfig ? contactRouteCopy(p.bookingConfig.escalation, p) : s.dutyContact,
      "A request needs the recorded appointment escalation route. Who should reception contact and how?",
    );
  for (const f of topicFields[topic] ?? []) {
    if (f.showWhen && !f.showWhen(p, settings)) continue;
    if (f.legacyOnly && !selectedValues(f, settings).some((v) => v !== EXCLUDE_QUESTION)) continue;
    // Role-derived query coverage is generated below. Keep explicit legacy contacts,
    // but never manufacture a second foundational question from arbitrary staff names.
    if (topic === "prescriptions" && f.key === "queries" && !selectedValues(f, settings).length)
      continue;
    const known =
      f.key === "sameDay"
        ? sameDayProcess
        : topic === "prescriptions" && f.key === "queries"
          ? ""
          : topic === "prescriptions" &&
              f.key === "urgentRequest" &&
              !configMissing(p).prescription.some((item) => item.startsWith("Urgent"))
            ? urgentPrescriptionCopy(p)
            : f.known?.(s);
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
            const contact = answerText(details!.contact!, p);
            return [
              `Ask ${details!.contact!.startsWith("role:") ? roleDestination(contact) : contact} for advice${details?.instruction?.trim() ? `. ${details.instruction.trim()}` : ""}`,
            ];
          }
          return [
            !f.options.length && value.startsWith("role:")
              ? roleDestination(option.label)
              : option.label,
          ];
        });
    const selectedRule = known || choices.join("; ");
    const rule =
      selectedRule && !f.options.length
        ? contactChoicesCopy(known ? known.split("; ").filter(Boolean) : choices)
        : selectedRule;
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
  settings = effectiveTopicSettings(topic, p, settings);
  if (settings.trainingLevel && !["learn", "apply"].includes(settings.trainingLevel)) return [];
  const make = (
    label: string,
    situation: string,
    answer: string,
    alternatives: string[],
    source: string,
    condition?: string,
    validActions: readonly string[] = [],
  ): MCQScenario => ({
    kind: "mcq",
    id: crypto.randomUUID(),
    correctIndex: 0,
    status: "draft",
    ...practiceQuestionPresentation(
      topic,
      label,
      situation,
      answer,
      settings,
      (() => {
        const field = (topicFields[topic] ?? []).find((f) => f.label === label);
        if (
          /^Contact .+ (?:by telephone|in person|through Microsoft Teams|through the clinical system)[^.]*\.$/.test(
            answer,
          )
        ) {
          const destination = answer.replace(
            / (?:by telephone|in person|through Microsoft Teams|through the clinical system)[^.]*\.$/,
            "",
          );
          return ["phone", "person", "teams", "system"]
            .filter((id) => !answer.startsWith(destination + " " + contactMethodCopy(id)))
            .map((id) => destination + " " + contactMethodCopy(id) + ".");
        }
        if (field && !field.options.length && /^Contact /.test(answer)) {
          // A named clinician and their role may identify the same destination.
          // Do not offer that role (or its members) as a supposedly incorrect alternative.
          const correctRoles = new Set(
            p.staff.filter((person) => answer.includes(person.name)).map((person) => person.role),
          );
          for (const role of Object.values(p.roleRequests ?? {}))
            if (answer.includes(role.label)) correctRoles.add(role.label);
          return configuredContacts(p)
            .filter((id) => {
              const role = id.startsWith("staff:")
                ? p.staff.find((person) => person.id === id.slice(6))?.role
                : p.roleRequests?.[id.slice(5)]?.label;
              return role && !correctRoles.has(role);
            })
            .map((id) => contactChoicesCopy([answerText(id, p)]))
            .filter((text) => text !== answer);
        }
        if (!field || !field.options.length)
          return condition || /^Individual exception:/.test(label) ? alternatives : [];
        const selected = selectedValues(field, settings);
        return field.options
          .filter(
            (option) =>
              !selected.includes(option) &&
              !field.detailOptions?.[option] &&
              option !== EXCLUDE_QUESTION &&
              !/^(other|not yet|it depends)/i.test(option),
          )
          .map((option) => configuredAnswer(label, option));
      })().filter(
        (option) =>
          !validActions.some((valid) => bookingActionKey(valid) === bookingActionKey(option)),
      ),
      condition ?? "",
    ),
    learningPoint: source,
    ...(topic === "appointment-booking" && condition && settings.trainingLevel
      ? {
          patientQuote:
            settings.trainingLevel === "learn"
              ? neutralLearnSituation(condition)
              : naturalSituation(situation),
          question:
            settings.trainingLevel === "learn" ? "What should you do?" : "What would you do next?",
          options: localAnswerOptions(
            answer,
            label,
            settings.trainingLevel,
            alternatives,
            configuredBookingActions(p, settings).filter(
              (action) =>
                !validActions.some((valid) => bookingActionKey(valid) === bookingActionKey(action)),
            ),
          ),
        }
      : {}),
  });
  const fieldLabels = new Set((topicFields[topic] ?? []).map((f) => f.label));
  const facts = moduleFacts(topic, p, settings).sort(
    (a, b) =>
      Number(fieldLabels.has(b.label) || b.label === "Local exception") -
      Number(fieldLabels.has(a.label) || a.label === "Local exception"),
  );
  const factual = facts.flatMap((f) => {
    const parts = f.rule.split(";").map((v) => v.trim());
    const methods = unconditionalMethods(
      parts.filter((v) => submissionChannel(v)),
      parts.filter((v) => !submissionChannel(v)).join(" "),
    );
    const multi = /request|submit|method/i.test(f.label)
      ? methodQuestion(
          f.label,
          methods,
          [
            "Telephone",
            "NHS App",
            "Practice website / online form",
            "Paper request at reception",
            "Nominated pharmacy",
          ],
          "",
        )
      : undefined;
    if (multi)
      multi.provenance = {
        kind: "configured_fact",
        paths: [],
        snapshot: { topic, label: f.label, rule: f.rule },
      };
    if (multi && p.prescriptionConfig && f.label === "Repeat requests")
      multi.provenance = {
        kind: "configured_fact",
        paths: ["practiceData.prescriptionConfig"],
        snapshot: structuredClone(p.prescriptionConfig),
      };
    const conditional = /request|submit|method/i.test(f.label)
      ? conditionalMethodQuestions(
          f.label,
          methods,
          parts.filter((v) => !submissionChannel(v)).join(" "),
          settings.trainingLevel,
        )
      : [];
    const provenance = multi?.provenance ??
      (["Repeat requests", "Urgent prescription request"].includes(f.label) && p.prescriptionConfig
        ? {
            kind: "configured_fact" as const,
            paths:
              f.label === "Urgent prescription request" &&
              p.prescriptionConfig.urgentRoute.source === "appointment"
                ? []
                : ["practiceData.prescriptionConfig"],
            snapshot: {
              prescriptionConfig: structuredClone(p.prescriptionConfig),
              ...(f.label === "Urgent prescription request" &&
              p.prescriptionConfig.urgentRoute.source === "appointment"
                ? { bookingConfig: structuredClone(p.bookingConfig) }
                : {}),
            },
          }
        : undefined) ?? {
        kind: "configured_fact" as const,
        paths: [],
        snapshot: { topic, label: f.label, rule: f.rule },
      };
    const methodSource = `methods:${requestSubject(f.label, f.situation)}`;
    if (multi)
      multi.generationObjective = {
        source: methodSource,
        skill: "knowledge",
        structure: "methods",
      };
    conditional.forEach((q) => {
      q.provenance = provenance;
      q.generationObjective = {
        source: methodSource,
        skill: settings.trainingLevel === "learn" ? "knowledge" : "application",
        structure: "conditional-methods",
      };
    });
    return [
      ...(multi ? [multi] : []),
      ...conditional,
      ...applications(f)
        .filter((a) => !multi || a.copyKind !== "allowed-channel")
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
            application.alternatives ?? [],
            application.feedback,
            application.condition ?? f.condition,
            application.validActions,
          ),
          ...(application.copyKind === "allowed-channel"
            ? {
                title: application.label,
                options: [
                  application.rule,
                  application.rule.replace(
                    /^Yes, this practice accepts/,
                    "No, this practice does not accept",
                  ),
                ],
                correctIndex: 0,
                question: "What should you tell them?",
                ...{
                  patientQuote: application.situation.replace(/ What should you tell them\?$/, ""),
                },
              }
            : {}),
          provenance,
          generationObjective: {
            source:
              application.copyKind === "allowed-channel"
                ? methodSource
                : `fact:${topic}:${f.label}:${application.condition ?? f.condition ?? ""}`,
            skill:
              application.condition || f.condition
                ? ("application" as const)
                : ("knowledge" as const),
            structure: application.copyKind === "allowed-channel" ? "methods" : "fact",
          },
          learningPoint: application.feedback,
          followUpSituation: application.followUpSituation,
        })),
    ];
  });
  const requests = new Map<string, string>();
  for (const role of Object.values(p.roleRequests ?? {}))
    for (const r of selectedRequests(role))
      if (relevantRequest(topic, r.label)) requests.set(r.id, r.label);
  for (const person of p.staff)
    for (const r of effectiveRequestsForStaff(p, person.id))
      if (relevantRequest(topic, r.label)) requests.set(r.id, r.label);
  const routing: Scenario[] = [];
  for (const [id, label] of requests) {
    if (broadRequestLabel(label)) continue;
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
        ? `A patient asks about ${label.toLowerCase()} and wants to see whoever has the first free appointment. Before considering availability, you need to establish who can handle this request.`
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
      roleQuestion.patientQuote = roleRequestSituation(label).replace(
        "contacts the practice about",
        "asks to book an appointment about",
      );
      roleQuestion.question = "Who should you book the patient an appointment with?";
      roleQuestion.options = roleAnswerChoices(
        p,
        id,
        label,
        roles,
        settings.trainingLevel === "learn",
      );
      if (apply && explicitSameDayBooking(p, id, label)) {
        const choices = roleQuestion.options;
        const timed = (choice: string, timing: string) =>
          choice.replace(/ appointment/g, ` — ${timing} appointment`);
        roleQuestion.question = "Which appointment should you book?";
        roleQuestion.options = [
          timed(choices[0], "same-day"),
          timed(choices[0], "routine"),
          ...choices
            .slice(1, 2)
            .flatMap((choice) =>
              choice.includes(" appointment")
                ? [timed(choice, "same-day"), timed(choice, "routine")]
                : [choice],
            ),
        ];
      }
      roleQuestion.correctIndex = 0;
      roleQuestion.learningPoint = `${roleList(roles.map((r) => r.label))} can handle this request. Check individual staff exceptions before choosing a clinician. Follow the practice’s booking process before arranging the appointment.`;
      if (apply && explicitSameDayBooking(p, id, label))
        roleQuestion.learningPoint +=
          " Your practice explicitly lists this request for same-day direct booking.";
    }
    if (topic !== "appointment-booking" && roleQuestion.kind === "mcq") {
      roleQuestion.localRoleRequestId = id;
      roleQuestion.title = label;
      roleQuestion.patientQuote =
        roleRequestSituation(label) +
        (settings.trainingLevel === "apply"
          ? " They ask for the person they saw last time. You need to check who handles this request."
          : "");
      const action = responsibilityAction(label);
      roleQuestion.patientQuote =
        action === "book"
          ? roleRequestSituation(label).replace(
              "contacts the practice about",
              "contacts the practice to arrange",
            )
          : roleRequestSituation(label);
      roleQuestion.question =
        action === "book"
          ? "Who should you book the patient an appointment with?"
          : "Who can help the patient with this request?";
      const response = (people: string[]) =>
        action === "book"
          ? "Book the patient an appointment with " + readableList(people, "disjunction") + "."
          : readableList(people, "disjunction").replace(/^a /, "A ").replace(/^the /, "The ") + ".";
      const foundational =
        roles.length > 0 &&
        (settings.trainingLevel === "learn" || !staff.some((person) => person.individualException));
      const destinations = foundational
        ? [
            ...roles.map((r) => roleDestination(r.label)),
            ...eligible
              .filter((s) => s.individualException)
              .map((s) => s.employee.name + " (" + s.role + ")"),
          ]
        : eligible.length
          ? eligible.map((s) => s.employee.name + " (" + s.role + ")")
          : roles.map((r) => roleDestination(r.label));
      const correct = response(destinations);
      const wrongPeople = (foundational ? [] : staff)
        .filter((s) => !s.canHandle)
        .map((s) => s.employee.name + " (" + s.role + ")");
      const wrongRoles =
        eligible.length && !foundational
          ? []
          : Object.values(p.roleRequests ?? {})
              .filter(
                (r) =>
                  r.confirmed && !r.archived && !roles.some((valid) => valid.roleId === r.roleId),
              )
              .map((r) => r.label);
      roleQuestion.options = [
        correct,
        ...[
          ...wrongPeople.map((name) => response([name])),
          ...wrongRoles.map((name) => response([roleDestination(name)])),
          ...(action === "knowledge"
            ? ["None of these roles handles this request."]
            : ["Do not book an appointment with any of these roles."]),
        ]
          .filter((text) => text !== correct)
          .slice(0, settings.trainingLevel === "learn" ? 2 : 3),
      ];
      roleQuestion.correctIndex = 0;
      roleQuestion.learningPoint =
        readableList(destinations, "disjunction").replace(/^a /, "A ").replace(/^the /, "The ") +
        " has responsibility for " +
        label.toLowerCase() +
        ". Check individual responsibilities before choosing a member of staff.";
    }
    routing.push(roleQuestion);
    for (const exception of staff.filter((s) => s.individualException))
      routing.push({
        ...make(
          `Individual exception: ${exception.employee.name} · ${label}`,
          `A colleague suggests ${exception.employee.name} for ${label.toLowerCase()} based on their role title. Can they handle this request?`,
          exception.canHandle
            ? "This request is included for this employee."
            : "This request is excluded for this employee.",
          [
            exception.canHandle
              ? "This request is excluded for this employee."
              : "This request is included for this employee.",
          ],
          `${exception.employee.name} ${exception.canHandle ? "can" : "does not"} handle ${label.toLowerCase()} at this practice. Individual responsibilities take precedence over the shared role.`,
        ),
        generationObjective: {
          source: `staff:${exception.employee.id}:${id}`,
          skill: "exception",
          structure: "staff-exception",
        },
      });
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
  const eligible = pool.filter(hasFinishedCopy);
  const distinct = eligible.filter(
    (scenario, index) =>
      eligible.findIndex(
        (other) =>
          other.kind !== "matching" &&
          scenario.kind !== "matching" &&
          other.patientQuote === scenario.patientQuote &&
          other.question === scenario.question &&
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
    // A named staff exception remains relevant in a patient/colleague decision even
    // when the same restriction is also taught in Learn.
    return distinct.filter(
      (s) =>
        s.kind !== "mcq" ||
        s.generationObjective?.skill === "exception" ||
        !recognition.has(exerciseSignature(s)),
    );
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
/** Teach a role's confirmed scope, rather than repeating a patient-to-role MCQ for each request. */
function roleCapabilityQuestions(
  topic: string,
  p: PracticeData,
  covered: Set<string>,
): MCQScenario[] {
  const roles = Object.values(p.roleRequests ?? {}).filter((r) => r.confirmed && !r.archived);
  const all = roles.flatMap((r) => r.categories.flatMap((c) => c.requests));
  const unambiguous = (id: string, label: string) =>
    !all.some((r) => (r.id === id && r.label !== label) || (r.id !== id && r.label === label));
  return roles.flatMap((role) => {
    const selected = new Set(selectedRequests(role).map((r) => r.id));
    const relevant = role.categories
      .flatMap((c) => c.requests)
      .filter(
        (r) =>
          relevantRequest(topic, r.label) &&
          !broadRequestLabel(r.label) &&
          !covered.has(r.id) &&
          unambiguous(r.id, r.label),
      );
    // Sample across the role's categories, rather than asking for its entire scope.
    // This limit is specific to foundational capabilities, not complete practice rules.
    const correct = role.categories
      .flatMap((category) =>
        category.requests
          .filter((r) => relevant.includes(r) && selected.has(r.id))
          .map((request, index) => ({ request, index })),
      )
      .sort((a, b) => a.index - b.index)
      .slice(0, 4)
      .map(({ request }) => request);
    const wrong = relevant.filter((r) => !selected.has(r.id));
    if (!correct.length || !wrong.length) return [];
    return [
      {
        id: crypto.randomUUID(),
        kind: "mcq" as const,
        title: `${role.label}: requests they can handle`,
        patientQuote: "",
        question: `Which of these requests can ${roleDestination(role.label)} handle at this practice?${correct.length > 1 ? " Select all that apply." : ""}`,
        options: [...correct.map((r) => r.label), ...wrong.slice(0, 2).map((r) => r.label)],
        correctIndex: 0,
        ...(correct.length > 1 ? { correctIndices: correct.map((_, i) => i) } : {}),
        learningPoint: `Among the requests shown, ${role.label} can handle ${readableList(
          correct.map((r) => r.label),
          "conjunction",
        )}. This is a selection of the role’s responsibilities. Check individual staff exceptions before choosing a member of staff.`,
        status: "draft" as const,
        generationObjective: {
          source: `role:${role.roleId}`,
          skill: "capability" as const,
          structure: "role-capabilities",
        },
        provenance: {
          kind: "configured_fact" as const,
          paths: ["practiceData.roleRequests"],
          snapshot: { label: `Role capabilities: ${role.roleId}`, role: structuredClone(role) },
        },
      },
    ];
  });
}

/** Group by recorded source/objective, then round-robin structures without discarding distinct requests. */
function diverseQuestions(pool: Scenario[]): Scenario[] {
  const chosen = new Map<string, Scenario>();
  for (const q of pool) {
    const origin = q.provenance;
    const key =
      origin?.kind === "core"
        ? `core:${origin.conceptId}`
        : origin?.kind === "sequence"
          ? `sequence:${origin.sourceId}`
          : q.kind === "matching"
            ? "role-matching"
            : q.kind === "mcq" && q.localRoleRequestId
              ? `request:${q.localRoleRequestId}`
              : q.kind === "mcq" && q.generationObjective
                ? q.generationObjective.source
                : `copy:${q.question}:${q.kind === "mcq" ? q.options[q.correctIndex] : q.title}`;
    const previous = chosen.get(key);
    // A qualifying method question covers both general permission and the explicit exception.
    if (
      !previous ||
      (q.kind === "mcq" &&
        q.generationObjective?.structure === "conditional-methods" &&
        !(
          previous.kind === "mcq" &&
          previous.generationObjective?.structure === "conditional-methods"
        ))
    )
      chosen.set(key, q);
  }
  const groups = new Map<string, Scenario[]>();
  for (const q of chosen.values()) {
    const structure =
      q.kind !== "mcq"
        ? q.kind
        : (q.generationObjective?.structure ??
          (q.localRoleRequestId ? "role-decisions" : q.question));
    groups.set(structure, [...(groups.get(structure) ?? []), q]);
  }
  const result: Scenario[] = [];
  while ([...groups.values()].some((group) => group.length))
    for (const group of groups.values()) if (group.length) result.push(group.shift()!);
  return result;
}

/** Preview and generation share this finite selection; no source can pad the total. */
export function selectedModuleScenarios(
  topic: string,
  title: string,
  p: PracticeData,
  settings: ModuleSettings,
): Scenario[] {
  settings = effectiveTopicSettings(topic, p, settings);
  if (settings.trainingLevel && !["learn", "apply"].includes(settings.trainingLevel)) return [];
  const count = Number.isInteger(settings.count) ? Math.min(100, Math.max(1, settings.count)) : 12;
  let local = configuredScenarios(topic, title, p, settings).filter(hasFinishedCopy);
  if (settings.trainingLevel === "learn") {
    const matching = ["appointment-booking", "first-week"].includes(topic)
      ? roleMatchingScenario(p)
      : undefined;
    const covered = new Set(matching?.items.map((item) => item.id) ?? []);
    const capabilities = roleCapabilityQuestions(topic, p, covered);
    const capabilityRoles = new Set(capabilities.map((q) => q.generationObjective!.source));
    for (const role of Object.values(p.roleRequests ?? {})) {
      if (capabilityRoles.has(`role:${role.roleId}`)) {
        for (const request of selectedRequests(role)) {
          if (relevantRequest(topic, request.label) && !broadRequestLabel(request.label))
            covered.add(request.id);
        }
      }
    }
    local = [
      ...(matching ? [matching] : []),
      ...capabilities,
      // Omitted capabilities do not become extra routing questions to fill the module.
      // Keep direct knowledge only when there is no safe capability exercise for the role.
      ...local.filter(
        (q) => q.kind !== "mcq" || !q.localRoleRequestId || !covered.has(q.localRoleRequestId),
      ),
    ];
  }
  if (settings.trainingLevel === "apply") {
    // Direct recall is not transformed into a story merely to fill an Apply module.
    local = local.filter((q) => q.kind === "mcq" && !!q.patientQuote.trim());
    if (topic === "appointment-booking") {
      const sequences = inspectLocalProcedureSequences(p).candidates;
      const requests = new Set(
        sequences.map((q) => q.provenance.snapshot.localProcedure?.requestId),
      );
      local = [
        ...sequences,
        ...local.filter((q) => q.kind !== "mcq" || !requests.has(q.localRoleRequestId)),
      ];
    }
  }
  local = diverseQuestions(local);
  if (topic !== "appointment-booking") return local.slice(0, count);
  const core = diverseQuestions(
    appointmentCorePool({ topicKey: topic, practice: p, settings }).filter(hasFinishedCopy),
  );
  // Local knowledge leads. Core complements it, rather than filling unsupported local slots.
  const coreBudget = Math.min(core.length, Math.round(count * 0.3));
  const selectedLocal = local.slice(
    0,
    Math.max(0, count - (local.length ? Math.min(coreBudget, count - 1) : coreBudget)),
  );
  const selectedCore = core.slice(
    0,
    Math.min(
      coreBudget,
      count - selectedLocal.length,
      local.length ? Math.max(1, selectedLocal.length) : coreBudget,
    ),
  );
  return [...selectedLocal, ...selectedCore];
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
            ...(s.correctIndices
              ? {
                  correctIndices: s.correctIndices.map(
                    (i) => (i - offset + s.options.length) % s.options.length,
                  ),
                }
              : {}),
          }
        : s;
    // Shared Learn/Apply lengths count all stored questions. Legacy settings retain follow-ups.
    const follow =
      topic === "appointment-booking" || settings.trainingLevel
        ? undefined
        : configuredFollowUp(primary);
    return (follow ? [primary, follow] : [primary]).map((q) =>
      q.provenance?.kind === "sequence" ? q : { ...q, title: displayLabel(q.title) },
    );
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
        if (scenario.kind === "mcq" && current.provenance?.kind === "configured_fact")
          return {
            ...scenario,
            status: "draft",
            provenance: { ...structuredClone(current.provenance), managerModified: true },
            followUpSituation: undefined,
          };
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
  if (current?.provenance?.kind === "sequence") {
    if (!module.needsReview) return module;
    const requestId = current.provenance.snapshot.localProcedure?.requestId;
    const source = inspectLocalProcedureSequences(practice).candidates.find(
      (s) => s.provenance.snapshot.localProcedure?.requestId === requestId,
    );
    if (!source)
      throw new Error(
        "No eligible confirmed procedure is available for this question. Review the procedure in Practice Setup, or delete this question.",
      );
    const replacement =
      current.kind === "mcq" ? localProcedureApplication(practice, source)! : source;
    return {
      ...module,
      scenarios: module.scenarios.map((s) =>
        s.id === scenarioId ? { ...replacement, id: scenarioId, status: "draft" } : s,
      ),
    };
  }
  if (!current) return module;
  if (current.kind === "matching") {
    if (module.needsReview) {
      const replacement = roleMatchingScenario(practice);
      if (!replacement)
        throw new Error(
          "Current role configuration cannot generate this matching question. Review Practice Setup, or delete this question.",
        );
      return {
        ...module,
        scenarios: module.scenarios.map((s) =>
          s.id === scenarioId ? { ...replacement, id: scenarioId, status: "draft" } : s,
        ),
      };
    }
    // Re-presentation uses the original evidence outside a practice-change review.
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
  if (!module.settings) return module;
  if (current.provenance?.kind === "core") {
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
    if (!replacement || !hasFinishedCopy(replacement)) return module;
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
  const pool = [
    ...configuredScenarios(module.topicKey, module.type, practice, module.settings),
    ...(module.settings.trainingLevel === "learn"
      ? roleCapabilityQuestions(
          module.topicKey,
          practice,
          new Set(
            module.scenarios.flatMap((q) =>
              q.kind === "matching" ? q.items.map((item) => item.id) : [],
            ),
          ),
        )
      : []),
  ].filter((s) => !module.settings?.trainingLevel || hasFinishedCopy(s));
  const primaryTitle = current.title;
  const used = new Set(
    module.scenarios.filter((s) => s.id !== scenarioId && !s.followUpFor).map((s) => s.title),
  );
  const sourceLabel = (s: Scenario): string | undefined => {
    if (s.provenance?.kind !== "configured_fact") return undefined;
    const snapshot = s.provenance.snapshot as { label?: unknown } | null;
    return typeof snapshot?.label === "string" ? snapshot.label : undefined;
  };
  const sameSource =
    current.provenance?.kind === "configured_fact"
      ? pool.filter(
          (s) =>
            s.provenance?.kind === "configured_fact" &&
            (sourceLabel(current)
              ? sourceLabel(s) === sourceLabel(current)
              : s.title.toLowerCase() === current.title.toLowerCase()),
        )
      : undefined;
  const pick = sameSource
    ? (sameSource.find(
        (s) =>
          s.title.toLowerCase() === current.title.toLowerCase() && s.question === current.question,
      ) ??
      sameSource.find((s) => s.title.toLowerCase() === current.title.toLowerCase()) ??
      sameSource[0])
    : (pool.find((s) => !used.has(s.title) && s.title !== current.title) ??
      pool.find((s) => s.title === primaryTitle));
  if (sameSource && !pick)
    throw new Error(
      "This question no longer has enough clear practice information to regenerate safely. Review Practice Setup or delete the question.",
    );
  if (!pick) return module;
  const replacement: Scenario = {
    ...pick,
    id: current.id,
  };
  const follow =
    module.topicKey === "appointment-booking" || module.settings.trainingLevel
      ? undefined
      : configuredFollowUp(replacement);
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
