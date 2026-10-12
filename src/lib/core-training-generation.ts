import { coreForbiddenInferences } from "./core-appointment-recipes.ts";
import { coreTrainingLibrary, coreBindingSources } from "./core-training-library.ts";
import type {
  CoreBindingId,
  CoreRecipeId,
  CoreTrainingConcept,
  InteractionType,
  TrainingLevel,
} from "./core-training-types";
import type { PracticeData } from "./store";
import type { ModuleSettings } from "./module-config";
import type { MCQScenario, CoreScenarioProvenance } from "./training-types";
import { effectiveRequestsForStaff, selectedRequests, requestRoleId } from "./role-requests.ts";
import { contactMethods, contactRoles } from "./practice-config.ts";

export interface CoreGenerationContext {
  topicKey: string;
  practice: PracticeData;
  settings: ModuleSettings;
}
type ResolvedInput = CoreScenarioProvenance["inputs"][number];
export { coreBindingSources } from "./core-training-library.ts";

/** Closed adapters over explicit selections only. No legacy-text migrations or text inference. */
export function resolveCoreBinding(
  key: CoreBindingId,
  context: CoreGenerationContext,
): ResolvedInput | undefined {
  const p = context.practice;
  const roles = Object.values(p.roleRequests ?? {}).filter((r) => r.confirmed && !r.archived);
  const resolved = (snapshot: unknown, paths: string[]): ResolvedInput => ({
    bindingId: key,
    source: coreBindingSources[key],
    paths,
    snapshot: structuredClone(snapshot),
  });
  switch (key) {
    case "configured_roles":
      return roles.length
        ? resolved(
            roles.map((r) => ({ id: r.roleId, label: r.label })),
            ["practiceData.roleRequests"],
          )
        : undefined;
    case "effective_role_responsibilities": {
      const capabilities = roles.map((r) => ({ roleId: r.roleId, requests: selectedRequests(r) }));
      const employees = p.staff
        .filter((s) => roles.some((r) => r.roleId === requestRoleId(s.role)))
        .map((s) => ({ employeeId: s.id, requests: effectiveRequestsForStaff(p, s.id) }));
      return capabilities.some((r) => r.requests.length) || employees.some((s) => s.requests.length)
        ? resolved({ roles: capabilities, employees }, [
            "practiceData.roleRequests",
            "practiceData.staff.role",
            "practiceData.staff.requestOverrides",
          ])
        : undefined;
    }
    case "booking_pathways": {
      const b = p.bookingConfig;
      // Conditional/custom instructions need a future typed adapter; never discard their qualifiers.
      if (
        !b ||
        b.sameDayInstruction.trim() ||
        b.routineInstruction.trim() ||
        b.sameDayPathway.instruction.trim() ||
        !["direct", "triage"].includes(b.sameDayProcess.id) ||
        !["direct", "online", "triage"].includes(b.routineProcess.id)
      )
        return undefined;
      return resolved({ sameDay: b.sameDayProcess.id, routine: b.routineProcess.id }, [
        "practiceData.bookingConfig.sameDayProcess",
        "practiceData.bookingConfig.routineProcess",
      ]);
    }
    case "escalation_routes": {
      const r = p.bookingConfig?.escalation;
      if (!r || r.instruction.trim()) return undefined;
      const method = contactMethods.find((m) => m.id === r.method.id && m.id !== "other");
      const contact = r.contact;
      const person =
        contact.kind === "staff" ? p.staff.find((s) => s.id === contact.staffId) : undefined;
      const name =
        person?.name ||
        (r.contact.kind === "role" && contactRoles.includes(r.contact.role) ? r.contact.role : "");
      if (!name.trim() || !method || (r.method.id === "phone" && !r.method.other.trim()))
        return undefined;
      return resolved(
        {
          contact: r.contact,
          name,
          methodId: method.id,
          method: method.label,
          phone: r.method.id === "phone" ? r.method.other : undefined,
        },
        [
          "practiceData.bookingConfig.escalation",
          ...(person ? [`practiceData.staff[${person.id}].name`] : []),
        ],
      );
    }
    case "clinician_preference": {
      if (context.topicKey !== "appointment-booking") return undefined;
      const choices: Record<string, string> = {
        "Book with the requested clinician if an appropriate appointment is available":
          "requested_if_available",
        "Offer another suitable clinician if the requested clinician is unavailable":
          "alternative_if_unavailable",
      };
      const value = choices[context.settings.answers.preference];
      return value ? resolved({ preference: value }, ["settings.answers.preference"]) : undefined;
    }
    // No appropriate structured Appointment Booking fields exist for these contracts yet.
    // Do not reinterpret settings.extra, answerDetails, localConfidentiality or other prose.
    default:
      return undefined;
  }
}

