import { inspectLocalProcedureSequences } from "./local-procedure-sequences.ts";
import type { PracticeData } from "./store";
import type { Scenario } from "./training-types";

/** Read-only report captured at Generate time, not a second source of practice knowledge. */
export function procedureGenerationReport(
  p: PracticeData,
  level: string | undefined,
  count: number,
  scenarios: Scenario[],
) {
  const inspected = inspectLocalProcedureSequences(p);
  const localCount = scenarios.filter((s) => s.provenance?.kind !== "core").length;
  return {
    generatedAt: new Date().toISOString(),
    level,
    requestedCount: count,
    localCount,
    proceduresFound: inspected.diagnostics.length,
    procedures: inspected.diagnostics.map((d) => {
      const allocated = scenarios.some(
        (s) =>
          s.provenance?.kind === "sequence" &&
          s.provenance.snapshot.localProcedure?.requestId === d.requestId,
      );
      const reason = !d.eligible
        ? d.reason
        : allocated
          ? "Allocated"
          : level === "learn"
            ? "Sequencing is available in Apply, not Learn"
            : level !== "apply"
              ? "No explicit Apply level"
              : "Not selected within the module target";
      return {
        ...d,
        learnCandidateCreated: false,
        applyCandidateCreated: d.eligible,
        allocated,
        allocationReason: reason,
      };
    }),
  };
}
