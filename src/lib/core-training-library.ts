import { appointmentRecipe } from "./core-appointment-recipes.ts";
import type { CoreContentSource, CoreTrainingConcept } from "./core-training-types";

// Central editorial registry. Only explicitly approved concept versions enter production.
const careNavigationSource = {
  id: "nhse-care-navigation-v2",
  organisation: "NHS England",
  title: "How to improve care navigation in general practice",
  url: "https://www.england.nhs.uk/long-read/how-to-improve-care-navigation-in-general-practice-2/",
  version: "2",
  publishedOn: "2025-08-04",
  updatedOn: "2025-10-21",
  accessedOn: "2026-09-29",
  assessment: { status: "reference_only" },
} as const satisfies CoreContentSource;

const constraints = [
  {
    id: "no-inferred-urgency",
    description: "Do not infer clinical urgency, diagnosis or advice from a patient description.",
  },
  {
    id: "no-inferred-suitability",
    description:
      "Do not infer clinician suitability from a job title; local responsibilities and individual exceptions remain authoritative.",
  },
  {
    id: "no-invented-pathways",
    description:
      "Do not invent local people, services, pathways, communication methods, staff responsibilities, appointment availability or booking/routing rules.",
  },
  {
    id: "no-missing-data-fallback",
    description:
      "Do not substitute generic guidance or invented facts for missing local information. Do not invent condition-specific clinical questioning requirements or a required sequence/order without approved knowledge or explicit structured data.",
  },
] as const;
const provenance = {
  maintainedBy: "PracticeReady",
  kind: "example",
  createdOn: "2026-09-29",
  updatedOn: "2026-09-29",
  notes:
    "Illustrative editorial scaffold. References have been located, but content and source-to-claim mapping need PracticeReady review. Not approved training content.",
} as const;
const review = {
  status: "draft",
  notes:
    "Requires authoritative-source review and editorial approval before any future generation use.",
} as const;

const previousSources: Record<string, CoreContentSource> = {
  "care-navigation": {
    ...careNavigationSource,
    section: "Introduction; Document ‘how things will be done’",
  },
  "understand-request": {
    ...careNavigationSource,
    section: "Introduction; Making a decision about allocation",
  },
  "accurate-information": {
    ...careNavigationSource,
    section: "Document ‘how things will be done’",
  },
};

