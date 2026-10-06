export interface CoreScenarioProvenance {
  kind: "core";
  conceptId: string;
  conceptVersion: number;
  level: import("./core-training-types").TrainingLevel;
  interaction: "single_choice";
  recipe: import("./core-training-types").CoreRecipeId | "controlled_single_choice";
  templateId?: string;
  executableRecipeId?: string;
  variationId?: string;
  managerModified?: boolean;
  recipeVersion: 1 | 2;
  inputs: {
    bindingId: string;
    source: "practice_setup" | "module_setup";
    paths: string[];
    snapshot: unknown;
  }[];
}

export type ScenarioStatus = "draft" | "approved";

export interface MCQScenario {
  // Structured classification; trainee-facing titles are not internal identifiers.
  localRoleRequestId?: string;
  provenance?: CoreScenarioProvenance;
  // Optional generation metadata; old saved scenarios remain valid.
  followUpSituation?: string;
  kind: "mcq";
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  options: string[];
  correctIndex: number;
  learningPoint: string;
  status: ScenarioStatus;
  managerNote?: string;
  followUpFor?: string;
}

export interface OrderScenario {
  provenance?: CoreScenarioProvenance;
  kind: "order";
  id: string;
  title: string;
  patientQuote: string;
  question: string;
  steps: string[];
  learningPoint: string;
  status: ScenarioStatus;
  managerNote?: string;
  followUpFor?: string;
}

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
  provenance: {
    kind: "practice_role_matching";
    generatorVersion: 1 | 2;
    level: "learn";
    managerModified?: boolean;
    source: "practice_setup";
    paths: string[];
    snapshot: import("./role-requests").PracticeRoleRequests[];
  };
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

export interface Module {
  id: string;
  type: string;
  title: string;
  topicKey: string;
  published: boolean;
  scenarios: Scenario[];
  createdAt: number;
  difficulty?: Difficulty;
  length?: ModuleLength;
  settings?: import("./module-config").ModuleSettings;
  needsReview?: boolean;
  reviewReason?: string;
  packageId?: string;
}

export interface TrainingResult {
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
  id: string;
  traineeId: string;
  moduleId: string;
  assignedAt: number;
  dueDate?: string;
  status: "assigned" | "in_progress" | "completed" | "overdue";
  packageId?: string;
}
