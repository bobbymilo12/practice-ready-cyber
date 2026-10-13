import { useState } from "react";
import { useApp, TOPICS } from "@/lib/store";
import { defaultModuleSettings, fieldsForTopic } from "@/lib/module-config";
import { ModuleQuestion } from "./ModuleQuestion";
import { ConfirmedItems } from "./ConfirmedItems";

export function TopicPracticeFields({ topic: fixedTopic }: { topic?: string }) {
  const { practiceData, setTopicSettings } = useApp();
  const [selected, setSelected] = useState("urgent");
  const topic = fixedTopic ?? selected;
  const settings = { ...defaultModuleSettings(), ...practiceData.topicSettings?.[topic] };
  const save = (next: typeof settings | ((value: typeof settings) => typeof settings)) => {
    const value = typeof next === "function" ? next(settings) : next;
    const { answers, selections, customOptions, answerDetails, extra } = value;
    setTopicSettings(topic, { answers, selections, customOptions, answerDetails, extra });
  };
  return (
    <section className="space-y-5">
      <h2 className="font-semibold">Shared reception procedures</h2>
      <p className="text-sm text-muted-foreground">
        Configure these once for reuse in training. Select only what your practice has agreed; leave
        unknown processes blank.
      </p>
      {!fixedTopic && (
        <label className="block text-sm">
          Topic
          <select
            className="ml-3 rounded border p-2"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {TOPICS.filter(
              (t) => !["appointment-booking", "custom", "prescriptions"].includes(t.key),
            ).map((t) => (
              <option key={t.key} value={t.key}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {topic === "prescriptions" && (
        <p className="text-sm">
          Configure who handles prescription queries and medication reviews in Roles, including
          individual staff exceptions.
        </p>
      )}
      {fieldsForTopic(topic, practiceData, settings).map((field) => (
        <ModuleQuestion
          key={topic + field.key}
          shared
          field={field}
          practice={practiceData}
          settings={settings}
          onChange={save}
        />
      ))}
      <ConfirmedItems
        key={topic}
        label="Additional confirmed instruction"
        single
        items={settings.extra ? [settings.extra] : []}
        onChange={(items) => save({ ...settings, extra: items[0] ?? "" })}
      />
    </section>
  );
}
