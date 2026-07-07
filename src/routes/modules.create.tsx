import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";

export const Route = createFileRoute("/modules/create")({
  head: () => ({ meta: [{ title: "Create module — PracticeReady" }] }),
  component: CreateModule,
});

const TYPES = [
  { key: "first-week", title: "First week on reception", desc: "Orientation basics for new starters." },
  { key: "appointment-booking", title: "Appointment booking", desc: "Routine, on-the-day and urgent booking flows." },
  { key: "prescriptions", title: "Prescription requests", desc: "Repeats, queries and clinical escalation." },
  { key: "results", title: "Test results and confidentiality", desc: "Sharing results safely and appropriately." },
  { key: "urgent", title: "Urgent symptoms and escalation", desc: "Red flags and local escalation protocol." },
  { key: "difficult", title: "Difficult calls", desc: "De-escalation and empathetic communication." },
  { key: "custom", title: "Custom module", desc: "Design a module from your own process." },
];

function CreateModule() {
  const [selected, setSelected] = useState<string | null>(null);
  const nav = useNavigate();

  return (
    <Shell>
      <div>
        <p className="text-sm text-muted-foreground">Step 1 of 3</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Choose a module type
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pick the topic that best fits what you want new reception or admin staff to practise.
          You'll shape the specifics in the next step.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TYPES.map((t) => {
          const active = selected === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSelected(t.key)}
              className={`text-left rounded-2xl border p-5 transition ${
                active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="font-display text-base font-semibold">{t.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t.desc}</div>
            </button>
          );
        })}
      </div>

      <Card className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selected
            ? `Selected: ${TYPES.find((t) => t.key === selected)?.title}`
            : "Select a module type to continue."}
        </p>
        <button
          disabled={!selected}
          onClick={() => {
            const t = TYPES.find((x) => x.key === selected);
            if (!t) return;
            nav({ to: "/modules/setup", search: { type: t.title } });
          }}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Continue →
        </button>
      </Card>
    </Shell>
  );
}
