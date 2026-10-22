import { displayLabel } from "@/lib/question-quality";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { saveLocalProcedures } from "@/lib/backend";
import {
  procedureTargets,
  procedureDraft,
  addProcedureStep,
  removeProcedureStep,
  moveProcedureStep,
  confirmProcedure,
  confirmVisibleWithoutProcedures,
  type LocalProcedure,
  type ProcedureTarget,
  type OrderRequirement,
} from "@/lib/local-procedures";

const input = "mt-2 block w-full rounded-xl border border-input bg-background p-2 text-sm";
const secondary = "rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50";
const primary =
  "rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50";

function ProcedureEditor({
  target,
  record,
  onSave,
  onCancel,
}: {
  target: ProcedureTarget;
  record?: LocalProcedure;
  onSave: (record: LocalProcedure, expectedVersion: number) => Promise<void>;
  onCancel: () => void;
}) {
  // Snapshot the confirmed version at open time, never edit the shared record in place.
  const [original] = useState(record);
  const [draft, setDraft] = useState(() =>
    original?.status === "configured"
      ? procedureDraft(original)
      : addProcedureStep(procedureDraft()),
  );
  const account = useApp((s) => s.account);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(none = false) {
    setError("");
    setBusy(true);
    try {
      const next = confirmProcedure(target, original, none ? null : draft, account?.id ?? "");
      await onSave(next, original?.version ?? 0);
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy} className="mt-2 space-y-2">
      <legend className="text-sm font-medium">
        Add the steps reception staff should follow, in order.
      </legend>
      <ol className="space-y-1.5">
        {draft.stepOrder.map((id, index) => (
          <li key={id} className="flex items-start gap-2">
            <span aria-hidden="true" className="pt-2 text-sm text-muted-foreground">
              {index + 1}
            </span>
            <label className="min-w-0 flex-1 text-sm">
              <span className="sr-only">Step {index + 1}</span>
              <textarea
                className="block w-full resize-y rounded-lg border border-input bg-background px-2 py-2 text-sm"
                rows={1}
                placeholder={
                  index === 0
                    ? `e.g. What should reception do first for this request: ${displayLabel(target.label)}?`
                    : index === 1
                      ? "e.g. What happens next?"
                      : "e.g. What should reception do after that?"
                }
                value={draft.steps.find((s) => s.id === id)!.text}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    steps: d.steps.map((s) => (s.id === id ? { ...s, text: e.target.value } : s)),
                  }))
                }
              />
            </label>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="rounded-lg border border-border px-2 py-2 text-sm disabled:opacity-40"
                disabled={index === 0}
                aria-label={`Move step ${index + 1} up`}
                title="Move step up"
                onClick={() => setDraft((d) => moveProcedureStep(d, id, -1))}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-2 py-2 text-sm disabled:opacity-40"
                disabled={index === draft.stepOrder.length - 1}
                aria-label={`Move step ${index + 1} down`}
                title="Move step down"
                onClick={() => setDraft((d) => moveProcedureStep(d, id, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-2 py-2 text-sm disabled:opacity-40"
                aria-label={`Remove step ${index + 1}`}
                title="Remove step"
                onClick={() => setDraft((d) => removeProcedureStep(d, id))}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="rounded-lg border border-border px-3 py-1.5 text-sm"
        onClick={() => setDraft((d) => addProcedureStep(d))}
      >
        + Add step
      </button>
      <details>
        <summary className="cursor-pointer text-sm text-primary">
          Optional context and step order
        </summary>
        <label className="mt-3 block text-sm">
          When does this procedure apply?
          <textarea
            className={input}
            rows={2}
            value={draft.appliesWhen}
            onChange={(e) => setDraft((d) => ({ ...d, appliesWhen: e.target.value }))}
          />
        </label>
        <label className="mt-3 block text-sm">
          Do these steps need to be followed in this order?
          <select
            className={input}
            value={draft.orderRequirement}
            onChange={(e) =>
              setDraft((d) => ({ ...d, orderRequirement: e.target.value as OrderRequirement }))
            }
          >
            <option value="unassessed">Not sure / not specified</option>
            <option value="required_linear">Yes — follow in this order</option>
            <option value="conditional_or_flexible">No — it can depend on the situation</option>
          </select>
        </label>
      </details>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} onClick={() => void save()}>
          {busy ? "Saving…" : "Save procedure"}
        </button>
        <button type="button" className={secondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
      {original?.status === "configured" && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            This request no longer has a specific procedure
          </summary>
          <p className="my-2 text-sm">
            Save this change to replace the current procedure. Its previous version will be
            retained.
          </p>
          <button type="button" className={secondary} onClick={() => void save(true)}>
            Save as no specific procedure
          </button>
        </details>
      )}
    </fieldset>
  );
}

export function LocalProcedures() {
  const { practiceData, account } = useApp();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const targets = procedureTargets(practiceData);
  const visible = targets.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()));
  const records = practiceData.localProcedures ?? {};
  const unavailable = Object.values(records).filter(
    (r) => !targets.some((t) => t.id === r.requestId && !t.conflict),
  );
  const unchecked = visible.filter((t) => !t.conflict && !records[t.id] && !editing.includes(t.id));
  function open(id: string) {
    setMessage("");
    setEditing((s) => [...s, id]);
  }
  async function persist(updates: LocalProcedure[], versions: Record<string, number>) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await saveLocalProcedures(updates, versions);
      setMessage("Local procedures saved.");
    } finally {
      setBusy(false);
    }
  }
  async function saveChoices() {
    try {
      const updates = confirmVisibleWithoutProcedures(
        practiceData,
        visible.map((t) => t.id),
        editing,
        account?.id ?? "",
      );
      await persist(updates, Object.fromEntries(updates.map((r) => [r.requestId, 0])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    }
  }
  return (
    <section className="space-y-4" aria-label="Local reception procedures">
      <h2 className="font-display text-xl font-semibold">Local reception procedures</h2>
      <p className="text-sm">
        Which of these have a specific procedure reception staff should follow?
      </p>
      <p className="text-sm text-muted-foreground">
        Add any practice-specific steps reception staff should follow for these requests. These are
        saved for your practice and can be reused in training. You do not need a procedure for every
        request.
      </p>
      {!targets.length && (
        <p className="text-sm">
          Confirm the requests your practice roles handle in Practice Setup to add local procedures.
        </p>
      )}
      <fieldset disabled={busy} className="space-y-1">
        {!!targets.length && (
          <label className="block text-sm">
            Find a request
            <input
              className={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
            />
          </label>
        )}
        {targets.map((target) => {
          const record = records[target.id],
            isOpen = editing.includes(target.id);
          return (
            <div
              key={target.id}
              hidden={!visible.some((t) => t.id === target.id)}
              className="border-b border-border px-2 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                  {!record && !target.conflict ? (
                    <label className="flex min-h-10 sm:min-h-8 cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        onChange={() =>
                          isOpen
                            ? setEditing((s) => s.filter((id) => id !== target.id))
                            : open(target.id)
                        }
                      />
                      {displayLabel(target.label)}
                    </label>
                  ) : (
                    <p className="font-medium">{displayLabel(target.label)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{target.roles.join(", ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {target.conflict
                      ? "Request labels conflict across roles. Review in Practice Setup."
                      : record?.status === "configured"
                        ? `Procedure configured · ${record.steps.length} ${record.steps.length === 1 ? "step" : "steps"}`
                        : record
                          ? "No specific procedure"
                          : "Not reviewed"}
                  </p>
                </div>
                {record && !isOpen && !target.conflict && (
                  <button type="button" className={secondary} onClick={() => open(target.id)}>
                    {record.status === "configured" ? "View/Edit" : "Add procedure"}
                  </button>
                )}
              </div>
              {/* Keep drafts mounted when search hides their row. */}
              {isOpen && !target.conflict && (
                <ProcedureEditor
                  target={target}
                  record={record}
                  onSave={(next, expected) => persist([next], { [target.id]: expected })}
                  onCancel={() => setEditing((s) => s.filter((id) => id !== target.id))}
                />
              )}
            </div>
          );
        })}
        {!!unchecked.length && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Save unchecked requests shown here as having no specific procedure. Requests hidden by
              the search stay unchanged.
            </p>
            {editing.length > 0 && <p className="text-sm">Save or cancel open procedures first.</p>}
            <button
              type="button"
              className={secondary}
              disabled={editing.length > 0}
              onClick={() => void saveChoices()}
            >
              {busy ? "Saving…" : "Save choices"}
            </button>
          </div>
        )}
      </fieldset>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!!unavailable.length && (
        <details>
          <summary className="cursor-pointer text-sm text-primary">
            Previously saved requests needing review ({unavailable.length})
          </summary>
          <p className="my-3 text-sm">
            These requests are no longer available in confirmed roles, or their labels conflict.
            Their saved procedures are retained.
          </p>
          {unavailable.map((r) => (
            <div key={r.id} className="my-3 border-t border-border pt-3 text-sm">
              <p className="font-medium">{r.requestLabelAtConfirmation}</p>
              {r.status === "configured" ? (
                <>
                  <ol className="ml-5 list-decimal">
                    {r.stepOrder.map((id) => (
                      <li key={id} className="whitespace-pre-wrap">
                        {r.steps.find((s) => s.id === id)?.text}
                      </li>
                    ))}
                  </ol>
                  <p className="whitespace-pre-wrap">{r.appliesWhen}</p>
                </>
              ) : (
                <p>No specific procedure</p>
              )}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
