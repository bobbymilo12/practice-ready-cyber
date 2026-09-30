import { coreTrainingLibrary, approvedAppointmentCoreVersions } from "./core-training-library.ts";
import { generateCoreScenario } from "./core-training-generation.ts";
import type { CoreGenerationContext } from "./core-training-generation";
import type { MCQScenario } from "./training-types";

/** A finite, interleaved pool: a fictional situation appears once, not once per level. */
export function appointmentCorePool(context: CoreGenerationContext): MCQScenario[] {
  if (context.topicKey !== "appointment-booking") return [];
  const concepts = coreTrainingLibrary.filter(
    (c) =>
      c.code &&
      approvedAppointmentCoreVersions[c.code] === c.version &&
      c.review.status === "approved",
  );
  const pool: MCQScenario[] = [];
  const seen = new Set<string>();
  const rounds = Math.max(
    0,
    ...concepts.flatMap(
      (c) => c.templates?.map((t) => t.executable?.allowedVariations.length ?? 0) ?? [],
    ),
  );
  for (let variation = 0; variation < rounds; variation++) {
    concepts.forEach((concept, index) => {
      // Explicit levels govern the whole module; retain alternating selection for legacy settings.
      const level =
        context.settings.trainingLevel ?? ((index + variation) % 2 === 0 ? "learn" : "apply");
      const recipe = concept.templates?.find(
        (t) => t.executable?.eligibleLevel === level,
      )?.executable;
      if (!recipe || variation >= recipe.allowedVariations.length) return;
      const scenario = generateCoreScenario(
        concept.id,
        context,
        level,
        "single_choice",
        variation,
      ).scenario;
      if (!scenario) return;
      const key = scenario.patientQuote;
      if (seen.has(key)) return;
      seen.add(key);
      pool.push(scenario);
    });
  }
  return pool;
}

/** Never silently upgrade the version/recipe of a stored Core question. */
export function regenerateAppointmentCore(
  current: MCQScenario,
  existing: readonly { id: string; patientQuote: string }[],
  context: CoreGenerationContext,
): MCQScenario | undefined {
  const origin = current.provenance;
  if (!origin || origin.recipe !== "controlled_single_choice") return undefined;
  if (context.settings.trainingLevel && context.settings.trainingLevel !== origin.level)
    return undefined;
  const concept = coreTrainingLibrary.find((c) => c.id === origin.conceptId);
  if (
    !concept ||
    concept.version !== origin.conceptVersion ||
    approvedAppointmentCoreVersions[concept.code ?? ""] !== concept.version
  )
    return undefined;
  const template = concept.templates?.find((t) => t.id === origin.templateId);
  const recipe = template?.executable;
  if (!recipe || recipe.id !== origin.executableRecipeId || recipe.version !== origin.recipeVersion)
    return undefined;
  const start = recipe.allowedVariations.findIndex((v) => v.id === origin.variationId);
  const used = new Set(existing.filter((s) => s.id !== current.id).map((s) => s.patientQuote));
  for (let offset = 1; offset < recipe.allowedVariations.length; offset++) {
    const index = (Math.max(0, start) + offset) % recipe.allowedVariations.length;
    const next = generateCoreScenario(
      concept.id,
      context,
      origin.level,
      "single_choice",
      index,
    ).scenario;
    if (next && !used.has(next.patientQuote)) return { ...next, id: current.id };
  }
  return undefined;
}
