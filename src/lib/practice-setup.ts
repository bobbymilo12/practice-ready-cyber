import { configMissing, safeguardingMissing } from "./practice-config.ts";
import { requestRoleId, selectedRequests, practiceRoles } from "./role-requests.ts";
import type { PracticeData, StaffMember } from "./store";

export const setupSteps = [
  "Practice",
  "Roles",
  "Team",
  "Bookings",
  "Prescriptions",
  "Safety",
  "Review",
];
export function setupMissing(p: PracticeData): string[][] {
  const required = (items: [string, string][]) =>
    items.filter(([, value]) => !value.trim()).map(([label]) => label);
  const config = configMissing(p);
  return [
    required([
      ["Practice name", p.practiceName === "Your practice" ? "" : p.practiceName],
      ["Opening hours", p.hours],
      ["Out-of-hours process", p.outOfHoursTimes],
    ]),
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
    config.booking,
    config.prescription,
    safeguardingMissing(p),
    [],
  ];
}

export function teamReviewSummary(person: StaffMember, practice?: PracticeData): string {
  const role = practice?.roleRequests?.[requestRoleId(person.role)];
  return `${person.name} · ${person.role} — ${role?.confirmed ? `${selectedRequests(role).length} shared requests selected` : "Role configuration needs review"}`;
}
