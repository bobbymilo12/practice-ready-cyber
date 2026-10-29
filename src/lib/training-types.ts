/** Where a question came from. `paths` name the practiceData fields it depends on; without them
 * any practice change sends the whole module for review. */
export interface ScenarioProvenance {
  kind: string;
  paths?: string[];
  snapshot?: unknown;
  managerModified?: boolean;
}

export type ScenarioStatus = "draft" | "approved";

export interface MCQScenario {
  /** Allocation metadata only; never affects scoring or source-change dependencies. */
  generationObjective?: {
    source: string;
    skill: "knowledge" | "application" | "capability" | "exception";
    structure: string;
  };
  // Structured classification; trainee-facing titles are not internal identifiers.
  localRoleRequestId?: string;
  provenance?: ScenarioProvenance | import("./sequence").SequenceProvenance;
  // Optional generation metadata; old saved scenarios remain valid.
  followUpSituation?: string;
  kind: "mcq";
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  options: string[];
  correctIndex: number;
  // Present only for multi-select; all listed choices and no others must be selected.
  correctIndices?: number[];
  learningPoint: string;
  status: ScenarioStatus;
  managerNote?: string;
  followUpFor?: string;
}

interface OrderScenarioBase {
  kind: "order";
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  learningPoint: string;
  status: ScenarioStatus;
  managerNote?: string;
  followUpFor?: string;
}

export interface LegacyOrderScenario extends OrderScenarioBase {
  steps: string[];
  sequence?: never;
  provenance?: ScenarioProvenance;
}
export interface StructuredOrderScenario extends OrderScenarioBase {
  steps?: never;
  sequence: {
    steps: { id: string; label: string }[];
    correctOrder: string[];
    presentationOrder: string[];
  };
  provenance?: ScenarioProvenance | import("./sequence").SequenceProvenance;
}
export type OrderScenario = LegacyOrderScenario | StructuredOrderScenario;

export interface MatchingScenario {
  kind: "matching";
  // Absent in older reusable-target matching exercises.
  pairingMode?: "one_to_one";
  id: string;
  title: string;
  question: string;
  items: { id: string; label: string }[];
  targets: { id: string; label: string; kind: "role" }[];
  // All configured relationships within the presented targets, not just an intended answer.
  validMatches: Record<string, string[]>;
  learningPoint: string;
  status: ScenarioStatus;
  managerNote?: string;
  followUpFor?: string;
  provenance?: ScenarioProvenance;
}

export type Scenario = MCQScenario | OrderScenario | MatchingScenario;

export type Difficulty = "easy" | "intermediate" | "advanced";
export type ModuleLength = "short" | "medium" | "long";

export interface TrainingPackage {
  id: string;
  title: string;
  description: string;
  kind: "induction" | "custom";
  moduleIds: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewChange {
  path: string;
  label: string;
  reason: string;
  before?: string;
  after?: string;
}
export interface ReviewConfirmation {
  id: string;
  decision: "unchanged" | "updated";
  note: string;
  reviewKey: string;
  by: string;
  name: string;
  at: string;
  reasons: string[];
}
export interface Module {
  id: string;
  type: string;
  title: string;
  topicKey: string;
  published: boolean;
  /** "public" lets managers in other practices copy this module; absent means private. */
  visibility?: "public";
  scenarios: Scenario[];
  createdAt: number;
  difficulty?: Difficulty;
  length?: ModuleLength;
  needsReview?: boolean;
  reviewReason?: string;
  reviewChanges?: ReviewChange[];
  reviewedQuestions?: Record<string, string>;
  reviewConfirmations?: ReviewConfirmation[];
  packageId?: string;
}

export interface TrainingResult {
  scoreBasis?: "first_committed";
  attemptId?: string;
  strongTitles?: string[];
  recoveredTitles?: string[];
  moduleId: string;
  moduleTitle: string;
  correct: number;
  total: number;
  wrongTitles: string[];
  completedAt: number;
  confidence?: number; // 1-5 self-report
  traineeId?: string;
  traineeName?: string;
  emoji?: string;
}

export interface Assignment {
  withdrawnAt?: number;
  withdrawnBy?: string;
  id: string;
  traineeId: string;
  moduleId: string;
  assignedAt: number;
  dueDate?: string;
  status: "assigned" | "in_progress" | "completed" | "overdue";
  packageId?: string;
}
