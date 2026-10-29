import type { PracticeData } from "./store";
import type { Module, Scenario, ReviewChange, ReviewConfirmation } from "./training-types";

/** Stable comparisons ignore object-key order and absent optional values, never interpret prose. */
export function stableValue(value: unknown): string {
  return (
    JSON.stringify(value, (_, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .filter((key) => v[key] !== undefined && v[key] !== null)
              .map((key) => [key, v[key]]),
          )
        : v,
    ) ?? "null"
  );
}
// A compact stale-decision guard, not a content version or a security credential.
export function reviewKey(module: Module, practice: PracticeData): string {
  const text = stableValue({
    practice,
    title: module.title,
    type: module.type,
    topicKey: module.topicKey,
    scenarios: module.scenarios,
  });
  let a = 2166136261,
    b = 5381;
  for (const char of text) {
    a = Math.imul(a ^ char.charCodeAt(0), 16777619);
    b = Math.imul(b, 33) ^ char.charCodeAt(0);
  }
  return `${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}`;
}
const labels: Record<string, string> = {
  practiceName: "Practice name",
  hours: "Opening hours",
  address: "Practice address",
};
const scalar = (v: unknown) =>
  (typeof v === "string" || typeof v === "number") && String(v).length <= 500
    ? String(v)
    : undefined;
