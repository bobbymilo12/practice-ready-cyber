import { TopicPracticeFields } from "@/components/TopicPracticeFields";
import { LocalProcedures } from "@/components/LocalProcedures";
import { RolesStep } from "@/components/RolesStep";
import { SafeguardingFields } from "@/components/SafeguardingFields";
import { practiceRoles, requestRoleId, roleRequestErrors } from "@/lib/role-requests";
import { TeamFields } from "@/components/TeamFields";
import { BookingFields, PrescriptionFields, Instruction } from "@/components/PracticeProcessFields";
import {
  bookingFor,
  prescriptionsFor,
  safeguardingFor,
  safeguardingNames,
} from "@/lib/practice-config";
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
  | "topicSettings"
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
    void nav({ to: "/practice/setup", search: { step: next, flow: 2 } });
  };
  const input = (key: TextField, label: string, hint?: string) => (
    <label className="block text-sm font-medium">
      {label}
      {hint && <span className="mt-1 block font-normal text-muted-foreground">{hint}</span>}
      <textarea
        rows={key === "practiceName" || key === "hours" ? 1 : 2}
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
    const gaps = step === 1 ? roleErrors : step === 7 ? missing.flat() : missing[step];
    if (!exit && gaps.length) {
      setError(`Complete these details: ${gaps.join("; ")}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (step === 1 && !exit)
        roles.forEach((r) => store.setRoleRequests({ ...r, confirmed: true, archived: false }));
      if (step === 3 || step === 7) store.setBookingConfig(bookingFor(p));
      if (step === 5 || step === 7) store.setPrescriptionConfig(prescriptionsFor(p));
      if (step === 6 || step === 7) store.setSafeguardingRoute(safeguardingFor(p));
      if (!exit && step === 7) store.completeSetup(true);
      await flushPractice();
      if (exit) await nav({ to: "/dashboard" });
      else if (step === 7) setDone(true);
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
              "How are appointments handled?",
              "Local reception procedures",
              "How do prescriptions work?",
              "How does your team handle sensitive requests?",
              "Check your practice information",
            ][step]
          }
        </h1>
        <p className="mt-2 text-sm font-medium">
          Do not enter patient names, NHS numbers or other patient-identifiable information.
        </p>
        {step !== 1 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Use your agreed local procedures. These details will be used to draft training for your
            review.
          </p>
        )}
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
            {step === 0 && (
              <>
                {input("practiceName", "Practice name")}
                {input("hours", "Opening hours")}
                {input(
                  "outOfHoursTimes",
                  "Out-of-hours process",
                  "Include where staff should direct callers when the practice is closed.",
                )}
                <details>
                  <summary className="cursor-pointer text-sm">Add address (optional)</summary>
                  <div className="mt-4">{input("address", "Practice address")}</div>
                </details>
              </>
            )}
            {step === 1 && <RolesStep initialRole={role} />}
            {step === 2 && <TeamFields />}
            {step === 3 && (
              <>
                <BookingFields />
                <TopicPracticeFields topic="appointment-booking" />
              </>
            )}
            {step === 4 && <LocalProcedures />}
            {step === 5 && (
              <>
                <PrescriptionFields />
                <TopicPracticeFields topic="prescriptions" />
                <details>
                  <summary className="cursor-pointer text-sm">
                    More prescription details (optional)
                  </summary>
                  <div className="mt-4 space-y-5">
                    {input("repeatControlled", "Controlled drug requests")}
                    {input("repeatHighRisk", "Medication monitoring")}
                    {input("nominatedPharmacy", "Nominated pharmacy process")}
                  </div>
                </details>
              </>
            )}
            {step === 6 && (
              <>
                <SafeguardingFields />
                <TopicPracticeFields />
                <h2 className="font-semibold">Confidentiality</h2>
                <Instruction
                  label="Local confidentiality instructions"
                  value={p.localConfidentiality}
                  onChange={(v) => store.setPracticeField("localConfidentiality", v)}
                />
                <details>
                  <summary className="cursor-pointer text-sm">
                    More local policies (optional)
                  </summary>
                  <div className="mt-4 space-y-5">
                    {input("localComplaints", "Complaints")}
                    {input("localDNA", "Missed appointments")}
                    {input("localInterpreter", "Interpreters")}
                    {input("urgentNumbers", "Urgent contact numbers")}
                    {input("extras", "Other practice guidance")}
                  </div>
                </details>
              </>
            )}
            {step === 7 && (
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
                            `${p.practiceName} · ${p.hours}`,
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
                            `${bookingFor(p).sameDayPathway.selected.length + (bookingFor(p).sameDayPathway.requestSelections?.length ?? 0)} same-day request types selected`,
                            `${Object.values(p.localProcedures ?? {}).filter((r) => r.status === "configured").length} local procedures configured`,
                            `${prescriptionsFor(p).methods.length} repeat request methods · ${prescriptionsFor(p).turnaround.id ? (prescriptionsFor(p).turnaround.id === "other" ? "Custom turnaround" : prescriptionsFor(p).turnaround.id + " working hours") : "Turnaround needs review"}`,
                            `Safeguarding leads: ${safeguardingNames(p).join("; ") || "Needs review"}`,
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
                : step === 7
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
