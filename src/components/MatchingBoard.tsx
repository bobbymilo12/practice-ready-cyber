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
}: {
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
        Choose a request, then a role. To change a pair, select its request again. Select the same
        role again to remove a pair.
        {oneToOne && " Choosing a role already paired moves it to the selected request."}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Patient requests</h3>
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-pressed={active === item.id}
              onClick={() => setActive(item.id)}
              className={`min-h-24 w-full break-words rounded-xl border p-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${active === item.id ? "border-primary bg-primary/10" : value[item.id] ? "border-primary/50 bg-surface" : "border-border"}`}
            >
              <span className="font-semibold">
                {i + 1}. {item.label}
              </span>
              {value[item.id] && (
                <span className="mt-2 block text-xs">
                  Paired with {targets.find((t) => t.id === value[item.id])?.label}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="space-y-3">
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
                className={`min-h-24 w-full break-words rounded-xl border p-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 ${paired.length ? "border-primary/50 bg-surface" : "border-border"}`}
              >
                <span className="font-semibold">{target.label}</span>
                {paired.length > 0 && (
                  <span className="mt-2 block text-xs">
                    Paired with{" "}
                    {paired.map((item) => `${items.indexOf(item) + 1}. ${item.label}`).join("; ")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm">
        {announcement || `${Object.keys(value).length} of ${items.length} pairs selected`}
      </p>
    </div>
  );
}
