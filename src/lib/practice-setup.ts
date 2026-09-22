import { configMissing } from "./practice-config.ts";
import {
  appointmentTypes,
  clinicianCapabilities,
  isClinicalStaff,
} from "./appointment-capabilities.ts";
import type { PracticeData, StaffMember } from "./store";

export const setupSteps = ["Practice", "Team", "Bookings", "Prescriptions", "Safety", "Review"];
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
    p.staff.length === 0
      ? ["Add at least one team member"]
      : p.staff.flatMap((s) =>
          !s.name.trim() || !s.role.trim()
            ? [`Add a name and role for ${s.name || "each team member"}`]
            : [],
        ),
    config.booking,
    config.prescription,
    required([
      ["Confidentiality process", p.localConfidentiality],
      ["Safeguarding process", p.localSafeguarding],
    ]),
    [],
  ];
}

export function teamReviewSummary(person: StaffMember): string {
  const responsibilities = [person.clinics, ...(person.capabilities ?? [])]
    .filter(Boolean)
    .join(", ");
  const identity = `${person.name} · ${person.role}${responsibilities ? `: ${responsibilities}` : ""}`;
  if (!isClinicalStaff(person)) return identity;
  const capabilities = clinicianCapabilities(person);
  const selected = appointmentTypes.filter((t) => capabilities[t.id]).map((t) => t.name);
  return `${identity}\nAppointment types (${selected.length} selected): ${selected.join(", ") || "None selected"}`;
}
