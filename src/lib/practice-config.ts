import type { PracticeData, StaffMember } from "./store";
export type Option = { id: string; label: string };
const options = (values: [string, string][]): Option[] =>
  values.map(([id, label]) => ({ id, label }));
// Provisional review catalogue, not clinical guidance. Stable IDs permit future defaults layers.
export const sameDayGroups = [
  {
    label: "Acute illness",
    options: options([
      ["infection", "New or worsening infection symptoms"],
      ["respiratory", "Chest/respiratory infection symptoms"],
      ["urinary", "Urinary symptoms / suspected UTI"],
      ["ear-throat", "Ear/throat infection symptoms"],
      ["fever", "Fever / acute illness"],
      ["cough-breathing", "Significant new cough or breathing-related symptoms"],
      ["other-acute", "Other acute illness"],
    ]),
  },
  {
    label: "Pain / new symptoms",
    options: options([
      ["abdominal", "New or significant abdominal/stomach pain"],
      ["headache", "New severe headache"],
      ["pain", "Significant new pain"],
      ["worsening", "New or rapidly worsening symptoms"],
      ["other-new", "Other concerning new symptoms"],
    ]),
  },
  {
    label: "Children",
    options: options([
      ["unwell-child", "Acutely unwell child"],
      ["child-fever", "Fever in a child"],
      ["other-child", "Other acute childhood illness"],
    ]),
  },
  {
    label: "Mental health / safeguarding",
    options: options([
      ["mental-health", "Acute mental health concern"],
      ["safeguarding", "Safeguarding concern"],
    ]),
  },
];
export const sameDayProcesses = options([
  ["direct", "Reception can book eligible same-day appointments directly"],
  ["triage", "Clinical triage is required before booking"],
  ["depends", "Process depends on the request/appointment type"],
  ["other", "Other"],
]);
export const routineProcesses = options([
  ["direct", "Reception books directly"],
  ["by-type", "Reception books according to clinician/appointment type"],
  ["online", "Online request first"],
  ["triage", "Clinical triage required"],
  ["other", "Other"],
]);
export const prescriptionMethods = options([
  ["nhs-app", "NHS App"],
  ["website", "Practice website / online form"],
  ["paper", "Paper request at reception"],
  ["pharmacy", "Nominated pharmacy"],
  ["telephone", "Telephone"],
  ["other", "Other"],
]);
export const contactMethods = options([
  ["system", "Internal clinical system/message"],
  ["phone", "Phone/extension"],
  ["teams", "Microsoft Teams"],
  ["person", "In person"],
  ["other", "Other"],
]);
export const contactRoles = ["Duty GP", "Duty clinician", "Duty pharmacist"];
export const turnarounds = options([
  ["24", "24 working hours"],
  ["48", "48 working hours"],
  ["72", "72 working hours"],
  ["other", "Other"],
]);
export const calendarRules = options([
  ["unconfirmed", "Not yet confirmed"],
  ["exclude", "Excluded from turnaround"],
  ["include", "Included in turnaround"],
  ["other", "Other"],
]);
export const urgentActions = options([
  ["system", "Send urgent clinical-system request"],
  ["contact", "Contact responsible clinician"],
  ["other", "Follow another local process"],
]);
export interface Choice {
  id: string;
  other: string;
}
export type Contact =
  | { kind: "role"; role: string }
  | { kind: "staff"; staffId: string }
  | { kind: "other"; text: string }
  | { kind: "unconfirmed" };
