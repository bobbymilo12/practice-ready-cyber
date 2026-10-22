import { comparableValues, teachingPoint, displayLabel } from "./question-quality.ts";
import { readableGuidance, readableTitle } from "./training-copy.ts";
export { readableGuidance } from "./training-copy.ts";
import type { ModuleSettings } from "./module-config";
import { naturalSituation } from "./scenario-applications.ts";

// Editorial frames describe administrative decisions, never clinical rules or source dependencies.
// The configured answer remains verbatim. Alternatives are proposed response strategies,
// not assertions that another service, person, deadline or procedure exists at this practice.
interface DecisionFrame {
  challenge: string;
  alternatives: [string, string, string];
}
function decisionFrame(topic: string, label: string): DecisionFrame {
  if (label.startsWith("Individual exception:") || label.startsWith("Routing:"))
    return {
      challenge: "A colleague suggests using whoever has space first.",
      alternatives: [
        "Choose the person who handled the patient's previous request.",
        "Choose by the shared role title alone, without checking individual responsibilities.",
        "Check availability first and leave the responsibility check to the person receiving the request.",
      ],
    };
  if (/confidentiality|identity/i.test(label))
    return {
      challenge: "The caller says they have spoken to reception about this before.",
      alternatives: [
        "Use the checks noted on the previous enquiry for this conversation.",
        "Treat the caller's familiarity with the enquiry as confirmation they can receive an update.",
        "Confirm the details of the enquiry first and check permission only if the caller asks for more.",
      ],
    };
  if (/supportive language|acknowledge.*frustration/i.test(label))
    return {
      challenge: "The caller says your explanation has not addressed their concern.",
      alternatives: [
        "Repeat the explanation more slowly, using the same words.",
        "Explain the full process before asking which part is worrying them.",
        "Offer to ask a colleague to explain it instead of exploring the concern together.",
      ],
    };
  if (/turnaround|opening hours|address|contact information|nominated pharmacy/i.test(label))
    return {
      challenge: "The patient says they were given different information on a previous occasion.",
      alternatives: [
        "Give the information used for the last similar enquiry.",
        "Use the patient's previous experience as the basis for your answer.",
        "Offer a provisional answer from memory and check the current details if they query it.",
      ],
    };
  if (/which details|document|record|report|handover|activities.*shadow/i.test(label))
    return {
      challenge: "A colleague has already started a summary and asks whether it is enough.",
      alternatives: [
        "Use the previous summary as it stands for this handover.",
        "Add the main concern and leave the remaining details for the receiving colleague to collect.",
        "Give a verbal update first and rely on the next person to complete the record.",
      ],
    };
  if (/who|contact|support|buddy/i.test(label))
    return {
      challenge: "A colleague suggests approaching the first available member of staff.",
      alternatives: [
        "Send a message to the wider team asking someone to pick up the request.",
        "Ask an available colleague to deal with the request when they finish their current task.",
        "Send a general team message and wait for someone to pick it up.",
      ],
    };
  const task: Record<string, string> = {
    prescriptions: "prescription request",
    results: "results enquiry",
    vaccines: "vaccination request",
    "fit-notes": "fit note request",
    "home-visits": "home visit request",
    "first-week": "new starter's task",
    urgent: "urgent handover",
    difficult: "caller's concern",
    custom: "request",
  };
  const subject = task[topic] ?? "request";
  return {
    challenge: "The patient asks what will happen next.",
    alternatives: [
      `Send the ${subject} to the responsible team for advice before giving an answer.`,
      `Ask for the ${subject} in writing so the team can review it.`,
      `Arrange for a colleague to call back about the ${subject} with the next steps.`,
    ],
  };
}
export function practiceQuestionPresentation(
  topic: string,
  label: string,
  situation: string,
  answer: string,
  settings: ModuleSettings,
  configuredAlternatives?: string[],
) {
  const learn = settings.trainingLevel === "learn";
  const natural = naturalSituation(situation);
  const frame = decisionFrame(topic, label);
  const value = answer.split("\n")[0].trim();
  const comparable = comparableValues(value);
  if (comparable)
    return {
      title: displayLabel(label),
      patientQuote: natural.replace(/\s*[^.!?]*\?$/, "").trim(),
      question: /turnaround/i.test(label)
        ? "How long does the practice allow for processing this request?"
        : label.endsWith("?")
          ? label
          : "Which value is specified by the practice?",
      options: [value.replace(/\.$/, ""), ...comparable],
      learningPoint: teachingPoint(label, answer),
    };
  // Preserve the actual decision (including negative questions such as "must not promise").
  // Do not turn a question about a time/contact into "What should you do next?".
  const sourceQuestion = natural.match(/(?:^|[.!?]\s+)([^.!?]+\?)$/)?.[1];
  const directQuestion = label.endsWith("?") ? label : (sourceQuestion ?? "What should you do?");
  const base = natural.replace(/\s*[^.!?]*\?$/, "").trim();
  const subject = label.endsWith("?") ? "this request" : label.toLowerCase();
  const patientQuote =
    (base || "A colleague asks for help with " + subject + ".") +
    (!learn ? " " + frame.challenge : "");
  const incorrect = (
    configuredAlternatives?.length ? configuredAlternatives : frame.alternatives
  ).filter((text) => text.trim().toLowerCase() !== answer.trim().toLowerCase());
  return {
    title: readableTitle(label),
    learningPoint: teachingPoint(label, answer),
    patientQuote,
    question:
      !learn && /supportive language|acknowledge.*frustration/i.test(label)
        ? "What would be the best way to respond?"
        : directQuestion,
    options: [readableGuidance(answer), ...incorrect.slice(0, learn ? 2 : 3).map(readableGuidance)],
  };
}