const baseConstraints = [
  "no-inferred-urgency",
  "no-inferred-suitability",
  "no-invented-pathways",
  "no-missing-data-fallback",
];
const supportedConstraints = new Set([...baseConstraints, "no-universal-checklist"]);
const recipeLevels: Record<CoreRecipeId, readonly TrainingLevel[]> = {
  navigation_principle: ["learn"],
  clarify_request: ["learn", "apply"],
  information_accuracy: ["learn", "apply", "handle"],
  booking_support: ["apply"],
};
export type CoreEligibility =
  | { eligible: false; reasons: string[] }
  | { eligible: true; recipe: CoreRecipeId | "controlled_single_choice"; inputs: ResolvedInput[] };

function corePolicyReasons(concept: CoreTrainingConcept): string[] {
  const reasons: string[] = [];
  if (concept.review.status !== "approved") reasons.push("core_not_approved");
  if (
    concept.provenance.maintainedBy !== "PracticeReady" ||
    concept.sources.some((s) => s.assessment.status !== "content_reviewed")
  )
    reasons.push("editorial_review_required");
  if (
    baseConstraints.some((id) => !concept.mustNotAssume.some((c) => c.id === id)) ||
    concept.mustNotAssume.some((c) => !supportedConstraints.has(c.id))
  )
    reasons.push("unsupported_constraint_contract");
  return reasons;
}

/** Content availability only, not permission to execute a pattern as a generator prompt. */
export function resolveCoreTemplateEligibility(
  concept: CoreTrainingConcept,
  templateId: string,
  context: CoreGenerationContext,
  level: TrainingLevel,
  interaction: InteractionType = "single_choice",
): { eligible: boolean; reasons: string[]; inputs: ResolvedInput[] } {
  const reasons = corePolicyReasons(concept);
  const template = concept.templates?.find((t) => t.id === templateId);
  const inputs: ResolvedInput[] = [];
  if (!template) return { eligible: false, reasons: [...reasons, "unknown_template"], inputs };
  if (concept.topicKey !== context.topicKey) reasons.push("topic_mismatch");
  if (!concept.supportedLevels.includes(level) || !template.eligibleLevels.includes(level))
    reasons.push("level_unavailable");
  if (
    interaction !== "single_choice" ||
    template.interaction !== interaction ||
    !concept.supportedInteractions.includes(interaction)
  )
    reasons.push("interaction_unavailable");
  if (concept.sensitivity === "safety_critical") reasons.push("safety_critical_recipe_unavailable");
  if (template.mustNotAssume?.some((c) => !supportedConstraints.has(c.id)))
    reasons.push("unsupported_constraint_contract");
  for (const key of [...template.requiredBindings, ...template.optionalBindings]) {
    const declaration = concept.localBindings.find((b) => b.key === key);
    if (
      !declaration ||
      declaration.source !== coreBindingSources[key] ||
      (declaration.requirement === "required" && !template.requiredBindings.includes(key))
    ) {
      reasons.push(`binding_contract:${key}`);
      continue;
    }
    const input = resolveCoreBinding(key, context);
    if (input) inputs.push(input);
    else if (template.requiredBindings.includes(key)) reasons.push(`missing:${key}`);
  }
  return { eligible: reasons.length === 0, reasons, inputs };
}

