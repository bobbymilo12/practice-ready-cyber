import type { PracticeData, StaffMember } from "./store";
import { roleTemplateForName, type RoleTemplate } from "./role-templates.ts";

export interface RoleRequest {
  id: string;
  label: string;
  custom?: boolean;
}
export interface RequestCategory {
  id: string;
  label: string;
  requests: RoleRequest[];
  custom?: boolean;
}
export interface PracticeRoleRequests {
  roleId: string;
  label: string;
  categories: RequestCategory[];
  selectedRequestIds: string[];
  confirmed: boolean;
  archived?: boolean;
  // Snapshot provenance only: later library updates never rewrite local selections.
  template?: { id: string; version: number; suggestions: "awaiting-review" | "reviewed" };
  suggestionsEdited?: boolean;
}
// Role identity deliberately preserves distinct local roles (e.g. ANP and Nurse Practitioner).
export const requestRoleId = (role: string) =>
  `role:${role.trim().toLowerCase().replace(/\s+/g, " ")}`;
const category = (id: string, label: string, entries: string[]): RequestCategory => ({
  id,
  label,
  requests: entries.map((label) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
  })),
});
export const requestCategories = [
  category("minor-illness", "Minor illness & same-day care", [
    "Chest infections",
    "UTIs",
    "Coughs",
    "Sore throats",
    "Ear problems",
    "Minor skin problems",
    "Minor injuries",
    "Eye problems",
  ]),
  category("long-term", "Long-term condition care", [
    "Asthma reviews",
    "Diabetes reviews",
    "Blood pressure checks",
  ]),
  category("medication", "Medication-related care", ["Medication reviews", "Prescription queries"]),
  category("women", "Women's health", [
    "Cervical screening",
    "Contraception queries",
    "Breast examination",
  ]),
  category("tests", "Tests & procedures", ["Blood tests", "ECG", "Wound care"]),
  category("prevention", "Preventative care", ["Vaccinations", "New patient checks"]),
  category("admin", "Administrative / other", [
    "Fit note requests",
    "Test result queries",
    "Referral queries",
    "Mental health appointments",
    "Musculoskeletal appointments",
  ]),
];
// All roles receive the same unselected catalogue. Suggestions do not assert clinical scope.
export function suggestedRole(role: string): PracticeRoleRequests {
  return {
    roleId: requestRoleId(role),
    label: role.trim(),
    categories: structuredClone(requestCategories),
    selectedRequestIds: [],
    confirmed: false,
  };
}
/** Create a new, independent practice copy. Never use this to refresh saved configurations. */
export function initialiseRoleFromTemplate(
  template: RoleTemplate,
  label = template.label,
): PracticeRoleRequests {
  const role = suggestedRole(label);
  const ids = new Set(role.categories.flatMap((c) => c.requests.map((r) => r.id)));
  if (template.suggestions.selectedRequestIds.some((id) => !ids.has(id)))
    throw new Error(`Unknown request ID in role template ${template.id}`);
  return {
    ...role,
    selectedRequestIds:
      template.suggestions.status === "reviewed"
        ? [...template.suggestions.selectedRequestIds]
        : [],
    template: {
      id: template.id,
      version: template.version,
      suggestions: template.suggestions.status,
    },
  };
}
export function roleConfigurationStatus(role: PracticeRoleRequests): string {
  if (role.confirmed) return "Configured";
  return role.template?.suggestions === "reviewed" && !role.suggestionsEdited
    ? "Suggested setup ready"
    : "Needs review";
}
/** Match library identity without changing legacy role keys or combining local configurations. */
export function matchesRoleTemplate(role: PracticeRoleRequests, template: RoleTemplate): boolean {
  return role.template
    ? role.template.id === template.id
    : roleTemplateForName(role.label)?.id === template.id;
}
/** Restore saved data first. A template is applied only when a role has no stored configuration. */
export function roleToAdd(
  p: PracticeData,
  name: string,
  template = roleTemplateForName(name),
): PracticeRoleRequests {
  const exact = p.roleRequests?.[requestRoleId(name)];
  const saved =
    exact ??
    (template && Object.values(p.roleRequests ?? {}).find((r) => matchesRoleTemplate(r, template)));
  if (saved) return { ...saved, archived: false };
  const legacy = template && practiceRoles(p).find((r) => matchesRoleTemplate(r, template));
  return template
    ? initialiseRoleFromTemplate(template, legacy?.label ?? name)
    : suggestedRole(name);
}
export function selectedRequests(role: PracticeRoleRequests): RoleRequest[] {
  if (!role.confirmed || role.archived) return [];
  return role.categories
    .flatMap((c) => c.requests)
    .filter((r) => role.selectedRequestIds.includes(r.id));
}
export function rolesForRequest(p: PracticeData, requestId: string): PracticeRoleRequests[] {
  return Object.values(p.roleRequests ?? {}).filter((r) =>
    selectedRequests(r).some((request) => request.id === requestId),
  );
}

