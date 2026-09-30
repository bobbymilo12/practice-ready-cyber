import assert from "node:assert/strict";
import test from "node:test";
import { coreTrainingLibrary } from "../src/lib/core-training-library.ts";
import {
  createCoreGenerator,
  generateCoreScenario,
  resolveCoreBinding,
  resolveCoreEligibility,
  resolveCoreTemplateEligibility,
} from "../src/lib/core-training-generation.ts";
import type { CoreGenerationContext } from "../src/lib/core-training-generation.ts";
import type { CoreTrainingConcept } from "../src/lib/core-training-types.ts";
import type { PracticeData } from "../src/lib/store.ts";
import { defaultModuleSettings } from "../src/lib/module-config.ts";
import { suggestedRole } from "../src/lib/role-requests.ts";

// TEST ONLY: synthetic editorial records exercise draft fixtures without approving the real library.
// This harness is never imported by application code; production has no allowDraft switch.
function fixture(index = 0): CoreTrainingConcept {
  const c = structuredClone(
    coreTrainingLibrary.find((c) => c.code === ["AB01", "AB02", "AB06"][index])!,
  );
  const record = { by: "Test fixture only", on: "2026-09-29" };
  return {
    ...c,
    version: 1,
    supportedLevels: index === 2 ? ["learn", "apply", "handle"] : ["learn", "apply"],
    levels:
      index === 0
        ? {
            learn: { bindings: [], recipe: "navigation_principle" },
            apply: {
              bindings: [
                "configured_roles",
                "effective_role_responsibilities",
                "booking_pathways",
                "escalation_routes",
              ],
              recipe: "booking_support",
            },
          }
        : index === 1
          ? {
              learn: { bindings: [], recipe: "clarify_request" },
              apply: { bindings: ["clinician_preference"], recipe: "clarify_request" },
            }
          : {
              learn: { bindings: [], recipe: "information_accuracy" },
              apply: {
                bindings: ["required_request_information", "information_handling_rules"],
                recipe: "information_accuracy",
              },
            },
    localBindings: (index === 0
      ? [
          "configured_roles",
          "effective_role_responsibilities",
          "booking_pathways",
          "escalation_routes",
        ]
      : index === 1
        ? ["clinician_preference"]
        : ["required_request_information", "information_handling_rules"]
    ).map((key) => ({
      key,
      source:
        key === "clinician_preference" || key === "required_request_information"
          ? "module_setup"
          : "practice_setup",
      description: "Test-only recipe dependency",
      ...(index === 1
        ? { requirement: "optional" as const, whenMissing: "omit_dependent_content" as const }
        : { requirement: "required" as const, whenMissing: "unavailable" as const }),
    })),
    review: { status: "approved", review: record, approval: record },
    sources: c.sources.map((s) => ({
      ...s,
      assessment: { status: "content_reviewed", review: record },
    })) as unknown as CoreTrainingConcept["sources"],
  };
}
function context(): CoreGenerationContext {
  const role = suggestedRole("Practice Nurse");
  role.confirmed = true;
  role.selectedRequestIds = [role.categories[0].requests[0].id];
  return {
    topicKey: "appointment-booking",
    settings: defaultModuleSettings(),
    practice: {
      staff: [
        {
          id: "employee-1",
          name: "Alex Example",
          role: role.label,
          requestOverrides: { [role.roleId]: { [role.selectedRequestIds[0]]: false } },
        },
      ],
      roleRequests: { [role.roleId]: role },
      bookingConfig: {
        version: 1,
        sameDayProcess: { id: "triage", other: "" },
        routineProcess: { id: "direct", other: "" },
        sameDayInstruction: "",
        routineInstruction: "",
        sameDayPathway: { selected: [], custom: [], instruction: "" },
        sendUncertainToDutyClinician: false,
        escalation: {
          contact: { kind: "staff", staffId: "employee-1" },
          method: { id: "person", other: "" },
          instruction: "",
        },
      },
    } as unknown as PracticeData,
  };
}
test("approved concepts resolve; all real draft examples remain production-ineligible", () => {
  for (let i = 0; i < 3; i++) {
    const c = fixture(i);
    assert.ok(createCoreGenerator([c])(c.id, context(), "learn").scenario);
    assert.equal(!!generateCoreScenario(c.id, context(), "learn").scenario, c.code === "AB01");
  }
  const c = fixture();
  assert.equal(resolveCoreEligibility(c, context(), "apply", "single_choice").eligible, true);
  for (const status of ["draft", "reviewed", "retired"] as const) {
    const unapproved = { ...c, review: { status } } as CoreTrainingConcept;
    assert.equal(
      resolveCoreEligibility(unapproved, context(), "learn", "single_choice").eligible,
      false,
    );
  }
  assert.equal(
    resolveCoreEligibility(
      { ...c, sources: coreTrainingLibrary.find((c) => c.code === "AB02")!.sources },
      context(),
      "learn",
      "single_choice",
    ).eligible,
    false,
  );
});
test("required data fails closed; optional absent module selection is safe", () => {
  const c = fixture(),
    ctx = context();
  delete ctx.practice.bookingConfig;
  assert.equal(createCoreGenerator([c])(c.id, ctx, "apply").scenario, undefined);
  const optional = fixture(1);
  const result = createCoreGenerator([optional])(optional.id, ctx, "apply");
  assert.ok(result.scenario);
  assert.deepEqual(result.scenario.provenance?.inputs, []);
  const info = fixture(2);
  assert.equal(createCoreGenerator([info])(info.id, context(), "apply").scenario, undefined);
});
test("level, topic, interaction and recipe prerequisites are explicit", () => {
  const c = fixture(),
    ctx = context();
  for (const interaction of ["multi_select", "sequence"] as const)
    assert.equal(resolveCoreEligibility(c, ctx, "learn", interaction).eligible, false);
  assert.equal(resolveCoreEligibility(c, ctx, "handle", "single_choice").eligible, false);
  assert.equal(
    resolveCoreEligibility({ ...c, levels: undefined }, ctx, "learn", "single_choice").eligible,
    false,
  );
  assert.equal(
    resolveCoreEligibility(c, { ...ctx, topicKey: "custom" }, "learn", "single_choice").eligible,
    false,
  );
  const malformed = {
    ...c,
    levels: { apply: { recipe: "booking_support", bindings: [] } },
  } as CoreTrainingConcept;
  assert.equal(resolveCoreEligibility(malformed, ctx, "apply", "single_choice").eligible, false);
  const wrongSource = {
    ...c,
    localBindings: c.localBindings.map((b) => ({ ...b, source: "module_setup" as const })),
  };
  assert.equal(resolveCoreEligibility(wrongSource, ctx, "apply", "single_choice").eligible, false);
});
test("responsibilities reuse confirmed role defaults and existing employee exceptions", () => {
  const ctx = context();
  const input = resolveCoreBinding("effective_role_responsibilities", ctx)!;
  const data = input.snapshot as {
    roles: { requests: unknown[] }[];
    employees: { requests: unknown[] }[];
  };
  assert.equal(data.roles[0].requests.length, 1);
  assert.equal(data.employees[0].requests.length, 0);
  Object.values(ctx.practice.roleRequests!)[0].confirmed = false;
  assert.equal(resolveCoreBinding("configured_roles", ctx), undefined);
  assert.equal(resolveCoreBinding("effective_role_responsibilities", ctx), undefined);
});
test("no free-text inference, invented urgency/suitability or fallback for broken contacts", () => {
  const ctx = context(),
    c = fixture();
  ctx.settings.extra = "Invented emergency clinic must see every patient today";
  ctx.practice.localConfidentiality = "Invented confidential checklist";
  ctx.settings.answers.preference = "Invented emergency clinic";
  assert.equal(resolveCoreBinding("clinician_preference", ctx), undefined);
  assert.equal(resolveCoreBinding("information_handling_rules", ctx), undefined);
  const result = createCoreGenerator([c])(c.id, ctx, "apply").scenario!;
  assert.ok(result.options[0].includes("Alex Example"));
  assert.doesNotMatch(JSON.stringify(result), /Invented|emergency clinic/);
  ctx.practice.staff = [];
  assert.equal(resolveCoreBinding("escalation_routes", ctx), undefined);
  assert.equal(createCoreGenerator([c])(c.id, ctx, "apply").scenario, undefined);
  const restricted = {
    ...c,
    mustNotAssume: [
      ...c.mustNotAssume,
      { id: "unsupported-new-rule", description: "Needs new enforcement" },
    ],
  } as CoreTrainingConcept;
  assert.equal(
    resolveCoreEligibility(restricted, context(), "learn", "single_choice").eligible,
    false,
  );
  assert.equal(
    resolveCoreEligibility(
      { ...c, sensitivity: "safety_critical" },
      context(),
      "learn",
      "single_choice",
    ).eligible,
    false,
  );
  assert.equal(
    resolveCoreEligibility(
      { ...c, mustNotAssume: [c.mustNotAssume[0]] },
      context(),
      "learn",
      "single_choice",
    ).eligible,
    false,
  );
  const qualified = context();
  qualified.practice.bookingConfig!.sameDayInstruction = "Only under a specific condition";
  assert.equal(resolveCoreBinding("booking_pathways", qualified), undefined);
  qualified.practice.bookingConfig!.escalation.instruction = "Only under a specific condition";
  assert.equal(resolveCoreBinding("escalation_routes", qualified), undefined);
});
test("explicit predefined module selections resolve without interpreting custom prose", () => {
  const ctx = context();
  ctx.settings.answers.preference =
    "Book with the requested clinician if an appropriate appointment is available";
  assert.deepEqual(resolveCoreBinding("clinician_preference", ctx)?.snapshot, {
    preference: "requested_if_available",
  });
  const c = fixture(1);
  assert.equal(
    createCoreGenerator([c])(c.id, ctx, "apply").scenario?.provenance?.inputs[0].source,
    "module_setup",
  );
});
test("provenance pins concept/recipe version and independent structured input snapshots", () => {
  const ctx = context(),
    c = fixture();
  const generate = createCoreGenerator([c]);
  const scenario = generate(c.id, ctx, "apply").scenario!;
  const saved = JSON.stringify(scenario);
  ctx.practice.staff[0].name = "Changed Name";
  (c as { version: number }).version = 99;
  assert.equal(JSON.stringify(scenario), saved);
  assert.equal(generate(c.id, ctx, "apply").scenario?.provenance?.conceptVersion, 1);
  const restored = JSON.parse(saved);
  assert.equal(restored.provenance.conceptId, c.id);
  assert.equal(restored.provenance.conceptVersion, 1);
  assert.equal(restored.provenance.recipeVersion, 1);
  assert.ok(restored.provenance.inputs.every((i: { paths: string[] }) => i.paths.length));
  const legacy = { ...scenario };
  delete legacy.provenance;
  assert.equal(JSON.parse(JSON.stringify(legacy)).kind, "mcq");
});

