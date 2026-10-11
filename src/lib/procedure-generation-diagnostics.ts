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
  const included = scenarios.find((s) => s.provenance?.kind === "sequence");
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
          : !["learn", "apply"].includes(level ?? "")
            ? "No explicit Learn/Apply level"
            : localCount < (level === "learn" ? 1 : 2)
              ? "Insufficient selected local slots"
              : included
                ? "Another eligible procedure selected; maximum one procedure per module"
                : "No replaceable local MCQ slot";
      return {
        ...d,
        learnCandidateCreated: d.eligible,
        applyCandidateCreated: d.eligible,
        allocated,
        allocationReason: reason,
      };
    }),
  };
}