// Retain original stable IDs and source records; revised candidate content gets a new version.
type Binding = import("./core-training-types").CoreBindingId;
type Template = import("./core-training-types").CoreScenarioTemplate;
type Entry = {
  code: string;
  slug: string;
  title: string;
  teach: string;
  learn: string;
  apply: string;
  required?: Binding[];
  optional?: Binding[];
  future?: ("multi_select" | "routing")[];
};
const entries: Entry[] = [
  {
    code: "AB01",
    slug: "care-navigation",
    title: "Purpose of care navigation",
    teach:
      "Understand a patient's request before considering a destination; a request does not automatically require a GP appointment.",
    learn:
      "A colleague assumes every request needs a GP appointment; distinguish the purpose of care navigation.",
    apply:
      "A patient asks for an appointment without describing their need; choose to understand the request before assuming a destination.",
  },
  {
    code: "AB02",
    slug: "understand-request",
    title: "Understand what the patient needs help with",
    teach:
      "Gather information to understand what help a patient needs without adding clinical interpretations.",
    learn: "Identify why reception asks what help a patient needs.",
    apply:
      "A patient makes a broad request for help; choose a response that clarifies their need without diagnosing.",
    future: ["multi_select"],
  },
  {
    code: "AB03",
    slug: "explain-information-request",
    title: "Explain why information is requested",
    teach:
      "Explain that understanding the request supports care navigation without promising a particular outcome.",
    learn:
      "A patient asks why reception needs information about their request; choose an appropriate explanation.",
    apply:
      "A patient is reluctant to explain their request; choose a respectful explanation of why the information is useful.",
  },
  {
    code: "AB04",
    slug: "listening-open-communication",
    title: "Listening and open communication",
    teach:
      "Listen and use open communication to understand a request without leading the patient towards an assumed answer.",
    learn: "Distinguish an open invitation to explain a request from a leading assumption.",
    apply:
      "A patient starts explaining their request; choose a response that listens and checks understanding.",
    future: ["multi_select"],
  },
  {
    code: "AB05",
    slug: "consistent-information-gathering",
    title: "Consistent information gathering",
    teach:
      "Gather relevant information consistently without inventing condition-specific clinical question sets.",
    learn: "Identify why consistency matters when gathering relevant information.",
    apply:
      "Two similar administrative requests contain different levels of detail; choose a consistent approach without inventing mandatory questions.",
    optional: ["required_request_information"],
    future: ["multi_select"],
  },
  {
    code: "AB06",
    slug: "accurate-information",
    title: "Accurate recording",
    teach:
      "Record relevant information and navigation/allocation decisions accurately, distinguishing confirmed facts from assumptions.",
    learn:
      "Identify the difference between recording what was confirmed and recording an assumption.",
    apply:
      "A handover contains an unconfirmed detail about a navigation decision; choose to clarify it before treating it as fact.",
    optional: ["request_recording_method"],
    future: ["multi_select"],
  },
  {
    code: "AB07",
    slug: "appropriate-professional-service",
    title: "Appropriate professional/service",
    teach:
      "Use explicitly configured responsibilities to identify an appropriate destination; a GP is not automatically the only destination.",
    learn:
      "Distinguish configured responsibilities from assumptions based on a professional title.",
    apply:
      "Use an actual explicitly configured responsibility to frame a fictional request and choose a configured destination; honour employee exceptions and do not infer clinical suitability.",
    required: ["configured_roles", "effective_role_responsibilities"],
    future: ["routing"],
  },
  {
    code: "AB08",
    slug: "agreed-navigation-processes",
    title: "Follow agreed practice navigation processes",
    teach:
      "Use the practice's explicit booking/navigation process rather than importing another practice's rules.",
    learn: "Identify why navigation processes must reflect the practice.",
    apply:
      "A booking request needs the practice's process; choose the action explicitly supported by the structured booking pathway without adding urgency or availability.",
    required: ["booking_pathways"],
    future: ["routing"],
  },
  {
    code: "AB09",
    slug: "individual-circumstances",
    title: "Individual circumstances",
    teach:
      "Consider relevant individual circumstances when communicating and navigating without inferring clinical urgency.",
    learn:
      "Recognise that individual circumstances can affect communication without determining urgency.",
    apply:
      "A patient says they need an explanation repeated; choose an adaptable response without inferring clinical priority.",
    future: ["multi_select"],
  },
  {
    code: "AB10",
    slug: "continuity-of-care",
    title: "Continuity of care",
    teach:
      "Understand continuity as a general concept without inventing a practice continuity policy.",
    learn: "Recognise the value of continuity without promising access to a particular clinician.",
    apply:
      "A patient asks about continuing with a previous clinician; apply only an explicit structured continuity rule.",
    required: ["continuity_process"],
  },
  {
    code: "AB11",
    slug: "patient-preference-choice",
    title: "Patient preference and informed choice",
    teach:
      "Acknowledge patient preferences and support informed choices without inventing available appointments or pathways.",
    learn: "Distinguish acknowledging a preference from guaranteeing it can be met.",
    apply:
      "A patient expresses a clinician preference; communicate respectfully, using a configured preference rule only if available and otherwise making no booking promise.",
    optional: ["clinician_preference"],
  },
  {
    code: "AB12",
    slug: "explain-next-steps",
    title: "Explain what happens next",
    teach: "Explain next steps clearly without inventing actions or timeframes.",
    learn: "Recognise why a patient needs a clear explanation of what happens next.",
    apply:
      "A patient asks what will happen next; explain only the action and any timeframe explicitly supported by structured local process data.",
    required: ["next_step_process"],
  },
  {
    code: "AB13",
    slug: "consistency-access-routes",
    title: "Consistency across access routes",
    teach:
      "Apply consistent care-navigation principles across access routes without assuming which channels the practice offers.",
    learn:
      "Compare communication principles across hypothetical telephone, online and in-person examples without asserting local availability.",
    apply:
      "A request arrives through an explicitly fictional channel, or a confirmed local channel if bound; choose a consistent approach to understanding the need.",
    optional: ["access_channels"],
  },
  {
    code: "AB14",
    slug: "seek-support",
    title: "Seek support when unsure",
    teach:
      "Seek support when unsure rather than guess; any specific destination must come from the practice's explicit escalation route.",
    learn: "Distinguish recognising uncertainty and seeking support from guessing a destination.",
    apply:
      "An uncertain booking request requires support; choose the contact and method from the explicit structured escalation route.",
    required: ["escalation_routes"],
    future: ["routing"],
  },
  {
    code: "AB15",
    slug: "effective-communication",
    title: "Effective communication during care navigation",
    teach:
      "Use listening, empathy, patience, adaptability and consistency to support informed choices.",
    learn: "Identify communication that combines listening and empathy with clear explanations.",
    apply:
      "A patient is frustrated by an explanation they do not understand; choose a patient, adaptable response that supports informed choice without promising an outcome.",
    future: ["multi_select"],
  },
];