test("Core v1 templates use explicit availability, independently of executable recipes", () => {
  const approved = (code: string): CoreTrainingConcept => {
    const c = coreTrainingLibrary.find((c) => c.code === code)!;
    return { ...c, review: fixture().review, sources: fixture().sources };
  };
  const check = (code: string, ctx = context(), level: "learn" | "apply" = "apply") => {
    const c = approved(code);
    return resolveCoreTemplateEligibility(
      c,
      c.templates!.find((t) => t.eligibleLevels.includes(level))!.id,
      ctx,
      level,
    );
  };
  const empty = context();
  empty.practice.staff = [];
  empty.practice.roleRequests = {};
  delete empty.practice.bookingConfig;
  assert.equal(check("AB03", empty).eligible, true);
  assert.equal(check("AB07", empty).eligible, false);
  assert.equal(check("AB07").eligible, true);
  assert.equal(check("AB14", empty).eligible, false);
  assert.equal(check("AB14").eligible, true);
  assert.equal(check("AB14", empty, "learn").eligible, true);
  assert.equal(check("AB05", empty).eligible, true); // absent optional process
  assert.equal(check("AB10", empty).eligible, false);
  assert.equal(check("AB12", empty).eligible, false);
  const c = approved("AB05");
  const template = c.templates![0];
  assert.equal(resolveCoreTemplateEligibility(c, template.id, empty, "handle").eligible, false);
  assert.equal(
    resolveCoreTemplateEligibility(c, template.id, empty, "learn", "multi_select").eligible,
    false,
  );
  assert.equal(createCoreGenerator([c])(c.id, empty, "learn").scenario, undefined); // pattern is not a recipe
  for (const draft of coreTrainingLibrary.filter((c) => c.review.status === "draft")) {
    for (const t of draft.templates!) {
      assert.equal(
        resolveCoreTemplateEligibility(draft, t.id, context(), t.eligibleLevels[0]).eligible,
        false,
      );
      assert.equal(
        generateCoreScenario(draft.id, context(), t.eligibleLevels[0]).scenario,
        undefined,
      );
    }
  }
});

