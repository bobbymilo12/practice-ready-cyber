import { useState } from "react";
import { useApp } from "@/lib/store";
import { addPracticeRequest, practiceRequestChoices } from "@/lib/practice-requests";
import { bookingFor, sameDayGroups } from "@/lib/practice-config";

export function SameDayRequests() {
  const p = useApp((s) => s.practiceData);
  const set = useApp((s) => s.setBookingConfig);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const b = bookingFor(p),
    selected = b.sameDayPathway.requestSelections ?? [];
  const choices = practiceRequestChoices(p);
  const missing = selected.filter((s) => !choices.some((r) => r.id === s.requestId));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        These are requests already configured for your practice, not an exhaustive list. Add any
        others you need. Eligibility is your practice’s decision.
      </p>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
        {!choices.length && (
          <p className="text-sm">No requests configured yet. You can add one below.</p>
        )}
        {choices.map((r) => (
          <label key={r.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              disabled={r.conflict}
              checked={selected.some((s) => s.requestId === r.id)}
              onChange={(e) =>
                set({
                  ...b,
                  sameDayPathway: {
                    ...b.sameDayPathway,
                    requestSelections: e.target.checked
                      ? [...selected, { requestId: r.id, labelSnapshot: r.label }]
                      : selected.filter((s) => s.requestId !== r.id),
                  },
                })
              }
            />
            <span>
              {r.label}
              {r.roles.length > 0 && (
                <span className="block text-xs text-muted-foreground">{r.roles.join(", ")}</span>
              )}
              {r.conflict && (
                <span className="block text-destructive">
                  Conflicting request labels — review your role configuration.
                </span>
              )}
            </span>
          </label>
        ))}
        {missing.map((r) => (
          <label key={r.requestId} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked
              onChange={() =>
                set({
                  ...b,
                  sameDayPathway: {
                    ...b.sameDayPathway,
                    requestSelections: selected.filter((s) => s.requestId !== r.requestId),
                  },
                })
              }
            />
            <span>
              {r.labelSnapshot} — no longer available in configured requests; review this selection.
            </span>
          </label>
        ))}
      </div>
      <button type="button" className="text-sm text-primary" onClick={() => setAdding(true)}>
        + Add another request
      </button>
      {adding && (
        <div className="space-y-2">
          <label className="block text-sm">
            Request name
            <input
              className="mt-1 w-full rounded-xl border border-border bg-background p-3"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Adding a request does not select it for same-day appointments. Tick it above if
            appropriate.
          </p>
          <button
            type="button"
            disabled={!label.trim()}
            className="rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            onClick={() => {
              useApp.setState((s) => ({ practiceData: addPracticeRequest(s.practiceData, label) }));
              setLabel("");
              setAdding(false);
            }}
          >
            Add request
          </button>
          <button
            type="button"
            className="ml-3 text-sm"
            onClick={() => {
              setAdding(false);
              setLabel("");
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {(b.sameDayPathway.selected.length > 0 || b.sameDayPathway.custom.length > 0) && (
        <details>
          <summary className="cursor-pointer text-sm text-primary">
            Previously saved same-day choices
          </summary>
          <p className="my-2 text-xs text-muted-foreground">
            Retained from your earlier configuration. These have not been matched to role requests.
          </p>
          {b.sameDayPathway.selected.map((id) => (
            <label key={id} className="my-2 flex gap-2 text-sm">
              <input
                type="checkbox"
                checked
                onChange={() =>
                  set({
                    ...b,
                    sameDayPathway: {
                      ...b.sameDayPathway,
                      selected: b.sameDayPathway.selected.filter((v) => v !== id),
                    },
                  })
                }
              />
              {sameDayGroups.flatMap((g) => g.options).find((o) => o.id === id)?.label ?? id}
            </label>
          ))}
          {b.sameDayPathway.custom.map((text, i) => (
            <label key={i} className="my-2 block text-sm">
              Previously added request {i + 1}
              <textarea
                className="mt-1 w-full rounded-xl border border-border bg-background p-2"
                value={text}
                onChange={(e) =>
                  set({
                    ...b,
                    sameDayPathway: {
                      ...b.sameDayPathway,
                      custom: b.sameDayPathway.custom.map((v, j) => (i === j ? e.target.value : v)),
                    },
                  })
                }
              />
            </label>
          ))}
        </details>
      )}
    </div>
  );
}
