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
  managerNote?: string;
  followUpFor?: string;
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
  managerNote?: string;
  followUpFor?: string;
}

export type Scenario = MCQScenario | OrderScenario;

export type Difficulty = "easy" | "intermediate" | "advanced";
export type ModuleLength = "short" | "medium" | "long";

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
  needsReview?: boolean;
  reviewReason?: string;
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
}
