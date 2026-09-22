import { BookingFields, PrescriptionFields } from "@/components/PracticeProcessFields";
import { bookingFor, prescriptionsFor, practiceSummary, configReview } from "@/lib/practice-config";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp, ROLE_OPTIONS, STAFF_CAPABILITY_OPTIONS, type PracticeData } from "@/lib/store";
import { flushPractice } from "@/lib/backend";
import {
  appointmentTypes,
  clinicianCapabilities,
  initialiseCapabilities,
  isClinicalStaff,
  roleCapabilities,
} from "@/lib/appointment-capabilities";
import { setupMissing, setupSteps, teamReviewSummary } from "@/lib/practice-setup";

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
  "staff" | "rolePolicies" | "sameDayReasons" | "bookingConfig" | "prescriptionConfig"
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
  const review = configReview(p);
  const reviewByStep = [undefined, undefined, review.booking, review.prescription, undefined];
  const summary = practiceSummary({
    ...p,
    bookingConfig: bookingFor(p),
    prescriptionConfig: prescriptionsFor(p),
  });
  const go = (next: number) => {
    setError("");
    void nav({ to: "/practice/setup", search: { step: next } });
  };
  const input = (key: TextField, label: string, hint?: string) => (
    <label className="block text-sm font-medium">
      {label}
      {hint && <span className="mt-1 block font-normal text-muted-foreground">{hint}</span>}
      <textarea
        rows={key === "practiceName" ? 1 : 3}
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
      p.staff.forEach((person) => {
        if (!person.appointmentCapabilities)
          store.updateStaff(person.id, initialiseCapabilities(person));
      });
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
            {step === 1 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Add the people trainees need to know. Include their clinics or responsibilities.
                </p>
                {p.staff.map((person) => (
                  <div key={person.id} className="space-y-3 rounded-xl border border-border p-4">
                    <label className="block text-sm">
                      Name
                      <input
                        className={field}
                        value={person.name}
                        onChange={(e) => store.updateStaff(person.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="block text-sm">
                      Role
                      <input
                        list="team-roles"
                        className={field}
                        value={person.role}
                        onChange={(e) => store.updateStaff(person.id, { role: e.target.value })}
                      />
                    </label>
                    {isClinicalStaff(person) && (
                      <details>
                        <summary className="cursor-pointer text-sm">
                          Edit appointment types (
                          {
                            appointmentTypes.filter(({ id }) => clinicianCapabilities(person)[id])
                              .length
                          }{" "}
                          selected)
                        </summary>
                        <p className="mt-3 text-sm text-muted-foreground">
                          We’ve pre-selected the appointment types typically associated with this
                          role. Adjust these if this team member works differently at your practice.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {appointmentTypes.map(({ id, name }) => (
                            <label key={id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={clinicianCapabilities(person)[id] === true}
                                onChange={(e) =>
                                  store.updateStaff(person.id, {
                                    appointmentCapabilities: {
                                      defaults:
                                        person.appointmentCapabilities?.defaults ??
                                        roleCapabilities(person.role),
                                      overrides: {
                                        ...person.appointmentCapabilities?.overrides,
                                        [id]: e.target.checked,
                                      },
                                    },
                                  })
                                }
                              />
                              {name}
                            </label>
                          ))}
                        </div>
                      </details>
                    )}
                    <label className="block text-sm">
                      Clinics or responsibilities (optional)
                      <textarea
                        className={field}
                        value={person.clinics}
                        onChange={(e) => store.updateStaff(person.id, { clinics: e.target.value })}
                      />
                    </label>
                    <details>
                      <summary className="cursor-pointer text-sm">
                        Choose additional responsibilities (optional)
                      </summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {STAFF_CAPABILITY_OPTIONS.map((task) => (
                          <label key={task} className="flex gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={person.capabilities?.includes(task) ?? false}
                              onChange={(e) =>
                                store.updateStaff(person.id, {
                                  capabilities: e.target.checked
                                    ? [...(person.capabilities ?? []), task]
                                    : person.capabilities?.filter((t) => t !== task),
                                })
                              }
                            />
                            {task}
                          </label>
                        ))}
                      </div>
                    </details>
                    <button
                      className="text-sm text-destructive"
                      onClick={() => store.removeStaff(person.id)}
                    >
                      Remove {person.name || "team member"}
                    </button>
                  </div>
                ))}
                <datalist id="team-roles">
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
                <button
                  onClick={() =>
                    store.addStaff({
                      name: "",
                      role: ROLE_OPTIONS[0],
                      clinics: "",
                      capabilities: [],
                    })
                  }
                  className="rounded-xl border border-border px-4 py-2 text-sm"
                >
                  Add team member
                </button>
              </>
            )}
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
                {input(
                  "localConfidentiality",
                  "Confidentiality process",
                  "Include identity checks and requests for another person’s information.",
                )}
                {input(
                  "localSafeguarding",
                  "Safeguarding process",
                  "Include the named contact and how to raise a concern.",
                )}
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
                <p className="text-sm text-muted-foreground">
                  We’ll create starter drafts for bookings, urgent requests, prescriptions, results
                  and reception onboarding. Review every scenario before publishing.
                </p>
                {(review.booking.unconfirmed.length > 0 ||
                  review.booking.textOnly.length > 0 ||
                  review.prescription.unconfirmed.length > 0 ||
                  review.prescription.textOnly.length > 0) && (
                  <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                    Some settings are unconfirmed or recorded only in existing guidance. You can
                    save your progress and retain that guidance. Resolve these review items before
                    relying on or publishing the resulting training.
                  </p>
                )}
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
                            `${p.practiceName}\n${p.hours}\n${p.outOfHoursTimes}`,
                            p.staff.map(teamReviewSummary).join("\n\n"),
                            `Same-day: ${summary.rolePolicies.gpsSameDay}\nRoutine: ${summary.rolePolicies.gpsRoutine}\nCriteria: ${summary.sameDayReasons.join("; ")}\nEscalation: ${summary.dutyContact}`,
                            `${summary.prescriptionOrdering}\n${summary.repeatTurnaround}\nRun-out: ${summary.repeatEmergency}`,
                            `Confidentiality: ${p.localConfidentiality}\nSafeguarding: ${p.localSafeguarding}`,
                          ][i]
                        }
                      </p>
                      {reviewByStep[i] && (
                        <div className="mt-3 space-y-2 rounded-lg border border-border p-3 text-sm">
                          <p className="font-medium">
                            {reviewByStep[i]!.unconfirmed.length || reviewByStep[i]!.textOnly.length
                              ? "Configuration needs review"
                              : "Structured selections complete"}
                          </p>
                          {reviewByStep[i]!.unconfirmed.length > 0 && (
                            <p>Not yet confirmed: {reviewByStep[i]!.unconfirmed.join("; ")}.</p>
                          )}
                          {reviewByStep[i]!.textOnly.length > 0 && (
                            <p>
                              Existing guidance only — awaiting structured review:{" "}
                              {reviewByStep[i]!.textOnly.join("; ")}.
                            </p>
                          )}
                          {reviewByStep[i]!.instructions.length > 0 && (
                            <p>
                              Local instructions to check against current selections:{" "}
                              {reviewByStep[i]!.instructions.join("; ")}. Use Edit to resolve any
                              conflicting wording.
                            </p>
                          )}
                        </div>
                      )}
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