/** Only confirmed, currently catalogued requests participate in effective capability queries. */
export function effectiveRequestsForStaff(p: PracticeData, staffId: string): RoleRequest[] {
  const person = p.staff.find((s) => s.id === staffId);
  const role = person && p.roleRequests?.[requestRoleId(person.role)];
  if (!person || !role?.confirmed || role.archived) return [];
  const overrides = person.requestOverrides?.[role.roleId] ?? {};
  return role.categories
    .flatMap((c) => c.requests)
    .filter((r) => overrides[r.id] ?? role.selectedRequestIds.includes(r.id));
}
export function requestsForStaff(p: PracticeData, staffId: string): string[] {
  return effectiveRequestsForStaff(p, staffId).map((r) => r.id);
}

/** Store a difference only on an explicit employee edit. Role edits never rewrite overrides. */
export function withRequestOverride(
  person: StaffMember,
  role: PracticeRoleRequests,
  requestId: string,
  enabled: boolean,
): StaffMember {
  if (
    requestRoleId(person.role) !== role.roleId ||
    !role.categories.some((c) => c.requests.some((r) => r.id === requestId))
  )
    return person;
  const overrides = { ...person.requestOverrides?.[role.roleId] };
  if (enabled === role.selectedRequestIds.includes(requestId)) delete overrides[requestId];
  else overrides[requestId] = enabled;
  return replaceRoleOverrides(person, role.roleId, overrides);
}
function replaceRoleOverrides(
  person: StaffMember,
  roleId: string,
  overrides: Record<string, boolean>,
): StaffMember {
  const byRole = { ...person.requestOverrides };
  if (Object.keys(overrides).length) byRole[roleId] = overrides;
  else delete byRole[roleId];
  return { ...person, requestOverrides: Object.keys(byRole).length ? byRole : undefined };
}
export function resetRequestOverride(
  person: StaffMember,
  roleId: string,
  requestId: string,
): StaffMember {
  const overrides = { ...person.requestOverrides?.[roleId] };
  delete overrides[requestId];
  return replaceRoleOverrides(person, roleId, overrides);
}
export function resetAllRequestOverrides(person: StaffMember): StaffMember {
  return { ...person, requestOverrides: undefined };
}
function matchesRequest(r: RoleRequest, request: string) {
  const query = request.trim().toLowerCase();
  const label = r.label.trim().toLowerCase();
  return r.id === request || label === query || label === `${query}s` || `${label}s` === query;
}
/** Includes eligible and ineligible employees so training can explain individual exceptions. */
export function staffForRequest(p: PracticeData, request: string) {
  return p.staff.flatMap((person) => {
    const role = p.roleRequests?.[requestRoleId(person.role)];
    if (!role?.confirmed || role.archived) return [];
    const matching = role.categories
      .flatMap((c) => c.requests)
      .filter((r) => matchesRequest(r, request));
    if (!matching.length) return [];
    const effective = new Set(requestsForStaff(p, person.id));
    return [
      {
        employee: person,
        role: role.label,
        canHandle: matching.some((r) => effective.has(r.id)),
        individualException: matching.some((r) =>
          Object.hasOwn(person.requestOverrides?.[role.roleId] ?? {}, r.id),
        ),
      },
    ];
  });
}
/** Role defaults stay separate from employee exceptions, including employee-only additions. */
export function routingForRequest(p: PracticeData, request: string) {
  const staff = staffForRequest(p, request);
  return Object.values(p.roleRequests ?? {})
    .filter(
      (role) =>
        role.confirmed &&
        (selectedRequests(role).some((r) => matchesRequest(r, request)) ||
          staff.some((s) => requestRoleId(s.employee.role) === role.roleId && s.canHandle)),
    )
    .map((role) => ({
      roleId: role.roleId,
      role: role.label,
      practiceDefault: selectedRequests(role).some((r) => matchesRequest(r, request)),
      employees: staff
        .filter((s) => requestRoleId(s.employee.role) === role.roleId && s.canHandle)
        .map((s) => s.employee),
    }));
}

// Include older employee roles without silently promoting their historical data to role defaults.
export function practiceRoles(p: PracticeData): PracticeRoleRequests[] {
  const roles = new Map(
    Object.values(p.roleRequests ?? {})
      .filter((r) => !r.archived)
      .map((r) => [r.roleId, r]),
  );
  for (const person of p.staff) {
    if (person.role.trim() && !roles.has(requestRoleId(person.role))) {
      const old = p.roleRequests?.[requestRoleId(person.role)];
      roles.set(
        requestRoleId(person.role),
        old ? { ...old, archived: false } : suggestedRole(person.role),
      );
    }
  }
  return [...roles.values()];
}

// Shared by inline role saving and the Roles step's final confirmation.
export function roleRequestErrors(config: PracticeRoleRequests): string[] {
  if (config.categories.some((c) => !c.label.trim() || c.requests.some((r) => !r.label.trim())))
    return ["Name or remove empty custom entries before saving."];
  const labels = config.categories.flatMap((c) =>
    c.requests.map((r) => r.label.trim().toLowerCase()),
  );
  const categories = config.categories.map((c) => c.label.trim().toLowerCase());
  return new Set(labels).size !== labels.length || new Set(categories).size !== categories.length
    ? ["Use each request and category once. Rename or remove duplicate custom entries."]
    : [];
}
