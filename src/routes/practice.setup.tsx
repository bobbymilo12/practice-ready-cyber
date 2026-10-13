import { RolesStep } from "@/components/RolesStep";
import { practiceRoles, requestRoleId, roleRequestErrors } from "@/lib/role-requests";
import { TeamFields } from "@/components/TeamFields";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp, type PracticeData } from "@/lib/store";
import { flushPractice } from "@/lib/backend";
import { setupMissing, setupSteps, setupSearch } from "@/lib/practice-setup";

export const Route = createFileRoute("/practice/setup")({
  head: () => ({ meta: [{ title: "Set up your practice — PracticeReady" }] }),
  validateSearch: setupSearch,
  component: PracticeSetup,
});
const field = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
type TextField = keyof Omit<
  PracticeData,
  | "staff"
  | "rolePolicies"
  | "sameDayReasons"
  | "bookingConfig"
  | "prescriptionConfig"
  | "practiceRequests"
  | "localProcedures"
  | "roleRequests"
  | "safeguardingRoute"
>;
function PracticeSetup() {
  const { step = 0, role } = Route.useSearch();
  const nav = useNavigate();
  const p = useApp((s) => s.practiceData);
  const store = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    // Role confirmation/edits invalidate an earlier Roles validation message.
    if (step === 1) setError("");
  }, [p.roleRequests, step]);
  const missing = setupMissing(p);
  const go = (next: number) => {
    setError("");
    void nav({ to: "/practice/setup", search: { step: next } });
  };
  const input = (key: TextField, label: string, hint?: string) => (
    <label className="block text-sm font-medium">
      {label}
      {hint && <span className="mt-1 block font-normal text-muted-foreground">{hint}</span>}
      <textarea
        rows={1}
        className={field}
        value={p[key]}
        onChange={(e) => store.setPracticeField(key, e.target.value)}
      />
    </label>
  );
  async function save(exit = false) {
    const roles = practiceRoles(p);
    const roleErrors = roles.length
      ? roles.flatMap((r) => roleRequestErrors(r).map((error) => `${r.label}: ${error}`))
      : ["Select at least one role"];
    const gaps = step === 1 ? roleErrors : step === 3 ? missing.flat() : missing[step];
    if (!exit && gaps.length) {
      setError(`Complete these details: ${gaps.join("; ")}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (step === 1 && !exit)
        roles.forEach((r) => store.setRoleRequests({ ...r, confirmed: true, archived: false }));
      if (!exit && step === 3) store.completeSetup();
      await flushPractice();
      if (exit) await nav({ to: "/dashboard" });
      else if (step === 3) setDone(true);
      else go(step + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <Shell>
        <Card>
          <h1 className="font-display text-2xl font-bold">Your practice is set up</h1>
          <p className="mt-3 text-muted-foreground">
            Next, review your starter modules before publishing and assigning them. Existing modules
            have been kept.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-primary-foreground"
          >
            Review modules
          </Link>
        </Card>
      </Shell>
    );
  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">
          Practice setup · Step {step + 1} of {setupSteps.length}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">
          {
            [
              "Start with your practice",
              "Roles at your practice",
              "Who works at your practice?",
              "Check your practice information",
            ][step]
          }
        </h1>
        <nav aria-label="Setup steps" className="my-6 flex flex-wrap gap-2">
          {setupSteps.map((label, i) => (
            <button
              key={label}
              disabled={busy}
              aria-current={step === i ? "step" : undefined}
              onClick={() => go(i)}
              className={`rounded-lg border px-3 py-2 text-sm ${step === i ? "border-primary bg-primary/10 font-semibold" : "border-border"}`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </nav>
        <Card>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            {step === 0 && input("practiceName", "Practice name")}
            {step === 1 && <RolesStep initialRole={role} />}
            {step === 2 && <TeamFields />}
            {step === 3 && (
              <>
                {setupSteps.slice(0, -1).map((label, i) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-border pb-4"
                  >
                    <div>
                      <h2 className="font-semibold">{label}</h2>
                      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                        {
                          [
                            p.practiceName,
                            practiceRoles(p)
                              .map(
                                (r) =>
                                  `${r.label} — ${r.confirmed ? "Configured" : "Needs review"}`,
                              )
                              .join("\n") || "No practice roles selected",
                            p.staff
                              .map((s) => {
                                const count = Object.keys(
                                  s.requestOverrides?.[requestRoleId(s.role)] ?? {},
                                ).length;
                                return `${s.name} — ${s.role}${count ? ` · ${count} individual ${count === 1 ? "exception" : "exceptions"}` : ""}`;
                              })
                              .join("\n") || "No team members added",
                          ][i]
                        }
                      </p>
                      {missing[i].length > 0 && (
                        <p className="mt-2 text-sm text-destructive">
                          Needs review: {missing[i].join("; ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => go(i)}
                      className="text-sm font-semibold text-primary"
                      aria-label={`Edit ${label.toLowerCase()}`}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </>
            )}
          </fieldset>
        </Card>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button disabled={busy} onClick={() => void save(true)} className="text-sm text-primary">
            Save and exit
          </button>
          <div className="flex gap-3">
            {step > 0 && (
              <button
                disabled={busy}
                onClick={() => go(step - 1)}
                className="rounded-xl border border-border px-5 py-3 text-sm"
              >
                {step === 1 ? "Back to Practice" : "Back"}
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => void save()}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy
                ? "Saving…"
                : step === 3
                  ? "Create starter drafts"
                  : step === 1
                    ? "Continue to Team"
                    : "Save and continue"}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
