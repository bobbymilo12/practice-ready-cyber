import { LocalProcedures } from "@/components/LocalProcedures";
import { TeamFields } from "@/components/TeamFields";
import { bookingFor, practiceSummary } from "@/lib/practice-config";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { api } from "@/lib/backend";
import { supabase } from "@/integrations/supabase/client";
import { useApp, type RolePolicies, type PracticeData } from "@/lib/store";

export const Route = createFileRoute("/data-hub")({
  head: () => ({ meta: [{ title: "Practice information — PracticeReady" }] }),
  component: DataHub,
});

type RoleGroup = {
  title: string;
  hint: string;
  sameDayKey: keyof RolePolicies;
  routineKey: keyof RolePolicies;
  sameDayPlaceholder: string;
  routinePlaceholder: string;
};

const ROLE_GROUPS: RoleGroup[] = [
  {
    title: "Nurse Practitioners / ANPs",
    hint: "What ANPs can see on-the-day vs at a routine appointment. Note who is trained.",
    sameDayKey: "npsSameDay",
    routineKey: "npsRoutine",
    sameDayPlaceholder:
      "e.g. Anna Bright — minor illness in over-5s, UTI (women 16–65 non-pregnant), ear/throat, wound review. NOT under-5s or chest pain.",
    routinePlaceholder:
      "e.g. Minor illness follow-up, recurrent UTI review, wound review follow-up, simple rash review.",
  },
  {
    title: "Practice Nurses",
    hint: "Named nurses and which appointments they cover, same-day vs routine.",
    sameDayKey: "nursesSameDay",
    routineKey: "nursesRoutine",
    sameDayPlaceholder:
      "e.g. Priya — post-A&E asthma review (20-min slot within 2 working days), acute wound dressing, suture / staple removal.",
    routinePlaceholder:
      "e.g. Priya — asthma reviews, diabetic annual reviews (HCA bloods first, then 30-min nurse slot), cervical screening, childhood imms Tue AM.",
  },
  {
    title: "HCAs",
    hint: "HCA tasks split by same-day and routine. Never new symptoms.",
    sameDayKey: "hcasSameDay",
    routineKey: "hcasRoutine",
    sameDayPlaceholder:
      "e.g. Marcus — BP check, clinician-requested urgent bloods, ECG for cardiology referral, simple wound dressing.",
    routinePlaceholder:
      "e.g. Marcus — pre-review bloods, NHS Health Check, B12 injection, BP monitoring, phlebotomy. NOT new symptoms.",
  },
  {
    title: "Practice Pharmacists",
    hint: "What routes to the pharmacist same-day vs routinely.",
    sameDayKey: "pharmacistsSameDay",
    routineKey: "pharmacistsRoutine",
    sameDayPlaceholder:
      "e.g. Sarah Khan — emergency supply triage, urgent medication query, hospital discharge medication reconciliation.",
    routinePlaceholder:
      "e.g. Sarah Khan — full medication review, high-risk drug monitoring, polypharmacy, minor med queries, interaction check.",
  },
];

const RULE_GROUPS: {
  key: keyof RolePolicies;
  title: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "neverPromise",
    title: "Things reception must never promise",
    hint: "Used across every module so drafts always reflect it.",
    placeholder: "e.g. A specific GP or time. That results are 'fine'. Anything clinical.",
  },
  {
    key: "phrasesUse",
    title: "Phrases staff should use",
    hint: "Warm, calm, professional wording your practice prefers.",
    placeholder:
      "e.g. 'I can hear this is frustrating…', 'I'll get the duty team to call you back.'",
  },
  {
    key: "phrasesAvoid",
    title: "Phrases staff should avoid",
    hint: "Phrases that cause complaints or misunderstandings.",
    placeholder: "e.g. 'It's just a…', 'Everyone's waiting.'",
  },
];

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