export function resolveCoreEligibility(
  concept: CoreTrainingConcept,
  context: CoreGenerationContext,
  level: TrainingLevel,
  interaction: InteractionType,
): CoreEligibility {
  const reasons = corePolicyReasons(concept);
  if (concept.topicKey !== context.topicKey) reasons.push("topic_mismatch");
  if (interaction !== "single_choice" || !concept.supportedInteractions.includes(interaction))
    reasons.push("interaction_unavailable");
  const definition = concept.levels?.[level];
  if (!concept.supportedLevels.includes(level) || !definition) reasons.push("level_unavailable");
  if (concept.sensitivity === "safety_critical") reasons.push("safety_critical_recipe_unavailable");
  const inputs: ResolvedInput[] = [];
  if (definition) {
    if (!recipeLevels[definition.recipe]?.includes(level)) reasons.push("recipe_unavailable");
    for (const key of definition.bindings) {
      const declaration = concept.localBindings.find((b) => b.key === key);
      if (!declaration || declaration.source !== coreBindingSources[key]) {
        reasons.push(`binding_contract:${key}`);
        continue;
      }
      const input = resolveCoreBinding(key, context);
      if (input) inputs.push(input);
      else if (declaration.requirement === "required") reasons.push(`missing:${key}`);
    }
    const required: CoreBindingId[] =
      definition.recipe === "booking_support"
        ? [
            "configured_roles",
            "effective_role_responsibilities",
            "booking_pathways",
            "escalation_routes",
          ]
        : definition.recipe === "information_accuracy" && level !== "learn"
          ? ["required_request_information", "information_handling_rules"]
          : [];
    for (const key of required) {
      if (!inputs.some((i) => i.bindingId === key)) reasons.push(`missing:${key}`);
    }
  }
  return reasons.length || !definition
    ? { eligible: false, reasons }
    : { eligible: true, recipe: definition.recipe, inputs };
}

