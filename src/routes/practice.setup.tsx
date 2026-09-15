import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp, STAFF_ROLE_OPTIONS } from "@/lib/store";

export const Route = createFileRoute("/practice/setup")({
  head: () => ({
    meta: [
      { title: "Set up your practice — PracticeReady" },
      {
        name: "description",
        content:
          "First-time setup: add your practice basics, your clinical and admin team, same-day appointment reasons and how patients order prescriptions.",
      },
      { property: "og:title", content: "Set up your practice — PracticeReady" },
      {
        property: "og:description",
        content:
          "Capture your local practice knowledge once, then PracticeReady drafts onboarding modules from it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticeSetup,
});

const field =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

function PracticeSetup() {
  const nav = useNavigate();
  const practiceData = useApp((s) => s.practiceData);
  const setPracticeField = useApp((s) => s.setPracticeField);
  const setSameDayReasons = useApp((s) => s.setSameDayReasons);
  const addStaff = useApp((s) => s.addStaff);
  const updateStaff = useApp((s) => s.updateStaff);
  const removeStaff = useApp((s) => s.removeStaff);
  const completeSetup = useApp((s) => s.completeSetup);

  const [step, setStep] = useState(0);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<string>(STAFF_ROLE_OPTIONS[0]);
  const [created, setCreated] = useState<number | null>(null);

  const steps = ["Your team", "Practice basics", "Same-day appointments", "Prescriptions"];
  const reasons = practiceData.sameDayReasons;

  const setReason = (i: number, value: string) =>
    setSameDayReasons(reasons.map((r, idx) => (idx === i ? value : r)));

  const finish = () => {
    const ids = completeSetup(true);
    setCreated(ids.length);
  };

  if (created !== null) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl">
          <Card>
            <h1 className="font-display text-2xl font-bold">Practice setup saved</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {created > 0
                ? `We've drafted ${created} starter modules from your answers — appointment booking, urgent requests, prescriptions, test results and first week on reception.`
                : "Your starter modules are already in place and have been left as they are."}{" "}
              Every scenario is a draft until you approve it, so nothing reaches your team
              before you've read it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Go to dashboard
              </Link>
              <Link
                to="/data-hub"
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface"
              >
                Add more detail in the Data Hub
              </Link>
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">First-time setup</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Set up your practice
        </h1>
        <p className="mt-2 text-muted-foreground">
          Answer these once. Every training module is drafted from what you enter here, and
          you can change any of it later in the Data Hub.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1.5 font-medium ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {step === 0 && (
          <Card className="mt-6">
            <h2 className="font-display text-xl font-semibold">Who works here?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add each clinician and admin lead with their role. Reception staff need to know
              who does what before they can book correctly.
            </p>

            <div className="mt-5 space-y-2">
              {practiceData.staff.map((s) => (
                <div
                  key={s.id}
                  className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    value={s.name}
                    onChange={(e) => updateStaff(s.id, { name: e.target.value })}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Name"
                  />
                  <select
                    value={STAFF_ROLE_OPTIONS.includes(s.role as never) ? s.role : ""}
                    onChange={(e) => updateStaff(s.id, { role: e.target.value })}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {!STAFF_ROLE_OPTIONS.includes(s.role as never) && (
                      <option value="">{s.role || "Choose a role"}</option>
                    )}
                    {STAFF_ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeStaff(s.id)}
                    className="rounded-lg border border-destructive/40 px-3 py-2 text-xs text-destructive hover:bg-destructive/5"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 rounded-xl border border-dashed border-border p-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add a name"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {STAFF_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!newName.trim()) return;
                  addStaff({ name: newName.trim(), role: newRole, clinics: "" });
                  setNewName("");
                }}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Add
              </button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="mt-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">Practice basics</h2>
            <label className="block text-sm">
              <span className="font-medium">Practice name</span>
              <input
                className={field}
                value={practiceData.practiceName}
                onChange={(e) => setPracticeField("practiceName", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Address</span>
              <input
                className={field}
                value={practiceData.address}
                onChange={(e) => setPracticeField("address", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Opening times</span>
              <input
                className={field}
                value={practiceData.hours}
                onChange={(e) => setPracticeField("hours", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Out-of-hours appointment times</span>
              <textarea
                rows={3}
                className={field}
                value={practiceData.outOfHoursTimes}
                onChange={(e) => setPracticeField("outOfHoursTimes", e.target.value)}
              />
            </label>
          </Card>
        )}

        {step === 2 && (
          <Card className="mt-6">
            <h2 className="font-display text-xl font-semibold">
              What counts as a same-day appointment?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One reason per line. New starters use this list to decide what to offer and what
              to pass to the duty team.
            </p>
            <div className="mt-4 space-y-2">
              {reasons.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={r}
                    onChange={(e) => setReason(i, e.target.value)}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => setSameDayReasons(reasons.filter((_, idx) => idx !== i))}
                    className="rounded-lg border border-border px-3 text-sm text-muted-foreground hover:text-destructive"
                    aria-label="Remove reason"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSameDayReasons([...reasons, ""])}
              className="mt-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
            >
              + Add a reason
            </button>
          </Card>
        )}

        {step === 3 && (
          <Card className="mt-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">
              How do patients order prescriptions?
            </h2>
            <textarea
              rows={5}
              className={field}
              value={practiceData.prescriptionOrdering}
              onChange={(e) => setPracticeField("prescriptionOrdering", e.target.value)}
              placeholder="e.g. NHS App, paper slip at reception, nominated pharmacy. Telephone requests not accepted."
            />
            <label className="block text-sm">
              <span className="font-medium">Normal turnaround</span>
              <input
                className={field}
                value={practiceData.repeatTurnaround}
                onChange={(e) => setPracticeField("repeatTurnaround", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">If a patient has run out completely</span>
              <textarea
                rows={3}
                className={field}
                value={practiceData.repeatEmergency}
                onChange={(e) => setPracticeField("repeatEmergency", e.target.value)}
              />
            </label>
          </Card>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            ← Back
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={finish}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Finish setup &amp; draft starter modules
            </button>
          )}
        </div>

        <button
          onClick={() => nav({ to: "/dashboard" })}
          className="mt-4 text-xs text-muted-foreground hover:underline"
        >
          Skip for now
        </button>
      </div>
    </Shell>
  );
}
