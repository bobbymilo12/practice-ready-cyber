/** Product-maintained starting points. IDs and versions must not depend on display wording.
 * Populate reviewed selections using existing request IDs only, after content review.
 * The legacy appointment-capabilities defaults are explicitly placeholders, so are NOT
 * reliable selections to import. In particular, never expand broad 'minor illness'
 * into assumed permission for every specific patient request.
 */
export interface RoleTemplate {
  id: string;
  version: number;
  label: string;
  aliases: string[];
  suggestions: {
    status: "awaiting-review" | "reviewed";
    selectedRequestIds: string[];
  };
}
export const roleTemplates: RoleTemplate[] = [
  {
    id: "gp",
    version: 1,
    label: "Doctor",
    aliases: ["GP", "Doctor / GP", "Doctor (GP)"],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "practice-nurse",
    version: 1,
    label: "Practice Nurse",
    aliases: [],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "healthcare-assistant",
    version: 1,
    label: "Healthcare Assistant",
    aliases: ["HCA"],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "nurse-practitioner",
    version: 1,
    label: "Nurse Practitioner",
    aliases: [],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  // Keep ANP and NP distinct to preserve existing local roles and employee exceptions.
  {
    id: "advanced-nurse-practitioner",
    version: 1,
    label: "Advanced Nurse Practitioner",
    aliases: ["ANP"],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "clinical-pharmacist",
    version: 1,
    label: "Clinical Pharmacist",
    aliases: [],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "physician-associate",
    version: 1,
    label: "Physician Associate",
    aliases: [],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "first-contact-physiotherapist",
    version: 1,
    label: "First Contact Physiotherapist",
    aliases: [],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "mental-health-practitioner",
    version: 1,
    label: "Mental Health Practitioner",
    aliases: [],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "social-prescribing-link-worker",
    version: 1,
    label: "Social Prescribing Link Worker",
    aliases: [],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
  {
    id: "paramedic",
    version: 1,
    label: "Paramedic",
    aliases: [],
    suggestions: { status: "awaiting-review", selectedRequestIds: [] },
  },
];
/** The role_templates table is the source of truth; the literal above is only a dev/test fallback. */
export function setRoleTemplates(list: RoleTemplate[]) {
  if (list.length) roleTemplates.splice(0, roleTemplates.length, ...list);
}
const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
export function roleTemplateForName(name: string): RoleTemplate | undefined {
  return roleTemplates.find((t) =>
    [t.label, ...t.aliases].some((label) => normalise(label) === normalise(name)),
  );
}