function approvedRecipeConcept(code: string): CoreTrainingConcept {
  const c = structuredClone(coreTrainingLibrary.find((c) => c.code === code)!);
  // Synthetic approval is isolated in tests; source registry remains draft.
  return { ...c, review: fixture().review, sources: fixture().sources };
}
const executableCodes = ["AB01", "AB03", "AB04", "AB15"];

test("only the four requested concepts have deterministic constrained executable recipes", () => {
  assert.deepEqual(
    coreTrainingLibrary.filter((c) => c.templates?.some((t) => t.executable)).map((c) => c.code),
    executableCodes,
  );
  const recipeIds = new Set<string>();
  for (const code of executableCodes) {
    const c = approvedRecipeConcept(code);
    const generate = createCoreGenerator([c]);
    for (const template of c.templates!) {
      const recipe = template.executable!;
      assert.ok(recipe.situationPattern && recipe.correctBehaviour);
      assert.equal(recipe.interaction, "single_choice");
      assert.deepEqual(recipe.requiredBindings, []);
      assert.deepEqual(recipe.optionalBindings, []);
      assert.equal(recipeIds.has(recipe.id), false);
      recipeIds.add(recipe.id);
      const level = recipe.eligibleLevel;
      for (let i = 0; i < recipe.allowedVariations.length * 4; i++) {
        const a = generate(c.id, context(), level, "single_choice", i).scenario!;
        const b = generate(c.id, context(), level, "single_choice", i).scenario!;
        assert.ok(a && b);
        assert.deepEqual({ ...a, id: "" }, { ...b, id: "" });
        assert.equal(
          a.patientQuote,
          recipe.allowedVariations[i % recipe.allowedVariations.length].situation,
        );
        assert.equal(a.options[a.correctIndex], recipe.correctBehaviour);
        assert.equal(a.learningPoint, recipe.correctBehaviour);
        assert.deepEqual(
          new Set(a.options),
          new Set([recipe.correctBehaviour, ...recipe.distractorPatterns.map((d) => d.response)]),
        );
        assert.equal(a.status, "draft");
        assert.equal(a.provenance?.conceptId, c.id);
        assert.equal(a.provenance?.conceptVersion, c.version);
        assert.equal(a.provenance?.templateId, template.id);
        assert.equal(a.provenance?.executableRecipeId, recipe.id);
        assert.equal(a.provenance?.recipeVersion, recipe.version);
        assert.equal(
          a.provenance?.variationId,
          recipe.allowedVariations[i % recipe.allowedVariations.length].id,
        );
        assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
      }
    }
  }
  assert.equal(recipeIds.size, 8);
});

