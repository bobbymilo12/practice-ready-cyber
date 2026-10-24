import type { MCQScenario } from "./training-types";
import { roleRequestSituation } from "./role-question-presentation.ts";
import type { PracticeData } from "./store";
import { procedureTargets, validateLocalProcedures } from "./local-procedures.ts";
import { createSequenceScenario } from "./sequence.ts";

/** Exclusion only: obvious optional/branching wording cannot establish a compulsory order.
 * This does not assess clinical correctness or infer missing operational facts.
 */
const conditionalStep =
  /\b(if|unless|optional|optionally|depending|alternatively|may|might)\b|\b((?:as|where|when|only when) (?:needed|appropriate|necessary|available)|can skip|either|otherwise)\b/i;

export function inspectLocalProcedureSequences(p: PracticeData) {
  const reasons: string[] = [];
  const candidates: ReturnType<typeof createSequenceScenario>[] = [];
  const diagnostics: { requestId: string; record: unknown; eligible: boolean; reason: string }[] =
    [];
  const targets = procedureTargets(p);
  const records = Object.entries(p.localProcedures ?? {}).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  for (const [requestId, record] of records) {
    const before = reasons.length;
    let eligible = false;
    try {
      validateLocalProcedures({ [requestId]: record });
      if (record.status !== "configured") {
        reasons.push("No configured procedure confirmed.");
        continue;
      }
      if (record.orderRequirement !== "required_linear") {
        reasons.push(
          `${record.requestLabelAtConfirmation}: required step order has not been confirmed (${record.orderRequirement ?? "unassessed"}).`,
        );
        continue;
      }
      const target = targets.find((t) => t.id === requestId);
      if (!target || target.conflict || target.label !== record.requestLabelAtConfirmation) {
        reasons.push(
          `${record.requestLabelAtConfirmation}: ${!target ? "request is absent from active confirmed roles" : target.conflict ? "request identity conflicts across roles" : "request label has changed since confirmation"}.`,
        );
        continue;
      }
      if (record.steps.length < 3 || record.steps.length > 5) {
        reasons.push(
          `${record.requestLabelAtConfirmation}: ${record.steps.length} steps saved; sequencing requires exactly 3–5. No steps were removed.`,
        );
        continue;
      }
      if (
        record.steps.some((s) => !s.text.trim()) ||
        new Set(record.steps.map((s) => s.text.trim().toLowerCase())).size !== record.steps.length
      ) {
        reasons.push(
          `${record.requestLabelAtConfirmation}: blank or duplicate step wording; no repair was attempted.`,
        );
        continue;
      }
      if (
        record.steps.some((step) =>
          conditionalStep.test(
            step.text.replace(/\b(ask|check|confirm)(?: the patient)? if\b/gi, "$1 whether"),
          ),
        )
      ) {
        reasons.push(
          `${record.requestLabelAtConfirmation}: step wording indicates conditional or optional actions; review the order setting.`,
        );
        continue;
      }
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
      scenario.question = `You are handling this request at reception. Put your practice’s procedure steps in the correct order: ${record.requestLabelAtConfirmation}`;
      scenario.patientQuote = record.appliesWhen;
      candidates.push(scenario);
      eligible = true;
    } catch (error) {
      reasons.push(
        `${record?.requestLabelAtConfirmation || "Saved procedure"}: needs valid confirmation and 3–5 distinct complete steps in an explicit order. ${error instanceof Error ? error.message : "Invalid record"}`,
      );
    } finally {
      diagnostics.push({
        requestId,
        record: structuredClone(record),
        eligible,
        reason: eligible ? "Apply sequencing candidate created." : reasons.slice(before).join(" "),
      });
    }
  }
  return { scenario: candidates[0], candidates, diagnostics, reasons };
}

export function localProcedureSequence(p: PracticeData) {
  return inspectLocalProcedureSequences(p).scenario;
}
/** Apply asks for the first action in a confirmed mandatory order. Other authored steps are
 * alternatives for this position, not fabricated workflows. No clinical interpretation. */
export function localProcedureApplication(
  p: PracticeData,
  source = localProcedureSequence(p),
): MCQScenario | undefined {
  if (!source) return undefined;
  const record = source.provenance.snapshot.localProcedure!;
  const ordered = source.sequence.correctOrder.map(
    (id) => source.sequence.steps.find((s) => s.id === id)!.label,
  );
  return {
    id: crypto.randomUUID(),
    kind: "mcq",
    title: `Beginning a request: ${record.requestLabelAtConfirmation}`,
    patientQuote: [
      roleRequestSituation(record.requestLabelAtConfirmation),
      record.appliesWhen,
      "You are beginning to handle this request at reception.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    question: "As the receptionist, what should you do first?",
    options: ordered,
    correctIndex: 0,
    learningPoint: "Begin with the first step in your practice’s procedure.",
    status: "draft",
    provenance: structuredClone(source.provenance),
  };
}
