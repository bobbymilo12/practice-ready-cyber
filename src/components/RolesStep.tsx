import { useState } from "react";
import { useApp } from "@/lib/store";
import { practiceRoles, matchesRoleTemplate, roleToAdd, requestRoleId } from "@/lib/role-requests";
import { roleTemplates } from "@/lib/role-templates";
import { RoleRequestFields } from "./RoleRequestFields";

export function RolesStep({ initialRole }: { initialRole?: string }) {
  const p = useApp((s) => s.practiceData);
  const setRole = useApp((s) => s.setRoleRequests);
  const active = practiceRoles(p);
  // Retain archived custom entries too, so deselection can always be reversed here.
  const options = new Map(Object.values(p.roleRequests ?? {}).map((r) => [r.roleId, r]));
  for (const role of active) options.set(role.roleId, role);
  for (const template of roleTemplates) {
    if (![...options.values()].some((r) => matchesRoleTemplate(r, template))) {
      const role = roleToAdd(p, template.label, template);
      options.set(role.roleId, role);
    }
  }
  // Keep the library order stable as roles are selected and saved.
  const order = (role: (typeof active)[number]) => {
    const index = roleTemplates.findIndex((template) => matchesRoleTemplate(role, template));
    return index < 0 ? roleTemplates.length : index;
  };
  const orderedOptions = [...options.values()].sort(
    (a, b) => order(a) - order(b) || a.roleId.localeCompare(b.roleId),
  );
  const [expanded, setExpanded] = useState<string[]>(initialRole ? [initialRole] : []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  return (
    <section className="space-y-4" aria-label="Practice roles">
      <p className="text-sm text-muted-foreground">
        Select the roles available at your practice, then review what each role handles.
      </p>
      {orderedOptions.map((role) => {
        const selected = active.some((r) => r.roleId === role.roleId);
        const assigned = p.staff.some((s) => requestRoleId(s.role) === role.roleId);
        return (
          <div
            key={role.roleId}
            className="rounded-xl border border-border p-3"
            aria-label={`Practice role ${role.label}`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                aria-label={`Use ${role.label}`}
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                checked={selected}
                disabled={assigned}
                onChange={(e) => {
                  setRole({ ...role, archived: !e.target.checked });
                  if (!e.target.checked) setExpanded(expanded.filter((id) => id !== role.roleId));
                }}
              />
              <div className="min-w-0 flex-1">
                {selected ? (
                  <RoleRequestFields
                    role={role.label}
                    open={expanded.includes(role.roleId)}
                    onOpen={() =>
                      setExpanded(
                        expanded.includes(role.roleId)
                          ? expanded.filter((id) => id !== role.roleId)
                          : [...expanded, role.roleId],
                      )
                    }
                  />
                ) : (
                  <span className="font-medium">{role.label}</span>
                )}
                {assigned && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Used by your team. Reassign team members before removing this role.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => setAdding(!adding)}
        className="text-sm font-semibold text-primary"
      >
        + Add another role
      </button>
      {adding && (
        <div className="rounded-xl border border-border p-4">
          <label className="block text-sm">
            Role name
            <input
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => {
              const config = roleToAdd(p, name);
              setRole(config);
              setExpanded([...new Set([...expanded, config.roleId])]);
              setAdding(false);
              setName("");
            }}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40"
          >
            Add role
          </button>
        </div>
      )}
    </section>
  );
}
