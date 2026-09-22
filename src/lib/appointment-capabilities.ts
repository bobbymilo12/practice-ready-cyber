/** Placeholder catalogue/defaults for manager review; not approved clinical guidance.
 * Stable IDs are persisted separately from display labels and staff responsibilities.
 */
export const appointmentTypes = [
  { id: "bp-check", name: "Blood pressure check", category: "General" },
  { id: "minor-illness", name: "Minor illness", category: "General" },
  { id: "breast-examination", name: "Breast examination", category: "Women’s Health" },
  { id: "cervical-screening", name: "Cervical screening", category: "Women’s Health" },
  { id: "asthma-review", name: "Asthma review", category: "Long-Term Conditions" },
  { id: "diabetes-review", name: "Diabetes review", category: "Long-Term Conditions" },
  { id: "blood-test", name: "Blood test", category: "Treatment Room" },
  { id: "wound-care", name: "Wound care", category: "Treatment Room" },
  { id: "ecg", name: "ECG", category: "Treatment Room" },
  { id: "medication-review", name: "Medication review", category: "Other" },
  { id: "mental-health", name: "Mental health appointment", category: "Other" },
  { id: "musculoskeletal", name: "Musculoskeletal assessment", category: "Other" },
] as const;
export type AppointmentId = (typeof appointmentTypes)[number]["id"];
export type CapabilityMap = Partial<Record<AppointmentId, boolean>>;
export type RoleDefaults = Record<string, CapabilityMap>;
export interface AppointmentCapabilities {
  // Snapshot protects reviewed selections when the default catalogue changes.
  defaults: CapabilityMap;
  overrides: CapabilityMap;
}
const enabled = (...ids: AppointmentId[]): CapabilityMap =>
  Object.fromEntries(ids.map((id) => [id, true]));
export const defaultRoleCapabilities: RoleDefaults = {
  gp: enabled(
    "bp-check",
    "minor-illness",
    "breast-examination",
    "asthma-review",
    "diabetes-review",
    "medication-review",
    "mental-health",
  ),
  np: enabled(
    "bp-check",
    "minor-illness",
    "breast-examination",
    "cervical-screening",
    "asthma-review",
    "diabetes-review",
    "blood-test",
    "wound-care",
    "ecg",
  ),
  nurse: enabled(
    "bp-check",
    "cervical-screening",
    "asthma-review",
    "diabetes-review",
    "blood-test",
    "wound-care",
    "ecg",
  ),
  hca: enabled("bp-check", "blood-test", "wound-care", "ecg"),
  pharmacist: enabled("medication-review"),
  physio: enabled("musculoskeletal"),
  mentalhealth: enabled("mental-health"),
};
const aliases: Record<string, string> = {
  doctor: "gp",
  gp: "gp",
  "doctor (gp)": "gp",
  "gp partner": "gp",
  "nurse practitioner": "np",
  "advanced nurse practitioner": "np",
  anp: "np",
  nurse: "nurse",
  "practice nurse": "nurse",
  "senior nurse": "nurse",
  hca: "hca",
  "healthcare assistant": "hca",
  pharmacist: "pharmacist",
  physio: "physio",
  physiotherapist: "physio",
  "mental health practitioner": "mentalhealth",
};
export const capabilityRole = (role: string) =>
  aliases[role.trim().toLowerCase()] ?? role.trim().toLowerCase();
export function roleCapabilities(
  role: string,
  organisation: RoleDefaults = {},
  practice: RoleDefaults = {},
): CapabilityMap {
  const key = capabilityRole(role);
  return {
    ...Object.fromEntries(appointmentTypes.map(({ id }) => [id, false])),
    ...defaultRoleCapabilities[key],
    ...organisation[key],
    ...practice[key],
  };
}
type Clinician = {
  role: string;
  appointmentCapabilities?: AppointmentCapabilities;
};
export const isClinicalStaff = (person: Clinician) =>
  Object.hasOwn(defaultRoleCapabilities, capabilityRole(person.role));
export function clinicianCapabilities(person: Clinician): CapabilityMap {
  return {
    ...(person.appointmentCapabilities?.defaults ?? roleCapabilities(person.role)),
    ...person.appointmentCapabilities?.overrides,
  };
}
export const canHandleAppointment = (person: Clinician, appointment: AppointmentId): boolean =>
  isClinicalStaff(person) && clinicianCapabilities(person)[appointment] === true;
export function initialiseCapabilities<T extends Clinician>(person: T): T {
  return person.appointmentCapabilities
    ? person
    : {
        ...person,
        appointmentCapabilities: { defaults: roleCapabilities(person.role), overrides: {} },
      };
}
