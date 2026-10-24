import { comparableValues, teachingPoint, displayLabel } from "./question-quality.ts";
import { readableGuidance, readableTitle } from "./training-copy.ts";
export { readableGuidance } from "./training-copy.ts";
import type { ModuleSettings } from "./module-config";
import { naturalSituation } from "./scenario-applications.ts";

// These frames describe the decision only. The selected practice answer supplies all policy.
const applyDecisions: [RegExp, string, string][] = [
  [
    /When may reception pass on a result/,
    "A patient asks you to read out a test result that is visible on their record.",
    "What should you do before sharing it?",
  ],
  [
    /identity details/,
    "A caller asks for their test result and offers their name, then waits for an answer.",
    "Which details should you check?",
  ],
  [
    /check whether a patient can book a vaccination/,
    "A patient asks for a vaccination appointment and gives you dates they can attend.",
    "What should you check before looking for a slot?",
  ],
  [
    /no suitable vaccination appointment/,
    "You have checked for a suitable vaccination appointment, but none is available.",
    "What should you do next?",
  ],
  [
    /issued fit notes provided/,
    "A fit note has been issued. The patient asks how they can receive it.",
    "What should you explain?",
  ],
  [
    /document a home visit request/,
    "You have taken a home visit request. A colleague asks where they can find it for review.",
    "Where should you record it?",
  ],
  [
    /readiness to work independently/,
    "A new starter has finished shadowing and asks to handle requests on their own.",
    "What needs to happen before they work independently?",
  ],
  [
    /caller make a complaint/,
    "A caller wants to make a complaint and asks how to get it to the practice.",
    "What should you explain?",
  ],
  [
    /document a difficult-call incident/,
    "A difficult call has ended. You need to leave a record for colleagues to follow up.",
    "Where should you record it?",
  ],
];

/** A decision must supply its alternatives. No generic distractor or scenario padding. */
export function practiceQuestionPresentation(
  topic: string,
  label: string,
  situation: string,
  answer: string,
  settings: ModuleSettings,
  alternatives: string[] = [],
  condition = "",
) {
  const learn = settings.trainingLevel !== "apply";
  const natural = naturalSituation(situation);
  const title = label.endsWith("?")
    ? displayLabel(topic.replaceAll("-", " "))
    : readableTitle(label);
  const sourceQuestion = natural.match(/(?:^|[.!?]\s+)([^.!?]+\?)$/)?.[1];
  const question = label.endsWith("?") ? label : (sourceQuestion ?? "What should reception do?");
  const base = natural.replace(/\s*[^.!?]*\?$/, "").trim();
  const meaningful =
    /\b(not on|not yet|unreviewed|unavailable|unclear|overdue|after|before|already|without|behalf|frustrated|unresolved|identified as urgent|classified as urgent|included|left out|suggests)\b/i.test(
      base,
    );
  const value = answer.split("\n")[0].trim();
  const comparable = comparableValues(value);
  if (comparable)
    return {
      title: displayLabel(title),
      patientQuote: "",
      question: /turnaround/i.test(label)
        ? `How long does the practice allow for ${/prescription/i.test(label) ? "a routine prescription request" : "this request"} to be processed?`
        : question,
      options: [value.replace(/\.$/, ""), ...comparable],
      learningPoint: teachingPoint(label, answer),
    };
  // This frame tests communication judgement, not local clinical policy.
  if (/supportive language|acknowledge.*frustration/i.test(label))
    return {
      title: "Responding to a Concern",
      patientQuote:
        "A caller is frustrated and says your explanation has not addressed their concern.",
      question: "What would be the best way to respond?",
      options: [
        readableGuidance(answer),
        "Repeat the explanation more slowly, using the same words.",
        "Explain the full process before asking which part is worrying them.",
        ...(!learn
          ? ["Offer to ask a colleague to explain it instead of exploring the concern together."]
          : []),
      ],
      learningPoint: teachingPoint(label, answer),
    };
  const frame = !learn ? applyDecisions.find(([pattern]) => pattern.test(label)) : undefined;
  const correct = readableGuidance(answer);
  const incorrect = [...new Set(alternatives.map(readableGuidance))].filter(
    (s) => s.toLowerCase() !== correct.toLowerCase(),
  );
  return {
    title,
    learningPoint: teachingPoint(label, answer),
    patientQuote: frame
      ? frame[1]
      : condition && settings.trainingLevel === "learn"
        ? ""
        : condition || (!learn && meaningful) || /left out|suggests/i.test(base)
          ? base
          : "",
    question: frame
      ? frame[2]
      : condition && settings.trainingLevel === "learn"
        ? `${condition.replace(/^./, (c) => c.toUpperCase())}: what should reception do?`
        : !learn && meaningful && label.endsWith("?")
          ? "What should reception do next?"
          : question,
    options: [correct, ...incorrect.slice(0, learn ? 2 : 3)],
  };
}
