import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card } from "@/components/Shell";

const HERO_RECEPTIONIST =
  "https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?auto=format&fit=crop&w=1400&q=80";
const HERO_TRAINING =
  "https://images.unsplash.com/photo-1573497491765-dccce02b29df?auto=format&fit=crop&w=1400&q=80";

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
      <section className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            For GP practice managers &amp; teams
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Scenario-based onboarding for GP reception teams
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Turn your practice's own protocols into short, interactive training modules so new
            reception and admin staff practise realistic calls before they take them live.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
            >
              I'm a manager
            </Link>
            <Link
              to="/staff"
              className="inline-flex items-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-surface"
            >
              I'm a trainee
            </Link>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">Safety note.</strong>{" "}
            PracticeReady supports local onboarding and does not replace statutory or mandatory
            training, clinical protocols or manager judgement.
          </div>
        </div>

        <div className="relative">
          <img
            src={heroReceptionist}
            alt="GP practice receptionist smiling while taking a call at the front desk"
            width={1280}
            height={960}
            className="w-full rounded-2xl border border-border object-cover shadow-[0_20px_60px_-20px_rgba(15,30,60,0.25)]"
          />
          <div className="absolute -bottom-6 -left-6 hidden w-64 rounded-2xl border border-border bg-background p-4 shadow-md md:block">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Manager review required
            </div>
            <p className="mt-1 text-sm">
              AI-assisted drafts are never published to staff until a manager approves them.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-24 grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
        <img
          src={heroTraining}
          alt="Two GP admin colleagues reviewing a training module together"
          width={1280}
          height={960}
          loading="lazy"
          className="w-full rounded-2xl border border-border object-cover"
        />
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Built around your practice, not a generic script
          </h2>
          <p className="mt-4 text-muted-foreground">
            Managers answer specific questions — from asthma follow-up bookings to chest pain
            escalation — and PracticeReady drafts scenarios that match the way your practice
            actually works.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Choose multiple-choice (1 of 4) or 'put these steps in order' quizzes.",
              "AI-assisted draft generation with manager review required before publishing.",
              "Trainees see clear learning points after every answer.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-3">
        {[
          {
            t: "For managers",
            d: "Create modules from your local protocols, review AI drafts, publish when ready and track staff progress.",
          },
          {
            t: "For trainees",
            d: "Log in to see modules assigned to you and practise real calls in a safe, guided way.",
          },
          {
            t: "For the practice",
            d: "Consistent onboarding, confident new starters and a clear audit trail of who has completed what.",
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
