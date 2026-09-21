import type { PracticeData } from "./store";

export const setupSteps = ["Practice", "Team", "Bookings", "Prescriptions", "Safety", "Review"];
export function setupMissing(p: PracticeData): string[][] {
  const required = (items: [string, string][]) =>
    items.filter(([, value]) => !value.trim()).map(([label]) => label);
  return [
    required([
      ["Practice name", p.practiceName === "Your practice" ? "" : p.practiceName],
      ["Opening hours", p.hours],
      ["Out-of-hours process", p.outOfHoursTimes],
    ]),
    p.staff.length === 0
      ? ["Add at least one team member"]
      : p.staff.flatMap((s) =>
          !s.name.trim() || !s.role.trim() || !(s.clinics.trim() || s.capabilities?.length)
            ? [`Add a name, role and responsibilities for ${s.name || "each team member"}`]
            : [],
        ),
    required([
      ["Same-day criteria", p.sameDayReasons.filter((s) => s.trim()).join("")],
      ["Escalation contact", p.dutyContact],
      ["Same-day booking process", p.rolePolicies.gpsSameDay],
      ["Routine booking process", p.rolePolicies.gpsRoutine],
    ]),
    required([
      ["Prescription ordering", p.prescriptionOrdering],
      ["Prescription turnaround", p.repeatTurnaround],
      ["Medication run-out process", p.repeatEmergency],
    ]),
    required([
      ["Confidentiality process", p.localConfidentiality],
      ["Safeguarding process", p.localSafeguarding],
    ]),
    [],
  ];
}
