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
        "Approach the person who dealt with the last similar enquiry.",
        "Choose someone available in the same team before checking who is responsible.",
        "Send a general team message and wait for someone to pick it up.",
      ],
    };
  if (topic === "results")
    return {
      challenge: "The patient expects this enquiry to be handled like their previous result.",
      alternatives: [
        "Use the instructions attached to the patient's previous result.",
        "Base the response on the patient's account of what normally happens.",
        "Explain the usual next step from memory and check the current instruction if they query it.",
      ],
    };
  if (topic === "prescriptions")
    return {
      challenge: "The patient asks whether the arrangements used last time will still apply.",
      alternatives: [
        "Use the arrangements from the patient's previous prescription request.",
        "Base the response on the patient's description of their usual prescription process.",
        "Confirm the usual arrangements first, then check whether this request follows the same process.",
      ],
    };
  if (topic === "vaccines")
    return {
      challenge: "The patient asks for the same arrangements as their previous vaccination.",
      alternatives: [
        "Use the booking arrangements from the patient's previous vaccination.",
        "Base the next step on the patient's account of what they were offered last time.",
        "Start with the usual booking arrangements and check this request's instructions afterwards.",
      ],
    };
  if (topic === "fit-notes")
    return {
      challenge: "The patient expects the arrangements for their previous fit note to apply again.",
      alternatives: [
        "Use the arrangements from the patient's previous fit note request.",
        "Base the response on how the patient says their last request was handled.",
        "Explain the usual process first and check this request's requirements afterwards.",
      ],
    };
  if (topic === "home-visits")
    return {
      challenge: "The caller says their previous home visit request was handled differently.",
      alternatives: [
        "Use the arrangements from the patient's previous home visit request.",
        "Base the next step on the caller's description of what happened last time.",
        "Start the usual request process and check any different requirements at handover.",
      ],
    };
  if (topic === "first-week")
    return {
      challenge: "A colleague suggests an approach they used at another practice.",
      alternatives: [
        "Use the approach you learned at your previous workplace.",
        "Copy how a colleague handles a similar task before checking this practice's instructions.",
        "Complete the familiar parts of the task and check the local requirements afterwards.",
      ],
    };
  if (topic === "difficult")
    return {
      challenge: "The caller wants a resolution before you have established the next steps.",
      alternatives: [
        "Repeat the explanation of the usual process before exploring the caller's concern.",
        "Suggest the approach used for a previous caller with a similar concern.",
        "Offer to transfer the conversation before clarifying what remains unresolved.",
      ],
    };
  return {
    challenge:
      topic === "urgent"
        ? "A colleague suggests using the handover arrangements from the previous call."
        : "A colleague suggests using the approach from a similar task.",
    alternatives: [
      "Use the approach followed for the last similar request.",
      "Start with the familiar steps and check this request's requirements afterwards.",
      "Pass on a summary and leave the next person to check which instructions apply.",
    ],
  };
}
export function practiceQuestionPresentation(
  topic: string,
  label: string,
  situation: string,
  answer: string,
  settings: ModuleSettings,
) {
  const learn = settings.trainingLevel === "learn";
  const natural = naturalSituation(situation);
  const frame = decisionFrame(topic, label);
  // Preserve the actual decision (including negative questions such as "must not promise").
  // Do not turn a question about a time/contact into "What should you do next?".
  const sourceQuestion = natural.match(/(?:^|[.!?]\s+)([^.!?]+\?)$/)?.[1];
  const directQuestion = label.endsWith("?") ? label : (sourceQuestion ?? "What should you do?");
  const base = natural.replace(/\s*[^.!?]*\?$/, "").trim();
  const subject = label.endsWith("?") ? "this request" : label.toLowerCase();
  const patientQuote =
    (base || "A colleague asks for help with " + subject + ".") +
    (!learn ? " " + frame.challenge : "");
  const incorrect = frame.alternatives.filter(
    (text) => text.trim().toLowerCase() !== answer.trim().toLowerCase(),
  );
  return {
    title: readableTitle(label),
    learningPoint: "For this request, follow your practice's guidance: " + readableGuidance(answer),
    patientQuote,
    question:
      !learn && /supportive language|acknowledge.*frustration/i.test(label)
        ? "What would be the best way to respond?"
        : directQuestion,
    options: [readableGuidance(answer), ...incorrect.slice(0, learn ? 2 : 3)],
  };
}
