import assert from "node:assert/strict";
import test from "node:test";
import { coreTrainingLibrary } from "../src/lib/core-training-library.ts";
import type { CoreTrainingConcept } from "../src/lib/core-training-types.ts";

import { coreBindingSources } from "../src/lib/core-training-generation.ts";

const concepts: readonly CoreTrainingConcept[] = coreTrainingLibrary;

test("core examples have stable identities, revision metadata and current topic keys", () => {
  assert.equal(concepts.length, 15);
  assert.equal(new Set(concepts.map((c) => c.id)).size, concepts.length);
  for (const c of concepts) {
    assert.match(c.id, /^core\.appointment-booking\.[a-z-]+$/);
    assert.equal(c.topicKey, "appointment-booking");
    assert.equal(c.schemaVersion, 1);
    assert.ok(Number.isInteger(c.version) && c.version > 0);
    assert.ok(c.title.trim() && c.learningObjective.trim());
    assert.ok(c.canTeach.length && c.canTeach.every((item) => item.trim()));
    assert.ok(c.supportedLevels.every((level) => ["learn", "apply", "handle"].includes(level)));
    assert.ok(
      c.supportedInteractions.every((kind) =>
        ["single_choice", "multi_select", "sequence"].includes(kind),
      ),
    );
    assert.equal(new Set(c.supportedLevels).size, c.supportedLevels.length);
    assert.equal(new Set(c.supportedInteractions).size, c.supportedInteractions.length);
    assert.ok(["administrative", "clinically_adjacent", "safety_critical"].includes(c.sensitivity));
  }
});

test("illustrations cannot be mistaken for reviewed or approved authoritative content", () => {
  for (const c of concepts) {
    assert.equal(
      c.review.status,
      ["AB01", "AB03", "AB04", "AB15"].includes(c.code!) ? "approved" : "draft",
    );
    assert.equal(c.provenance.kind, "example");
    assert.equal(c.provenance.maintainedBy, "PracticeReady");
    assert.ok(c.provenance.notes.length);
    assert.ok(c.sources.length);
    for (const source of c.sources) {
      assert.ok(source.organisation && source.title && source.version);
      assert.equal(new URL(source.url).protocol, "https:");
      assert.match(source.accessedOn, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(Number.isFinite(Date.parse(source.accessedOn)));
      assert.equal(
        source.assessment.status,
        c.review.status === "approved" ? "content_reviewed" : "reference_only",
      );
    }
  }
});

test("bindings declare missing-data behaviour and never contain local values", () => {
  let required = 0,
    optional = 0;
  for (const c of concepts) {
    assert.equal(new Set(c.localBindings.map((b) => b.key)).size, c.localBindings.length);
    for (const binding of c.localBindings) {
      assert.ok(binding.key && binding.description);
      assert.ok(["practice_setup", "module_setup"].includes(binding.source));
      if (binding.requirement === "required") {
        required++;
        assert.equal(binding.whenMissing, "unavailable");
      } else {
        optional++;
        assert.equal(binding.whenMissing, "omit_dependent_content");
      }
      assert.ok(!("value" in binding));
    }
    const ids = c.mustNotAssume.map((rule) => rule.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of [
      "no-inferred-urgency",
      "no-inferred-suitability",
      "no-invented-pathways",
      "no-missing-data-fallback",
    ])
      assert.ok(ids.includes(id));
    assert.ok(c.mustNotAssume.every((rule) => rule.description.trim()));
  }
  assert.ok(required > 0 && optional > 0);
});

test("core definitions remain plain serialisable content, separate from generated modules", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(concepts)), concepts);
  for (const c of concepts) {
    assert.ok(!("scenarios" in c));
    assert.ok(!("answers" in c));
    assert.ok(!("practiceData" in c));
    assert.ok(!("published" in c));
  }
});

test("Core v1 has 15 stable codes and 30 unique controlled single-choice patterns", () => {
  assert.deepEqual(
    concepts.map((c) => c.code),
    Array.from({ length: 15 }, (_, i) => `AB${String(i + 1).padStart(2, "0")}`),
  );
  const ids = new Set<string>();
  for (const c of concepts) {
    assert.equal(c.templates?.length, 2);
    assert.deepEqual(c.supportedInteractions, ["single_choice"]);
    for (const t of c.templates!) {
      assert.equal(ids.has(t.id), false);
      ids.add(t.id);
      assert.equal(
        t.id,
        `core.appointment-booking.${c.code!.toLowerCase()}.${t.eligibleLevels[0]}.v1`,
      );
      assert.ok(t.intent && t.pattern);
      assert.equal(t.interaction, "single_choice");
      assert.ok(t.eligibleLevels.every((l) => c.supportedLevels.includes(l) && l !== "handle"));
      for (const key of [...t.requiredBindings, ...t.optionalBindings]) {
        assert.ok(c.localBindings.some((b) => b.key === key));
        assert.ok(key in coreBindingSources);
      }
      assert.ok(t.requiredBindings.every((k) => !t.optionalBindings.includes(k)));
    }
  }
  assert.equal(ids.size, 30);
  for (const id of ["care-navigation", "understand-request", "accurate-information"]) {
    assert.equal(
      concepts.find((c) => c.id === `core.appointment-booking.${id}`)?.version,
      id === "care-navigation" ? 4 : 2,
    );
  }
});
