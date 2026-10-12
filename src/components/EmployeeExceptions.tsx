import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { flushPractice } from "@/lib/backend";
import {
  requestRoleId,
  withRequestOverride,
  resetRequestOverride,
  resetAllRequestOverrides,
} from "@/lib/role-requests";

export function EmployeeExceptions({
  staffId,
  onClose,
  onEditRole,
}: {
  staffId: string;
  onClose: () => void;
  onEditRole: (role: string) => void;
}) {
  const p = useApp((s) => s.practiceData);
  const updateStaff = useApp((s) => s.updateStaff);
  const person = p.staff.find((s) => s.id === staffId);
  const heading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    heading.current?.focus();
  }, []);
  if (!person) return null;
  const roleId = requestRoleId(person.role);
  const role = p.roleRequests?.[roleId];
  const overrides = person.requestOverrides?.[roleId] ?? {};
  const change = (requestOverrides: typeof person.requestOverrides) => {
    updateStaff(person.id, { requestOverrides });
    setMessage("");
  };
  return (
    <section
      aria-label={`Customise ${person.name}`}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 ref={heading} tabIndex={-1} className="font-display text-xl font-semibold">
          Customise {person.name}
        </h2>
        <button type="button" onClick={onClose} className="text-sm text-primary">
          Close customisation
        </button>
      </div>
      <p className="mt-2 text-sm font-medium">Role: {person.role}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {person.name} inherits your practice’s {person.role} configuration. Only change items that
        are different for {person.name}.
      </p>
      {!role?.confirmed ? (
        <div className="mt-4 text-sm">
          <p>
            Review and save this practice role before customising individual exceptions. Existing
            exceptions are preserved.
          </p>
          <button
            type="button"
            onClick={() => onEditRole(person.role)}
            className="mt-2 font-semibold text-primary"
          >
            View / edit {person.role} role
          </button>
        </div>
      ) : (
        <fieldset disabled={busy} className="mt-4 min-w-0 space-y-3">
          {role.categories.map((category) => {
            const count = category.requests.filter((r) => Object.hasOwn(overrides, r.id)).length;
            return (
              <details
                key={category.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {category.label} ·{" "}
                  {count ? `${count} ${count === 1 ? "exception" : "exceptions"}` : "No exceptions"}
                </summary>
                <div className="mt-3 space-y-4">
                  {category.requests.map((request) => {
                    const explicit = Object.hasOwn(overrides, request.id);
                    const inherited = role.selectedRequestIds.includes(request.id);
                    return (
                      <div
                        key={request.id}
                        className="flex flex-wrap items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 shrink-0 accent-primary"
                              checked={overrides[request.id] ?? inherited}
                              onChange={(e) =>
                                change(
                                  withRequestOverride(person, role, request.id, e.target.checked)
                                    .requestOverrides,
                                )
                              }
                            />
                            {request.label}
                          </label>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {explicit
                              ? `${person.name} · Individual exception`
                              : `Practice default · Inherited from ${person.role}`}
                          </p>
                          {explicit && (
                            <p className="text-xs text-muted-foreground">
                              Current practice default: {inherited ? "selected" : "not selected"}
                            </p>
                          )}
                        </div>
                        {explicit && (
                          <button
                            type="button"
                            aria-label={`Reset ${request.label} to role default`}
                            onClick={() =>
                              change(
                                resetRequestOverride(person, roleId, request.id).requestOverrides,
                              )
                            }
                            className="text-xs font-semibold text-primary"
                          >
                            Reset to role default
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={!person.requestOverrides}
              onClick={() => change(resetAllRequestOverrides(person).requestOverrides)}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm disabled:opacity-40"
            >
              Reset all to {person.role} defaults
            </button>
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                setMessage("");
                try {
                  await flushPractice();
                  setMessage("Employee exceptions saved");
                } catch {
                  setMessage("Could not save. Please retry.");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {busy ? "Saving…" : "Save exceptions"}
            </button>
          </div>
        </fieldset>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
