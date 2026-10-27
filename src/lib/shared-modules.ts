import type { Module } from "./training-types.ts";

export type PublicModuleSummary = {
  practiceId: string;
  id: string;
  title: string;
  topicKey: string;
  type: string;
  scenarioCount: number;
};

/** Only a published module that is not paused for review may be offered to other practices. */
export const shareable = (m: Module) => m.published && !m.needsReview;

/** Copy a public module into another practice as a fresh draft its manager must approve.
 * Drops the source practice's review history (manager names and IDs) and package links.
 */
export function copyPublicModule(source: Module, id: string, at: number): Module {
  const {
    visibility: _visibility,
    packageId: _package,
    reviewChanges: _changes,
    reviewedQuestions: _approvals,
    reviewConfirmations: _history,
    needsReview: _needsReview,
    reviewReason: _reason,
    ...module
  } = structuredClone(source);
  const ids = new Map(module.scenarios.map((s) => [s.id, `${id}-${s.id}`]));
  return {
    ...module,
    id,
    type: "Copied from shared library",
    published: false,
    createdAt: at,
    scenarios: module.scenarios.map((s) => ({
      ...s,
      id: ids.get(s.id)!,
      status: "draft",
      followUpFor: s.followUpFor && (ids.get(s.followUpFor) ?? s.followUpFor),
    })),
  };
}
