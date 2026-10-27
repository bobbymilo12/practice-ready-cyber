import { useState } from "react";
import { pairCards } from "@/lib/matching-interaction";

type Card = { id: string; label: string };
/** Deliberately receives no valid mappings or correctness information. */
export function MatchingBoard({
  items,
  targets,
  value,
  oneToOne,
  disabled,
  onChange,
  instructions,
}: {
  instructions?: string;
  items: Card[];
  targets: Card[];
  value: Record<string, string>;
  oneToOne: boolean;
  disabled: boolean;
  onChange: (value: Record<string, string>) => void;
}) {
  const [active, setActive] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  return (
    <div className="mt-4">
      <p className="mb-3 text-sm text-muted-foreground">
        {instructions ??
          "Select a patient request, then select the matching practice role. You can change your matches until you press Continue."}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Patient requests</h3>
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-pressed={active === item.id}
              onClick={() => setActive(item.id)}
              className={`min-h-12 w-full break-words flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${active === item.id ? "border-primary bg-primary/10" : value[item.id] ? "border-primary/50 bg-surface" : "border-border"}`}
            >
              {value[item.id] && (
                <span
                  aria-label={`Pair ${i + 1}`}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/40 text-xs font-semibold"
                >
                  {i + 1}
                </span>
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Practice roles</h3>
          {targets.map((target) => {
            const paired = items.filter((item) => value[item.id] === target.id);
            return (
              <button
                key={target.id}
                type="button"
                disabled={disabled || !active}
                aria-pressed={!!active && value[active] === target.id}
                onClick={() => {
                  if (!active) return;
                  const next = pairCards(value, active, target.id, oneToOne);
                  onChange(next);
                  setAnnouncement(
                    next[active]
                      ? `${items.find((i) => i.id === active)?.label} paired with ${target.label}.`
                      : "Pair removed.",
                  );
                  setActive(undefined);
                }}
                className={`min-h-12 w-full break-words flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 ${paired.length ? "border-primary/50 bg-surface" : "border-border"}`}
              >
                {paired.map((item) => (
                  <span
                    key={item.id}
                    aria-label={`Pair ${items.indexOf(item) + 1}`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/40 text-xs font-semibold"
                  >
                    {items.indexOf(item) + 1}
                  </span>
                ))}
                <span>{target.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {active && value[active] && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange(pairCards(value, active, value[active], oneToOne));
            setAnnouncement("Pair removed.");
            setActive(undefined);
          }}
          className="mt-2 rounded border border-border px-3 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Remove selected pair
        </button>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement || `${Object.keys(value).length} of ${items.length} pairs selected`}
      </p>
    </div>
  );
}
