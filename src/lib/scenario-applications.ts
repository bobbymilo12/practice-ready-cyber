/** Small application layer: configuration supplies facts; frames supply only situations. */
export interface ScenarioFact {
  label: string;
  rule: string;
  situation: string;
  condition?: string;
}
export interface Application extends ScenarioFact {
  validActions?: string[];
  feedback: string;
  followUpSituation?: string;
  alternatives?: string[];
}

export function naturalSituation(text: string): string {
  return text
    .replace(
      /A request needs the recorded appointment escalation route\. Who should reception contact and how\?/,
      "You cannot resolve a patient’s appointment request. Who would you contact for help, and how?",
    )
    .replace(
      /A colleague asks about the additional local procedure for this topic\. Which instruction has the manager recorded\?/,
      "A colleague hands over a request with an additional requirement. How would you handle it?",
    )
    .replace(
      /A patient asks about the practice’s recorded pharmacy information\. What can you tell them\?/,
      "A patient asks where their prescription will be sent. What can you tell them?",
    )
    .replace(
      /Which possible (?:routes|processes) are recorded[^?]*\?/g,
      "What can you explain about the available routes?",
    )
    .replace(/Which methods are recorded by the practice\?/g, "How can you help them submit it?")
    .replace(
      /Which (?:recorded|local|locally confirmed) (?:process|procedure|arrangement|handover process) applies\?/g,
      "What would you do next?",
    )
    .replace(/What is the (?:recorded|local) (?:process|arrangement)\?/g, "What would you do next?")
    .replace(
      /Which local confidentiality procedure applies\?/g,
      "What should you check before responding?",
    )
    .replace(
      /What is the recorded way to check receipt\?/g,
      "How would you check it has been received?",
    )
    .replace(/Which recorded wording should reception use\?/g, "How would you respond?")
    .replace(/the recorded urgent contact/g, "the urgent contact")
    .replace(/recorded turnaround/g, "expected turnaround")
    .replace(/the local handover/g, "the handover");
}

const action = (value: string) => {
  const text = value.trim();
  const actions: Record<string, string> = {
    "Reception can book eligible same-day appointments directly":
      "Book an eligible same-day appointment directly",
    "Clinical triage is required before booking":
      "Send the request for clinical triage before booking",
    "Reception books directly": "Book the routine appointment directly",
    "Reception books according to clinician/appointment type":
      "Match the request to the clinician and appointment type before booking",
    "Online request first": "Ask the patient to submit an online request first",
    "Clinical triage required": "Send the request for clinical triage",
  };
  if (actions[text]) return actions[text];
  if (/^same-day(?: with a)? GP$/i.test(text)) return "Arrange a same-day GP appointment";
  if (/^(same-day|routine) (GP|clinician|appointment)$/i.test(text))
    return `Use the ${text} pathway`;
  if (/^duty\b/i.test(text)) return `Contact ${text}`;
  return text;
};

// Only explicit condition -> action pairs are split. Never split prose steps or infer clinical rules.
export function explicitRules(value: string): { condition: string; action: string }[] {
  const lines = value
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  const pairs = lines.map((line) => line.match(/^\s*(?:[-*•]\s*)?(.+?)\s*(?:->|→)\s*(.+)$/));
  return pairs.length && pairs.every(Boolean)
    ? pairs.map((p) => ({ condition: p![1].trim(), action: action(p![2]) }))
    : groupedRules(value);
}

// Recognise only an explicit action heading and its list. Ambiguous prose stays intact.
function groupedRules(value: string): { condition: string; action: string }[] {
  const match = value
    .trim()
    .match(/^(Same-day(?: with a)? GP|Routine(?: with a)? GP):\s*([\s\S]+)$/i);
  if (!match) return [];
  let body = match[2].trim();
  const unsure = body.match(/(?:[.;]\s*|\n\s*)(?:When|If) unsure\s*(?:—|–|->|→|:)\s*([^\n]+)$/i);
  if (unsure) body = body.slice(0, unsure.index).trim();
  // Do not split qualifiers or conjunctions whose scope could cover more than one item.
  if (/\b(?:unless|except|only if|otherwise)\b|[;:]|\b(?:and|or)\b/i.test(body)) return [];
  let depth = 0;
  const parts: string[] = [];
  let current = "";
  for (const char of body) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth < 0) return [];
    if ((char === "," || char === "\n") && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else current += char;
  }
  if (depth) return [];
  if (current.trim()) parts.push(current.trim());
  const conditions = parts.map((p) =>
    p
      .replace(/^[-*•]\s*/, "")
      .replace(/[.]$/, "")
      .trim(),
  );
  if (!conditions.length || conditions.some((p) => !p || p.length > 120 || /[.!?]/.test(p)))
    return [];
  const result = conditions.map((condition) => ({ condition, action: action(match[1]) }));
  if (unsure)
    result.push({ condition: "When unsure", action: action(unsure[1].replace(/[.]$/, "")) });
  return result;
}