export interface ContactRoute {
  contact: Contact;
  method: Choice;
  instruction: string;
}
export interface BookingConfig {
  version: 1;
  // Separate domain: these selections do not classify emergency or clinical triage criteria.
  sameDayPathway: { selected: string[]; custom: string[]; instruction: string };
  sameDayProcess: Choice;
  sameDayInstruction: string;
  sendUncertainToDutyClinician: boolean;
  escalation: ContactRoute;
  routineProcess: Choice;
  routineInstruction: string;
}
export interface PrescriptionConfig {
  version: 1;
  methods: string[];
  otherMethod: string;
  orderingInstruction: string;
  turnaround: Choice;
  turnaroundInstruction: string;
  weekends: Choice;
  bankHolidays: Choice;
  urgentRoute:
    // Inactive settings are retained only for restoring the separate route, never for routing.
    | { source: "appointment"; previousSeparateRoute?: ContactRoute }
    | { source: "separate"; route: ContactRoute };
  urgentActions: string[];
  otherAction: string;
  urgentInstruction: string;
}
const choice = (id = ""): Choice => ({ id, other: "" });
export const emptyContactRoute = (): ContactRoute => ({
  contact: { kind: "unconfirmed" },
  method: choice(),
  instruction: "",
});
const join = (...s: (string | undefined)[]) =>
  [...new Set(s.filter((v): v is string => !!v?.trim()))].join("\n");
export function bookingFor(p: PracticeData): BookingConfig {
  if (p.bookingConfig) return p.bookingConfig;
  const legacy = !!join(
    p.sameDayReasons.join("\n"),
    p.dutyContact,
    p.rolePolicies.gpsSameDay,
    p.rolePolicies.gpsRoutine,
  );
  return {
    version: 1,
    sameDayPathway: {
      selected: legacy
        ? []
        : sameDayGroups.flatMap((g) =>
            g.options.filter((o) => !o.id.startsWith("other-")).map((o) => o.id),
          ),
      custom: [],
      instruction: p.sameDayReasons.join("\n"),
    },
    sameDayProcess: choice(legacy ? "" : "triage"),
    sameDayInstruction: p.rolePolicies.gpsSameDay,
    sendUncertainToDutyClinician: !legacy,
    escalation: { ...emptyContactRoute(), instruction: p.dutyContact },
    routineProcess: choice(legacy ? "" : "direct"),
    routineInstruction: p.rolePolicies.gpsRoutine,
  };
}
export function prescriptionsFor(p: PracticeData): PrescriptionConfig {
  if (p.prescriptionConfig) return p.prescriptionConfig;
  const legacy = !!join(
    p.prescriptionOrdering,
    p.repeatOrderMethods,
    p.repeatTurnaround,
    p.repeatEmergency,
  );
  return {
    version: 1,
    methods: legacy ? [] : ["nhs-app", "website", "paper"],
    otherMethod: "",
    orderingInstruction: join(p.prescriptionOrdering, p.repeatOrderMethods),
    turnaround: choice(legacy ? "" : "48"),
    turnaroundInstruction: p.repeatTurnaround,
    weekends: choice("unconfirmed"),
    bankHolidays: choice("unconfirmed"),
    urgentRoute: p.repeatEmergency.trim()
      ? { source: "separate", route: emptyContactRoute() }
      : { source: "appointment" },
    urgentActions: legacy ? [] : ["contact"],
    otherAction: "",
    urgentInstruction: p.repeatEmergency,
  };
}
export function contactText(c: Contact, staff: StaffMember[]): string {
  if (c.kind === "staff") {
    const s = staff.find((s) => s.id === c.staffId);
    return s
      ? `${s.name} — ${s.role}`
      : "Previously selected team member is no longer available — choose a contact";
  }
  return c.kind === "role" ? c.role : c.kind === "other" ? c.text : "";
}
export const choiceText = (c: Choice, list: Option[]) =>
  c.id === "other" ? c.other : (list.find((o) => o.id === c.id)?.label ?? "");
