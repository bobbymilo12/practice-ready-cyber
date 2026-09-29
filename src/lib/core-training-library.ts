import type { CoreContentSource, CoreTrainingConcept } from "./core-training-types";

// Central editorial registry. These examples remain draft; the Core pipeline excludes them in production.
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
      "Do not invent local people, services, pathways, communication methods or appointment availability.",
  },
  {
    id: "no-missing-data-fallback",
    description:
      "Do not substitute generic guidance or invented facts for missing local information.",
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

export const coreTrainingLibrary = [
  {
    schemaVersion: 1,
    id: "core.appointment-booking.care-navigation",
    topicKey: "appointment-booking",
    version: 1,
    title: "Understanding care navigation",
    levels: {
      learn: { bindings: [], recipe: "navigation_principle" },
      apply: {
        bindings: [
          "configured_roles",
          "effective_role_responsibilities",
          "booking_pathways",
          "escalation_routes",
        ],
        recipe: "booking_support",
      },
    },
    learningObjective:
      "Distinguish understanding a request from deciding how it should be handled at this practice.",
    canTeach: [
      "Care navigation connects a request with the practice's confirmed process; a role title alone is not a booking rule.",
    ],
    mustNotAssume: constraints,
    sources: [
      { ...careNavigationSource, section: "Introduction; Document ‘how things will be done’" },
    ],
    supportedLevels: ["learn", "apply"],
    supportedInteractions: ["single_choice", "multi_select"],
    localBindings: [
      {
        key: "configured_roles",
        source: "practice_setup",
        description: "Roles actively used at this practice.",
        requirement: "required",
        whenMissing: "unavailable",
      },
      {
        key: "effective_role_responsibilities",
        source: "practice_setup",
        description: "Confirmed role capabilities with individual employee exceptions applied.",
        requirement: "required",
        whenMissing: "unavailable",
      },
      {
        key: "booking_pathways",
        source: "practice_setup",
        description: "Manager-confirmed rules for handling and booking requests.",
        requirement: "required",
        whenMissing: "unavailable",
      },
      {
        key: "escalation_routes",
        source: "practice_setup",
        description: "Confirmed contacts and methods for requests that staff cannot resolve.",
        requirement: "required",
        whenMissing: "unavailable",
      },
    ],
    sensitivity: "clinically_adjacent",
    review,
    provenance,
  },
  {
    schemaVersion: 1,
    id: "core.appointment-booking.understand-request",
    topicKey: "appointment-booking",
    version: 1,
    title: "Understanding the patient's request",
    levels: {
      learn: { bindings: [], recipe: "clarify_request" },
      apply: { bindings: ["clinician_preference"], recipe: "clarify_request" },
    },
    learningObjective:
      "Clarify what help a patient is requesting without adding a clinical interpretation.",
    canTeach: [
      "Separate the patient's description from assumptions about the appointment or person they need.",
      "Check understanding before applying a locally confirmed booking process.",
    ],
    mustNotAssume: constraints,
    sources: [
      { ...careNavigationSource, section: "Introduction; Making a decision about allocation" },
    ],
    supportedLevels: ["learn", "apply"],
    supportedInteractions: ["single_choice", "multi_select"],
    localBindings: [
      {
        key: "clinician_preference",
        source: "module_setup",
        description: "Explicit module selection for handling a requested clinician; no custom prose inference.",
        requirement: "optional",
        whenMissing: "omit_dependent_content",
      },
    ],
    sensitivity: "clinically_adjacent",
    review,
    provenance,
  },
  {
    schemaVersion: 1,
    id: "core.appointment-booking.accurate-information",
    topicKey: "appointment-booking",
    version: 1,
    title: "Gathering accurate information",
    levels: {
      learn: { bindings: [], recipe: "information_accuracy" },
      apply: {
        bindings: [
          "required_request_information",
          "information_handling_rules",
          "request_recording_method",
        ],
        recipe: "information_accuracy",
      },
      handle: {
        bindings: ["required_request_information", "information_handling_rules"],
        recipe: "information_accuracy",
      },
    },
    learningObjective:
      "Capture the information the practice requires without turning an assumption into a fact.",
    canTeach: [
      "Distinguish information provided by the patient from information that still needs clarification.",
      "Check an information-gathering task against the practice's confirmed requirements.",
    ],
    mustNotAssume: [
      ...constraints,
      {
        id: "no-universal-checklist",
        description:
          "Do not invent mandatory identity checks, questions, recording systems or data-sharing permissions.",
      },
    ],
    sources: [{ ...careNavigationSource, section: "Document ‘how things will be done’" }],
    supportedLevels: ["learn", "apply", "handle"],
    supportedInteractions: ["single_choice", "multi_select", "sequence"],
    localBindings: [
      {
        key: "required_request_information",
        source: "module_setup",
        description:
          "Information the manager confirms is needed for this request; no default checklist is implied.",
        requirement: "required",
        whenMissing: "unavailable",
      },
      {
        key: "information_handling_rules",
        source: "practice_setup",
        description: "Confirmed confidentiality and information-handling requirements.",
        requirement: "required",
        whenMissing: "unavailable",
      },
      {
        key: "request_recording_method",
        source: "module_setup",
        description: "Where and how staff should record the request, if specified.",
        requirement: "optional",
        whenMissing: "omit_dependent_content",
      },
    ],
    sensitivity: "administrative",
    review,
    provenance,
  },
] as const satisfies readonly CoreTrainingConcept[];
