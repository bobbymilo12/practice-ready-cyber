import type { PracticeData } from "./store";
import type { ModuleSettings } from "./module-config";
import type { MCQScenario } from "./training-types";
import { resolveCoreBinding } from "./core-training-generation.ts";

/** Local knowledge only: no Core concept, clinical inference or legacy text migration. */
function baseStructuredBookingExercises(p: PracticeData, settings: ModuleSettings): MCQScenario[] {
  const level = settings.trainingLevel;
  if (level !== "learn" && level !== "apply") return [];
  const result: MCQScenario[] = [];
  const add = (
    title: string,
    recognition: string,
    situation: string,
    action: string,
    alternatives: string[],
  ) => {
    result.push({
      id: crypto.randomUUID(),
      kind: "mcq",
      title,
      patientQuote: level === "learn" ? recognition : situation,
      question:
        level === "learn" ? "What is this practice’s procedure?" : "What would you do next?",
      options: [action, ...alternatives.filter((a) => a !== action)],
      correctIndex: 0,
      learningPoint: action,
      status: "draft",
    });
  };
  const b = p.bookingConfig;
  // Qualifying prose cannot be silently dropped; only unqualified typed processes are used.
  if (b && !b.sameDayInstruction.trim() && !b.sameDayPathway.instruction.trim()) {
    const action = {
      direct: "Book an eligible same-day appointment directly.",
      triage: "Send the request for clinical triage before booking.",
    }[b.sameDayProcess.id];
    if (action)
      add(
        "An eligible same-day request",
        "A request has already been identified as eligible for the same-day process. What is reception’s next step?",
        "A request has already been identified as eligible for the same-day process. The patient asks you to confirm a booking now, before the booking process has been completed.",
        action,
        b.sameDayProcess.id === "triage"
          ? [
              "Confirm a booking now and arrange triage afterwards.",
              "Choose the next step from the patient’s preferred appointment time.",
            ]
          : [
              "Delay the confirmed next step while checking the outcome of a previous request.",
              "Choose the next step from the patient’s preferred appointment time.",
            ],
      );
  }
  if (b && !b.routineInstruction.trim()) {
    const action = {
      direct: "Book the routine appointment directly.",
      online: "Ask the patient to submit an online request first.",
      triage: "Send the routine request for clinical triage before booking.",
    }[b.routineProcess.id];
    if (action)
      add(
        "A routine booking request",
        "A request is already identified as routine. Which booking process does this practice use?",
        "A patient’s request has already been identified as routine. They ask whether you can confirm the appointment straight away, although the practice’s booking process has not yet been completed.",
        action,
        b.routineProcess.id === "direct"
          ? [
              "Add a further approval step before booking the routine appointment.",
              "Choose the next step from when the patient contacted the practice rather than the type of request.",
            ]
          : [
              "Confirm an appointment first and complete the required process afterwards.",
              "Choose the next step from when the patient contacted the practice rather than the type of request.",
            ],
      );
  }
  const route = resolveCoreBinding("escalation_routes", {
    topicKey: "appointment-booking",
    practice: p,
    settings,
  });
  if (route) {
    const contact = route.snapshot as { name: string; method: string; phone?: string };
    add(
      "An unclear booking route",
      "When reception is unsure which booking route applies, how should staff seek support?",
      "A patient has explained what they need help with, but you cannot establish which of the practice’s booking routes fits. They ask what will happen next.",
      `Contact ${contact.name} — ${contact.method}${contact.phone ? `: ${contact.phone}` : ""}.`,
      [
        "Use the route from the patient’s previous request while waiting to clarify this one.",
        "Ask the patient to choose a route so you can continue with the booking.",
      ],
    );
  }
  return result;
}

/** Conservative equivalence prevents a paraphrase of the correct route becoming a distractor. */
export function bookingActionKey(action: string): string {
  const text = action
    .toLowerCase()
    .replace(/[.!;]+$/g, "")
    .trim();
  if (/clinical triage/.test(text)) return "clinical-triage";
  if (/same.day/.test(text) && /book|arrange/.test(text)) return "same-day-booking";
  if (/routine/.test(text) && /book|arrange/.test(text)) return "routine-booking";
  if (/online request/.test(text)) return "online-request";
  return text;
}

/** Only typed, unqualified selections; no arbitrary prose becomes a route. */
export function configuredBookingActions(p: PracticeData, settings: ModuleSettings): string[] {
  return baseStructuredBookingExercises(p, { ...settings, trainingLevel: "learn" }).map(
    (s) => s.options[s.correctIndex],
  );
}

const genericMistakes = [
  "Ask which appointment the patient would prefer before clarifying the request.",
  "Handle this in the same way as the patient’s previous request.",
];

/** Stable source key drives diversity, not random IDs or mutable answer order. */
export function localAnswerOptions(
  correct: string,
  key: string,
  level: "learn" | "apply",
  generic: readonly string[],
  configured: readonly string[] = [],
): string[] {
  const hash = Array.from(key).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  const rotate = (values: string[], offset: number) =>
    values.length
      ? [...values.slice(offset % values.length), ...values.slice(0, offset % values.length)]
      : [];
  const unique = (values: readonly string[]) => [
    ...new Map(
      values
        .filter((v) => bookingActionKey(v) !== bookingActionKey(correct))
        .map((v) => [bookingActionKey(v), v]),
    ).values(),
  ];
  const routes = rotate(unique(configured), hash).slice(0, level === "apply" ? 3 : 2);
  const mistakes = rotate(
    unique([...generic, ...genericMistakes]).filter(
      (v) => !routes.some((r) => bookingActionKey(r) === bookingActionKey(v)),
    ),
    hash + (level === "apply" ? 1 : 0),
  );
  return [correct, ...routes, ...mistakes.slice(0, 3 - routes.length)];
}

export function structuredBookingExercises(
  p: PracticeData,
  settings: ModuleSettings,
): MCQScenario[] {
  const base = baseStructuredBookingExercises(p, settings);
  if (settings.trainingLevel !== "learn" && settings.trainingLevel !== "apply") return base;
  return base.map((s) => ({
    ...s,
    options: localAnswerOptions(
      s.options[0],
      s.title,
      settings.trainingLevel!,
      s.options.slice(1),
      base.map((other) => other.options[0]),
    ),
  }));
}

/** Wording only: preserve the configured information without adding clinical or contact detail. */
export function neutralLearnSituation(condition: string): string {
  const label = condition.trim().replace(/[.?!]+$/, "");
  const key = label.toLowerCase();
  if (key === "mental health crisis" || key === "new severe headache")
    return `A patient contacts the practice about a ${key}.`;
  if (/^(?:under[ -]?5(?:s)? illness|illness (?:in )?under[ -]?5s?)$/.test(key))
    return "The practice is contacted about illness in a child under 5.";
  if (key === "acutely unwell child")
    return "The practice is contacted about an acutely unwell child.";
  if (key === "urinary symptoms / suspected uti")
    return "A patient contacts the practice about urinary symptoms (suspected UTI).";
  if (/^(?:when |if )?unsure$/.test(key))
    return "A patient asks for help, but you are unsure how to arrange it.";
  return `The practice is contacted about ${label}.`;
}

/** Guard the exercise, not its ID or answer ordering. */
export function exerciseSignature(s: {
  patientQuote: string;
  question: string;
  options?: string[];
  correctIndex?: number;
}): string {
  return JSON.stringify([
    s.patientQuote.trim(),
    s.question.trim(),
    s.options?.[s.correctIndex ?? 0]?.trim(),
  ]);
}
