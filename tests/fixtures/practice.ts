import type { PracticeData } from "../../src/lib/store.ts";
import type { MatchingScenario } from "../../src/lib/training-types.ts";

// Fictional test data, never production defaults.
export const empty = (): PracticeData => ({
  practiceName: "Test Practice",
  hours: "",
  address: "",
});

/** A 4×4 one-to-one board with exactly one valid pairing. */
export const matchingBoard = (): MatchingScenario => ({
  kind: "matching",
  pairingMode: "one_to_one",
  id: "test-matching",
  title: "Matching test fixture",
  question: "Match each item to a target",
  items: ["a", "b", "c", "d"].map((id) => ({ id, label: `Item ${id}` })),
  targets: ["w", "x", "y", "z"].map((id) => ({ id, label: `Target ${id}`, kind: "role" })),
  validMatches: { a: ["w", "x"], b: ["x"], c: ["y", "z"], d: ["z"] },
  learningPoint: "Test only.",
  status: "approved",
});
