import type { PracticeData } from "./store";
export interface PracticeRequest {
  id: string;
  label: string;
}
export interface RequestChoice extends PracticeRequest {
  roles: string[];
  conflict: boolean;
}
/** A small shared overlay, not a migration of the role-owned catalogues. */
export function practiceRequestChoices(p: PracticeData): RequestChoice[] {
  const entries = new Map<string, RequestChoice>();
  const add = (r: PracticeRequest, role?: string) => {
    const old = entries.get(r.id);
    if (old) {
      old.conflict ||= old.label !== r.label;
      if (role && !old.roles.includes(role)) old.roles.push(role);
    } else entries.set(r.id, { ...r, roles: role ? [role] : [], conflict: false });
  };
  Object.values(p.practiceRequests ?? {}).forEach((r) => add(r));
  Object.values(p.roleRequests ?? {})
    .filter((r) => r.confirmed && !r.archived)
    .forEach((r) =>
      r.categories
        .flatMap((c) => c.requests)
        .filter((q) => r.selectedRequestIds.includes(q.id))
        .forEach((q) => add(q, r.label)),
    );
  return [...entries.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
  );
}
export function addPracticeRequest(p: PracticeData, label: string): PracticeData {
  if (!label.trim()) throw new Error("Enter a request.");
  const request = { id: `custom:${crypto.randomUUID()}`, label: label.trim() };
  // Adding knowledge does not select same-day eligibility or assign a role.
  return { ...p, practiceRequests: { ...p.practiceRequests, [request.id]: request } };
}
