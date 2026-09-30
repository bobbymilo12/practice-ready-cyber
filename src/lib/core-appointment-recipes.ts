import type { CoreExecutableRecipe, CoreForbiddenInference } from "./core-training-types";

export const coreForbiddenInferences: readonly CoreForbiddenInference[] = [
  "diagnosis",
  "clinical_urgency",
  "clinician_suitability",
  "clinical_questioning",
  "local_routing_policy",
  "appointment_availability",
  "escalation_destination",
  "staff_responsibilities",
];

type Content = Pick<
  CoreExecutableRecipe,
  "correctBehaviour" | "allowedVariations" | "distractorPatterns"
>;
// Candidate editorial answer keys. No model output can change these behaviours.
// Incorrect options describe unsupported response strategies, not purported local facts.
const content: Record<string, Content> = {
  AB01: {
    correctBehaviour:
      "Understand what help the patient needs before considering an appropriate next step.",
    allowedVariations: [
      {
        id: "appointment-request",
        situation:
          "A patient contacts reception and asks for an appointment, without explaining what help they need.",
      },
      {
        id: "help-request",
        situation:
          "A patient contacts reception saying they need some help but are not sure what to ask for.",
      },
    ],
    distractorPatterns: [
      {
        id: "promise-gp",
        theme: "Automatically promise a GP",
        response: "Promise a GP appointment before finding out what help the patient needs.",
      },
      {
        id: "ignore-request",
        theme: "Ignore the nature of the request",
        response: "Choose the next step without asking about the nature of the request.",
      },
      {
        id: "assume-route",
        theme: "Unsupported routing assumption",
        response:
          "Assume the destination should be the same as for the patient's previous request.",
      },
    ],
  },
  AB03: {
    correctBehaviour:
      "Explain that understanding the request helps the practice identify suitable support, without pressing for unnecessary detail.",
    allowedVariations: [
      {
        id: "why-ask",
        situation: "A patient asks, “Why do you need to know what my request is about?”",
      },
      {
        id: "hesitant",
        situation:
          "A patient hesitates when asked what help they need and asks why the information is useful.",
      },
      {
        id: "prefer-clinician",
        situation:
          "A patient says they would prefer to discuss the details with a clinician and asks why reception needs to know about the request.",
      },
    ],
    distractorPatterns: [
      {
        id: "diagnosing",
        theme: "Claim reception is diagnosing",
        response: "Explain that reception needs the information to diagnose the problem.",
      },
      {
        id: "pressure",
        theme: "Pressure the patient",
        response: "Ask for the full account again without explaining why it would help.",
      },
      {
        id: "invent-policy",
        theme: "Unsupported local policy claim",
        response: "Say it is a booking requirement without checking the practice’s policy.",
      },
    ],
  },
  AB04: {
    correctBehaviour:
      "Listen, allow the patient to explain and check your understanding before assuming what they need.",
    allowedVariations: [
      {
        id: "begins-explaining",
        situation:
          "A patient starts explaining what they need help with but has not yet finished describing their request.",
      },
      {
        id: "adds-context",
        situation:
          "A patient begins a request, then says there is something else they need to explain about it.",
      },
    ],
    distractorPatterns: [
      {
        id: "interrupt",
        theme: "Unnecessary interruption",
        response: "Move on to appointment preferences before the patient finishes explaining.",
      },
      {
        id: "assume-issue",
        theme: "Assume the issue",
        response: "Finish the explanation for the patient based on a similar conversation.",
      },
      {
        id: "select-route",
        theme: "Invent or select a pathway prematurely",
        response: "Select a pathway before hearing what the patient needs.",
      },
    ],
  },
  AB15: {
    correctBehaviour:
      "Respond with patience and empathy, give the patient time and use clear language to check understanding.",
    allowedVariations: [
      {
        id: "confused",
        situation:
          "A patient says they are confused by an explanation and asks you to explain it another way.",
      },
      {
        id: "frustrated",
        situation:
          "A patient sounds frustrated and says they are struggling to explain what they need.",
      },
      {
        id: "hesitant",
        situation: "A patient hesitates and says they are not sure how to describe their request.",
      },
    ],
    distractorPatterns: [
      {
        id: "dismiss",
        theme: "Dismissive response",
        response:
          "Repeat that the explanation has already been given rather than checking what is unclear.",
      },
      {
        id: "rush",
        theme: "Unnecessarily rush the patient",
        response: "Press the patient to finish quickly instead of giving them time to explain.",
      },
      {
        id: "confront",
        theme: "Confrontation and assumptions",
        response: "Focus on correcting the patient’s tone before understanding their request.",
      },
    ],
  },
};

const titles: Record<string, string> = {
  AB01: "A patient asks for an appointment",
  AB03: "Why do you need to know?",
  AB04: "Understanding the request",
  AB15: "Finding a clearer explanation",
};

