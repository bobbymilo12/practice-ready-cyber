import { defaultModuleSettings, generateConfiguredModule, topicFields } from "./module-config.ts";
import type { PracticeData, Scenario } from "./store";

/** Legacy/custom entry uses the same eligibility and source boundaries as the manager flow.
 * Unstructured answers remain source material, not permission to invent scenarios or workflows. */
export function practiceScenarios(
  topic: string,
  title: string,
  practice: PracticeData,
  answers: Record<string, string>,
): Scenario[] {
  const known = new Set((topicFields[topic] ?? []).map((field) => field.key));
  return generateConfiguredModule(topic, title, practice, {
    ...defaultModuleSettings(),
    trainingLevel: "learn",
    count: 100,
    answers,
    extra: Object.entries(answers)
      .filter(([key]) => !known.has(key))
      .map(([, value]) => value)
      .join("\n"),
  });
}
