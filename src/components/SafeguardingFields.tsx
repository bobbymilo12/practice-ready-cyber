import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import {
  safeguardingFor,
  safeguardingNames,
  contactMethods,
  routeText,
} from "@/lib/practice-config";
import { SelectChoice, Text, Instruction } from "./PracticeProcessFields";

export function SafeguardingFields() {
  const p = useApp((s) => s.practiceData);
  const set = useApp((s) => s.setSafeguardingRoute);
  const route = safeguardingFor(p);
  const ids = route.leadIds ?? [];
  const [query, setQuery] = useState("");
  const named = p.staff.filter((s) => s.name.trim());
  const missing = ids.filter((id) => !named.some((s) => s.id === id));
  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Safeguarding</h2>
      <div className="space-y-2">
        <p className="text-sm font-medium">Safeguarding lead(s)</p>
        {named.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members have been added yet.{" "}
            <Link to="/practice/setup" search={{ step: 2 }} className="text-primary underline">
              Add team members
            </Link>
          </p>
        ) : (
          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm">
              Choose safeguarding leads · {ids.length - missing.length} selected
            </summary>
            <label className="mt-3 block text-sm">
              Search team members
              <input
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {named
                .filter((s) => `${s.name} ${s.role}`.toLowerCase().includes(query.toLowerCase()))
                .map((s) => (
                  <label key={s.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 accent-primary"
                      checked={ids.includes(s.id)}
                      onChange={(e) =>
                        set({
                          ...route,
                          leadIds: e.target.checked
                            ? [...ids, s.id]
                            : ids.filter((id) => id !== s.id),
                        })
                      }
                    />
                    {s.name} — {s.role}
                  </label>
                ))}
            </div>
          </details>
        )}
        {!!ids.length && (
          <p className="text-sm text-muted-foreground">{safeguardingNames(p).join("; ")}</p>
        )}
        {missing.map((id) => (
          <div key={id} className="text-sm text-destructive">
            A selected safeguarding lead is no longer available. Safety needs review.{" "}
            <button
              type="button"
              onClick={() => set({ ...route, leadIds: ids.filter((x) => x !== id) })}
              className="underline"
            >
              Remove unavailable lead
            </button>
          </div>
        ))}
      </div>
      <SelectChoice
        label="How should staff raise a concern?"
        options={contactMethods}
        value={route.method}
        onChange={(method) => set({ ...route, method })}
      />
      {route.method.id === "phone" && (
        <Text
          label="Phone / extension number"
          value={route.method.other}
          onChange={(other) => set({ ...route, method: { ...route.method, other } })}
        />
      )}
      {!!p.safeguardingRoute && p.safeguardingRoute.contact.kind !== "unconfirmed" && (
        <details>
          <summary className="cursor-pointer text-sm">
            Previous safeguarding contact (preserved)
          </summary>
          <p className="mt-2 text-sm whitespace-pre-line">{routeText(p.safeguardingRoute, p)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Select named leads above. Previous role or free-text contacts have not been assigned to
            a person.
          </p>
        </details>
      )}
      {!!route.instruction && (
        <Instruction
          label="Previous safeguarding contact instructions"
          value={route.instruction}
          onChange={(instruction) => set({ ...route, instruction })}
        />
      )}
      <Instruction
        label="Practice-specific safeguarding instructions"
        value={p.localSafeguarding}
        onChange={(v) => useApp.getState().setPracticeField("localSafeguarding", v)}
      />
    </div>
  );
}
