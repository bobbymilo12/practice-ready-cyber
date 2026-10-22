import type { MCQScenario } from "./training-types.ts";
import { submissionChannel, readableList } from "./training-copy.ts";

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
  const phrase = (m: string) => `Submit the request ${submissionChannel(m)!.phrase}.`;
  return {
    id: crypto.randomUUID(),
    kind: "mcq",
    title: displayLabel(label),
    patientQuote: situation,
    question:
      "Which standard methods does the practice accept for this request, outside any separately configured exception? Select all that apply.",
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
  if (!/\b(if|only|over|under|except|aged|unless)\b/i.test(instructions)) return methods;
  const aliases: Record<string, RegExp> = {
    Telephone: /telephone|\bphone\b/i,
    "NHS App": /NHS\s*App/i,
    "Practice website / online form": /website|online form/i,
    "Paper request at reception": /paper/i,
    "At reception": /reception|in person/i,
    "Nominated pharmacy": /pharmacy|pharmacist/i,
  };
  const mentioned = methods.filter((m) => aliases[m]?.test(instructions));
  // If we cannot establish which method the condition limits, do not assert universal permission.
  return mentioned.length ? methods.filter((m) => !mentioned.includes(m)) : [];
}
