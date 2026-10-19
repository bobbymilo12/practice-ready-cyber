import type { Assignment } from "./training-types.ts";

export const activeAssignment = (assignment: Assignment) => !assignment.withdrawnAt;
export function withdrawAssignments(
  assignments: Assignment[],
  traineeId: string,
  at: number,
  by: string,
) {
  return assignments.map((a) =>
    a.traineeId === traineeId && activeAssignment(a)
      ? { ...a, withdrawnAt: at, withdrawnBy: by }
      : a,
  );
}
/** Historical withdrawals cannot be erased/reopened through ordinary workspace saves. */
export function validateAssignmentLifecycle(
  previous: Assignment[],
  next: Assignment[],
  inactiveIds: Set<string>,
) {
  for (const old of previous.filter((a) => a.withdrawnAt)) {
    const saved = next.find((a) => a.id === old.id);
    if (
      !saved ||
      saved.withdrawnAt !== old.withdrawnAt ||
      saved.traineeId !== old.traineeId ||
      saved.moduleId !== old.moduleId
    )
      throw new Error(
        "Withdrawn assignments must remain in history. Assign the module again to create new training.",
      );
  }
  for (const a of next) {
    if (activeAssignment(a) && inactiveIds.has(a.traineeId))
      throw new Error(
        "Inactive staff cannot receive assignments. Reactivate the staff member first.",
      );
    if (a.withdrawnAt !== undefined && (!Number.isFinite(a.withdrawnAt) || a.withdrawnAt <= 0))
      throw new Error("Invalid assignment withdrawal.");
  }
}
