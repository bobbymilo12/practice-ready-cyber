import {
  applications,
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

export interface ModuleSettings {
  version: 1;
  answers: Record<string, string>;
  // Optional additions keep existing version-1 modules compatible.
  selections?: Record<string, string[]>;
  customOptions?: Record<string, { id: string; label: string }[]>;
  extra: string;
  length: "quick" | "standard" | "thorough" | "custom";
  count: number;
}
export interface TopicField {
  key: string;
  label: string;
  options: string[];
  multiple?: boolean;
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
export const topicFields: Record<string, TopicField[]> = {
  "appointment-booking": [
    field(
      "sameDay",
      "How are appropriate same-day requests normally handled?",
      [
        "Reception books directly with an appropriate clinician",
        "Request goes through triage first",
        "It depends on the request",
      ],
      (p) => p.rolePolicies.gpsSameDay,
    ),
    {
      ...field(
        "sameDayRoutes",
        "Which possible routes are used for same-day requests?",
        [
          "Direct booking where the recorded request rules permit it",
          "Clinical triage before booking",
          "Request sent to the responsible team for a decision",
        ],
        (p) => p.bookingConfig?.sameDayInstruction ?? "",
      ),
      multiple: true,
      situation:
        "A colleague is learning the practice’s same-day process. Which possible routes are recorded? These choices do not decide which route applies to an individual patient.",
      showWhen: (p, settings) =>
        p.bookingConfig?.sameDayProcess.id === "depends" ||
        (!practiceSummary(p).rolePolicies.gpsSameDay.trim() &&
          settings.answers.sameDay === "It depends on the request"),
    },
    {
      ...field("preference", "What happens if a patient requests a particular GP or clinician?", [
        "Check that clinician’s recorded responsibilities and availability before offering an appointment",
        "Send the preference to the booking team for review",
        "It depends on whether the request is routine or same-day",
      ]),
      situation:
        "A patient asks specifically for their usual clinician. What is the recorded process?",
    },
    {
      ...field(
        "preferenceRoutes",
        "Which processes apply when the clinician preference cannot be met?",
        [
          "Discuss another clinician who is recorded as handling the request",
          "Ask the responsible team to review the request before making an offer",
        ],
      ),
      multiple: true,
      showWhen: (_p, settings) =>
        settings.answers.preference === "It depends on whether the request is routine or same-day",
      situation:
        "A patient’s clinician preference cannot be met. Which possible processes are recorded, subject to the request’s booking rules?",
    },
    field(
      "unavailable",
      "When the appropriate appointment is unavailable, what should reception do?",
      [
        "Refer to the saved appointment escalation route",
        "Send a request to the booking team for review",
      ],
    ),
    field(
      "uncertain",
      "When unsure which appointment to book, what should reception do?",
      ["Refer to the saved appointment escalation route"],
      (p) =>
        p.bookingConfig?.sendUncertainToDutyClinician
          ? "Send to duty clinician"
          : !configMissing(p).booking.includes("Escalation contact and method")
            ? p.dutyContact
            : "",
    ),
    {
      ...field(
        "appointmentMode",
        "How should reception handle a request to change between telephone and face-to-face?",
        [
          "Check the recorded booking instruction before changing the appointment mode",
          "Ask the responsible clinician or team to confirm the appointment mode",
        ],
      ),
      situation:
        "A patient asks to change an appointment from telephone to face-to-face. What should reception do?",
    },
    {
      ...field(
        "cancellation",
        "How should a cancelled appointment be handled?",
        [
          "Release the slot and offer rebooking under the saved booking process",
          "Send a rebooking request to the booking team",
        ],
        (p) => p.localDNA,
      ),
      situation:
        "A patient cancels and asks for a replacement appointment. What is the local process?",
    },
  ],
  prescriptions: [
    {
      ...field("acute", "How should a non-repeat prescription request be submitted?", channels),
      multiple: true,
    },
    contact("queries", "Who handles prescription queries?", (p) =>
      p.staff
        .filter((person) =>
          effectiveRequestsForStaff(p, person.id).some((r) => /prescription quer/i.test(r.label)),
        )
        .map((person) => `${person.name} — ${person.role}`)
        .join("; "),
    ),
    field(
      "monitoring",
      "What should reception do when a medication review is overdue?",
      ["Send the request for clinician review", "Use the recorded medication monitoring process"],
      (p) => p.repeatHighRisk,
    ),
    {
      ...field(
        "urgentRequest",
        "How should an urgent prescription request be handed over?",
        [
          "Refer to the saved appointment escalation route",
          "Send an urgent clinical-system request to the prescription team",
        ],
        (p) =>
          !configMissing(p).prescription.some((item) => item.startsWith("Urgent"))
            ? p.repeatEmergency
            : "",
      ),
      situation:
        "A patient says their prescription request is urgent. Which locally confirmed handover process applies?",
    },
    {
      ...field(
        "chasing",
        "What happens when a patient chases a prescription beyond the recorded turnaround?",
        [
          "Check the request status and send a query to the prescription team",
          "Ask the responsible clinician to review the outstanding request",
        ],
      ),
      situation:
        "A patient says their prescription is still outstanding after the recorded turnaround. What should reception do?",
    },
    {
      ...field(
        "pharmacyIssue",
        "What happens when a pharmacy cannot find an expected prescription?",
        [
          "Check the recorded prescription destination and status before referring the query",
          "Send the query to the prescription team for investigation",
        ],
      ),
      situation:
        "A patient says the pharmacy cannot find a prescription they expected. What is the recorded process?",
    },
  ],
  urgent: [
    contact(
      "backup",
      "Who should reception contact if the recorded urgent contact is unavailable?",
    ),
    field("record", "Where should the urgent handover be recorded?", [
      "Clinical system urgent task",
      "Practice urgent-call template",
    ]),
    {
      ...field("handover", "Which details should accompany an urgent handover?", [
        "Patient identifiers",
        "Callback number",
        "Caller’s own description of the concern",
        "Actions already taken and the time of the call",
      ]),
      multiple: true,
      situation:
        "You are handing over an urgent request. Which details does this practice require?",
    },
    {
      ...field(
        "acknowledgement",
        "How should reception check that an urgent handover has been received?",
        [
          "Seek acknowledgement from the receiving team",
          "Check the clinical-system task acknowledgement",
        ],
      ),
      situation: "An urgent request has been passed on. What is the recorded way to check receipt?",
    },
  ],
  results: [
    field("release", "When may reception pass on a result?", [
      "Only when marked as reviewed and authorised for reception to share",
      "All result enquiries go to the reviewing clinician",
    ]),
    field("pending", "How should an unreviewed result enquiry be handled?", [
      "Send a task to the reviewing clinician",
      "Refer to the saved appointment escalation route",
    ]),
    field(
      "identity",
      "Which identity details must be checked?",
      ["Full name and date of birth", "Full name, date of birth and address"],
      (p) => p.localConfidentiality,
    ),
    {
      ...field(
        "followup",
        "What should reception do when a reviewed result includes a follow-up instruction?",
        [
          "Arrange the follow-up exactly as recorded by the reviewing clinician",
          "Pass the instruction to the booking team to arrange",
        ],
      ),
      situation:
        "A reviewed result includes a follow-up instruction. What should reception do next?",
    },
    {
      ...field("notReceived", "What happens if an expected test result has not arrived?", [
        "Send a query to the results team",
        "Ask the requesting clinician to review the missing-result enquiry",
      ]),
      situation:
        "A patient asks for an expected result which is not yet in the record. What is the local process?",
    },
  ],
  vaccines: [
    field("eligibility", "How should reception confirm permission to book a vaccine?", [
      "Check the recorded clinician invitation",
      "Ask the vaccination team to confirm before booking",
    ]),
    field("unclear", "What happens if the vaccine booking instruction is unclear?", [
      "Refer to the saved appointment escalation route",
      "Send a query to the vaccination team",
    ]),
    {
      ...field(
        "clinicFull",
        "What happens when the authorised vaccine clinic has no available appointments?",
        [
          "Send the request to the vaccination team to arrange capacity",
          "Use the practice’s vaccination waiting list",
        ],
      ),
      situation:
        "A patient has authorisation to book but the specified vaccine clinic is full. What happens next?",
    },
    {
      ...field("waitingList", "Which details are recorded on the vaccination waiting list?", [
        "Patient identifiers",
        "Contact number",
        "Recorded vaccine invitation",
        "Patient availability",
      ]),
      multiple: true,
      showWhen: (_p, settings) =>
        settings.answers.clinicFull === "Use the practice’s vaccination waiting list",
      situation:
        "A patient is joining the vaccination waiting list. Which details should be recorded?",
    },
    {
      ...field(
        "vaccineAdvice",
        "How should reception handle a clinical question about a vaccine?",
        [
          "Send the question to the vaccination team",
          "Ask the clinician named in the booking instruction to respond",
        ],
      ),
      situation:
        "A patient asks reception whether a vaccine is suitable for them. Who should handle the question?",
    },
  ],
  "fit-notes": [
    { ...field("request", "How are fit note requests submitted?", channels), multiple: true },
    field("delivery", "How are issued fit notes provided?", [
      "Secure digital message",
      "Paper collection under the saved confidentiality procedure",
      "Patient chooses secure digital message or paper collection",
    ]),
    field("extension", "How are extension or backdating requests handled?", [
      "Send to the responsible clinician for a decision",
      "Use the same request pathway as a new fit note",
    ]),
    {
      ...field("fitNoteChase", "How should an outstanding fit note request be chased?", [
        "Check the request status and send a query to the responsible team",
        "Refer the enquiry to the clinician reviewing the request",
      ]),
      situation: "A patient chases a fit note decision. What should reception do?",
    },
  ],
  "home-visits": [
    field("intake", "Where should a home visit request be recorded?", [
      "Clinical system home visit task",
      "Practice home visit request template",
    ]),
    contact("review", "Who reviews home visit requests?"),
    field("late", "How are requests received after the routine visiting round handled?", [
      "Refer to the saved appointment escalation route",
      "Send to the home visit reviewer for a decision",
    ]),
    {
      ...field("visitDetails", "Which details should reception collect for a home visit request?", [
        "Patient identifiers",
        "Current location and access information",
        "Callback number",
        "Caller’s description of the reason for the request",
      ]),
      multiple: true,
      situation: "A caller requests a home visit. Which details are needed for the local handover?",
    },
    {
      ...field("visitUpdate", "How should a change to a pending home visit request be handled?", [
        "Send the update to the home visit reviewer",
        "Refer to the saved appointment escalation route",
      ]),
      situation:
        "A caller provides new information about a pending home visit request. What happens next?",
    },
  ],
  difficult: [
    contact("support", "Who supports reception with an unresolved difficult call?"),
    field(
      "complaint",
      "How should a caller wishing to complain proceed?",
      ["Send the complaint to the practice manager", "Provide the practice complaint form"],
      (p) => p.localComplaints,
    ),
    field("record", "Where are difficult-call incidents recorded?", [
      "Practice incident reporting system",
      "Clinical system incident template",
    ]),
    field(
      "phrasing",
      "Which approach should staff use to acknowledge frustration?",
      [
        "Acknowledge the concern and explain the next available step",
        "Offer to involve the named support contact",
      ],
      (p) => p.rolePolicies.phrasesUse,
    ),
    {
      ...field("unresolved", "How should an unresolved non-clinical concern be followed up?", [
        "Request a callback from the named support contact",
        "Pass a written handover to the practice manager",
      ]),
      situation:
        "A caller’s non-clinical concern remains unresolved. How should reception arrange follow-up?",
    },
    {
      ...field(
        "incidentDetails",
        "Which details are included in a difficult-call incident report?",
        [
          "Date and time",
          "Caller’s own words where relevant",
          "Actions taken",
          "Team member notified",
        ],
      ),
      multiple: true,
      situation:
        "You need to report a difficult-call incident. Which details does this practice require?",
    },
  ],
  "first-week": [
    contact("buddy", "Who is the new starter’s named buddy?"),
    field(
      "supervision",
      "What should happen before a new starter handles requests independently?",
      [
        "Buddy observes and confirms readiness",
        "Practice manager confirms readiness after shadowing",
      ],
    ),
    {
      ...field("shadowing", "Which activities should a new starter shadow?", [
        "Appointment requests",
        "Prescription requests",
        "Results enquiries",
        "Administrative handovers",
      ]),
      multiple: true,
      situation:
        "A new starter is planning their supervised induction. Which activities should they shadow?",
    },
    {
      ...field(
        "accessIssue",
        "What should a new starter do if they cannot access a required system?",
        [
          "Ask their named buddy to raise an access request",
          "Contact the practice’s system administrator",
        ],
      ),
      situation:
        "A new starter cannot access a system needed for their work. What is the local process?",
    },
  ],
};
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
export function questionOptions(f: TopicField, p: PracticeData, settings: ModuleSettings) {
  return [
    ...optionsForField(f, p).map((value) => ({ value, label: answerText(value, p) })),
    ...(settings.customOptions?.[f.key] ?? [])
      .filter((o) => o.id.startsWith("custom:") && o.label.trim())
      .map((o) => ({ value: o.id, label: o.label.trim() })),
  ];
}
export function fieldsForTopic(
  topic: string,
  p: PracticeData,
  settings: ModuleSettings = defaultModuleSettings(),
) {
  const summary = practiceSummary(p);
  return (topicFields[topic] ?? []).filter(
    (f) => (!f.showWhen || f.showWhen(p, settings)) && !f.known?.(summary)?.trim(),
  );
}
export function optionsForField(f: TopicField, p: PracticeData): string[] {
  return f.options.length
    ? f.options.filter(
        (o) =>
          !o.includes("saved appointment escalation") ||
          !configMissing(p).booking.includes("Escalation contact and method"),
      )
    : [
        ...new Set([
          ...p.staff.filter((s) => s.name.trim()).map((s) => `staff:${s.id}`),
          ...Object.values(p.roleRequests ?? {})
            .filter((r) => r.confirmed && !r.archived)
            .map((r) => `role:${r.roleId}`),
        ]),
      ];
}
export function answerText(value: string, p: PracticeData) {
  if (value.startsWith("role:")) return p.roleRequests?.[value.slice(5)]?.label ?? "";
  if (!value.startsWith("staff:")) return value;
  const s = p.staff.find((s) => s.id === value.slice(6));
  return s ? `${s.name} — ${s.role}` : "";
}
interface Fact {
  label: string;
  rule: string;
  situation: string;
}
export function moduleFacts(topic: string, p: PracticeData, settings: ModuleSettings): Fact[] {
  const s = practiceSummary(p),
    facts: Fact[] = [];
  const add = (label: string, rule: string | undefined, situation: string) => {
    if (rule?.trim()) facts.push({ label, rule: rule.trim(), situation });
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
        add(
          `Same-day request: ${condition}`,
          process,
          `A caller describes their concern as “${condition}”. What would you do next?`,
        );
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
    const known = f.key === "sameDay" ? sameDayProcess : f.known?.(s);
    const selected = selectedValues(f, settings);
    const options = questionOptions(f, p, settings);
    // Exclusion wins over malformed multi-select combinations. Saved setup stays authoritative.
    const choices = selected.includes(EXCLUDE_QUESTION)
      ? []
      : selected.flatMap((value) => {
          const option = options.find((o) => o.value === value);
          return option ? [option.label] : [];
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
      facts.findIndex((other) => other.rule === f.rule && other.situation === f.situation) === i,
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
  const make = (
    label: string,
    situation: string,
    answer: string,
    alternatives: string[],
    source: string,
  ): Scenario => ({
    kind: "mcq",
    id: crypto.randomUUID(),
    title: label,
    patientQuote: naturalSituation(situation),
    question: "What would you do next?",
    options: [
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
    applications(f).map((application) => ({
      ...make(
        application.label,
        application.situation,
        application.rule,
        applicationMistakes(application.situation),
        application.feedback,
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
    const staff = staffForRequest(p, id),
      eligible = staff.filter((s) => s.canHandle);
    const roles = Object.values(p.roleRequests ?? {}).filter((role) =>
      selectedRequests(role).some((r) => r.id === id),
    );
    if (!eligible.length && !roles.length) continue;
    const names = eligible.length
      ? eligible.map((s) => `${s.employee.name} (${s.role})`).join("; ")
      : roles.map((role) => role.label).join("; ");
    routing.push(
      make(
        `Routing: ${label}`,
        `A patient needs help with ${label.toLowerCase()}. Who can handle this request?`,
        `Approach ${names}`,
        [
          "Use the clinician the patient saw last time, assuming they cover this request too.",
          "Treat the patient’s preferred clinician as confirmation they can handle the request.",
          "Choose by earliest availability before matching the request to a clinician’s responsibilities.",
        ],
        `${names} can handle ${label.toLowerCase()} at this practice. Responsibility alone does not authorise a booking.`,
      ),
    );
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
  const pool: Scenario[] = [];
  for (let i = 0; i < Math.max(factual.length, routing.length); i++) {
    if (factual[i]) pool.push(factual[i]);
    if (routing[i]) pool.push(routing[i]);
  }
  return pool.filter(
    (scenario, index) =>
      pool.findIndex(
        (other) =>
          other.patientQuote === scenario.patientQuote &&
          other.kind === "mcq" &&
          scenario.kind === "mcq" &&
          other.options[other.correctIndex] === scenario.options[scenario.correctIndex],
      ) === index,
  );
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
export function generateConfiguredModule(
  topic: string,
  title: string,
  p: PracticeData,
  settings: ModuleSettings,
): Scenario[] {
  const count = Number.isInteger(settings.count) ? Math.min(100, Math.max(1, settings.count)) : 12;
  return configuredScenarios(topic, title, p, settings)
    .slice(0, count)
    .flatMap((s, index) => {
      const offset = s.kind === "mcq" ? index % s.options.length : 0;
      const primary: Scenario =
        s.kind === "mcq"
          ? {
              ...s,
              options: [...s.options.slice(offset), ...s.options.slice(0, offset)],
              correctIndex: (s.correctIndex - offset + s.options.length) % s.options.length,
            }
          : s;
      const follow = configuredFollowUp(primary);
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
      .map((current) =>
        current.id === scenario.id
          ? {
              ...scenario,
              status: "draft",
              ...(scenario.kind === "mcq" ? { followUpSituation: undefined } : {}),
            }
          : current,
      ),
  };
}

export function regenerateConfiguredScenario(
  module: Module,
  scenarioId: string,
  practice: PracticeData,
): Module {
  if (!module.settings) return module;
  const current = module.scenarios.find((s) => s.id === scenarioId);
  if (!current) return module;
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
  const follow = configuredFollowUp(replacement);
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
