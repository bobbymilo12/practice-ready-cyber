import type { Module } from "./training-types";

/** Core capabilities, not the difficulty/length settings of an existing Module. */
export type TrainingLevel = "learn" | "apply" | "handle";
/** Extend this union for routing/multi_step when their interaction contracts are designed. */
export type InteractionType = "single_choice" | "multi_select" | "sequence";
export type ContentSensitivity = "administrative" | "clinically_adjacent" | "safety_critical";
export type CoreReviewStatus = "draft" | "reviewed" | "approved" | "retired";

export interface CoreReviewRecord {
  readonly by: string;
  /** ISO calendar date, YYYY-MM-DD. */
  readonly on: string;
  readonly notes?: string;
}

export type CoreContentReview =
  | { readonly status: "draft"; readonly notes: string }
  | { readonly status: "reviewed"; readonly review: CoreReviewRecord }
  | {
      readonly status: "approved";
      readonly review: CoreReviewRecord;
      readonly approval: CoreReviewRecord;
    }
  | {
      readonly status: "retired";
      readonly retirement: CoreReviewRecord;
      readonly replacementConceptId?: string;
    };

export interface CoreContentSource {
  readonly id: string;
  readonly organisation: string;
  readonly title: string;
  readonly url: string;
  readonly section?: string;
  readonly version?: string;
  readonly publishedOn?: string;
  readonly updatedOn?: string;
  readonly accessedOn: string;
  /** Finding a reference does not mean its support for our content has been reviewed. */
  readonly assessment:
    | { readonly status: "reference_only" }
    | { readonly status: "content_reviewed"; readonly review: CoreReviewRecord };
}

export type CoreLocalBinding = {
  /** Semantic key, not a copied local value or an executable object path. */
  readonly key: string;
  readonly source: "practice_setup" | "module_setup";
  readonly description: string;
} & (
  | { readonly requirement: "required"; readonly whenMissing: "unavailable" }
  | { readonly requirement: "optional"; readonly whenMissing: "omit_dependent_content" }
);

export type CoreBindingId =
  | "configured_roles"
  | "effective_role_responsibilities"
  | "booking_pathways"
  | "escalation_routes"
  | "request_clarification_rules"
  | "clinician_preference"
  | "required_request_information"
  | "information_handling_rules"
  | "request_recording_method"
  | "continuity_process"
  | "next_step_process"
  | "access_channels";

export type CoreRecipeId =
  "navigation_principle" | "clarify_request" | "information_accuracy" | "booking_support";
export interface CoreLevelDefinition {
  /** Explicit subset of concept bindings used at this level; missing definition = unavailable. */
  readonly bindings: readonly CoreBindingId[];
  readonly recipe: CoreRecipeId;
}

export type CoreForbiddenInference =
  | "diagnosis"
  | "clinical_urgency"
  | "clinician_suitability"
  | "clinical_questioning"
  | "local_routing_policy"
  | "appointment_availability"
  | "escalation_destination"
  | "staff_responsibilities";

/** Trusted editorial content, never model- or manager-authored at runtime. */
export interface CoreExecutableRecipe {
  readonly approval?: CoreReviewRecord;
  readonly id: string;
  readonly version: 1 | 2;
  readonly eligibleLevel: "learn" | "apply";
  readonly interaction: "single_choice";
  readonly situationPattern: string;
  readonly correctBehaviour: string;
  readonly allowedVariations: readonly {
    readonly id: string;
    readonly situation: string;
    readonly title?: string;
  }[];
  readonly distractorPatterns: readonly {
    readonly id: string;
    readonly theme: string;
    readonly response: string;
  }[];
  readonly requiredBindings: readonly CoreBindingId[];
  readonly optionalBindings: readonly CoreBindingId[];
  readonly forbiddenInferences: readonly CoreForbiddenInference[];
}

/** Editorial patterns only; availability does not imply an executable generation recipe. */
export interface CoreScenarioTemplate {
  readonly executable?: CoreExecutableRecipe;
  readonly id: string;
  readonly eligibleLevels: readonly TrainingLevel[];
  readonly interaction: InteractionType;
  readonly intent: string;
  readonly pattern: string;
  readonly requiredBindings: readonly CoreBindingId[];
  readonly optionalBindings: readonly CoreBindingId[];
  readonly mustNotAssume?: CoreTrainingConcept["mustNotAssume"];
}

export interface CoreTrainingConcept {
  readonly code?: string;
  readonly templates?: readonly CoreScenarioTemplate[];
  /** Editorial roadmap only; does not enable an interaction. */
  readonly futureInteractions?: readonly ("multi_select" | "routing")[];
  readonly schemaVersion: 1;
  /** Stable across content revisions. */
  readonly id: string;
  /** Reuses the current module topic namespace without constraining future sectors. */
  readonly topicKey: Module["topicKey"];
  readonly title: string;
  readonly learningObjective: string;
  readonly canTeach: readonly [string, ...string[]];
  /** Stable constraint IDs permit future machine checks; descriptions require editorial review. */
  readonly mustNotAssume: readonly [
    { readonly id: string; readonly description: string },
    ...{
      readonly id: string;
      readonly description: string;
    }[],
  ];
  readonly sources: readonly [CoreContentSource, ...CoreContentSource[]];
  readonly supportedLevels: readonly [TrainingLevel, ...TrainingLevel[]];
  readonly supportedInteractions: readonly [InteractionType, ...InteractionType[]];
  readonly localBindings: readonly CoreLocalBinding[];
  readonly sensitivity: ContentSensitivity;
  readonly levels?: Partial<Record<TrainingLevel, CoreLevelDefinition>>;
  /** Revision of the centrally maintained content, separate from schemaVersion. */
  readonly version: number;
  readonly review: CoreContentReview;
  readonly provenance: {
    readonly maintainedBy: "PracticeReady";
    readonly kind: "example" | "editorial";
    readonly createdOn: string;
    readonly updatedOn: string;
    readonly notes: string;
  };
}