export function scenarioQuestion(situation: string): string {
  if (/who|direct|route|contact/i.test(situation)) return "Where should this request be directed?";
  if (/identity|confidential|behalf|another patient/i.test(situation))
    return "What should you check before responding?";
  if (/details|handover|record|report/i.test(situation)) return "What should you include?";
  if (/submit|receive|opening hours|when.*open/i.test(situation))
    return "What would you tell them?";
  return "What would you do next?";
}

interface ConditionFrame {
  title: string;
  situation: string;
  followUpSituation?: string;
  alternatives: string[];
}
// Deliberately bounded presentations, not a clinical interpretation engine.
// Unknown labels and qualified shorthand are retained in configuration but not dramatised.
function conditionFrame(condition: string): ConditionFrame | undefined {
  const key = condition.trim().toLowerCase();
  if (/^(?:under[ -]?5(?:s)? illness|illness (?:in )?under[ -]?5s?)$/.test(key))
    return {
      title: "An unwell young child",
      situation: "A parent calls about their 3-year-old, who has been unwell since yesterday.",
      followUpSituation:
        "A parent comes to reception with their unwell 4-year-old and asks how to get help.",
      alternatives: [
        "Check whether the parent is asking about an existing appointment.",
        "Confirm the family's preferred appointment time before choosing a route.",
        "Ask whether the family wants a repeat of the child's previous appointment type.",
      ],
    };
  if (key === "acutely unwell child")
    return {
      title: "A parent needs help for an unwell child",
      situation:
        "A parent contacts reception because their child has become unwell and asks for help.",
      alternatives: [
        "Check whether the parent wants to change an existing appointment.",
        "Ask which clinician the family usually sees before choosing a route.",
        "Confirm the parent's preferred time before deciding how to handle the request.",
      ],
    };
  if (key === "urinary symptoms / suspected uti")
    return {
      title: "An enquiry about urinary symptoms",
      situation: "A patient contacts reception about urinary symptoms and asks how to get help.",
      alternatives: [
        "Check whether the enquiry is about an earlier appointment.",
        "Ask which appointment format the patient prefers before choosing a route.",
        "Check whether the patient wants to follow up a previous request.",
      ],
    };
  if (key === "mental health crisis")
    return {
      title: "A distressed caller needs help",
      situation:
        "A patient calls sounding very distressed and says they are struggling to cope and need to speak to someone today.",
      alternatives: [
        "Check whether the caller wants to chase an existing request.",
        "Clarify which clinician the caller prefers before deciding how to handle the request.",
        "Check whether this is a request to bring an existing appointment forward.",
      ],
    };
  if (key === "new severe headache")
    return {
      title: "A new concern over the phone",
      situation: "A patient calls about a severe headache that is new for them and asks for help.",
      alternatives: [
        "Check whether the patient is asking to change a booked appointment.",
        "Ask which appointment format the patient prefers before choosing a route.",
        "Check whether the enquiry is about following up a previous visit.",
      ],
    };
  if (/^(?:when |if )?unsure$/.test(key))
    return {
      title: "An unclear appointment request",
      situation: "You cannot work out which route fits a patient's request.",
      alternatives: [
        "Use the route for the closest matching appointment type.",
        "Ask the patient to choose between the available appointment types.",
        "Use the route taken for the patient's last request.",
      ],
    };
  return undefined;
}