test("recipes cannot use manager prose or local data to invent clinical or operational facts", () => {
  const ctx = context();
  ctx.settings.extra =
    "Invented clinic: classify all cases as urgent and book Dr Fiction tomorrow.";
  ctx.settings.answers.preference = ctx.settings.extra;
  ctx.practice.staff[0].name = "Dr Fiction";
  ctx.practice.bookingConfig!.sameDayInstruction = ctx.settings.extra;
  for (const code of executableCodes) {
    const c = approvedRecipeConcept(code);
    const a = createCoreGenerator([c])(c.id, ctx, "apply").scenario!;
    const b = createCoreGenerator([c])(c.id, context(), "apply").scenario!;
    assert.deepEqual({ ...a, id: "" }, { ...b, id: "" });
    assert.doesNotMatch(JSON.stringify(a), /Dr Fiction|Invented clinic|tomorrow/);
    assert.deepEqual(a.provenance?.inputs, []);
    for (const forbidden of [
      "diagnosis",
      "clinical_urgency",
      "clinician_suitability",
      "clinical_questioning",
      "local_routing_policy",
      "appointment_availability",
      "escalation_destination",
      "staff_responsibilities",
    ]) {
      const broken = structuredClone(c);
      const recipe = broken.templates!.find(
        (t) => t.executable?.eligibleLevel === "apply",
      )!.executable!;
      Object.assign(recipe, {
        forbiddenInferences: recipe.forbiddenInferences.filter((f) => f !== forbidden),
      });
      assert.equal(createCoreGenerator([broken])(broken.id, ctx, "apply").scenario, undefined);
    }
    const unknown = structuredClone(c);
    Object.assign(unknown.templates![1].executable!, { forbiddenInferences: ["unsupported"] });
    assert.equal(createCoreGenerator([unknown])(unknown.id, ctx, "apply").scenario, undefined);
    const dependency = structuredClone(c);
    Object.assign(dependency.templates![1].executable!, {
      requiredBindings: ["escalation_routes"],
    });
    assert.equal(
      createCoreGenerator([dependency])(dependency.id, ctx, "apply").scenario,
      undefined,
    );
  }
});