export const coreBindingSources: Record<Binding, "practice_setup" | "module_setup"> = {
  configured_roles: "practice_setup",
  effective_role_responsibilities: "practice_setup",
  booking_pathways: "practice_setup",
  escalation_routes: "practice_setup",
  request_clarification_rules: "module_setup",
  clinician_preference: "module_setup",
  required_request_information: "module_setup",
  information_handling_rules: "practice_setup",
  request_recording_method: "module_setup",
  continuity_process: "practice_setup",
  next_step_process: "practice_setup",
  access_channels: "practice_setup",
};

// Product-owner instruction records internal PracticeReady approval, not NHS endorsement.
// Future content changes must increment version and receive a new explicit approval.
export const approvedAppointmentCoreVersions: Readonly<Record<string, number>> = {
  AB01: 4,
  AB03: 3,
  AB04: 3,
  AB15: 3,
};
const editorialApproval = {
  by: "PracticeReady editorial — product owner",
  on: "2026-09-30",
  notes:
    "Core v1 approval explicitly authorised by the product owner for the current concept and both version-2 Learn/Apply recipes, including the requested level-specific presentation refinement.",
} as const;

export const coreTrainingLibrary: readonly CoreTrainingConcept[] = entries.map((e) => {
  const previous = previousSources[e.slug];
  const version = (previous ? 2 : 1) + (["AB01", "AB03", "AB04", "AB15"].includes(e.code) ? 2 : 0);
  const approved = approvedAppointmentCoreVersions[e.code] === version;
  const templates: Template[] = (["learn", "apply"] as const).map((level) => ({
    id: `core.appointment-booking.${e.code.toLowerCase()}.${level}.v1`,
    eligibleLevels: [level],
    interaction: "single_choice",
    intent: e.teach,
    pattern: e[level],
    requiredBindings: level === "apply" ? (e.required ?? []) : [],
    optionalBindings: level === "apply" ? (e.optional ?? []) : [],
    ...(appointmentRecipe(
      e.code,
      `core.appointment-booking.${e.code.toLowerCase()}.${level}.v1`,
      level,
      e[level],
    )
      ? {
          executable: appointmentRecipe(
            e.code,
            `core.appointment-booking.${e.code.toLowerCase()}.${level}.v1`,
            level,
            e[level],
          ),
        }
      : {}),
  }));
  if (approved) {
    for (const template of templates) {
      if (template.executable?.version === 2)
        Object.assign(template, {
          executable: { ...template.executable, approval: editorialApproval },
        });
    }
  }
  return {
    schemaVersion: 1,
    id: `core.appointment-booking.${e.slug}`,
    code: e.code,
    topicKey: "appointment-booking",
    version,
    title: e.title,
    learningObjective: e.teach,
    canTeach: [e.teach],
    mustNotAssume: constraints,
    sources: [
      {
        ...(previous ?? careNavigationSource),
        ...(approved
          ? { assessment: { status: "content_reviewed" as const, review: editorialApproval } }
          : {}),
      },
    ],
    supportedLevels: ["learn", "apply"],
    supportedInteractions: ["single_choice"],
    ...(e.future ? { futureInteractions: e.future } : {}),
    templates,
    localBindings: [...(e.required ?? []), ...(e.optional ?? [])].map((key) => ({
      key,
      source: coreBindingSources[key],
      description: `Explicit structured ${key.replaceAll("_", " ")}; never inferred from prose.`,
      ...(e.required?.includes(key)
        ? { requirement: "required" as const, whenMissing: "unavailable" as const }
        : { requirement: "optional" as const, whenMissing: "omit_dependent_content" as const }),
    })),
    sensitivity: "clinically_adjacent",
    review: approved
      ? { status: "approved", review: editorialApproval, approval: editorialApproval }
      : review,
    provenance: {
      ...provenance,
      updatedOn: "2026-09-30",
      notes: approved
        ? "PracticeReady-approved Core v1 concept and Learn/Apply recipes. Local facts remain manager-supplied; approval is not NHS endorsement."
        : "Appointment Booking Core v1 candidate patterns. Source-to-claim and template review remain outstanding. Not approved training content.",
    },
  };
});