const REPEAT_FIELDS: { key: PracticeTextKey; label: string; hint: string; placeholder: string }[] =
  [
    {
      key: "repeatControlled",
      label: "Controlled drug rules — what reception must never do",
      hint: "Include the 28-day rule and advance-request limits.",
      placeholder:
        "e.g. Never taken by phone. 28-day rule. Named GP only. Advance requests no more than 7 days early. Check ID at collection.",
    },
    {
      key: "repeatHighRisk",
      label: "High-risk drugs needing clinician sign-off before reissue",
      hint: "List each drug/class and what monitoring must be on file.",
      placeholder:
        "e.g. Warfarin (INR in date), methotrexate (bloods 12-weekly), lithium, DMARDs, opioids, ADHD meds — do NOT issue on standard route.",
    },
  ];

const LOCAL_FIELDS: { key: PracticeTextKey; label: string; hint: string; placeholder: string }[] = [
  {
    key: "localSafeguarding",
    label: "Safeguarding — lead, how concerns are raised and escalated",
    hint: "Include lead's name, template used, third-party rules for under-16s.",
    placeholder:
      "e.g. Safeguarding lead: Dr Patel. Same-day EMIS template + verbal handover. Under-16 third-party requests always escalated.",
  },
  {
    key: "localComplaints",
    label: "Complaints — verbal and written process",
    hint: "Include acknowledgement / response timelines and what reception must never say.",
    placeholder:
      "e.g. Verbal: acknowledge, offer escalation to practice manager, log on Datix. Written: ack in 3 wd, response in 20.",
  },
  {
    key: "localDNA",
    label: "DNA / missed appointment policy",
    hint: "Include how many DNAs before escalation and vulnerable-patient rules.",
    placeholder:
      "e.g. Code DNA in EMIS; 3+ DNAs in 6 months → practice manager; vulnerable patients → welfare check to duty GP.",
  },
  {
    key: "localInterpreter",
    label: "Interpreter / BSL — how it's arranged",
    hint: "Include service, number, PIN location, and what NOT to do.",
    placeholder:
      "e.g. Language Line 0800 XXX XXXX (PIN on intranet). BSL via SignVideo. Never use family for clinical interpretation.",
  },
  {
    key: "localConfidentiality",
    label: "Confidentiality — day-to-day rules for reception",
    hint: "Screen locking, third-party rules, age-based results rules.",
    placeholder:
      "e.g. Screen lock on leaving desk. No info in reception area. Third party only with written consent. <13 to parent; 13–16 Gillick; 16+ patient only.",
  },
];

