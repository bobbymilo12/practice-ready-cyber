import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp, type StaffMember, type RolePolicies } from "@/lib/store";

export const Route = createFileRoute("/data-hub")({
  head: () => ({ meta: [{ title: "Practice Setup / Data Hub — PracticeReady" }] }),
  component: DataHub,
});

const ROLE_GROUPS: {
  key: keyof RolePolicies;
  title: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "gps",
    title: "GPs — what reception can book",
    hint: "Names of GPs, and appointment types reception can book directly with a GP. Do not ask AI to decide clinical scope — describe your booking rules.",
    placeholder:
      "e.g. Dr Owens, Dr Patel, Dr Ahmed. Book directly with a GP: safeguarding, mental health same-day (after duty triage), under-5 illness, cancer 2WW follow-up. When unsure — book duty triage.",
  },
  {
    key: "nps",
    title: "Nurse Practitioners / ANPs",
    hint: "Names and what they take (minor illness, UTI, ear/throat, wound review, etc.). Note any individual restrictions.",
    placeholder:
      "e.g. Anna Bright — minor illness in over-5s, UTI, ear/throat, wound review. Not: under-5s, chest pain, mental health crisis. Ask duty if unsure.",
  },
  {
    key: "nurses",
    title: "Senior Nurses / Practice Nurses",
    hint: "Names and which nurse does what: diabetes, asthma, smears, imms, wound care, BP, travel, injections.",
    placeholder:
      "e.g. Priya Shah — asthma reviews, diabetic reviews, cervical screening. Do not book acute illness with practice nurses.",
  },
  {
    key: "hcas",
    title: "HCAs",
    hint: "Names and tasks: bloods, BP, NHS Health Checks, ECG, injections. Note restrictions.",
    placeholder:
      "e.g. Marcus Lee — bloods, BP, ECG, B12, NHS Health Checks. Do not book new symptoms with HCAs.",
  },
  {
    key: "pharmacists",
    title: "Practice Pharmacists",
    hint: "Names and what queries to route to them; what to escalate to GP instead.",
    placeholder:
      "e.g. Sarah Khan — medication reviews, high-risk drug monitoring, interaction queries. Escalate to GP: dose changes on high-risk meds, controlled drugs, new symptoms.",
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
    placeholder: "e.g. 'I can hear this is frustrating…', 'I'll get the duty team to call you back.'",
  },
  {
    key: "phrasesAvoid",
    title: "Phrases staff should avoid",
    hint: "Phrases that cause complaints or misunderstandings.",
    placeholder: "e.g. 'It's just a…', 'Everyone's waiting.'",
  },
];

function DataHub() {
  const {
    practiceData,
    setPracticeField,
    setRolePolicy,
    addStaff,
    updateStaff,
    removeStaff,
    replaceStaffName,
  } = useApp();

  const [newStaff, setNewStaff] = useState<Omit<StaffMember, "id">>({
    name: "",
    role: "",
    clinics: "",
  });
  const [replaceOld, setReplaceOld] = useState("");
  const [replaceNew, setReplaceNew] = useState("");
  const [replaceMsg, setReplaceMsg] = useState<string | null>(null);

  const fields: {
    key: "practiceName" | "hours" | "dutyContact" | "nominatedPharmacy" | "urgentNumbers" | "extras";
    label: string;
    hint: string;
  }[] = [
    { key: "practiceName", label: "Practice name", hint: "Shown in modules and dashboards." },
    { key: "hours", label: "Appointment hours", hint: "Core and extended access." },
    { key: "dutyContact", label: "Duty team / escalation contact", hint: "How reception reaches duty." },
    { key: "nominatedPharmacy", label: "Nominated pharmacy", hint: "Default EPS pharmacy." },
    { key: "urgentNumbers", label: "Urgent / crisis numbers", hint: "999, 111, crisis team." },
    { key: "extras", label: "Local extras", hint: "PCN hub, safeguarding lead, interpreter service." },
  ];

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Central knowledge base for your practice</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Practice Setup / Data Hub
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Store your staff, clinic responsibilities and local rules once. Every module
            you create pulls from this. When something changes — a new starter, a nurse
            leaves, a clinic moves — update it here and use{" "}
            <span className="font-semibold text-foreground">Update Local Knowledge</span>{" "}
            to flag existing modules for review.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface"
        >
          ← Back to dashboard
        </Link>
      </div>

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

      {/* Staff list */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Clinicians &amp; staff</h2>
            <p className="text-sm text-muted-foreground">
              Name, role and appointment types they cover. Referenced by every module.
            </p>
          </div>
          <Badge tone="info">{practiceData.staff.length} on file</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {practiceData.staff.map((s) => (
            <Card key={s.id}>
              <div className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_2fr_auto] md:items-start">
                <input
                  value={s.name}
                  onChange={(e) => updateStaff(s.id, { name: e.target.value })}
                  className="rounded-lg border border-input bg-background p-2 text-sm"
                  placeholder="Name"
                />
                <input
                  value={s.role}
                  onChange={(e) => updateStaff(s.id, { role: e.target.value })}
                  className="rounded-lg border border-input bg-background p-2 text-sm"
                  placeholder="Role (GP, ANP, Nurse, HCA, Pharmacist, Reception)"
                />
                <input
                  value={s.clinics}
                  onChange={(e) => updateStaff(s.id, { clinics: e.target.value })}
                  className="rounded-lg border border-input bg-background p-2 text-sm"
                  placeholder="Clinics / appointment types they cover"
                />
                <button
                  onClick={() => removeStaff(s.id)}
                  className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-4">
          <h3 className="font-display text-base font-semibold">Add a new staff member</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_1.2fr_2fr_auto]">
            <input
              value={newStaff.name}
              onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              placeholder="e.g. Amy Chen"
              className="rounded-lg border border-input bg-background p-2 text-sm"
            />
            <input
              value={newStaff.role}
              onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
              placeholder="e.g. Nurse Practitioner"
              className="rounded-lg border border-input bg-background p-2 text-sm"
            />
            <input
              value={newStaff.clinics}
              onChange={(e) => setNewStaff({ ...newStaff, clinics: e.target.value })}
              placeholder="e.g. Minor illness, UTIs, wound review"
              className="rounded-lg border border-input bg-background p-2 text-sm"
            />
            <button
              disabled={!newStaff.name.trim() || !newStaff.role.trim()}
              onClick={() => {
                addStaff(newStaff);
                setNewStaff({ name: "", role: "", clinics: "" });
              }}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </Card>
      </section>

      {/* Role policies */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Who books what — by role</h2>
        <p className="text-sm text-muted-foreground">
          Describe your booking rules per role in plain English. The AI uses these to
          draft accurate scenarios. Do not ask AI to decide clinical scope — write what
          your practice already does.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {ROLE_GROUPS.map((g) => (
            <Card key={g.key}>
              <label className="text-sm font-semibold">{g.title}</label>
              <p className="mt-0.5 text-xs text-muted-foreground">{g.hint}</p>
              <textarea
                value={practiceData.rolePolicies[g.key]}
                onChange={(e) => setRolePolicy(g.key, e.target.value)}
                rows={5}
                placeholder={g.placeholder}
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
            Tell PracticeReady when someone has left and been replaced (for example, Anna
            has left and been replaced by Amy). We rename them in the staff list, update
            every published and draft module that mentions the old name, and flag those
            modules for manager review.
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
          {replaceMsg && (
            <p className="mt-3 text-sm text-[color:var(--success)]">{replaceMsg}</p>
          )}
        </Card>
      </section>
    </Shell>
  );
}