export function routeText(r: ContactRoute, p: PracticeData): string {
  return join(
    contactText(r.contact, p.staff),
    choiceText(r.method, contactMethods),
    r.method.id === "phone" ? r.method.other : "",
    r.instruction,
  );
}
// Read-only compatibility projection: never persist derived strings over legacy data.
export function practiceSummary(p: PracticeData): PracticeData {
  let result = p;
  if (p.bookingConfig) {
    const b = p.bookingConfig;
    const criteria = [
      ...b.sameDayPathway.selected.map(
        (id) => sameDayGroups.flatMap((g) => g.options).find((o) => o.id === id)?.label ?? id,
      ),
      ...b.sameDayPathway.custom,
    ].filter((s) => s.trim());
    result = {
      ...result,
      sameDayReasons: [
        join(
          criteria.length
            ? `Consider for the same-day pathway: ${criteria.join("; ")}. This does not authorise automatic booking; follow the configured process. These provisional categories are not emergency or clinical triage guidance.`
            : "",
          b.sameDayPathway.instruction,
        ),
      ].filter(Boolean),
      dutyContact: routeText(b.escalation, p),
      rolePolicies: {
        ...p.rolePolicies,
        gpsSameDay: join(
          choiceText(b.sameDayProcess, sameDayProcesses),
          b.sendUncertainToDutyClinician ? "If reception is unsure, send to duty clinician." : "",
          b.sameDayInstruction,
        ),
        gpsRoutine: join(choiceText(b.routineProcess, routineProcesses), b.routineInstruction),
      },
    };
  }
  if (p.prescriptionConfig) {
    const c = p.prescriptionConfig;
    const ordering = join(
      c.methods
        .map((id) =>
          id === "other"
            ? c.otherMethod
            : (prescriptionMethods.find((o) => o.id === id)?.label ?? id),
        )
        .filter(Boolean)
        .join("; "),
      c.orderingInstruction,
    );
    result = {
      ...result,
      prescriptionOrdering: ordering,
      repeatOrderMethods: ordering,
      repeatTurnaround: join(
        choiceText(c.turnaround, turnarounds),
        `Weekends: ${choiceText(c.weekends, calendarRules)}`,
        `Bank holidays: ${choiceText(c.bankHolidays, calendarRules)}`,
        c.turnaroundInstruction,
      ),
      repeatEmergency: join(
        c.urgentRoute.source === "appointment"
          ? `Use appointment escalation: ${result.dutyContact || "Contact and method not yet confirmed"}`
          : routeText(c.urgentRoute.route, p),
        c.urgentActions
          .map((id) =>
            id === "other" ? c.otherAction : (urgentActions.find((o) => o.id === id)?.label ?? id),
          )
          .join("; "),
        c.urgentInstruction,
      ),
    };
  }
  return result;
}
export function contactMissing(r: ContactRoute, p: PracticeData): boolean {
  if (r.contact.kind === "unconfirmed") return !r.instruction.trim();
  const c = r.contact;
  return (
    !contactText(c, p.staff).trim() ||
    (c.kind === "staff" && !p.staff.some((s) => s.id === c.staffId)) ||
    !r.method.id ||
    (["other", "phone"].includes(r.method.id) && !r.method.other.trim())
  );
}
export function configMissing(p: PracticeData): { booking: string[]; prescription: string[] } {
  const b = bookingFor(p),
    c = prescriptionsFor(p);
  const validChoice = (v: Choice, instruction: string) =>
    v.id === "other" ? !!v.other.trim() : !!v.id || !!instruction.trim();
  return {
    booking: [
      !b.sameDayPathway.selected.length &&
      !b.sameDayPathway.custom.some((s) => s.trim()) &&
      !b.sameDayPathway.instruction.trim()
        ? "Same-day pathway criteria"
        : "",
      !validChoice(b.sameDayProcess, b.sameDayInstruction) ? "Same-day booking process" : "",
      !validChoice(b.routineProcess, b.routineInstruction) ? "Routine booking process" : "",
      contactMissing(b.escalation, p) ? "Escalation contact and method" : "",
    ].filter(Boolean),
    prescription: [
      (!c.methods.length && !c.orderingInstruction.trim()) ||
      (c.methods.includes("other") && !c.otherMethod.trim())
        ? "Prescription ordering"
        : "",
      !validChoice(c.turnaround, c.turnaroundInstruction) ? "Prescription turnaround" : "",
      [c.weekends, c.bankHolidays].some((v) => v.id === "other" && !v.other.trim())
        ? "Weekend / bank-holiday details"
        : "",
      !(
        c.urgentRoute.source === "separate" &&
        c.urgentRoute.route.contact.kind === "unconfirmed" &&
        c.urgentInstruction.trim()
      ) &&
      contactMissing(c.urgentRoute.source === "appointment" ? b.escalation : c.urgentRoute.route, p)
        ? "Urgent prescription contact and method"
        : "",
      (!c.urgentActions.length && !c.urgentInstruction.trim()) ||
      (c.urgentActions.includes("other") && !c.otherAction.trim())
        ? "Urgent prescription action"
        : "",
    ].filter(Boolean),
  };
}

