import type { SequenceSource } from "../../src/lib/sequence.ts";
import { createTestSequenceScenario } from "../../src/lib/sequence.ts";
import type { Module } from "../../src/lib/training-types.ts";

// Artificial token exercise; not a healthcare or local administrative procedure.
export const approvedTestSequence: SequenceSource = {
  kind: "core_sequence",
  scope: "test_only",
  id: "sequence-stage1-test",
  version: 1,
  topicKey: "test-only",
  title: "Sequencing practice — test fixture",
  steps: [
    { id: "circle", label: "Place the circle token" },
    { id: "square", label: "Place the square token" },
    { id: "triangle", label: "Place the triangle token" },
    { id: "star", label: "Place the star token" },
  ],
  correctOrder: ["circle", "square", "triangle", "star"],
  learningPoint:
    "This test-only exercise defines circle → square → triangle → star. It is not a practice procedure.",
  evidence: [{ reference: "Stage 1 artificial token exercise specification", version: "1" }],
  approval: { status: "approved", by: "PracticeReady test fixture only", on: "2026-10-06" },
};
export function sequencePreviewModule(): Module {
  return {
    id: "dev-sequence-preview",
    title: "Sequencing — test-only preview",
    type: "Development test",
    topicKey: "test-only",
    published: true,
    createdAt: 1,
    scenarios: [{ ...createTestSequenceScenario(approvedTestSequence, 17), status: "approved" }],
  };
}
