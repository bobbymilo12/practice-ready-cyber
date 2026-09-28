/** Small application layer: configuration supplies facts; frames supply only situations. */
export interface ScenarioFact {
  label: string;
  rule: string;
  situation: string;
}
export interface Application extends ScenarioFact {
  feedback: string;
  followUpSituation?: string;
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
  if (/^(same-day|routine) (GP|clinician|appointment)/i.test(text))
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
    : [];
}

function conditionSituation(condition: string): [string, string?] {
  if (/^(?:under[ -]?5(?:s)? illness|illness (?:in )?under[ -]?5s?)$/i.test(condition))
    return [
      "A parent calls about their 3-year-old, who has been unwell since yesterday. What would you do next?",
      "A parent comes to reception with their unwell 4-year-old and asks how to get help. What would you do next?",
    ];
  if (/^(?:when |if )?unsure$/i.test(condition))
    return ["You cannot work out which route fits a patient's request. What would you do next?"];
  return [
    `A caller describes the reason for their request as “${condition}”. What would you do next?`,
  ];
}

export function applications(fact: ScenarioFact): Application[] {
  const pairs = explicitRules(fact.rule);
  if (pairs.length)
    return pairs.map((pair) => {
      const [situation, followUpSituation] = conditionSituation(pair.condition);
      return {
        label: `${fact.label}: ${pair.condition}`,
        rule: pair.action,
        situation,
        followUpSituation,
        feedback: `For ${pair.condition.toLowerCase()}, the next step at this practice is to ${pair.action.charAt(0).toLowerCase()}${pair.action.slice(1)}.`,
      };
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
  if (/request|appointment|book|medication|prescription/i.test(situation))
    return [
      "Repeat what happened for the patient's previous request without checking whether it applies.",
      "Treat the patient's preferred outcome as authorisation to proceed.",
      "Ask the patient to call back before taking any action on the request.",
    ];
  return [
    "Rely on what happened last time without checking whether the circumstances match.",
    "Give an answer based on what the caller expects to happen.",
    "Leave the matter for the caller to raise again.",
  ];
}