export function applications(fact: ScenarioFact): Application[] {
  const pairs = fact.condition
    ? [{ condition: fact.condition, action: action(fact.rule) }]
    : explicitRules(fact.rule);
  if (pairs.length)
    return pairs.flatMap((pair) => {
      const frame = conditionFrame(pair.condition);
      if (!frame) return [];
      const validActions = pairs
        .filter((other) => other.condition.toLowerCase() === pair.condition.toLowerCase())
        .map((other) => other.action);
      // Reuse only supported, distinct booking/triage actions from this same configured rule set.
      // Never use ambiguous shorthand, clinical advice or another valid action as a distractor.
      const configuredAlternatives = pairs
        .filter(
          (other) =>
            conditionFrame(other.condition) &&
            !validActions.includes(other.action) &&
            /^(Arrange a (?:same-day|routine) GP appointment|Use the routine (?:GP|clinician|appointment) pathway|Contact duty triage(?: first)?|Send the request for clinical triage(?: before booking)?)$/i.test(
              other.action,
            ),
        )
        .map((other) => other.action);
      return [
        {
          label: frame.title,
          condition: pair.condition,
          validActions,
          rule: pair.action,
          situation: frame.situation,
          followUpSituation: frame.followUpSituation,
          alternatives: [...new Set([...configuredAlternatives, ...frame.alternatives])]
            .filter((option) => !validActions.includes(option))
            .slice(0, 3),
          feedback: `For ${pair.condition.toLowerCase()}, the next step at this practice is to ${pair.action.charAt(0).toLowerCase()}${pair.action.slice(1)}.`,
        },
      ];
    });
  const items = fact.rule
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
  const channels = /request methods|repeat requests|submitted|requests submitted/i.test(fact.label);
  if (
    channels &&
    items.length &&
    items.every((item) =>
      /^(NHS App|Telephone|At reception|Paper request at reception|Nominated pharmacy|Practice website \/ online form)$/.test(
        item,
      ),
    )
  )
    return items.map((method) => ({
      label: items.length > 1 ? `${fact.label}: ${method}` : fact.label,
      rule: `Explain how to submit the request using ${method}`,
      situation: `A patient wants to submit ${/prescription|repeat/i.test(fact.label + fact.situation) ? "a prescription" : /fit note/i.test(fact.label) ? "a fit note" : "an appointment"} request and asks whether they can use ${method}. What would you tell them?`,
      feedback: `${method} is an accepted way to submit this request at this practice. Submitting a request does not confirm its outcome.`,
    }));
  if (/which details|activities.*shadow/i.test(fact.label) && items.length > 1)
    return items.map((item) => ({
      label: `${fact.label}: ${item}`,
      rule: `Include ${item.toLowerCase()}`,
      situation: `${naturalSituation(fact.situation)} A colleague has included ${items.filter((other) => other !== item).join("; ")}, but left out ${item.toLowerCase()}. What needs changing?`,
      feedback: `${item} is part of this practice's requirements for this task. A partial handover or plan misses this requirement.`,
    }));
  return [
    {
      ...fact,
      rule: action(fact.rule),
      situation: naturalSituation(fact.situation),
      feedback: `Apply this step to this type of request: ${fact.rule.replace(/[.]$/, "")}. Do not assume that a different request follows the same process.`,
    },
  ];
}

// Mistakes concern timing, completeness or assumptions, never invented local services.
export function applicationMistakes(situation: string): string[] {
  if (/identity|confidential|another patient|behalf/i.test(situation))
    return [
      "Treat familiarity with the caller as enough to release the information.",
      "Give a brief summary before completing the checks.",
      "Take the caller's knowledge of the patient's details as permission to share.",
    ];
  if (/record|details|handover|report/i.test(situation))
    return [
      "Leave the details until the end of the shift.",
      "Pass on only the patient's name and the general reason for calling.",
      "Assume the earlier conversation contains everything needed.",
    ];
  if (/prescription|medication|pharmacy/i.test(situation))
    return [
      "Treat the request being submitted as confirmation that it has been authorised.",
      "Use the status of the last prescription to answer this enquiry.",
      "Check only where the prescription should be sent, without checking its progress.",
    ];
  if (/result/i.test(situation))
    return [
      "Treat the result being available as permission to share it.",
      "Give the result without checking whether there is a follow-up instruction.",
      "Use the previous result's follow-up instruction for this enquiry.",
    ];
  if (/appointment|book|request|unwell/i.test(situation))
    return [
      "Choose an appointment by availability before checking whether it suits this request.",
      "Use the appointment type from the patient's last visit for this request.",
      "Treat the patient's requested appointment type as confirmation that it is appropriate.",
    ];
  return [
    "Carry out the first step only and treat the request as complete.",
    "Use the response to a similar enquiry without checking the differences.",
    "Pass on the request without the information needed to act on it.",
  ];
}
