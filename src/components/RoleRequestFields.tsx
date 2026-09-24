import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { requestRoleId, suggestedRole, type PracticeRoleRequests } from "@/lib/role-requests";
import { flushPractice } from "@/lib/backend";
const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
function RoleEditor({ role, open, onOpen }: { role: string; open: boolean; onOpen: () => void }) {
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) summary.current?.focus();
  }, [open]);
  const [saving, setSaving] = useState(false);
  const saved = useApp((s) => s.practiceData.roleRequests?.[requestRoleId(role)]);
  const set = useApp((s) => s.setRoleRequests);
  const config = saved ?? suggestedRole(role);
  const [message, setMessage] = useState("");
  const update = (patch: Partial<PracticeRoleRequests>) => {
    set({ ...config, ...patch, confirmed: false });
    setMessage("");
  };
  return (
    <details open={open} className="rounded-xl border border-border p-4">
      <summary
        ref={summary}
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        className="cursor-pointer font-medium"
      >
        {role} · {config.selectedRequestIds.length} selected ·{" "}
        {config.confirmed ? "Confirmed" : "Needs review"}
      </summary>
      <fieldset disabled={saving} className="mt-4 min-w-0 space-y-4">
        <h3 className="font-semibold">What this role handles</h3>
        <p className="text-sm text-muted-foreground">
          Configure the types of patient requests and appointments that can be directed to this role
          at your practice.
        </p>
        <p className="text-sm text-muted-foreground">
          Suggestions are unselected starting templates, not NHS-approved scope-of-practice rules.
          Select only requests your practice has agreed this role handles.
        </p>
        {config.categories.map((category) => (
          <details key={category.id} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {category.label || "Custom category"} ·{" "}
              {category.requests.filter((r) => config.selectedRequestIds.includes(r.id)).length}{" "}
              selected
            </summary>
            <div className="mt-3 space-y-3">
              {category.custom && (
                <div className="flex gap-2">
                  <input
                    aria-label="Custom category name"
                    className={field}
                    value={category.label}
                    onChange={(e) =>
                      update({
                        categories: config.categories.map((c) =>
                          c.id === category.id ? { ...c, label: e.target.value } : c,
                        ),
                      })
                    }
                  />
                  <button
                    className="text-sm text-destructive"
                    onClick={() =>
                      update({
                        categories: config.categories.filter((c) => c.id !== category.id),
                        selectedRequestIds: config.selectedRequestIds.filter(
                          (id) => !category.requests.some((r) => r.id === id),
                        ),
                      })
                    }
                  >
                    Remove category
                  </button>
                </div>
              )}
              {category.requests.map((request) => (
                <div key={request.id} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={config.selectedRequestIds.includes(request.id)}
                      onChange={(e) =>
                        update({
                          selectedRequestIds: e.target.checked
                            ? [...config.selectedRequestIds, request.id]
                            : config.selectedRequestIds.filter((id) => id !== request.id),
                        })
                      }
                    />
                    {request.custom ? (
                      <span className="sr-only">Select {request.label || "custom request"}</span>
                    ) : (
                      request.label
                    )}
                  </label>
                  {request.custom && (
                    <>
                      <input
                        aria-label="Custom request name"
                        className={field}
                        value={request.label}
                        onChange={(e) =>
                          update({
                            categories: config.categories.map((c) =>
                              c.id === category.id
                                ? {
                                    ...c,
                                    requests: c.requests.map((r) =>
                                      r.id === request.id ? { ...r, label: e.target.value } : r,
                                    ),
                                  }
                                : c,
                            ),
                          })
                        }
                      />
                      <button
                        className="text-sm text-destructive"
                        aria-label={`Remove ${request.label || "custom request"}`}
                        onClick={() =>
                          update({
                            categories: config.categories.map((c) =>
                              c.id === category.id
                                ? { ...c, requests: c.requests.filter((r) => r.id !== request.id) }
                                : c,
                            ),
                            selectedRequestIds: config.selectedRequestIds.filter(
                              (id) => id !== request.id,
                            ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              ))}
              <button
                className="text-sm text-primary"
                onClick={() =>
                  update({
                    categories: config.categories.map((c) =>
                      c.id === category.id
                        ? {
                            ...c,
                            requests: [
                              ...c.requests,
                              { id: `custom:${crypto.randomUUID()}`, label: "", custom: true },
                            ],
                          }
                        : c,
                    ),
                  })
                }
              >
                + Add another request
              </button>
            </div>
          </details>
        ))}
        <button
          className="block text-sm text-primary"
          onClick={() =>
            update({
              categories: [
                ...config.categories,
                { id: `custom:${crypto.randomUUID()}`, label: "", requests: [], custom: true },
              ],
            })
          }
        >
          + Add custom category
        </button>
        <button
          className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={async () => {
            if (
              config.categories.some(
                (c) => !c.label.trim() || c.requests.some((r) => !r.label.trim()),
              )
            ) {
              setMessage("Name or remove empty custom entries before saving.");
              return;
            }
            const labels = config.categories.flatMap((c) =>
              c.requests.map((r) => r.label.trim().toLowerCase()),
            );
            const categories = config.categories.map((c) => c.label.trim().toLowerCase());
            if (
              new Set(labels).size !== labels.length ||
              new Set(categories).size !== categories.length
            ) {
              setMessage(
                "Use each request and category once. Rename or remove duplicate custom entries.",
              );
              return;
            }
            setSaving(true);
            set({ ...config, confirmed: true });
            try {
              await flushPractice();
              setMessage("Role saved");
            } catch {
              setMessage("Could not save. Please retry.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save role"}
        </button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </fieldset>
    </details>
  );
}
export function RoleRequestFields({
  activeRole,
  onRoleChange,
}: {
  activeRole: string | null;
  onRoleChange: (role: string | null) => void;
}) {
  const p = useApp((s) => s.practiceData);
  const roles = [
    ...new Map(
      [...p.staff.map((s) => s.role), ...Object.values(p.roleRequests ?? {}).map((r) => r.label)]
        .filter((r) => r.trim())
        .map((r) => [requestRoleId(r), r]),
    ).values(),
  ];
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Role configuration</h2>
      <p className="text-sm text-muted-foreground">
        Configure each role once for everyone with that role.
      </p>
      {roles.map((role) => (
        <RoleEditor
          key={requestRoleId(role)}
          role={role}
          open={activeRole === requestRoleId(role)}
          onOpen={() =>
            onRoleChange(activeRole === requestRoleId(role) ? null : requestRoleId(role))
          }
        />
      ))}
    </section>
  );
}