function description(label: string, before?: string, after?: string): string {
  return before !== undefined && after !== undefined
    ? before === after
      ? `${label} was changed and restored to “${after}”.`
      : `${label} changed from “${before || "not set"}” to “${after || "not set"}”.`
    : `${label} changed. Check the training against the current practice information.`;
}
export function practiceChanges(before: PracticeData, after: PracticeData): ReviewChange[] {
  const changes: ReviewChange[] = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const old = (before as unknown as Record<string, unknown>)[key],
      next = (after as unknown as Record<string, unknown>)[key];
    if (stableValue(old) === stableValue(next)) continue;
    const label = labels[key] ?? "Practice information",
      from = scalar(old),
      to = scalar(next);
    changes.push({
      path: `practiceData.${key}`,
      label,
      before: from,
      after: to,
      reason: description(label, from, to),
    });
  }
  return changes;
}
function sourcePaths(scenario: Scenario): string[] | undefined {
  const source = scenario.provenance;
  if (!source || source.managerModified || !("paths" in source)) return undefined;
  return Array.isArray(source.paths) && source.paths.every((path) => typeof path === "string")
    ? source.paths
    : undefined;
}
function usesChange(scenario: Scenario, change: ReviewChange): boolean {
  const paths = sourcePaths(scenario);
  if (!paths?.length) return true; // Unknown/manual dependencies: conservative module review.
  return paths.some((path) => {
    const root = path.match(/^practiceData\.([a-zA-Z]+)(?:\.|\[|$)/)?.[1];
    // Unrecognised bindings cannot prove a practice change irrelevant.
    return !root || change.path.startsWith(`practiceData.${root}`);
  });
}
/** Review hints only: absent or edited provenance never implies an exact question dependency. */
export function recordedSourceChanges(scenario: Scenario, changes: ReviewChange[]): ReviewChange[] {
  const paths = sourcePaths(scenario) ?? [];
  return changes.filter((change) =>
    paths.some(
      (path) =>
        path === change.path ||
        path.startsWith(change.path + ".") ||
        path.startsWith(change.path + "[") ||
        change.path.startsWith(path + ".") ||
        change.path.startsWith(path + "["),
    ),
  );
}
/** Missing links require review of the whole module, never a guessed question dependency. */
export function questionReviewScope(module: Module) {
  const changes = module.reviewChanges ?? [];
  const broad =
    !!module.needsReview &&
    (!changes.length ||
      changes.some(
        (change) =>
          !module.scenarios.length ||
          module.scenarios.some(
            (scenario) =>
              usesChange(scenario, change) && !recordedSourceChanges(scenario, [change]).length,
          ),
      ));
  const ids = module.needsReview
    ? module.scenarios
        .filter((s) => broad || recordedSourceChanges(s, changes).length)
        .map((s) => s.id)
    : [];
  return { broad, ids };
}
export function questionReviewKey(module: Module, scenario: Scenario, practice: PracticeData) {
  return reviewKey(
    {
      ...module,
      title: stableValue({
        title: module.title,
        changes: module.reviewChanges,
        reason: module.reviewReason,
      }),
      scenarios: [{ ...scenario, status: "draft" }],
    },
    practice,
  );
}
export function pendingQuestionReviews(module: Module, practice: PracticeData): string[] {
  const { ids } = questionReviewScope(module);
  return module.scenarios
    .filter(
      (s) =>
        ids.includes(s.id) &&
        (s.status !== "approved" ||
          module.reviewedQuestions?.[s.id] !== questionReviewKey(module, s, practice)),
    )
    .map((s) => s.id);
}
export function approveReviewedQuestion(
  module: Module,
  scenarioId: string,
  practice: PracticeData,
): Module {
  const scenario = module.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return module;
  return {
    ...module,
    scenarios: module.scenarios.map((s) =>
      s.id === scenarioId ? { ...s, status: "approved" } : s,
    ),
    ...(module.needsReview
      ? {
          reviewedQuestions: {
            ...module.reviewedQuestions,
            [scenarioId]: questionReviewKey(module, scenario, practice),
          },
        }
      : {}),
  };
}
export function flagPracticeChanges(
  before: PracticeData | undefined,
  after: PracticeData,
  modules: Module[],
): Module[] {
  if (!before) return modules;
  const changes = practiceChanges(before, after);
  if (!changes.length) return modules;
  let changed = false;
  const result = modules.map((module) => {
    if (!module.published) return module;
    const relevant = changes.filter(
      (change) => !module.scenarios.length || module.scenarios.some((s) => usesChange(s, change)),
    );
    if (!relevant.length) return module;
    const pending = new Map((module.reviewChanges ?? []).map((change) => [change.path, change]));
    if (module.needsReview && !module.reviewChanges?.length && module.reviewReason)
      pending.set("module", {
        path: "module",
        label: "Existing review requirement",
        reason: module.reviewReason,
      });
    for (const change of relevant) {
      const previous = pending.get(change.path);
      const merged = { ...change, before: previous?.before ?? change.before };
      merged.reason = description(merged.label, merged.before, merged.after);
      pending.set(change.path, merged);
    }
    const reviewChanges = [...pending.values()];
    const reviewReason = reviewChanges.map((change) => change.reason).join("\n");
    if (
      module.needsReview &&
      !Object.keys(module.reviewedQuestions ?? {}).length &&
      stableValue(module.reviewChanges) === stableValue(reviewChanges) &&
      module.reviewReason === reviewReason
    )
      return module;
    changed = true;
    return {
      ...module,
      needsReview: true,
      reviewChanges,
      reviewReason,
      reviewedQuestions: undefined,
    };
  });
  return changed ? result : modules;
}

/** Server-side enforcement: history is retained and new decisions are authenticated/stamped. */
export function enforceReviewDecisions(
  previous: Module[],
  next: Module[],
  practice: PracticeData,
  actor: { id: string; name: string },
  at: string,
  previousPractice?: PracticeData,
): Module[] {
  return next.map((module) => {
    const old = previous.find((m) => m.id === module.id);
    const history = old?.reviewConfirmations ?? [];
    const added = (module.reviewConfirmations ?? []).filter(
      (r) => !history.some((h) => h.id === r.id),
    );
    if (old?.needsReview && !module.needsReview && !added.length)
      throw new Error("Record a review decision before making this module available again.");
    if (!added.length) return history.length ? { ...module, reviewConfirmations: history } : module;
    if (!old?.needsReview || added.length !== 1) throw new Error("Invalid review confirmation.");
    if (previousPractice && practiceChanges(previousPractice, practice).length)
      throw new Error("Save practice changes before reviewing and confirming affected training.");
    if (
      pendingQuestionReviews(
        {
          ...module,
          needsReview: true,
          reviewChanges: old.reviewChanges,
          reviewReason: old.reviewReason,
        },
        practice,
      ).length ||
      module.scenarios.some((s) => s.status !== "approved") ||
      !module.scenarios.length
    )
      throw new Error("Approve the questions requiring review before republishing.");
    const decision = added[0];
    if (
      !["unchanged", "updated"].includes(decision.decision) ||
      typeof decision.id !== "string" ||
      !decision.id ||
      typeof decision.note !== "string" ||
      decision.note.length > 1000 ||
      decision.reviewKey !== reviewKey(old, practice)
    )
      throw new Error(
        "Practice information or training changed. Review it again before confirming.",
      );
    if (
      decision.decision === "unchanged" &&
      stableValue(old.scenarios) !== stableValue(module.scenarios)
    )
      throw new Error("Changed training must be reviewed and republished.");
    const confirmed: ReviewConfirmation = {
      ...decision,
      by: actor.id,
      name: actor.name,
      at,
      reasons: old.reviewChanges?.length
        ? old.reviewChanges.map((c) => c.reason)
        : [old.reviewReason ?? "Training required review."],
    };
    return { ...module, reviewConfirmations: [...history, confirmed] };
  });
}
