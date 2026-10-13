import { requestRoleId, selectedRequests, practiceRoles } from "./role-requests.ts";
import type { PracticeData, StaffMember } from "./store";

export const setupSteps = ["Practice", "Roles", "Team", "Review"];
export function setupSearch(s: Record<string, unknown>): { step?: number; role?: string } {
  return {
    step: Math.min(setupSteps.length - 1, Math.max(0, Math.floor(Number(s.step) || 0))),
    role: typeof s.role === "string" ? s.role : undefined,
  };
}
export function setupMissing(p: PracticeData): string[][] {
  return [
    !p.practiceName.trim() || p.practiceName === "Your practice" ? ["Practice name"] : [],
    practiceRoles(p).length
      ? practiceRoles(p)
          .filter((r) => !r.confirmed)
          .map((r) => `${r.label} role needs review`)
      : ["Add at least one practice role"],
    p.staff.length === 0
      ? ["Add at least one team member"]
      : p.staff.flatMap((s) =>
          !s.name.trim() || !s.role.trim()
            ? [`Add a name and role for ${s.name || "each team member"}`]
            : [],
        ),
    [],
  ];
}

export function teamReviewSummary(person: StaffMember, practice?: PracticeData): string {
  const role = practice?.roleRequests?.[requestRoleId(person.role)];
  return `${person.name} · ${person.role} — ${role?.confirmed ? `${selectedRequests(role).length} shared requests selected` : "Role configuration needs review"}`;
}
