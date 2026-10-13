import { ConfirmedItems } from "./ConfirmedItems";
import type { PracticeData } from "@/lib/store";
import {
  contactText,
  routeContacts,
  contactRoles,
  type ContactRoute,
  type SingleContact,
} from "@/lib/practice-config";
type Entry = Exclude<SingleContact, { kind: "unconfirmed" }>;
export const contactKey = (c: Entry) =>
  c.kind === "staff"
    ? `staff:${c.staffId}`
    : c.kind === "role"
      ? `role:${c.roleId ?? c.role}`
      : "other";
export function escalationChoices(p: PracticeData): Entry[] {
  return [
    ...[
      ...new Set([
        ...contactRoles,
        "Reception Manager",
        ...p.staff.map((s) => s.role).filter(Boolean),
      ]),
    ]
      .filter(
        (label) =>
          !Object.values(p.roleRequests ?? {}).some((r) => !r.archived && r.label === label),
      )
      .map((role): Entry => ({ kind: "role", role })),
    ...Object.values(p.roleRequests ?? {})
      .filter((r) => !r.archived)
      .map((r): Entry => ({ kind: "role", roleId: r.roleId, role: r.label })),
    ...p.staff.filter((s) => s.name.trim()).map((s): Entry => ({ kind: "staff", staffId: s.id })),
    { kind: "other", text: "" },
  ];
}
export function EscalationContacts({
  label,
  value,
  practice,
  onChange,
}: {
  label: string;
  value: ContactRoute;
  practice: PracticeData;
  onChange: (v: ContactRoute) => void;
}) {
  const selected = routeContacts(value);
  const choices = escalationChoices(practice);
  // Keep legacy and removed references visible, never silently substitute a person/role.
  selected.forEach((c) => {
    if (!choices.some((v) => contactKey(v) === contactKey(c))) choices.push(c);
  });
  const change = (contacts: Entry[]) =>
    onChange({ ...value, contact: { kind: "multiple", contacts } });
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm">
          {selected.length
            ? `${selected.length} selected — ${contactText(value.contact, practice.staff, practice.roleRequests)}`
            : "Choose contacts"}
        </summary>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {choices.map((c) => (
            <label key={contactKey(c)} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.some((v) => contactKey(v) === contactKey(c))}
                onChange={(e) =>
                  change(
                    e.target.checked
                      ? [...selected, c]
                      : selected.filter((v) => contactKey(v) !== contactKey(c)),
                  )
                }
              />
              {c.kind === "other" ? "Other" : contactText(c, practice.staff, practice.roleRequests)}
            </label>
          ))}
        </div>
      </details>
      {selected.some((c) => c.kind === "other") && (
        <ConfirmedItems
          label="Other contacts"
          items={selected
            .filter((c) => c.kind === "other" && c.text.trim())
            .map((c) => (c.kind === "other" ? c.text : ""))}
          onChange={(items) =>
            change([
              ...selected.filter((c) => c.kind !== "other"),
              ...(items.length ? items : [""]).map((text): Entry => ({ kind: "other", text })),
            ])
          }
        />
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Select the contacts your practice uses. Use the instructions below if different methods
        apply.
      </p>
    </fieldset>
  );
}
