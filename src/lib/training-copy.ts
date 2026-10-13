import {
  routeContacts,
  contactText,
  contactMissing,
  type ContactRoute,
} from "./practice-config.ts";
import type { PracticeData } from "./store";
import type { Scenario } from "./training-types";

/** Linguistic forms only. A recognised channel establishes permission, never a workflow. */
const channelForms: Record<string, { phrase: string; title: string }> = {
  Telephone: { phrase: "by telephone", title: "Telephone requests" },
  "NHS App": { phrase: "through the NHS App", title: "Requests through the NHS App" },
  "Practice website / online form": {
    phrase: "through the practice website or online form",
    title: "Online requests",
  },
  "At reception": { phrase: "at reception", title: "Requests at reception" },
  "Paper request at reception": { phrase: "on paper at reception", title: "Paper requests" },
  "Nominated pharmacy": {
    phrase: "through their nominated pharmacy",
    title: "Requests through a nominated pharmacy",
  },
};
export const submissionChannel = (value: string) => channelForms[value.trim()];
export const readableList = (
  items: string[],
  type: "conjunction" | "disjunction" = "conjunction",
) => new Intl.ListFormat("en-GB", { style: "long", type }).format(items);
export function requestSubject(label: string, situation: string): string {
  const text = label + " " + situation;
  if (/non-repeat/i.test(text)) return "a non-repeat prescription request";
  if (/repeat request|repeat prescription/i.test(text)) return "a repeat prescription request";
  if (/prescription/i.test(text)) return "a prescription request";
  if (/fit note/i.test(text)) return "a fit note request";
  if (/appointment/i.test(text)) return "an appointment request";
  return "this request";
}
export function methodApplication(label: string, situation: string, method: string) {
  const form = submissionChannel(method);
  if (!form) return undefined;
  const subject = requestSubject(label, situation);
  return {
    copyKind: "allowed-channel" as const,
    label: "Submitting " + subject + " " + form.phrase,
    rule:
      "Yes, this practice accepts these requests " +
      form.phrase.replace("their nominated", "your nominated") +
      ".",
    situation:
      "A patient asks if they can submit " +
      subject +
      " " +
      form.phrase +
      ". What should you tell them?",
    feedback:
      "This type of request can be submitted " +
      form.phrase +
      " at this practice. Submitting it does not confirm the outcome.",
  };
}
export function readableGuidance(text: string): string {
  return text
    .split(/;\s*|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (/[.!?:]$/.test(part) ? part : part + "."))
    .join(" ");
}
export function readableTitle(label: string): string {
  const clean = label
    .replace(/^Routing:\s*/, "")
    .replace(/^Individual exception:\s*/, "Responsibilities for ");
  return clean.replace(/\?$/, "");
}
export function roleDestination(role: string): string {
  if (/^(doctor|nurse practitioner|nurse|pharmacist)$/i.test(role.trim())) return "a " + role;
  return "the " + role;
}
export function routingAction(destinations: string[], query: boolean): string {
  return (
    (query ? "Pass the query to " : "Direct the patient to ") +
    readableList(destinations, "disjunction") +
    "."
  );
}

/** Catch unfinished templates at the generation boundary; never rewrite saved content/provenance.
 * Exact local sequences and manager-authored wording are not guessed at or paraphrased.
 */
export function hasFinishedCopy(scenario: Scenario): boolean {
  if (scenario.kind !== "mcq" || scenario.provenance) return true;
  const copy = [
    scenario.title,
    scenario.patientQuote,
    scenario.question,
    ...scenario.options,
    scenario.learningPoint,
  ].join("\n");
  return !/\?:|\b(?:using|use) (?:Telephone|Practice website \/ online form|Paper request at reception)\b|^Routing:|Apply this step to this type of request|\[object Object\]|\bundefined\b/m.test(
    copy,
  );
}

/** A destination and contact method are rendered from their distinct saved fields. */
export function contactRouteCopy(route: ContactRoute, practice: PracticeData): string {
  if (contactMissing(route, practice)) return "";
  const contacts = routeContacts(route).map((c) => {
    if (c.kind === "role")
      return roleDestination(contactText(c, practice.staff, practice.roleRequests));
    if (c.kind === "staff") {
      const staff = practice.staff.find((s) => s.id === c.staffId)!;
      return staff.name + " (" + staff.role + ")";
    }
    return c.text;
  });
  const method = (
    {
      phone: "by telephone" + (route.method.other ? " on " + route.method.other : ""),
      person: "in person",
      teams: "through Microsoft Teams",
      system: "through the clinical system",
      other: "using this contact method: " + route.method.other,
    } as Record<string, string>
  )[route.method.id];
  if (!method) return "";
  return (
    "Contact " +
    readableList(contacts, "disjunction") +
    " " +
    method +
    "." +
    (route.instruction.trim() ? " " + route.instruction.trim() : "")
  );
}

/** These exact UI choices specify a location or delivery method, not additional steps. */
export function configuredAnswer(label: string, answer: string): string {
  if (/where.*(?:document|record)/i.test(label)) {
    const locations: Record<string, string> = {
      "Clinical system task": "Record the request as a task in the clinical system.",
      "Patient’s clinical record": "Record it in the patient's clinical record.",
      "Practice incident reporting system": "Record it in the practice incident reporting system.",
      "Home visit request list in the clinical system":
        "Record the request on the home visit list in the clinical system.",
    };
    return locations[answer] ?? answer;
  }
  if (/How are issued fit notes provided/i.test(label)) {
    const methods: Record<string, string> = {
      "Secure digital message": "The fit note is sent by secure digital message.",
      "Paper collection from reception": "The fit note can be collected on paper from reception.",
      "Patient chooses secure digital message or paper collection":
        "The patient can choose a secure digital message or paper collection.",
    };
    return methods[answer] ?? answer;
  }
  return answer;
}