// Optional restoration data keeps existing version-1 records compatible.
export function switchUrgentRoute(
  current: PrescriptionConfig["urgentRoute"],
  useAppointment: boolean,
): PrescriptionConfig["urgentRoute"] {
  if (useAppointment) {
    return current.source === "appointment"
      ? current
      : { source: "appointment", previousSeparateRoute: current.route };
  }
  return current.source === "separate"
    ? current
    : { source: "separate", route: current.previousSeparateRoute ?? emptyContactRoute() };
}

export interface ConfigReview {
  unconfirmed: string[];
  textOnly: string[];
  instructions: string[];
}
// Derived review prompts, not a persisted approval/audit trail. Never interpret prose as facts.
export function configReview(p: PracticeData): {
  booking: ConfigReview;
  prescription: ConfigReview;
} {
  const b = bookingFor(p),
    c = prescriptionsFor(p);
  const booking: ConfigReview = { unconfirmed: [], textOnly: [], instructions: [] };
  const prescription: ConfigReview = { unconfirmed: [], textOnly: [], instructions: [] };
  const inspect = (
    review: ConfigReview,
    label: string,
    configured: boolean,
    instruction: string,
  ) => {
    if (!configured) (instruction.trim() ? review.textOnly : review.unconfirmed).push(label);
    if (instruction.trim()) review.instructions.push(label);
  };
  const chosen = (v: Choice) =>
    !!v.id && v.id !== "unconfirmed" && (v.id !== "other" || !!v.other.trim());
  const contactConfigured = (r: ContactRoute) =>
    r.contact.kind !== "unconfirmed" && !contactMissing(r, p);
  inspect(
    booking,
    "Same-day pathway criteria",
    !!b.sameDayPathway.selected.length || b.sameDayPathway.custom.some((s) => !!s.trim()),
    b.sameDayPathway.instruction,
  );
  inspect(booking, "Same-day booking process", chosen(b.sameDayProcess), b.sameDayInstruction);
  inspect(booking, "Routine booking process", chosen(b.routineProcess), b.routineInstruction);
  inspect(
    booking,
    "Appointment escalation contact and method",
    contactConfigured(b.escalation),
    b.escalation.instruction,
  );
  inspect(
    prescription,
    "Prescription ordering",
    !!c.methods.length && (!c.methods.includes("other") || !!c.otherMethod.trim()),
    c.orderingInstruction,
  );
  inspect(prescription, "Prescription turnaround", chosen(c.turnaround), c.turnaroundInstruction);
  if (!chosen(c.weekends)) prescription.unconfirmed.push("Weekend turnaround rules");
  if (!chosen(c.bankHolidays)) prescription.unconfirmed.push("Bank-holiday turnaround rules");
  const urgent = c.urgentRoute.source === "appointment" ? b.escalation : c.urgentRoute.route;
  inspect(
    prescription,
    "Urgent prescription contact and method",
    contactConfigured(urgent),
    join(urgent.instruction, c.urgentRoute.source === "separate" ? c.urgentInstruction : ""),
  );
  inspect(
    prescription,
    "Urgent prescription actions",
    !!c.urgentActions.length && (!c.urgentActions.includes("other") || !!c.otherAction.trim()),
    c.urgentInstruction,
  );
  return { booking, prescription };
}