// Apply uses the same approved principles in a more contextual conversation.
// Neither the patient preference nor their frustration establishes a local rule.
const applyContent: Record<string, Content> = {
  AB01: {
    correctBehaviour:
      "Acknowledge the appointment request and ask what help the patient needs before discussing where it should go.",
    allowedVariations: [
      {
        id: "appointment-request",
        situation:
          "A patient asks to book with a GP and starts listing times they can attend. They have not yet said what help they need.",
      },
      {
        id: "help-request",
        situation:
          "A patient says they want the same sort of appointment as last time. They have not explained whether this request is about the same thing.",
      },
    ],
    distractorPatterns: [
      {
        id: "promise-gp",
        theme: "Assume a GP appointment",
        response:
          "Start arranging the requested GP appointment and leave the reason for the visit until later.",
      },
      {
        id: "ignore-request",
        theme: "Prioritise booking preferences over understanding",
        response: "Ask only which day and time would suit them before choosing the next step.",
      },
      {
        id: "assume-route",
        theme: "Unsupported routing assumption",
        response: "Use their previous appointment type as the starting decision for this request.",
      },
    ],
  },
  AB03: {
    correctBehaviour:
      "Acknowledge their hesitation and explain that a brief description helps the practice understand what support they need.",
    allowedVariations: [
      {
        id: "why-ask",
        situation:
          "When asked what help they need, a patient replies, “Why do you need to know? I just want an appointment.”",
      },
      {
        id: "hesitant",
        situation:
          "A patient pauses and says they are not comfortable giving a full account. They ask whether reception really needs all the details.",
      },
      {
        id: "prefer-clinician",
        situation:
          "A patient says, “I would rather discuss the details with a clinician. Why are you asking me about it now?”",
      },
    ],
    distractorPatterns: [
      {
        id: "diagnosing",
        theme: "Overstate reception's role",
        response: "Explain that the details let reception work out what is medically wrong.",
      },
      {
        id: "pressure",
        theme: "Repeat the request without explanation",
        response:
          "Ask them to give the full account first, then explain what the information is for.",
      },
      {
        id: "invent-policy",
        theme: "Unsupported policy explanation",
        response:
          "Describe full disclosure as a booking requirement without checking whether that is the practice’s policy.",
      },
    ],
  },
  AB04: {
    correctBehaviour:
      "Let the patient finish, then briefly summarise what you understood and check it with them.",
    allowedVariations: [
      {
        id: "begins-explaining",
        situation:
          "A patient's opening words sound like a request you have handled before, but they are still explaining. You think you recognise what they need.",
      },
      {
        id: "adds-context",
        situation:
          "You begin to summarise a request. The patient says, “There is something else I need to explain,” and starts adding context.",
      },
    ],
    distractorPatterns: [
      {
        id: "interrupt",
        theme: "Prematurely narrow the request",
        response: "Move straight to a short yes-or-no question about the request you expect.",
      },
      {
        id: "assume-issue",
        theme: "Fill gaps from experience",
        response: "Finish their explanation using the details of the similar request you remember.",
      },
      {
        id: "select-route",
        theme: "Choose a route too early",
        response: "Choose the next step now and invite the patient to add details afterwards.",
      },
    ],
  },
  AB15: {
    correctBehaviour:
      "Acknowledge the difficulty, give them time and use a simpler explanation before checking what is still unclear.",
    allowedVariations: [
      {
        id: "confused",
        situation:
          "You have explained a point once. The patient says, “I still do not understand,” and sounds embarrassed about asking again.",
      },
      {
        id: "frustrated",
        situation:
          "A patient says, “I keep trying to explain, but I do not think you understand.” They sound frustrated and stop speaking.",
      },
      {
        id: "hesitant",
        situation:
          "A patient keeps starting and stopping while describing their request. They apologise and say they cannot find the right words.",
      },
    ],
    distractorPatterns: [
      {
        id: "dismiss",
        theme: "Repeat without adapting",
        response: "Repeat the same explanation more slowly without asking which part is unclear.",
      },
      {
        id: "rush",
        theme: "Move on without checking",
        response:
          "Give a quick summary and move to the next question before checking their understanding.",
      },
      {
        id: "confront",
        theme: "Correct rather than understand",
        response: "Explain why your first response was right before inviting them to continue.",
      },
    ],
  },
};

export function appointmentRecipe(
  code: string,
  templateId: string,
  level: "learn" | "apply",
  situationPattern: string,
): CoreExecutableRecipe | undefined {
  const candidate = (level === "apply" ? applyContent : content)[code];
  if (!candidate) return undefined;
  return {
    id: `${templateId}.recipe`,
    version: 2,
    eligibleLevel: level,
    interaction: "single_choice",
    situationPattern,
    ...candidate,
    allowedVariations: candidate.allowedVariations.map((v) => ({ ...v, title: titles[code] })),
    requiredBindings: [],
    optionalBindings: [],
    forbiddenInferences: coreForbiddenInferences,
  };
}
