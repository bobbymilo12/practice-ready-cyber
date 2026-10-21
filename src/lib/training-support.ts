import type { Assignment, Module } from "./training-types.ts";
import type { Trainee } from "./store";
import { attemptUsesOlderContent, resumableAttempt, type TrainingSession } from "./training.ts";

export interface SupportReason {
  kind: "unresolved" | "repeated" | "confidence" | "updated" | "reassigned" | "paused";
  text: string;
}
export interface ModuleSupport {
  assignmentId: string;
  moduleId: string;
  moduleTitle: string;
  reasons: SupportReason[];
  latest?: TrainingSession;
  practising: boolean;
}
/** Completed time, not updatedAt: editing confidence must not promote an older attempt. */
export function currentCompletedAttempts(
  assignment: Assignment,
  module: Module,
  sessions: TrainingSession[],
) {
  return sessions
    .filter(
      (s) =>
        s.assignmentId === assignment.id &&
        s.traineeId === assignment.traineeId &&
        s.result &&
        Array.isArray(s.scenarios) &&
        !attemptUsesOlderContent(s, module),
    )
    .sort((a, b) => b.result!.completedAt - a.result!.completedAt || b.id.localeCompare(a.id));
}
export function traineeSupport(
  trainee: Trainee,
  assignments: Assignment[],
  modules: Module[],
  sessions: TrainingSession[],
): ModuleSupport[] {
  if (trainee.inactiveAt) return [];
  return assignments
    .filter((a) => a.traineeId === trainee.id && !a.withdrawnAt)
    .flatMap((a) => {
      const module = modules.find((m) => m.id === a.moduleId);
      if (!module) return [];
      const mine = sessions.filter((s) => s.assignmentId === a.id && s.traineeId === trainee.id);
      const completed = currentCompletedAttempts(a, module, sessions);
      const latest = completed[0];
      const practising = mine.some(
        (s) => Array.isArray(s.scenarios) && resumableAttempt(s, module),
      );
      const reasons: SupportReason[] = [];
      if (!module.published || module.needsReview) {
        if (!mine.some((s) => s.result))
          reasons.push({ kind: "paused", text: "Training paused — manager review needed." });
      } else {
        if (latest) {
          const unresolved = [...new Set(latest.result!.wrongTitles)];
          const previous = new Set(completed[1]?.result?.wrongTitles ?? []);
          const repeated = unresolved.filter((title) => previous.has(title));
          const remaining = unresolved.filter((title) => !previous.has(title));
          if (remaining.length)
            reasons.push({
              kind: "unresolved",
              text: `Unresolved in the latest completed attempt: ${remaining.join(", ")}.`,
            });
          if (repeated.length)
            reasons.push({
              kind: "repeated",
              text: `Unresolved in the last two completed attempts: ${repeated.join(", ")}.`,
            });
          const confidence = latest.result!.confidence;
          if (confidence === 1 || confidence === 2)
            reasons.push({
              kind: "confidence",
              text: `Confidence: ${confidence === 1 ? "Not yet" : "Shaky"} (${confidence}/5) in the latest completed attempt.`,
            });
        }
        // A previous completion remains valid. Content changes alone do not require a refresher.
        if (!mine.some((s) => s.result) && !practising) {
          if (
            mine.some(
              (s) => !s.result && Array.isArray(s.scenarios) && !resumableAttempt(s, module),
            )
          )
            reasons.push({
              kind: "updated",
              text: "Updated training is ready to start; earlier answers are retained.",
            });
          else if (
            sessions.some(
              (s) =>
                s.traineeId === trainee.id && s.moduleId === module.id && s.assignmentId !== a.id,
            )
          )
            reasons.push({ kind: "reassigned", text: "Reassigned training has not been started." });
        }
      }
      return reasons.length
        ? [
            {
              assignmentId: a.id,
              moduleId: module.id,
              moduleTitle: module.title,
              reasons,
              latest,
              practising,
            },
          ]
        : [];
    });
}
