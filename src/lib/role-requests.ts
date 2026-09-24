import type { PracticeData, StaffMember } from "./store";

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
export function selectedRequests(role: PracticeRoleRequests): RoleRequest[] {
  if (!role.confirmed) return [];
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
  if (!person || !role?.confirmed) return [];
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
    if (!role?.confirmed) return [];
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
