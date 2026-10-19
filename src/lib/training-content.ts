import type { Scenario } from "./training-types.ts";
import { stableValue } from "./practice-change-tracking.ts";

/** Teaching content only: internal IDs, approval and source audit metadata are not lessons. */
export function scenarioContent(s: Scenario) {
  const common = {
    kind: s.kind,
    title: s.title,
    question: s.question,
    patientQuote: "patientQuote" in s ? s.patientQuote : undefined,
    learningPoint: s.learningPoint,
    managerNote: s.managerNote || undefined,
  };
  if (s.kind === "mcq")
    return { ...common, options: [...s.options].sort(), correctAnswer: s.options[s.correctIndex] };
  if (s.kind === "matching")
    return {
      ...common,
      pairingMode: s.pairingMode,
      targets: s.targets.map((t) => stableValue({ label: t.label, kind: t.kind })).sort(),
      matches: s.items
        .map((i) =>
          stableValue({
            label: i.label,
            validTargets: (s.validMatches[i.id] ?? [])
              .map((id) => s.targets.find((t) => t.id === id)?.label ?? id)
              .sort(),
          }),
        )
        .sort(),
    };
  if (!s.sequence) return { ...common, steps: s.steps };
  return {
    ...common,
    steps: s.sequence.steps.map((s) => s.label).sort(),
    correctOrder: s.sequence.correctOrder.map(
      (id) => s.sequence.steps.find((s) => s.id === id)?.label ?? id,
    ),
  };
}

export function trainingContent(scenarios: Scenario[]): string {
  const approved = scenarios.filter((s) => s.status === "approved");
  return stableValue(
    approved
      .map((s) =>
        stableValue({
          content: scenarioContent(s),
          followUpFor: s.followUpFor
            ? scenarioContent(approved.find((parent) => parent.id === s.followUpFor) ?? s)
            : undefined,
        }),
      )
      .sort(),
  );
}
