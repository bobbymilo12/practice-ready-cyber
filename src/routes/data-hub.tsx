import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp, type StaffMember } from "@/lib/store";

export const Route = createFileRoute("/data-hub")({
  head: () => ({ meta: [{ title: "Data hub — PracticeReady" }] }),
  component: DataHub,
});

function DataHub() {
  const {
    practiceData,
    setPracticeField,
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
    { key: "dutyContact", label: "Duty team contact", hint: "How reception reaches duty." },
    { key: "nominatedPharmacy", label: "Nominated pharmacy", hint: "Default EPS pharmacy." },
    { key: "urgentNumbers", label: "Urgent / crisis numbers", hint: "999, 111, crisis team." },
    { key: "extras", label: "Local extras", hint: "PCN hub, safeguarding lead, interpreter service." },
  ];

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Practice knowledge base</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Data hub</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Store your staff list, contact routes and local rules once. Every module you create pulls
            from this. When staff change, update it here — you can push the change into existing
            modules with one click.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface"
        >
          ← Back to dashboard
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
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
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Clinicians &amp; staff</h2>
            <p className="text-sm text-muted-foreground">
              Name, role and what appointments they take. Modules will reference these people by
              name.
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
                  placeholder="Role (e.g. Nurse Practitioner)"
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

      <section className="mt-10">
        <Card>
          <h2 className="font-display text-xl font-semibold">Staff has changed</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell PracticeReady when someone has left and been replaced (for example, Anna has left
            and been replaced by Amy). We'll rename them in the staff list and update every
            published and draft module that mentions the old name.
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
                  `Updated ${touched} scenario${touched === 1 ? "" : "s"} across your modules.`,
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
