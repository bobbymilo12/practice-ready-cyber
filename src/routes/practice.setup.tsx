import { requestRoleId } from "@/lib/role-requests";
import { TeamFields } from "@/components/TeamFields";
import {
  BookingFields,
  PrescriptionFields,
  ContactFields,
  Instruction,
} from "@/components/PracticeProcessFields";
import { bookingFor, prescriptionsFor, emptyContactRoute } from "@/lib/practice-config";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp, type PracticeData } from "@/lib/store";
import { flushPractice } from "@/lib/backend";
import { setupMissing, setupSteps } from "@/lib/practice-setup";

export const Route = createFileRoute("/practice/setup")({
  head: () => ({ meta: [{ title: "Set up your practice — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>): { step?: number } => ({
    step: Math.min(setupSteps.length - 1, Math.max(0, Math.floor(Number(s.step) || 0))),
  }),
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
  | "roleRequests"
  | "safeguardingRoute"
>;
function PracticeSetup() {
  const { step = 0 } = Route.useSearch();
  const nav = useNavigate();
  const p = useApp((s) => s.practiceData);
  const store = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
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
        rows={key === "practiceName" || key === "hours" ? 1 : 2}
        className={field}
        value={p[key]}
        onChange={(e) => store.setPracticeField(key, e.target.value)}
      />
    </label>
  );
  async function save(exit = false) {
    const gaps = step === 5 ? missing.flat() : missing[step];
    if (!exit && gaps.length) {
      setError(`Complete these details: ${gaps.join("; ")}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (step === 2 || step === 5) store.setBookingConfig(bookingFor(p));
      if (step === 3 || step === 5) store.setPrescriptionConfig(prescriptionsFor(p));
      if (!exit && step === 5) store.completeSetup(true);
      await flushPractice();
      if (exit) await nav({ to: "/dashboard" });
      else if (step === 5) setDone(true);
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
              "Who does what?",
              "How are appointments handled?",
              "How do prescriptions work?",
              "How does your team handle sensitive requests?",
              "Check your practice information",
            ][step]
          }
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use your agreed local procedures. These details will be used to draft training for your
          review.
        </p>
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
            {step === 1 && <TeamFields />}
            {step === 2 && <BookingFields />}
            {step === 3 && (
              <>
                <PrescriptionFields />
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
            {step === 4 && (
              <>
                <h2 className="font-semibold">Safeguarding</h2>
                <ContactFields
                  label="Safeguarding lead"
                  practice={p}
                  value={p.safeguardingRoute ?? emptyContactRoute()}
                  onChange={store.setSafeguardingRoute}
                />
                <Instruction
                  label="Practice-specific safeguarding instructions"
                  value={p.localSafeguarding}
                  onChange={(v) => store.setPracticeField("localSafeguarding", v)}
                />
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
            {step === 5 && (
              <>
                <div className="flex justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <h2 className="font-semibold">Role configuration</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {Object.values(p.roleRequests ?? {}).filter((r) => r.confirmed).length}{" "}
                      confirmed roles
                    </p>
                    {p.staff.some((s) => !p.roleRequests?.[requestRoleId(s.role)]?.confirmed) && (
                      <p className="text-sm text-destructive">Some team roles still need review.</p>
                    )}
                  </div>
                  <button className="text-sm font-semibold text-primary" onClick={() => go(1)}>
                    Edit roles
                  </button>
                </div>
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
                            `${p.staff.length} team members · ${new Set(p.staff.map((s) => s.role)).size} roles`,
                            `${bookingFor(p).sameDayPathway.selected.length} same-day request types selected`,
                            `${prescriptionsFor(p).methods.length} repeat request methods · ${prescriptionsFor(p).turnaround.id ? (prescriptionsFor(p).turnaround.id === "other" ? "Custom turnaround" : prescriptionsFor(p).turnaround.id + " working hours") : "Turnaround needs review"}`,
                            `${p.safeguardingRoute || p.localSafeguarding ? "Safeguarding details recorded" : "Safeguarding needs attention"} · ${p.localConfidentiality ? "Local confidentiality instructions recorded" : "No additional confidentiality instructions"}`,
                          ][i]
                        }
                      </p>
                      {missing[i].length > 0 && (
                        <p className="mt-2 text-sm text-destructive">
                          Missing: {missing[i].join("; ")}
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
                Back
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => void save()}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : step === 5 ? "Create starter drafts" : "Save and continue"}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