test("drafts, unreviewed sources, new interactions, Handle and unimplemented concepts stay unavailable", () => {
  for (const code of executableCodes) {
    const c = approvedRecipeConcept(code),
      generate = createCoreGenerator([c]);
    const draft = { ...c, review: { status: "draft" as const, notes: "Test draft" } };
    assert.equal(createCoreGenerator([draft])(c.id, context(), "learn").scenario, undefined);
    assert.equal(createCoreGenerator([draft])(c.id, context(), "apply").scenario, undefined);
    assert.equal(generate(c.id, context(), "handle").scenario, undefined);
    for (const interaction of ["multi_select", "sequence"] as const)
      assert.equal(generate(c.id, context(), "apply", interaction).scenario, undefined);
    for (const i of [-1, 0.5, NaN])
      assert.equal(generate(c.id, context(), "apply", "single_choice", i).scenario, undefined);
    const unreviewed = {
      ...c,
      sources: coreTrainingLibrary.find((c) => c.code === "AB02")!.sources,
    };
    assert.equal(createCoreGenerator([unreviewed])(c.id, context(), "apply").scenario, undefined);
  }
  for (const original of coreTrainingLibrary.filter((c) => !executableCodes.includes(c.code!))) {
    const c = approvedRecipeConcept(original.code!);
    assert.equal(createCoreGenerator([c])(c.id, context(), "apply").scenario, undefined);
  }
});

test("editorial recipe snapshot and stored provenance survive later content changes", () => {
  const c = approvedRecipeConcept("AB03");
  const generate = createCoreGenerator([c]);
  const saved = generate(c.id, context(), "apply").scenario!;
  const snapshot = JSON.stringify(saved);
  Object.assign(c, { version: 999 });
  Object.assign(c.templates![1].executable!, { correctBehaviour: "Changed candidate behaviour" });
  assert.equal(JSON.stringify(saved), snapshot);
  const next = generate(c.id, context(), "apply").scenario!;
  assert.equal(next.provenance?.conceptVersion, saved.provenance?.conceptVersion);
  assert.equal(next.options[next.correctIndex], saved.options[saved.correctIndex]);
});

test("Core executor fails closed when opposite levels reuse a fictional presentation", () => {
  const c = approvedRecipeConcept("AB01");
  const learn = c.templates!.find((t) => t.executable?.eligibleLevel === "learn")!.executable!;
  const apply = c.templates!.find((t) => t.executable?.eligibleLevel === "apply")!.executable!;
  Object.assign(apply, { allowedVariations: learn.allowedVariations });
  const result = createCoreGenerator([c])(c.id, context(), "apply");
  assert.equal(result.scenario, undefined);
  assert.ok(
    !result.eligibility.eligible && result.eligibility.reasons.includes("cross_level_duplicate"),
  );
});
