import type { PracticeData } from "./store";
import { procedureTargets, validateLocalProcedures } from "./local-procedures.ts";
import { createSequenceScenario } from "./sequence.ts";

/** Exclusion only: obvious optional/branching wording cannot establish a compulsory order.
 * This does not assess clinical correctness or infer missing operational facts.
 */
const conditionalStep =
  /\b(if|unless|optional|optionally|depending|alternatively)\b|\b(as needed|where appropriate|when necessary|may need|can skip)\b/i;

export function localProcedureSequence(p: PracticeData) {
  const targets = procedureTargets(p);
  const records = Object.entries(p.localProcedures ?? {}).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  for (const [requestId, record] of records) {
    try {
      validateLocalProcedures({ [requestId]: record });
      if (record.status !== "configured" || record.orderRequirement !== "required_linear") continue;
      const target = targets.find((t) => t.id === requestId);
      if (!target || target.conflict || target.label !== record.requestLabelAtConfirmation)
        continue;
      if (record.steps.some((step) => conditionalStep.test(step.text))) continue;
      const { history: _history, ...revision } = record;
      let seed = 2166136261;
      for (const char of `${record.id}:${record.version}`)
        seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
      const scenario = createSequenceScenario(
        {
          id: record.id,
          version: record.version,
          topicKey: "appointment-booking",
          title: `Handling a request: ${record.requestLabelAtConfirmation}`,
          steps: record.steps.map((s) => ({ id: s.id, label: s.text })),
          correctOrder: [...record.stepOrder],
          learningPoint: "Follow the order confirmed by your practice for this procedure.",
          evidence: [
            {
              reference: `practiceData.localProcedures[${requestId}]`,
              version: String(record.version),
            },
          ],
          scope: "production",
          kind: "local_sequence",
          confirmation: { status: "confirmed", by: record.confirmedBy, on: record.confirmedAt },
          localProcedure: structuredClone(revision),
        },
        seed,
      );
      scenario.question = `Put the steps for handling this request at your practice in the correct order: ${record.requestLabelAtConfirmation}`;
      scenario.patientQuote = record.appliesWhen;
      return scenario;
    } catch {
      // Invalid or unsupported knowledge stays stored; try another eligible procedure.
    }
  }
  return undefined;
}
