import { captureProcedureDiagnostics } from "@/lib/dev-procedure-diagnostics";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Shell, Card } from "./Shell";
import { BookingFields, PrescriptionFields } from "./PracticeProcessFields";
import { useApp } from "@/lib/store";
import { flushPractice } from "@/lib/backend";
import { ModuleQuestion } from "./ModuleQuestion";
import { configMissing } from "@/lib/practice-config";
import {
  fieldsForTopic,
  extraRuleLabels,
  moduleFacts,
  defaultModuleSettings,
  lengthOptions,
  trainingLevelOptions,
  configuredScenarios,
  selectedModuleScenarios,
  generateConfiguredModule,
  type ModuleSettings,
} from "@/lib/module-config";
const input = "mt-2 block w-full rounded-xl border border-input bg-background p-3 text-sm";
export function PredefinedModuleSetup({
  topic,
  title,
  id,
}: {
  topic: string;
  title: string;
  id: string;
}) {
  const { practiceData, modules, createDraftModule, configureModule } = useApp();
  const existing = modules.find((m) => m.id === id);
  const [settings, setSettings] = useState<ModuleSettings>(
    () =>
      existing?.settings ?? {
        ...defaultModuleSettings(),
        ...(topic === "appointment-booking" ? { trainingLevel: "learn" as const } : {}),
      },
  );
  const [phase, setPhase] = useState<"questions" | "length">("questions");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");
  const nav = useNavigate();
  const fields = fieldsForTopic(topic, practiceData, settings);
  const facts = moduleFacts(topic, practiceData, {
    ...settings,
    answers: {},
    selections: {},
    extra: "",
  });
  const pool =
    topic === "appointment-booking"
      ? selectedModuleScenarios(topic, title, practiceData, settings)
      : configuredScenarios(topic, title, practiceData, settings);
  const savedResponsibilities = configuredScenarios(topic, title, practiceData, settings).filter(
    (s) =>
      (s.kind === "mcq" && !!s.localRoleRequestId) ||
      s.title.startsWith("Routing:") ||
      s.title.startsWith("Individual exception:"),
  );
  const validCount =
    Number.isInteger(settings.count) && settings.count >= 1 && settings.count <= 100;
  const missing = configMissing(practiceData);
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      let nextId = savedId;
      if (!nextId) {
        const scenarios = generateConfiguredModule(topic, title, practiceData, settings);
        if (!scenarios.length)
          throw new Error("Add at least one confirmed local process before creating a module.");
        if (existing) {
          configureModule(existing.id, settings, scenarios);
          nextId = existing.id;
        } else
          nextId = createDraftModule(
            title,
            `${title} — draft`,
            topic,
            scenarios,
            "easy",
            undefined,
            settings,
          );
        if (topic === "appointment-booking")
          captureProcedureDiagnostics(
            nextId,
            practiceData,
            settings.trainingLevel,
            settings.count,
            scenarios,
          );
        setSavedId(nextId);
      }
      await flushPractice();
      await nav({ to: "/modules/review", search: { id: nextId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please retry.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">Module setup · {title}</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Confirm how your practice works</h1>
        <p className="mt-2 text-muted-foreground">
          We use saved practice information to create scenarios. Confirm only the additional
          procedures you want this module to cover.
        </p>
        {id && !existing ? (
          <p role="alert">Module not found.</p>
        ) : (
          <>
            {topic === "appointment-booking" ? (
              <Card className="mt-6">
                <h2 className="font-semibold">Built from your practice setup</h2>
                <p className="mt-2 text-sm">
                  PracticeReady uses your saved booking rules, staff responsibilities, individual
                  exceptions and local procedures to create training that reflects how your practice
                  works.
                </p>
                <Link to="/data-hub" className="mt-3 inline-block text-sm text-primary underline">
                  Review practice setup
                </Link>
              </Card>
            ) : (
              <Card className="mt-6">
                <h2 className="font-semibold">
                  Using information from {practiceData.practiceName}
                </h2>
                <p className="mt-2 text-sm">
                  Confirmed roles, request types and individual exceptions are read directly from
                  Practice Setup where relevant. Changes to shared information belong in Practice
                  Setup.
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-primary">
                    View saved practice information ({facts.length})
                  </summary>
                  <dl className="mt-3 space-y-3">
                    {facts.map((f) => (
                      <div key={f.label}>
                        <dt className="font-medium text-sm">{f.label}</dt>
                        <dd className="whitespace-pre-line text-sm text-muted-foreground">
                          {f.rule}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
                {savedResponsibilities.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-primary">
                      View relevant responsibilities and individual exceptions
                    </summary>
                    <dl className="mt-3 space-y-3">
                      {savedResponsibilities.map((s) => (
                        <div key={s.title}>
                          <dt className="text-sm font-medium">{s.title}</dt>
                          <dd className="text-sm text-muted-foreground">
                            {s.kind === "mcq" ? s.options[s.correctIndex] : ""}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
                <Link to="/data-hub" className="mt-3 inline-block text-sm text-primary underline">
                  Edit practice information
                </Link>
              </Card>
            )}
            <fieldset disabled={saving || !!savedId}>
              {phase === "questions" ? (
                <>
                  {topic === "urgent" && missing.booking.length > 0 && (
                    <Card className="mt-6">
                      <details>
                        <summary className="cursor-pointer text-primary">
                          Complete missing booking information in Practice Setup
                        </summary>
                        <p className="my-3 text-sm">
                          These changes update the shared practice information. Unconfirmed
                          procedures are excluded from training.
                        </p>
                        <BookingFields />
                      </details>
                    </Card>
                  )}
                  {topic === "prescriptions" && missing.prescription.length > 0 && (
                    <Card className="mt-6">
                      <details>
                        <summary className="cursor-pointer text-primary">
                          Complete missing prescription information in Practice Setup
                        </summary>
                        <p className="my-3 text-sm">
                          These changes update the shared practice information.
                        </p>
                        <PrescriptionFields />
                      </details>
                    </Card>
                  )}
                  <Card className="mt-6 space-y-6">
                    <h2 className="font-display text-xl font-semibold">
                      Additional {title.toLowerCase()} procedures
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Select only options that match your practice. Leave a procedure unconfirmed to
                      exclude it from training. These are choices for your review, not recommended
                      clinical policies.
                    </p>
                    {fields.map((f) => (
                      <ModuleQuestion
                        key={f.key}
                        field={f}
                        practice={practiceData}
                        settings={settings}
                        onChange={setSettings}
                      />
                    ))}
                    <details open={settings.extra ? true : undefined}>
                      <summary className="cursor-pointer text-primary">
                        + Add practice-specific {extraRuleLabels[topic] ?? "local"} rule
                      </summary>
                      <label className="mt-3 block text-sm">
                        Additional {extraRuleLabels[topic] ?? "local"} rule or procedure
                        <textarea
                          className={input}
                          rows={3}
                          value={settings.extra}
                          onChange={(e) => setSettings((s) => ({ ...s, extra: e.target.value }))}
                        />
                      </label>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Include the situation and the action staff should take. We preserve your
                        wording for review.
                      </p>
                    </details>
                    <button
                      className="rounded-xl bg-primary px-5 py-3 text-primary-foreground"
                      onClick={() => setPhase("length")}
                    >
                      Choose module length →
                    </button>
                  </Card>
                </>
              ) : (
                <Card className="mt-6 space-y-5">
                  {topic === "appointment-booking" && (
                    <fieldset>
                      <legend className="font-display text-xl font-semibold">Training Level</legend>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {trainingLevelOptions.map((level) => (
                          <label
                            key={level.value}
                            className={`rounded-xl border p-4 ${settings.trainingLevel === level.value ? "border-primary bg-primary/5" : "border-border"}`}
                          >
                            <input
                              type="radio"
                              disabled={level.disabled}
                              name="training-level"
                              value={level.value}
                              checked={settings.trainingLevel === level.value}
                              onChange={() =>
                                level.value !== "handle" &&
                                setSettings((s) => ({ ...s, trainingLevel: level.value }))
                              }
                            />
                            <span className="ml-2 font-semibold">{level.label}</span>
                            {level.disabled && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                Coming soon
                              </span>
                            )}
                            <span className="mt-1 block text-sm text-muted-foreground">
                              {level.description}
                            </span>
                          </label>
                        ))}
                      </div>
                      {!settings.trainingLevel && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          This existing module uses mixed levels. Choose a level to use it for
                          regeneration.
                        </p>
                      )}
                    </fieldset>
                  )}
                  <h2 className="font-display text-xl font-semibold">
                    How long should this module be?
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {lengthOptions.map((o) => (
                      <label
                        key={o.key}
                        className={`rounded-xl border p-4 ${settings.length === o.key ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <input
                          type="radio"
                          name="module-length"
                          value={o.key}
                          checked={settings.length === o.key}
                          onChange={() =>
                            setSettings((s) => ({ ...s, length: o.key, count: o.count }))
                          }
                        />
                        <span className="ml-2 font-semibold">{o.label}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {o.description}
                        </span>
                      </label>
                    ))}
                  </div>
                  {settings.length === "custom" && (
                    <label className="block text-sm">
                      Number of scenarios
                      <input
                        className={input}
                        type="number"
                        min={1}
                        max={100}
                        value={settings.count}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, count: Number(e.target.value) }))
                        }
                      />
                    </label>
                  )}
                  {!validCount && <p role="alert">Choose a whole number from 1 to 100.</p>}
                  <p className="text-sm">
                    {Math.min(pool.length, settings.count)} distinct scenarios available for this
                    module.
                    {topic !== "appointment-booking" &&
                      " Follow-up practice after missed answers is additional."}
                  </p>
                  {pool.length < settings.count && (
                    <p className="rounded-xl bg-surface p-3 text-sm">
                      The available content supports {pool.length} distinct scenarios, fewer than
                      the requested {settings.count}. Add further confirmed procedures or role
                      responsibilities for wider coverage, or create this shorter draft. We will not
                      invent guidance or repeat scenarios to reach a number.
                    </p>
                  )}
                  {existing && (
                    <p className="text-sm">
                      Regeneration replaces this module’s scenarios and requires a fresh manager
                      review. Existing results and training packages are retained.
                    </p>
                  )}
                  <button onClick={() => setPhase("questions")} className="text-sm text-primary">
                    ← Back to procedures
                  </button>
                </Card>
              )}
            </fieldset>
            {phase === "length" && (
              <button
                disabled={saving || !validCount || (!pool.length && !savedId)}
                onClick={save}
                className="mt-5 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-40"
              >
                {saving
                  ? "Saving draft…"
                  : savedId
                    ? "Retry saving draft"
                    : existing
                      ? "Save settings and regenerate"
                      : "Create module"}
              </button>
            )}
            {error && (
              <p role="alert" className="mt-3 text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
