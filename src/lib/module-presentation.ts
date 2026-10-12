import type { Difficulty, Scenario } from "./training-types";
import type { ModuleSettings } from "./module-config";
import { naturalSituation } from "./scenario-applications.ts";

export const difficultyOptions: { value: Difficulty; label: string; description: string }[] = [
  { value: "easy", label: "Easy", description: "Direct questions with fewer alternatives." },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Everyday situations with closer alternatives.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Judge plausible responses to a more demanding handover.",
  },
];

// Response strategies only: no invented clinical rules, timings or destinations.
const contexts: Record<string, string> = {
  prescriptions: "prescription request",
  urgent: "urgent handover",
  results: "result enquiry",
  vaccines: "vaccination booking",
  "fit-notes": "fit note request",
  "home-visits": "home visit request",
  difficult: "difficult call",
  "first-week": "reception task",
  custom: "task",
};
const handovers: Record<string, string> = {
  prescriptions:
    "The patient asks whether the approach used for their last prescription request will work again.",
  urgent:
    "A colleague asks whether the handover can be handled in the same way as the previous call.",
  results: "The caller says their previous result enquiry was handled differently.",
  vaccines: "The patient asks for the same booking arrangements as last time.",
  "fit-notes":
    "The patient expects the request to be handled in the same way as their previous fit note.",
  "home-visits": "The caller says a previous home visit request was handled differently.",
  difficult: "The caller asks you to agree a resolution before you have checked the next steps.",
  "first-week": "A colleague suggests a familiar approach from a different practice.",
  custom: "A colleague suggests using the approach from a similar task.",
};
export function practiceQuestionPresentation(
  topic: string,
  label: string,
  situation: string,
  answer: string,
  settings: ModuleSettings,
) {
  const difficulty = settings.difficulty ?? "easy";
  const learn = settings.trainingLevel === "learn";
  const task = contexts[topic] ?? "request";
  const base =
    naturalSituation(situation)
      .replace(/\s*[^.!?]*\?$/, "")
      .trim() || "A colleague asks about " + label.toLowerCase() + ".";
  const patientQuote =
    (learn
      ? "You are checking your practice's instructions for " + label.toLowerCase() + "."
      : base) + (difficulty === "advanced" ? " " + (handovers[topic] ?? handovers.custom) : "");
  const incorrect = [
    "Use the approach followed for the last similar " + task + ".",
    "Start with the usual first step, then check whether this " +
      task +
      " has different requirements.",
    "Pass on a brief summary and leave the next person to check the complete instructions.",
  ].filter((text) => text.trim().toLowerCase() !== answer.trim().toLowerCase());
  return {
    patientQuote,
    question: learn
      ? "Which instruction should you follow?"
      : topic === "difficult"
        ? "What would be the best way to respond?"
        : "What should you do next?",
    options: [
      answer,
      ...incorrect.slice(0, difficulty === "easy" ? 1 : difficulty === "intermediate" ? 2 : 3),
    ],
  };
}

/** Retain evidence and answer meaning; difficulty never rewrites a correct answer. */
export function applyQuestionDifficulty(scenario: Scenario, difficulty?: Difficulty): Scenario {
  if (!difficulty || scenario.kind !== "mcq") return scenario;
  const correct = scenario.options[scenario.correctIndex];
  const count = difficulty === "easy" ? 2 : difficulty === "intermediate" ? 3 : 4;
  const incorrect = scenario.options
    .filter((_, i) => i !== scenario.correctIndex)
    .slice(0, count - 1);
  return { ...scenario, options: [correct, ...incorrect], correctIndex: 0 };
}