function DataHub() {
  const { practiceData, setPracticeField, setRolePolicy, replaceStaffName } = useApp();

  const summary = practiceSummary(practiceData);
  const [replaceOld, setReplaceOld] = useState("");
  const [replaceNew, setReplaceNew] = useState("");
  const [replaceMsg, setReplaceMsg] = useState<string | null>(null);

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

      {/* Role policies split by same-day vs routine */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Who books what — same-day vs routine</h2>
        <p className="text-sm text-muted-foreground">
          For each role, describe what reception can book on the day of the call vs at a routine
          appointment. These details support your module drafts.
        </p>
        <div className="mt-4 space-y-4">
          {ROLE_GROUPS.map((g) => (
            <Card key={g.title}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold">{g.title}</h3>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <BulletField
                  label="On-the-day bookings"
                  tone="primary"
                  value={practiceData.rolePolicies[g.sameDayKey]}
                  onChange={(v) => setRolePolicy(g.sameDayKey, v)}
                  placeholder={g.sameDayPlaceholder}
                />
                <BulletField
                  label="Routine appointments"
                  tone="accent"
                  value={practiceData.rolePolicies[g.routineKey]}
                  onChange={(v) => setRolePolicy(g.routineKey, v)}
                  placeholder={g.routinePlaceholder}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Repeat prescription process */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">
          Repeat prescriptions — your local process
        </h2>
        <p className="text-sm text-muted-foreground">
          Reception gets asked about prescriptions constantly. Be specific here — vague answers
          produce vague training.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {REPEAT_FIELDS.map((f) => (
            <Card key={f.key}>
              <label className="text-sm font-semibold">{f.label}</label>
              <p className="mt-0.5 text-xs text-muted-foreground">{f.hint}</p>
              <textarea
                value={practiceData[f.key]}
                onChange={(e) => setPracticeField(f.key, e.target.value)}
                rows={4}
                placeholder={f.placeholder}
                className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </Card>
          ))}
        </div>
      </section>

      {/* Local guidelines & protocols */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Local guidelines &amp; protocols</h2>
        <p className="text-sm text-muted-foreground">
          The everyday operational rules new starters need to know. These feed every module you
          generate.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {LOCAL_FIELDS.map((f) => (
            <Card key={f.key}>
              <label className="text-sm font-semibold">{f.label}</label>
              <p className="mt-0.5 text-xs text-muted-foreground">{f.hint}</p>
              <textarea
                value={practiceData[f.key]}
                onChange={(e) => setPracticeField(f.key, e.target.value)}
                rows={4}
                placeholder={f.placeholder}
                className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </Card>
          ))}
        </div>
      </section>

      {/* Language rules */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Language &amp; promises</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {RULE_GROUPS.map((g) => (
            <Card key={g.key}>
              <label className="text-sm font-semibold">{g.title}</label>
              <p className="mt-0.5 text-xs text-muted-foreground">{g.hint}</p>
              <textarea
                value={practiceData.rolePolicies[g.key]}
                onChange={(e) => setRolePolicy(g.key, e.target.value)}
                rows={4}
                placeholder={g.placeholder}
                className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </Card>
          ))}
        </div>
      </section>

      {/* Update local knowledge */}
      <section className="mt-10">
        <Card>
          <h2 className="font-display text-xl font-semibold">Update local knowledge</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell PracticeReady when someone has left and been replaced (for example, Anna has left
            and been replaced by Amy). We rename them in the staff list, update every published and
            draft module that mentions the old name, and flag those modules for manager review.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={replaceOld}
              onChange={(e) => setReplaceOld(e.target.value)}
              placeholder="Old name (e.g. Anna Bright)"
              className="rounded-lg border border-input bg-background p-2 text-sm"
            />
            <input
              value={replaceNew}
              onChange={(e) => setReplaceNew(e.target.value)}
              placeholder="New name (e.g. Amy Chen)"
              className="rounded-lg border border-input bg-background p-2 text-sm"
            />
            <button
              disabled={!replaceOld.trim() || !replaceNew.trim()}
              onClick={() => {
                const touched = replaceStaffName(replaceOld, replaceNew, true);
                setReplaceMsg(
                  touched === 0
                    ? "Name updated. No existing scenarios mentioned that name."
                    : `Updated ${touched} scenario${touched === 1 ? "" : "s"}. Affected modules are flagged for manager review.`,
                );
                setReplaceOld("");
                setReplaceNew("");
              }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
            >
              Replace &amp; propagate
            </button>
          </div>
          {replaceMsg && <p className="mt-3 text-sm text-[color:var(--success)]">{replaceMsg}</p>}
        </Card>
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

function BulletField({
  label,
  tone,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  tone: "primary" | "accent";
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const items = value ? value.split("\n") : [""];
  const setItems = (next: string[]) => onChange(next.join("\n"));
  const update = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    setItems(next);
  };
  const remove = (i: number) => {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next.length ? next : [""]);
  };
  const add = () => setItems([...items, ""]);
  const examples = placeholder
    .replace(/^e\.g\.\s*/i, "")
    .split(/[.;]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div>
      <label
        className={`text-xs font-semibold uppercase tracking-wider ${
          tone === "primary" ? "text-primary" : "text-accent"
        }`}
      >
        {label}
      </label>
      <div className="mt-1 space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className={`mt-2.5 h-1.5 w-1.5 flex-none rounded-full ${
                tone === "primary" ? "bg-primary" : "bg-accent"
              }`}
            />
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={items.length === 1 && !item ? (examples[0] ?? "") : "Add another item"}
              className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm outline-none ring-primary/30 focus:ring-2"
            />
            {items.length > 1 && (
              <button
                onClick={() => remove(i)}
                aria-label="Remove item"
                className="mt-0.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-2 text-xs font-medium text-primary hover:underline">
        + Add bullet
      </button>
      {examples.length > 1 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Examples: {examples.slice(0, 3).join(" · ")}
        </p>
      )}
    </div>
  );
}
