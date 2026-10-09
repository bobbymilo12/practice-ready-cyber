import type { PracticeData } from "./store";
import type { PracticeRoleRequests } from "./role-requests";
import { selectedRequests } from "./role-requests.ts";

export const roleList = (names: string[]) =>
  new Intl.ListFormat("en-GB", { style: "long", type: "disjunction" }).format(names);

/** Linguistic forms only; this table supplies no responsibilities or clinical facts. */
const singular: Record<string, string> = {
  "cervical screening": "cervical screening",
  "wound care": "wound care",
  "chest infections": "a chest infection",
  utis: "a UTI",
  coughs: "a cough",
  "sore throats": "a sore throat",
  "ear problems": "an ear problem",
  "minor skin problems": "a minor skin problem",
  "minor injuries": "a minor injury",
  "eye problems": "an eye problem",
  "asthma reviews": "an asthma review",
  "diabetes reviews": "a diabetes review",
  "blood pressure checks": "a blood pressure check",
  "medication reviews": "a medication review",
  "prescription queries": "a prescription query",
  "contraception queries": "a contraception query",
  "breast examination": "a breast examination",
  "blood tests": "a blood test",
  ecg: "an ECG",
  vaccinations: "a vaccination",
  "new patient checks": "a new patient check",
  "fit note requests": "a fit note request",
  "test result queries": "a test result query",
  "referral queries": "a referral query",
  "mental health appointments": "a mental health appointment",
  "musculoskeletal appointments": "a musculoskeletal appointment",
};
export function roleRequestSituation(label: string): string {
  const clean = label.trim().replace(/[.!?]+$/, "");
  return `A patient contacts the practice about ${singular[clean.toLowerCase()] ?? clean}.`;
}

/** Alternatives are confirmed local roles with this exact request present but unselected.
 * Label collisions are excluded rather than treating equivalent custom entries as false.
 */
export function roleAnswerChoices(
  p: PracticeData,
  id: string,
  label: string,
  valid: PracticeRoleRequests[],
): string[] {
  const correctNames = new Set(valid.map((r) => r.label.trim().toLowerCase()));
  const alternatives = Object.values(p.roleRequests ?? {})
    .filter(
      (role) =>
        role.confirmed &&
        !role.archived &&
        role.label.trim() &&
        !correctNames.has(role.label.trim().toLowerCase()) &&
        role.categories.some((c) => c.requests.some((r) => r.id === id)) &&
        !selectedRequests(role).some(
          (r) => r.id === id || r.label.trim().toLowerCase() === label.trim().toLowerCase(),
        ),
    )
    .map((r) => r.label);
  const correct = roleList([...new Set(valid.map((r) => r.label))]);
  const distinct = [...new Set(alternatives)];
  // A binary recognition question is safer than fabricated destinations or filler.
  return [
    correct,
    ...(distinct.length
      ? distinct.slice(0, 3)
      : ["None of these practice roles handles this request."]),
  ];
}

/** Umbrella request names do not specify a unique operational task. No clinical inference. */
export function broadRequestLabel(label: string): boolean {
  return (
    /^(prescription|medication|test result|referral|contraception) quer(?:y|ies)$/i.test(
      label.trim(),
    ) ||
    /^(other|general|administrative|admin)( requests?| queries| enquiries| issues)?$/i.test(
      label.trim(),
    )
  );
}
