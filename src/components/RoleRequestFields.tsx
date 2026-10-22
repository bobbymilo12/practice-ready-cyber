import { displayLabel } from "@/lib/question-quality";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import {
  requestRoleId,
  suggestedRole,
  roleRequestErrors,
  type PracticeRoleRequests,
} from "@/lib/role-requests";
import { flushPractice } from "@/lib/backend";
const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
export function RoleRequestFields({
  role,
  open,
  onOpen,
}: {
  role: string;
  open: boolean;
  onOpen: () => void;
}) {
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
    set({ ...config, ...patch, confirmed: false, suggestionsEdited: true });
    setMessage("");
  };
  return (
    <details open={open} className="min-w-0">
      <summary
        ref={summary}
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        className="cursor-pointer font-medium"
      >
        {role}
      </summary>
      <fieldset disabled={saving} className="mt-4 min-w-0 space-y-4">
        <h3 className="font-semibold">What this role handles</h3>
        <p className="text-sm text-muted-foreground">
          Configure the types of patient requests and appointments that can be directed to this role
          at your practice.
        </p>
        <p className="text-sm text-muted-foreground">
          {config.template?.suggestions === "reviewed"
            ? "Suggested starting point: we've pre-selected appointment and request types for this role. Review these so they reflect how your practice works."
            : "Choose the requests your practice has agreed this role handles."}{" "}
          Your practice confirms its local configuration.
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
                      displayLabel(request.label)
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
            const errors = roleRequestErrors(config);
            if (errors.length) {
              setMessage(errors.join(" "));
              return;
            }
            setSaving(true);
            const confirmation = { ...config, confirmed: true };
            set(confirmation);
            try {
              await flushPractice();
              setMessage("Role saved");
            } catch {
              // Restore the review state only if no later edit has replaced this save.
              if (useApp.getState().practiceData.roleRequests?.[config.roleId] === confirmation)
                set(config);
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
