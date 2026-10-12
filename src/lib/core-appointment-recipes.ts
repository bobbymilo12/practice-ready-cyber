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
        theme: "Prioritise clinician preference",
        response: "Ask which GP they would prefer to see.",
      },
      {
        id: "ignore-request",
        theme: "Prioritise appointment times",
        response: "Start by checking which appointment times suit them.",
      },
      {
        id: "assume-route",
        theme: "Unsupported routing assumption",
        response: "Ask which appointment type they had last time and look for a similar slot.",
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
        theme: "Offer choices before explaining the question",
        response: "Explain the appointment types available and ask them to choose.",
      },
      {
        id: "pressure",
        theme: "Reassure without explaining the purpose",
        response: "Reassure them that the conversation is private, then repeat the question.",
      },
      {
        id: "invent-policy",
        theme: "Hand over before explaining",
        response: "Offer to ask a colleague to explain the booking process.",
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
        response: "Ask which appointment times would suit them.",
      },
      {
        id: "assume-issue",
        theme: "Assume the issue",
        response: "Suggest what you think they mean and ask for a yes-or-no answer.",
      },
      {
        id: "select-route",
        theme: "Invent or select a pathway prematurely",
        response: "Explain the usual options for the part of the request you have heard.",
      },
    ],
  },
  AB15: {
    correctBehaviour:
      "Ask which part is unclear, explain it in a different way and check it makes sense.",
    allowedVariations: [
      {
        id: "confused",
        situation:
          "A patient says they don’t understand what you’ve explained and asks you to go over it again.",
      },
      {
        id: "frustrated",
        situation:
          "A patient sounds frustrated and says they cannot follow the instructions you have just given.",
      },
      {
        id: "hesitant",
        situation:
          "A patient hesitates after your explanation and says they are unsure what to do next.",
      },
    ],
    distractorPatterns: [
      {
        id: "dismiss",
        theme: "Repeat without adapting",
        response: "Repeat the same explanation more slowly.",
      },
      {
        id: "rush",
        theme: "Defer checking understanding",
        response: "Go over the information again and suggest they call back with any questions.",
      },
      {
        id: "confront",
        theme: "Hand over before clarifying",
        response: "Ask a colleague to take over the explanation.",
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
        response: "Check their preferred GP’s appointment times first, then ask about the request.",
      },
      {
        id: "ignore-request",
        theme: "Prioritise booking preferences over understanding",
        response: "Start with their preferred day and time, then discuss appointment types.",
      },
      {
        id: "assume-route",
        theme: "Unsupported routing assumption",
        response: "Look up their last appointment and offer to arrange the same type.",
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
        theme: "Offer choices before explaining the question",
        response: "Describe the appointment types available and ask which they would prefer.",
      },
      {
        id: "pressure",
        theme: "Repeat the request without explanation",
        response:
          "Reassure them that their information is confidential and ask the question again.",
      },
      {
        id: "invent-policy",
        theme: "Hand over before explaining",
        response: "Offer to pass the conversation to a colleague who can explain the process.",
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
        response:
          "Ask a yes-or-no question to check whether this matches the request you recognise.",
      },
      {
        id: "assume-issue",
        theme: "Fill gaps from experience",
        response: "Summarise the similar request you have in mind and ask if that sounds right.",
      },
      {
        id: "select-route",
        theme: "Choose a route too early",
        response: "Outline the usual next steps, then ask what else they wanted to add.",
      },
    ],
  },
  AB15: {
    correctBehaviour:
      "Reassure them that it is fine to ask again, find out what is unclear and explain it differently.",
    allowedVariations: [
      {
        id: "confused",
        situation:
          "You have explained a point once. The patient says, “I still do not understand,” and sounds embarrassed about asking again.",
      },
      {
        id: "frustrated",
        situation:
          "After you explain the next steps, a patient says, “I have heard that twice, but I still don’t know what I need to do.”",
      },
      {
        id: "hesitant",
        situation:
          "You have explained the next steps. A patient apologises for asking again and says they are unsure which step comes first.",
      },
    ],
    distractorPatterns: [
      {
        id: "dismiss",
        theme: "Repeat without adapting",
        response: "Repeat the instructions slowly, pausing between each step.",
      },
      {
        id: "rush",
        theme: "Move on without checking",
        response: "Summarise the instructions and suggest they call back when they are ready.",
      },
      {
        id: "confront",
        theme: "Hand over before clarifying",
        response: "Ask a colleague to give them the explanation instead.",
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
