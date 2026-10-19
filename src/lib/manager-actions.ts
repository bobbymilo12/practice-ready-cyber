import { scenarioContent } from "./training-content.ts";
import { stableValue } from "./practice-change-tracking.ts";
import { pendingQuestionReviews, reviewKey } from "./practice-change-tracking.ts";
import type { AppState } from "./store";

export type ManagerAction =
  | { kind: "publish"; moduleId: string; reviewKey?: string }
  | { kind: "delete-draft"; moduleId: string }
  | { kind: "merge"; moduleId: string; moduleIds: string[]; title: string }
  | { kind: "assign" | "reassign"; moduleId: string; traineeId: string };
export const managerActionKey = (action: ManagerAction) =>
  `${action.kind}:${action.moduleId}:${"traineeId" in action ? action.traineeId : ""}`;
type ManagerPatch = Partial<
  Pick<AppState, "modules" | "assignments" | "packages" | "currentDraftId">
>;

/** Prepare a separate payload; only apply its effects after the server confirms the save.
 * Reapplying to the latest state retains unrelated edits made while the request was pending.
 */
export function managerActionPatch(
  state: AppState,
  action: ManagerAction,
  identity: { id: string; at: number },
  confirmedFrom?: AppState,
): ManagerPatch {
  if (action.kind === "merge") {
    if (state.modules.some((m) => m.id === action.moduleId)) return {};
    const chosen = (confirmedFrom ?? state).modules.filter((m) => action.moduleIds.includes(m.id));
    if (chosen.length < 2 || !action.title.trim())
      throw new Error("Choose at least two modules and enter a title.");
    const scenarios: AppState["modules"][number]["scenarios"] = [];
    const seen = new Map<string, AppState["modules"][number]["scenarios"][number]>();
    const copiedIds = new Map<string, string>();
    const pendingParents: { scenario: (typeof scenarios)[number]; key: string }[] = [];
    chosen.forEach((module, index) => {
      module.scenarios.forEach((scenario) => {
        const parent = module.scenarios.find((s) => s.id === scenario.followUpFor);
        const key = stableValue({
          content: scenarioContent(scenario),
          provenance: scenario.provenance,
          requestId: scenario.kind === "mcq" ? scenario.localRoleRequestId : undefined,
          parent: parent
            ? {
                content: scenarioContent(parent),
                provenance: parent.provenance,
                requestId: parent.kind === "mcq" ? parent.localRoleRequestId : undefined,
              }
            : scenario.followUpFor,
        });
        const existing = seen.get(key);
        const needsApproval = module.needsReview || scenario.status !== "approved";
        if (existing) {
          if (needsApproval) existing.status = "draft";
          copiedIds.set(`${index}:${scenario.id}`, existing.id);
          return;
        }
        const copy = structuredClone(scenario);
        copy.id = `${action.moduleId}-${index}-${scenario.id}`;
        copy.status = needsApproval ? "draft" : scenario.status;
        copiedIds.set(`${index}:${scenario.id}`, copy.id);
        if (scenario.followUpFor)
          pendingParents.push({ scenario: copy, key: `${index}:${scenario.followUpFor}` });
        seen.set(key, copy);
        scenarios.push(copy);
      });
    });
    for (const { scenario, key } of pendingParents)
      scenario.followUpFor = copiedIds.get(key) ?? scenario.followUpFor;
    return {
      modules: [
        ...state.modules,
        {
          id: action.moduleId,
          type: "Merged module",
          title: action.title.trim(),
          topicKey: chosen[0]?.topicKey ?? "custom",
          published: false,
          scenarios,
          createdAt: identity.at,
        },
      ],
      currentDraftId: action.moduleId,
    };
  }
  if ((action as { kind: string }).kind === "confirm-review")
    throw new Error("Review the questions and publish the reviewed module.");
  const module = state.modules.find((m) => m.id === action.moduleId);
  if (!module) {
    if (confirmedFrom) return {};
    throw new Error("Module not found. Reload your practice and try again.");
  }
  if (action.kind === "publish") {
    const reviewed = confirmedFrom?.modules.find((m) => m.id === module.id) ?? module;
    const practice = confirmedFrom?.practiceData ?? state.practiceData;
    if (
      !confirmedFrom &&
      (!module.scenarios.length || module.scenarios.some((s) => s.status !== "approved"))
    )
      throw new Error("Approve every scenario before publishing.");
    if (reviewed.needsReview) {
      if (
        (!confirmedFrom && pendingQuestionReviews(reviewed, practice).length > 0) ||
        (action.reviewKey !== undefined && action.reviewKey !== reviewKey(reviewed, practice))
      )
        throw new Error(
          "Approve the questions requiring review against the current practice information before republishing.",
        );
      const changed = reviewKey(module, state.practiceData) !== reviewKey(reviewed, practice);
      const actor = confirmedFrom?.account ?? state.account;
      const record = {
        id: identity.id,
        decision: "updated" as const,
        note: "",
        reviewKey: reviewKey(reviewed, practice),
        by: actor?.id ?? "",
        name: actor?.name ?? "",
        at: new Date(identity.at).toISOString(),
        reasons: reviewed.reviewChanges?.length
          ? reviewed.reviewChanges.map((c) => c.reason)
          : [reviewed.reviewReason ?? "Training required review."],
      };
      return {
        modules: state.modules.map((m) =>
          m.id === module.id
            ? {
                ...m,
                published: true,
                needsReview: changed,
                reviewChanges: changed ? m.reviewChanges : undefined,
                reviewReason: changed
                  ? (m.reviewReason ??
                    "Practice information or training changed during confirmation. Review again.")
                  : undefined,
                reviewConfirmations: [
                  ...(m.reviewConfirmations ?? []).filter((r) => r.id !== record.id),
                  record,
                ],
              }
            : m,
        ),
      };
    }
    const changed =
      !!confirmedFrom && reviewKey(module, state.practiceData) !== reviewKey(reviewed, practice);
    return {
      modules: state.modules.map((m) =>
        m.id === module.id ? { ...m, published: true, needsReview: changed } : m,
      ),
    };
  }
  if (action.kind === "delete-draft") {
    if (module.published) throw new Error("Only draft modules can be deleted here.");
    return {
      modules: state.modules.filter((m) => m.id !== module.id),
      assignments: state.assignments.filter((a) => a.moduleId !== module.id),
      packages: state.packages.map((p) => ({
        ...p,
        moduleIds: p.moduleIds.filter((id) => id !== module.id),
      })),
      currentDraftId: state.currentDraftId === module.id ? null : state.currentDraftId,
    };
  }
  if (!state.trainees.some((t) => t.id === action.traineeId) || !module.published)
    throw new Error("Choose a trainee and a published module in this practice.");
  const existing = state.assignments.find(
    (a) => a.traineeId === action.traineeId && a.moduleId === module.id,
  );
  if (action.kind === "assign") {
    if (existing) return {};
    return {
      assignments: [
        ...state.assignments,
        {
          id: identity.id,
          traineeId: action.traineeId,
          moduleId: module.id,
          assignedAt: identity.at,
          status: "assigned",
        },
      ],
    };
  }
  if (!existing) throw new Error("Assignment not found. Reload your practice and try again.");
  return {
    assignments: state.assignments.map((a) =>
      a === existing ? { ...a, id: identity.id, assignedAt: identity.at, status: "assigned" } : a,
    ),
  };
}
