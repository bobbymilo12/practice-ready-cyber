import { displayLabel } from "@/lib/question-quality";
import { useId, useState } from "react";
import type { PracticeData } from "@/lib/store";
import {
  EXCLUDE_QUESTION,
  legacySelectedOptions,
  configuredContacts,
  answerText,
  questionNeedsDetails,
  questionOptions,
  selectedValues,
  selectAnswer,
  type ModuleSettings,
  type TopicField,
} from "@/lib/module-config";

export function ModuleQuestion({
  field,
  practice,
  settings,
  onChange,
  shared = false,
}: {
  shared?: boolean;
  field: TopicField;
  practice: PracticeData;
  settings: ModuleSettings;
  onChange: (settings: ModuleSettings) => void;
}) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const options = questionOptions(field, practice, settings);
  const selected = selectedValues(field, settings);
  const detailKinds = selected.map((value) => field.detailOptions?.[value]);
  const details = settings.answerDetails?.[field.key] ?? {};
  const updateDetails = (patch: typeof details) =>
    onChange({
      ...settings,
      answerDetails: {
        ...settings.answerDetails,
        [field.key]: { ...details, ...patch },
      },
    });
  const add = () => {
    const label = draft.trim();
    if (!label) return;
    if (
      options.some((o) => o.label.toLocaleLowerCase("en-GB") === label.toLocaleLowerCase("en-GB"))
    ) {
      setError("This option already exists. Select it above.");
      return;
    }
    onChange({
      ...settings,
      customOptions: {
        ...settings.customOptions,
        [field.key]: [
          ...(settings.customOptions?.[field.key] ?? []),
          { id: `custom:${crypto.randomUUID()}`, label },
        ],
      },
    });
    setDraft("");
    setError("");
    setAdding(false);
  };
  return (
    <fieldset
      className="space-y-3 rounded-xl border border-border p-4"
      aria-describedby={`${id}-hint`}
    >
      <legend className="px-1 text-sm font-semibold">{displayLabel(field.label)}</legend>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {field.multiple ? "Select all that apply." : "Select one option."} Suggestions are not
        confirmed until selected.
      </p>
      {[
        ...options,
        {
          value: EXCLUDE_QUESTION,
          label: shared ? "Not configured" : "Don't include this in the module",
        },
      ].map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${selected.includes(option.value) ? "border-primary bg-primary/5" : "border-border"}`}
        >
          <input
            type={field.multiple ? "checkbox" : "radio"}
            name={id}
            value={option.value}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            checked={selected.includes(option.value)}
            onChange={(e) =>
              onChange(selectAnswer(settings, field, option.value, e.target.checked))
            }
          />
          <span>
            {option.label}
            {option.value.startsWith("custom:") && (
              <span aria-hidden="true" className="ml-2 text-xs text-muted-foreground">
                Your option
              </span>
            )}
          </span>
        </label>
      ))}
      {legacySelectedOptions(field, settings).length > 0 && (
        <p className="text-xs text-muted-foreground">
          Your previous answer is retained. Please review it and specify any people or processes
          that are unclear.
        </p>
      )}
      {detailKinds.includes("contact") && (
        <label className="block text-sm" htmlFor={`${id}-person`}>
          Who should staff contact?
          <select
            id={`${id}-person`}
            value={details.contact ?? ""}
            className="mt-2 block w-full rounded-lg border border-input bg-background p-2"
            onChange={(e) => updateDetails({ contact: e.target.value })}
          >
            <option value="">Select a person or role</option>
            {details.contact && !configuredContacts(practice).includes(details.contact) && (
              <option value={details.contact}>
                Previous contact is no longer available — choose a replacement
              </option>
            )}
            {configuredContacts(practice).map((value) => (
              <option key={value} value={value}>
                {answerText(value, practice)}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs text-muted-foreground">
            If the contact is not listed, add your process below and include who to contact and how.
          </span>
        </label>
      )}
      {(detailKinds.includes("process") || detailKinds.includes("contact")) && (
        <label className="block text-sm" htmlFor={`${id}-instruction`}>
          {detailKinds.includes("process")
            ? "What should staff do? Include when each route applies."
            : "How should staff contact them? (optional)"}
          <textarea
            id={`${id}-instruction`}
            rows={2}
            maxLength={2000}
            className="mt-2 block w-full rounded-lg border border-input bg-background p-2"
            value={details.instruction ?? ""}
            onChange={(e) => updateDetails({ instruction: e.target.value })}
          />
        </label>
      )}
      {questionNeedsDetails(field, settings, practice) && (
        <p className="text-xs text-muted-foreground">
          Complete the details above before this choice can be used in training.
        </p>
      )}
      {!selected.length && (
        <p className="text-xs text-muted-foreground">
          Not yet confirmed — excluded from training until you select an answer.
        </p>
      )}
      {!adding ? (
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => setAdding(true)}
        >
          + {field.addLabel ?? "Add another process"}
        </button>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm" htmlFor={`${id}-custom`}>
            Your practice-specific answer
          </label>
          <input
            id={`${id}-custom`}
            className="w-full rounded-lg border border-input bg-background p-2 text-sm"
            value={draft}
            maxLength={500}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!draft.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-40"
              onClick={add}
            >
              Add
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground"
              onClick={() => {
                setAdding(false);
                setDraft("");
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Adding an option does not confirm it. Select it above to include it in training.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
