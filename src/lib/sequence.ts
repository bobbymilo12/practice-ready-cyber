import type { OrderScenario, StructuredOrderScenario } from "./training-types.ts";

export interface SequenceContent {
  id: string;
  version: number;
  topicKey: string;
  title: string;
  steps: { id: string; label: string }[];
  correctOrder: string[];
  learningPoint: string;
  evidence: { reference: string; version?: string }[];
  scope: "production" | "test_only";
  localProcedure?: Extract<
    import("./local-procedures").ProcedureRevision,
    { status: "configured" }
  >;
}
export type SequenceSource = SequenceContent &
  (
    | { kind: "core_sequence"; approval: { status: "approved"; by: string; on: string } }
    | { kind: "local_sequence"; confirmation: { status: "confirmed"; by: string; on: string } }
  );
export interface SequenceProvenance {
  kind: "sequence";
  sourceId: string;
  sourceVersion: number;
  sourceKind: SequenceSource["kind"];
  generatorVersion: 1;
  snapshot: SequenceSource;
  managerModified?: boolean;
}
export function isStepPermutation(ids: unknown, expected: readonly string[]): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length === expected.length &&
    ids.every((id) => typeof id === "string" && expected.includes(id)) &&
    new Set(ids).size === expected.length
  );
}
/** Seeded Fisher–Yates. The stored answer key is never mutated. */
export function shuffleSequence(correct: readonly string[], seed: number): string[] {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...correct];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.length > 1 && result.every((id, i) => id === correct[i]))
    [result[0], result[1]] = [result[1], result[0]];
  return result;
}
function build(source: SequenceSource, seed: number): StructuredOrderScenario {
  const record = source.kind === "core_sequence" ? source.approval : source.confirmation;
  if (
    !record ||
    (source.kind === "core_sequence"
      ? record.status !== "approved"
      : record.status !== "confirmed") ||
    !record.by?.trim() ||
    !record.on?.trim() ||
    !source.id?.trim() ||
    !Number.isInteger(source.version) ||
    source.version < 1 ||
    source.steps.length < 3 ||
    source.steps.length > 5 ||
    source.steps.some((s) => !s.id.trim() || !s.label.trim()) ||
    new Set(source.steps.map((s) => s.id)).size !== source.steps.length ||
    new Set(source.steps.map((s) => s.label.trim().toLowerCase())).size !== source.steps.length ||
    !isStepPermutation(
      source.correctOrder,
      source.steps.map((s) => s.id),
    ) ||
    !source.evidence.length
  )
    throw new Error("An approved or confirmed explicit 3–5-step sequence is required.");
  return {
    kind: "order",
    id: crypto.randomUUID(),
    title: source.title,
    patientQuote: "",
    question: "Put these steps in the correct order",
    sequence: {
      steps: structuredClone(source.steps),
      correctOrder: [...source.correctOrder],
      presentationOrder: shuffleSequence(source.correctOrder, seed),
    },
    learningPoint: source.learningPoint,
    status: "draft",
    provenance: {
      kind: "sequence",
      sourceId: source.id,
      sourceVersion: source.version,
      sourceKind: source.kind,
      generatorVersion: 1,
      snapshot: structuredClone(source),
    },
  };
}
/** Build only from approved Core or explicitly confirmed local sequence sources. */
export function createSequenceScenario(
  source: SequenceSource,
  seed: number,
): StructuredOrderScenario {
  if (source.scope !== "production")
    throw new Error("Test-only sequence sources are not production content.");
  return build(source, seed);
}
/** Isolated test/dev entry point: cannot accept production sources. */
export function createTestSequenceScenario(
  source: SequenceSource,
  seed: number,
): StructuredOrderScenario {
  if (source.scope !== "test_only") throw new Error("A test-only source is required.");
  return build(source, seed);
}
export function orderKey(scenario: OrderScenario): string[] {
  return scenario.sequence ? scenario.sequence.correctOrder : scenario.steps;
}
export function orderLabels(scenario: OrderScenario, ids: readonly string[]): string[] {
  return scenario.sequence
    ? ids.map((id) => scenario.sequence!.steps.find((s) => s.id === id)?.label ?? "Unknown step")
    : [...ids];
}
export function moveSequence(ids: readonly string[], from: number, to: number): string[] {
  const next = [...ids];
  if (from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
