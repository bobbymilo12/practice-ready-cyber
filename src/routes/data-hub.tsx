import { LocalProcedures } from "@/components/LocalProcedures";
import { TeamFields } from "@/components/TeamFields";
import { bookingFor, practiceSummary } from "@/lib/practice-config";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card } from "@/components/Shell";
import { api } from "@/lib/backend";
import { supabase } from "@/integrations/supabase/client";
import { useApp, type PracticeData } from "@/lib/store";

export const Route = createFileRoute("/data-hub")({
  head: () => ({ meta: [{ title: "Practice information — PracticeReady" }] }),
  component: DataHub,
});
type PracticeTextKey = keyof Omit<
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
function DataHub() {
  const { practiceData, setPracticeField } = useApp();

  const summary = practiceSummary(practiceData);

  const fields: { key: PracticeTextKey; label: string; hint: string }[] = [
    { key: "practiceName", label: "Practice name", hint: "Shown in modules and dashboards." },
    { key: "hours", label: "Appointment hours", hint: "Core and extended access." },
    { key: "nominatedPharmacy", label: "Nominated pharmacy", hint: "Default EPS pharmacy." },
    { key: "urgentNumbers", label: "Urgent / crisis numbers", hint: "999, 111, crisis team." },
    {
      key: "extras",
      label: "Local extras",
      hint: "PCN hub, safeguarding lead, interpreter service.",
    },
  ];

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Central knowledge base for your practice</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Practice information
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Keep your team and local procedures up to date. Review existing modules separately when
            procedures change.
          </p>
          <p className="mt-2 max-w-2xl text-sm font-medium">
            Do not enter patient names, NHS numbers or other patient-identifiable information
            anywhere in PracticeReady.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface"
        >
          ← Back to dashboard
        </Link>
      </div>

      <Link to="/practice/setup" className="mt-6 inline-block font-semibold text-primary">
        Open guided setup →
      </Link>

      <section className="mt-8 space-y-4">
        <Card>
          <details id="local-procedures">
            <summary className="cursor-pointer font-semibold">Local procedures</summary>
            <p className="mt-3 text-sm text-muted-foreground">
              Manage the practice-specific steps reception staff follow for common requests. These
              can be reused in training.
            </p>
            <div className="mt-4">
              <LocalProcedures />
            </div>
          </details>
        </Card>
        <Card>
          <h2 className="font-semibold">Appointment pathways</h2>
          <p className="mt-3 whitespace-pre-line text-sm">
            {[
              bookingFor(practiceData).sameDayPathway.requestSelections?.length
                ? "Requests potentially eligible for same-day appointments: " +
                  bookingFor(practiceData)
                    .sameDayPathway.requestSelections!.map((r) => r.labelSnapshot)
                    .join("; ")
                : "",
              summary.sameDayReasons.join("\n"),
              summary.rolePolicies.gpsSameDay,
              summary.rolePolicies.gpsRoutine,
              summary.dutyContact,
            ]
              .filter(Boolean)
              .join("\n\n") || "Not yet configured"}
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Prescription process</h2>
          <p className="mt-3 whitespace-pre-line text-sm">
            {[
              summary.prescriptionOrdering,
              !practiceData.prescriptionConfig &&
              summary.repeatOrderMethods !== summary.prescriptionOrdering
                ? summary.repeatOrderMethods
                : "",
              summary.repeatTurnaround,
              summary.repeatEmergency,
            ]
              .filter(Boolean)
              .join("\n\n") || "Not yet configured"}
          </p>
        </Card>
      </section>
      {/* Practice basics */}
      <h2 className="mt-10 font-display text-xl font-semibold">Practice basics</h2>
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <Card key={f.key}>
            <label className="text-sm font-semibold">{f.label}</label>
            <p className="mt-0.5 text-xs text-muted-foreground">{f.hint}</p>
            <textarea
              value={practiceData[f.key]}
              onChange={(e) => setPracticeField(f.key, e.target.value)}
              rows={2}
              className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2"
            />
          </Card>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold">Team and roles</h2>
        <TeamFields />
      </section>
      <section className="mt-10">
        <Card>
          <h2 className="font-semibold">Delete practice account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently deletes your practice, every staff login and all training results. This
            cannot be undone.
          </p>
          <button
            onClick={async () => {
              if (
                window.prompt(
                  "Type DELETE to permanently delete this practice and all its data.",
                ) !== "DELETE"
              )
                return;
              try {
                await api("delete-practice", { confirm: "DELETE" });
                await supabase.auth.signOut({ scope: "local" });
                window.location.assign("/");
              } catch (err) {
                window.alert(err instanceof Error ? err.message : "Could not delete the practice.");
              }
            }}
            className="mt-3 rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive"
          >
            Delete practice and all data
          </button>
        </Card>
      </section>
    </Shell>
  );
}
