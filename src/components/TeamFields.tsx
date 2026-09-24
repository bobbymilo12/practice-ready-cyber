import { useId, useState } from "react";
import { useApp, ROLE_OPTIONS } from "@/lib/store";
import { requestRoleId } from "@/lib/role-requests";
import { appointmentTypes } from "@/lib/appointment-capabilities";
import { EmployeeExceptions } from "./EmployeeExceptions";
import { RoleRequestFields } from "./RoleRequestFields";

const field = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";

/** One team editor shared by guided setup and Practice information. Individual legacy data is read-only. */
export function TeamFields() {
  const p = useApp((s) => s.practiceData);
  const { addStaff, updateStaff, removeStaff } = useApp();
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(ROLE_OPTIONS[0]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [customising, setCustomising] = useState<string | null>(null);
  const listId = useId();
  const roleSectionId = useId();
  const roles = [
    ...new Set([
      ...ROLE_OPTIONS,
      ...p.staff.map((s) => s.role),
      ...Object.values(p.roleRequests ?? {}).map((r) => r.label),
    ]),
  ].filter((r) => r.trim());
  const legacy = p.staff.filter(
    (s) => s.clinics || s.notes || s.capabilities?.length || s.appointmentCapabilities,
  );
  const editRole = (role: string) => {
    setCustomising(null);
    setActiveRole(requestRoleId(role));
    document.getElementById(roleSectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <section className="min-w-0 space-y-5" aria-label="Team and roles">
      <p className="text-sm text-muted-foreground">
        Add each employee’s name and role. Configure what the role handles once for everyone with
        that role.
      </p>
      <div className="rounded-xl border border-border p-4">
        <h2 className="font-semibold">Add employee</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Name
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-sm">
            Role
            <input
              className={field}
              list={listId}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!name.trim() || !role.trim()}
          onClick={() => {
            addStaff({ name: name.trim(), role: role.trim(), clinics: "" });
            setName("");
          }}
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Add employee
        </button>
      </div>
      <datalist id={listId}>
        {roles.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <div className="space-y-3">
        {p.staff.map((person) => (
          <article
            key={person.id}
            aria-label={`Employee ${person.name || "Unnamed"}`}
            className="rounded-xl border border-border p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Employee name
                <input
                  className={field}
                  value={person.name}
                  onChange={(e) => updateStaff(person.id, { name: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                Employee role
                <input
                  className={field}
                  list={listId}
                  value={person.role}
                  onChange={(e) => updateStaff(person.id, { role: e.target.value })}
                />
              </label>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {person.role.trim()
                ? `${person.name || "This employee"} uses your practice’s ${person.role} role configuration.`
                : "Choose a role to use its shared configuration."}
            </p>
            {!!Object.keys(person.requestOverrides?.[requestRoleId(person.role)] ?? {}).length && (
              <p className="mt-1 text-xs text-muted-foreground">
                {Object.keys(person.requestOverrides?.[requestRoleId(person.role)] ?? {}).length}{" "}
                individual exception(s)
              </p>
            )}
            <div className="mt-3 flex flex-wrap justify-between gap-3">
              <button
                type="button"
                disabled={!person.role.trim()}
                onClick={() => editRole(person.role)}
                className="text-sm font-semibold text-primary disabled:opacity-40"
              >
                View / edit {person.role || "shared"} role
              </button>
              <button
                type="button"
                disabled={!person.role.trim()}
                onClick={() => {
                  setActiveRole(null);
                  setCustomising(person.id);
                }}
                className="text-sm font-semibold text-primary disabled:opacity-40"
              >
                Customise for {person.name || "employee"}
              </button>
              <button
                type="button"
                onClick={() => removeStaff(person.id)}
                className="text-sm text-destructive"
              >
                Remove {person.name || "employee"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {customising && (
        <EmployeeExceptions
          key={customising}
          staffId={customising}
          onClose={() => setCustomising(null)}
          onEditRole={editRole}
        />
      )}
      <div id={roleSectionId} className="scroll-mt-6">
        <RoleRequestFields activeRole={activeRole} onRoleChange={setActiveRole} />
      </div>
      {legacy.length > 0 && (
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm">Preserved individual information</summary>
          <p className="mt-3 text-sm text-muted-foreground">
            These earlier notes and individual selections are kept for reference. They have not been
            applied to everyone in a role. Review the shared role configuration separately.
          </p>
          <div className="mt-3 space-y-4">
            {legacy.map((person) => (
              <div key={person.id} className="text-sm">
                <h3 className="font-semibold">
                  {person.name} · {person.role}
                </h3>
                {person.clinics && <p className="mt-1 whitespace-pre-wrap">{person.clinics}</p>}
                {person.notes && <p className="mt-1 whitespace-pre-wrap">{person.notes}</p>}
                {!!person.capabilities?.length && (
                  <p className="mt-1">Earlier responsibilities: {person.capabilities.join("; ")}</p>
                )}
                {person.appointmentCapabilities && (
                  <>
                    <p className="mt-1 text-muted-foreground">
                      Earlier appointment snapshot (including old template defaults; not confirmed
                      role guidance):
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {Object.entries({
                        ...person.appointmentCapabilities.defaults,
                        ...person.appointmentCapabilities.overrides,
                      }).map(([id, enabled]) => (
                        <li key={id}>
                          {appointmentTypes.find((t) => t.id === id)?.name ?? id}:{" "}
                          {enabled ? "selected" : "not selected"}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