/** Library must be a trusted editorial registry, never manager-supplied request data. */
export function createCoreGenerator(library: readonly CoreTrainingConcept[]) {
  const registry = structuredClone(library);
  return (
    conceptId: string,
    context: CoreGenerationContext,
    level: TrainingLevel,
    interaction: InteractionType = "single_choice",
    variationIndex = 0,
  ): { scenario?: MCQScenario; eligibility: CoreEligibility } => {
    const concept = registry.find((c) => c.id === conceptId);
    if (!concept) return { eligibility: { eligible: false, reasons: ["unknown_concept"] } };
    // Explicit legacy level recipes retain their existing behaviour.
    const template = concept.levels
      ? undefined
      : concept.templates?.find((t) => t.executable && t.eligibleLevels.includes(level));
    if (template?.executable) {
      const availability = resolveCoreTemplateEligibility(
        concept,
        template.id,
        context,
        level,
        interaction,
      );
      if (!availability.eligible)
        return { eligibility: { eligible: false, reasons: availability.reasons } };
      const recipe = template.executable;
      const responses = [
        recipe.correctBehaviour,
        ...recipe.distractorPatterns.map((d) => d.response),
      ];
      // These four recipes contain no local facts. Adding binding-dependent rendering requires
      // a separately reviewed executor, not interpolating arbitrary content into this one.
      const valid =
        ["AB01", "AB03", "AB04", "AB15"].includes(concept.code ?? "") &&
        !!recipe.approval?.by &&
        !!recipe.approval?.on &&
        recipe.id === `${template.id}.recipe` &&
        recipe.version === 2 &&
        recipe.eligibleLevel === level &&
        recipe.interaction === interaction &&
        recipe.situationPattern === template.pattern &&
        !recipe.requiredBindings.length &&
        !recipe.optionalBindings.length &&
        !template.requiredBindings.length &&
        !template.optionalBindings.length &&
        coreForbiddenInferences.every((f) => recipe.forbiddenInferences.includes(f)) &&
        recipe.forbiddenInferences.every((f) => coreForbiddenInferences.includes(f)) &&
        recipe.allowedVariations.length > 0 &&
        recipe.distractorPatterns.length >= 2 &&
        recipe.allowedVariations.every((v) => v.id.trim() && v.situation.trim()) &&
        new Set(recipe.allowedVariations.map((v) => v.id)).size ===
          recipe.allowedVariations.length &&
        recipe.distractorPatterns.every(
          (d) => d.id.trim() && d.theme.trim() && d.response.trim(),
        ) &&
        new Set(recipe.distractorPatterns.map((d) => d.id)).size ===
          recipe.distractorPatterns.length &&
        recipe.correctBehaviour.trim() &&
        new Set(responses).size === responses.length &&
        Number.isSafeInteger(variationIndex) &&
        variationIndex >= 0;
      if (!valid)
        return { eligibility: { eligible: false, reasons: ["unsupported_executable_contract"] } };
      const variation = recipe.allowedVariations[variationIndex % recipe.allowedVariations.length];
      const otherLevel = concept.templates?.find(
        (t) => t.executable?.eligibleLevel === (level === "learn" ? "apply" : "learn"),
      )?.executable;
      if (
        otherLevel?.allowedVariations.some((v) => v.situation.trim() === variation.situation.trim())
      )
        return { eligibility: { eligible: false, reasons: ["cross_level_duplicate"] } };
      // Deterministic rotation changes answer position, never the approved answer key.
      const shift = variationIndex % responses.length;
      const options = [...responses.slice(shift), ...responses.slice(0, shift)];
      return {
        eligibility: {
          eligible: true,
          recipe: "controlled_single_choice",
          inputs: availability.inputs,
        },
        scenario: {
          id: crypto.randomUUID(),
          kind: "mcq",
          title: variation.title ?? "Understanding the request",
          patientQuote: variation.situation,
          question: "What would be the best way to respond?",
          options,
          correctIndex: (responses.length - shift) % responses.length,
          learningPoint: recipe.correctBehaviour,
          status: "draft",
          provenance: {
            kind: "core",
            conceptId: concept.id,
            conceptVersion: concept.version,
            level,
            interaction: "single_choice",
            recipe: "controlled_single_choice",
            templateId: template.id,
            executableRecipeId: recipe.id,
            recipeVersion: recipe.version,
            variationId: variation.id,
            inputs: structuredClone(availability.inputs),
          },
        },
      };
    }
    const eligibility = resolveCoreEligibility(concept, context, level, interaction);
    if (!eligibility.eligible) return { eligibility };
    // Closed recipe set (editorial approval still required): no LLM, arbitrary prompt, symptom classification or free-text interpolation.
    let patientQuote: string, question: string, options: string[];
    switch (eligibility.recipe) {
      case "controlled_single_choice":
        return { eligibility: { eligible: false, reasons: ["recipe_unavailable"] } };
      case "navigation_principle":
        patientQuote =
          "A colleague asks whether a job title is enough to decide who can handle a request.";
        question = "What should determine the choice?";
        options = [
          "The confirmed responsibilities and booking process",
          "The job title alone",
          "The patient's previous appointment type",
        ];
        break;
      case "clarify_request":
        patientQuote =
          "A patient asks for an appointment but has not explained what help they need.";
        question = "What would you do next?";
        options = [
          "Clarify what help the patient is requesting",
          "Choose an appointment type from their previous visit",
          "Treat the request for an appointment as enough information to choose a clinician",
        ];
        break;
      case "information_accuracy":
        patientQuote =
          "A colleague's handover includes a detail that the patient has not confirmed.";
        question = "How should you handle that detail?";
        options = [
          "Clarify it rather than recording an assumption as fact",
          "Treat it as confirmed because it appears in the handover",
          "Use a similar previous request to fill the gap",
        ];
        break;
      case "booking_support": {
        const route = eligibility.inputs.find((i) => i.bindingId === "escalation_routes")!
          .snapshot as { name: string; method: string; phone?: string };
        patientQuote =
          "You cannot resolve a booking request and need help deciding what to do next.";
        question = "How should you ask for support?";
        options = [
          `Contact ${route.name} — ${route.method}${route.phone ? `: ${route.phone}` : ""}`,
          "Choose the route used for the patient's last request",
          "Ask the patient to choose an appointment type before seeking support",
        ];
        break;
      }
    }
    return {
      eligibility,
      scenario: {
        id: crypto.randomUUID(),
        kind: "mcq",
        title: concept.title,
        patientQuote,
        question,
        options,
        correctIndex: 0,
        learningPoint: options[0],
        status: "draft",
        provenance: {
          kind: "core",
          conceptId: concept.id,
          conceptVersion: concept.version,
          level,
          interaction: "single_choice",
          recipe: eligibility.recipe,
          recipeVersion: 1,
          inputs: structuredClone(eligibility.inputs),
        },
      },
    };
  };
}
// No draft override, environment switch or manager approval route in the production entry point.
export const generateCoreScenario = createCoreGenerator(coreTrainingLibrary);
