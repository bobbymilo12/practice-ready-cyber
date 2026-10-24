import type { MCQScenario } from "./training-types.ts";
import { submissionChannel, readableList, requestSubject } from "./training-copy.ts";

/** Display labels only: never call on sentences, options or authored procedure steps. */
export function displayLabel(value: string): string {
  if (/[.!?]/.test(value) || value.split(/\s+/).length > 8) return value;
  return value.replace(/\b[a-z][a-z']*/g, (word) => word[0].toUpperCase() + word.slice(1));
}
/** Numeric alternatives keep the configured unit and qualifiers; never convert working hours to days. */
export function comparableValues(value: string): string[] | undefined {
  const match = value
    .trim()
    .match(/^(\d+)\s+(working\s+|calendar\s+)?(hours?|days?|weeks?|minutes?|months?)\.?$/i);
  if (!match) return undefined;
  const n = Number(match[1]);
  if (!n) return undefined;
  const unit = match[3].replace(/s$/i, "");
  const step = /hour/i.test(unit) && n >= 24 && n % 24 === 0 ? 24 : 1;
  return [n > step ? n - step : n + step, n > step ? n + step : n + step * 2].map(
    (v) => `${v} ${match[2] ?? ""}${unit}${v === 1 ? "" : "s"}`,
  );
}
export function methodQuestion(
  label: string,
  methods: string[],
  otherMethods: string[],
  situation: string,
): MCQScenario | undefined {
  methods = [...new Set(methods)];
  if (methods.length < 2 || methods.some((m) => !submissionChannel(m))) return undefined;
  const receptionMethods = new Set(["At reception", "Paper request at reception"]);
  const incorrect = [...new Set(otherMethods)].filter(
    (m) =>
      !methods.includes(m) &&
      submissionChannel(m) &&
      !(receptionMethods.has(m) && methods.some((method) => receptionMethods.has(method))),
  );
  // Unsupported methods are alternatives to the explicit configured list, not invented workflows.
  if (!incorrect.length) return undefined;
  const phrase = (m: string) =>
    `Ask the patient to submit the request ${submissionChannel(m)!.phrase}.`;
  return {
    id: crypto.randomUUID(),
    kind: "mcq",
    title: label.endsWith("?") ? "Submitting a Request" : displayLabel(label),
    patientQuote: situation,
    question: situation
      ? "How can this patient submit their request? Select all that apply."
      : `Which methods can all patients use to submit ${requestSubject(label, "")}? Select all that apply.`,
    options: [...methods.map(phrase), ...incorrect.slice(0, 2).map(phrase)],
    correctIndex: 0,
    correctIndices: methods.map((_, i) => i),
    learningPoint: `These requests can be submitted ${readableList(
      methods.map((m) => submissionChannel(m)!.phrase),
      "disjunction",
    )}.`,
    status: "draft",
  };
}
/** A broad category establishes responsibility, not a universal instruction to route every enquiry. */
export function responsibilityAction(label: string): "book" | "knowledge" {
  return /appointments?|medication reviews?|examinations?/i.test(label) ? "book" : "knowledge";
}

export function teachingPoint(label: string, value: string): string {
  const first = value.split("\n")[0].trim();
  if (/turnaround/i.test(label) && comparableValues(first)) {
    const subject = /prescription/i.test(label) ? "Prescription requests" : "These requests";
    return `${subject} at this practice usually take ${first.replace(/\.$/, "")} to be processed.${
      value.includes("\n")
        ? " " +
          value
            .slice(value.indexOf("\n") + 1)
            .replace(
              /Weekends: Excluded from turnaround/g,
              "Weekends do not count towards this turnaround.",
            )
            .replace(
              /Bank holidays: Excluded from turnaround/g,
              "Bank holidays do not count towards this turnaround.",
            )
            .replace(/Weekends: Included in turnaround/g, "Weekends count towards this turnaround.")
            .replace(
              /Bank holidays: Included in turnaround/g,
              "Bank holidays count towards this turnaround.",
            )
            .replace(/\n/g, " ")
        : ""
    }`;
  }
  // Authored instructions already teach the rule; a generic possessive prefix adds no lesson.
  return /[.!?]$/.test(value.trim()) ? value.trim() : value.trim() + ".";
}

export function unconditionalMethods(methods: string[], instructions: string): string[] {
  if (
    !/\b(if|only|over|under|except|aged|unless|eligible|after|before|cannot)\b|\d+\+/i.test(
      instructions,
    )
  )
    return methods;
  const aliases: Record<string, RegExp> = {
    Telephone: /telephone|\bphone\b/i,
    "NHS App": /NHS\s*App/i,
    "Practice website / online form": /website|online form/i,
    "Paper request at reception": /paper/i,
    "At reception": /reception|in person/i,
    "Nominated pharmacy": /pharmacy|pharmacist/i,
  };
  const mentioned = Object.keys(aliases).filter((m) => aliases[m].test(instructions));
  // If we cannot establish which method the condition limits, do not assert universal permission.
  return mentioned.length ? methods.filter((m) => !mentioned.includes(m)) : [];
}

/** Deliberately bounded parsing: a whole sentence must state the permission and age threshold.
 * Unknown prose is retained in practice setup, never interpreted as a clinical rule. */
export function conditionalMethodQuestions(
  label: string,
  methods: string[],
  instructions: string,
  level?: "learn" | "apply",
): MCQScenario[] {
  const sentences = instructions
    .split(/\n|;|\.\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const conditional = sentences.filter((s) =>
    /\b(aged|over|under|if|only|unless|except)\b|\d+\+/i.test(s),
  );
  // A second qualifier could narrow this permission; never discard it.
  if (conditional.length !== 1) return [];
  const text = conditional[0];
  const named = text.match(
    /^(.+?) ordering is available for patients aged (\d+)(?: and over|\+)$/i,
  );
  const patient = text.match(
    /^Patients (aged |over )(\d+)(?: and over|\+)? can order(?: (repeat prescriptions|fit notes))? (.+)$/i,
  );
  const channels = [
    "Telephone",
    "NHS App",
    "Practice website / online form",
    "Paper request at reception",
    "Nominated pharmacy",
  ];
  const method = channels.find((m) =>
    named
      ? m.toLowerCase() === named[1].toLowerCase()
      : patient &&
        [submissionChannel(m)!.phrase, ...(m === "Telephone" ? ["by phone", "over the phone"] : [])]
          .map((value) => value.toLowerCase())
          .includes(patient[4].toLowerCase()),
  );
  if (
    !method ||
    (!named && !patient) ||
    (patient?.[3] &&
      requestSubject(label, "") !== "a " + patient[3].toLowerCase().replace(/s$/, "") + " request")
  )
    return [];
  // "Aged 60" alone is not an age range. Require the explicit lower bound.
  if (patient?.[1].toLowerCase() === "aged " && !/aged \d+(?: and over|\+)/i.test(text)) return [];
  const age = Number(named?.[2] ?? patient?.[2]) + (patient?.[1].toLowerCase() === "over " ? 1 : 0);
  if (age < 1 || age > 110) return [];
  const q = methodQuestion(
    label,
    [...methods, method],
    [
      "Telephone",
      "Nominated pharmacy",
      "NHS App",
      "Practice website / online form",
      "Paper request at reception",
    ],
    `A ${age}-year-old patient asks how to submit ${requestSubject(label, "")}.`,
  );
  if (!q) return [];
  q.title = "Ordering with an Age Exception";
  q.learningPoint += " " + text + ".";
  const below =
    age > 1
      ? methodQuestion(
          label,
          methods,
          [method],
          `A ${age - 1}-year-old patient asks how to submit ${requestSubject(label, "")}.`,
        )
      : undefined;
  if (below) {
    below.title = "Ordering Below the Age Threshold";
    below.learningPoint += " " + text + ". This patient does not meet that age condition.";
  }
  if (level === "learn") {
    q.patientQuote = "";
    q.question = `Which methods can patients aged ${age} and over use to submit ${requestSubject(label, "")}? Select all that apply.`;
    if (below) {
      below.patientQuote = "";
      below.question = `Which methods can patients under ${age} use to submit ${requestSubject(label, "")}? Select all that apply.`;
    }
  }
  return below ? [q, below] : [q];
}
