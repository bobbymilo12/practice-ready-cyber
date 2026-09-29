import assert from "node:assert/strict";
import test from "node:test";
import { coreTrainingLibrary } from "../src/lib/core-training-library.ts";
import type { CoreTrainingConcept } from "../src/lib/core-training-types.ts";

const concepts: readonly CoreTrainingConcept[] = coreTrainingLibrary;

test("core examples have stable identities, revision metadata and current topic keys", () => {
  assert.equal(concepts.length, 3);
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
    assert.equal(c.review.status, "draft");
    assert.equal(c.provenance.kind, "example");
    assert.equal(c.provenance.maintainedBy, "PracticeReady");
    assert.ok(c.provenance.notes.length);
    assert.ok(c.sources.length);
    for (const source of c.sources) {
      assert.ok(source.organisation && source.title && source.section && source.version);
      assert.equal(new URL(source.url).protocol, "https:");
      assert.match(source.accessedOn, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(Number.isFinite(Date.parse(source.accessedOn)));
      assert.equal(source.assessment.status, "reference_only");
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
