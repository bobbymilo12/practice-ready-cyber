import type { PracticeData } from "./store";
import type { MatchingScenario } from "./training-types";
import { requestCategories, selectedRequests } from "./role-requests.ts";

export type MatchingDiagnostic = {
  code:
    | "ready"
    | "too_few_roles"
    | "unconfirmed_roles"
    | "conflicting_roles"
    | "no_unique_board"
    | "search_limit";
  message: string;
};

/** Count complete one-to-one solutions, stopping at two; never discard valid edges. */
export function uniqueMatching(
  items: string[],
  targets: string[],
  edges: Record<string, string[]>,
): Record<string, string> | undefined {
  let count = 0;
  let solution: Record<string, string> | undefined;
  function visit(index: number, used: Set<string>, pairs: Record<string, string>) {
    if (count > 1) return;
    if (index === items.length) {
      count++;
      solution = { ...pairs };
      return;
    }
    const id = items[index];
    for (const target of targets) {
      if (!used.has(target) && edges[id]?.includes(target)) {
        used.add(target);
        pairs[id] = target;
        visit(index + 1, used, pairs);
        used.delete(target);
        delete pairs[id];
      }
    }
  }
  visit(0, new Set(), {});
  return count === 1 ? solution : undefined;
}

function* combinations<T>(values: T[], size: number, start = 0, chosen: T[] = []): Generator<T[]> {
  if (chosen.length === size) {
    yield chosen;
    return;
  }
  for (let i = start; i <= values.length - (size - chosen.length); i++)
    yield* combinations(values, size, i + 1, [...chosen, values[i]]);
}
function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

/** Deterministic independent column ordering; avoid lining every correct pair up. */
function arrange<T extends { id: string }>(values: T[], salt: string): T[] {
  return [...values].sort(
    (a, b) => hash(salt + a.id) - hash(salt + b.id) || a.id.localeCompare(b.id),
  );
}

export function inspectRoleMatching(p: PracticeData): {
  diagnostic: MatchingDiagnostic;
  scenario?: MatchingScenario;
} {
  const fail = (code: MatchingDiagnostic["code"], message: string) => ({
    diagnostic: { code, message },
  });
  const roles = Object.values(p.roleRequests ?? {})
    .filter((r) => !r.archived)
    .sort((a, b) => a.roleId.localeCompare(b.roleId));
  if (roles.length < 3)
    return fail("too_few_roles", "Matching needs at least three active configured roles.");
  if (roles.some((r) => !r.confirmed))
    return fail(
      "unconfirmed_roles",
      "Confirm each active role configuration before generating matching.",
    );
  if (
    roles.some((r) => !r.label.trim()) ||
    new Set(roles.map((r) => r.roleId)).size !== roles.length ||
    new Set(roles.map((r) => r.label.trim().toLowerCase())).size !== roles.length
  )
    return fail("conflicting_roles", "Role names or identities conflict and need reviewing.");
  const candidates = requestCategories
    .flatMap((c) => c.requests)
    .filter((request) => {
      const label = request.label.trim().toLowerCase();
      return !roles.some((r) =>
        r.categories
          .flatMap((c) => c.requests)
          .some(
            (other) =>
              (other.id === request.id && other.label.trim().toLowerCase() !== label) ||
              (other.id !== request.id && other.label.trim().toLowerCase() === label),
          ),
      );
    });
  const selections = new Map(
    roles.map((r) => [r.roleId, new Set(selectedRequests(r).map((q) => q.id))]),
  );
  let limited = false;
  for (const size of [4, 3]) {
    let searched = 0;
    let targetSets = 0;
    boardSearch: for (const selectedRoles of combinations(roles, size)) {
      if (++targetSets > 2000) {
        limited = true;
        break;
      }
      const targetIds = selectedRoles.map((r) => r.roleId);
      // Two requests with identical target sets cannot coexist in a unique complete
      // solution (their targets could be swapped). One representative is sufficient.
      const patterns = new Map<string, (typeof candidates)[number]>();
      for (const request of candidates) {
        const valid = targetIds.filter((id) => selections.get(id)!.has(request.id));
        if (valid.length && !patterns.has(valid.join("|"))) patterns.set(valid.join("|"), request);
      }
      for (const requests of combinations([...patterns.values()], size)) {
        if (++searched > 50000) {
          limited = true;
          break boardSearch;
        }
        const validMatches = Object.fromEntries(
          requests.map((q) => [q.id, targetIds.filter((id) => selections.get(id)!.has(q.id))]),
        );
        const solution = uniqueMatching(
          requests.map((r) => r.id),
          targetIds,
          validMatches,
        );
        if (!solution) continue;
        const items = arrange(
          requests.map(({ id, label }) => ({ id, label })),
          "requests",
        );
        let targets = arrange(
          selectedRoles.map((r) => ({ id: r.roleId, label: r.label, kind: "role" as const })),
          "targets",
        );
        if (items.every((item, i) => solution[item.id] === targets[i].id))
          targets = [...targets.slice(1), targets[0]];
        return {
          diagnostic: { code: "ready", message: "A matching board is available." },
          scenario: {
            id: crypto.randomUUID(),
            kind: "matching",
            pairingMode: "one_to_one",
            title: "Match requests to practice roles",
            question:
              "Pair each request with a role shown, using each role card once. More than one role may handle a request; find the combination that works for all cards.",
            items,
            targets,
            validMatches,
            learningPoint:
              "The complete board uses each role once. All accepted pairings come from your practice’s confirmed role responsibilities; other configured relationships remain valid. Individual exceptions and availability are separate.",
            status: "draft",
            provenance: {
              kind: "practice_role_matching",
              generatorVersion: 2,
              level: "learn",
              source: "practice_setup",
              paths: ["practiceData.roleRequests"],
              snapshot: structuredClone(roles),
            },
          },
        };
      }
    }
  }
  return limited
    ? fail(
        "search_limit",
        "No safe matching board was found within the bounded search. Existing questions are used instead.",
      )
    : fail(
        "no_unique_board",
        "No unique 3- or 4-pair board can be formed from confirmed standard requests. Overlapping responsibilities remain valid; existing questions are used instead.",
      );
}
export function roleMatchingScenario(p: PracticeData): MatchingScenario | undefined {
  return inspectRoleMatching(p).scenario;
}
