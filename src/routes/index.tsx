import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card } from "@/components/Shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PracticeReady — Scenario-based onboarding for GP reception teams" },
      {
        name: "description",
        content:
          "PracticeReady helps new GP reception and admin staff practise realistic situations before they take live calls.",
      },
      { property: "og:title", content: "PracticeReady" },
      {
        property: "og:description",
        content:
          "Scenario-based onboarding for GP reception and admin teams. Turn local processes into short interactive training modules.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <Shell>
      <section className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            For GP practice managers
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Scenario-based onboarding for GP reception teams
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            PracticeReady helps new reception/admin staff practise realistic situations before
            they take live calls.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
            >
              Start demo
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-surface"
            >
              See manager dashboard
            </Link>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">Safety note.</strong>{" "}
            PracticeReady supports local onboarding and does not replace statutory or mandatory
            training, clinical protocols or manager judgement.
          </div>
        </div>

        <Card className="bg-surface">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Example scenario
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold">
            Repeat prescription request
          </h3>
          <blockquote className="mt-3 rounded-lg border-l-4 border-accent bg-background p-3 text-sm italic text-foreground">
            "I've run out of my repeat medication. Can the doctor do it today?"
          </blockquote>
          <p className="mt-4 text-sm font-medium">What should the receptionist do?</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="rounded-lg border border-border p-3">
              A. Promise the patient it will be issued today.
            </div>
            <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
              B. Follow the practice's repeat prescription process, explain expected timescales,
              and escalate if there is a clinical concern.
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-3">
        {[
          {
            t: "Turn local processes into practice",
            d: "Short interactive modules built from your practice's own protocols.",
          },
          {
            t: "AI-assisted draft generation",
            d: "Scenarios are drafted with AI and always require manager review before staff use.",
          },
          {
            t: "Confidence before live calls",
            d: "New starters rehearse difficult calls, escalation and confidentiality safely.",
          },
        ].map((f) => (
          <Card key={f.t}>
            <h3 className="font-display text-base font-semibold">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </Card>
        ))}
      </section>
    </Shell>
  );
}
