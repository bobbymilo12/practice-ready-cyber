import { createFileRoute } from "@tanstack/react-router";
import { PredefinedModuleSetup } from "@/components/PredefinedModuleSetup";
import { TOPICS } from "@/lib/store";

export const Route = createFileRoute("/modules/setup")({
  head: () => ({ meta: [{ title: "Module setup — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    id: (s.id as string) || "",
    topic: (s.topic as string) || "custom",
    title: (s.title as string) || "Custom module",
  }),
  component: ModuleSetup,
});

function ModuleSetup() {
  const { topic, title, id } = Route.useSearch();
  const knownTopic = TOPICS.some((t) => t.key === topic) ? topic : "custom";
  return (
    <PredefinedModuleSetup key={knownTopic + ":" + id} topic={knownTopic} title={title} id={id} />
  );
}
