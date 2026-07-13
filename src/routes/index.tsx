import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card } from "@/components/Shell";

// Real Unsplash stock photography — office / reception admin staff (no lab coats).
const HERO_RECEPTIONIST =
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1400&q=80";
const IMG_TEAM =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80";
const IMG_TRAINING =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80";
const IMG_DESK =
  "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=1400&q=80";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PracticeReady — Local onboarding for GP reception teams" },
      {
        name: "description",
        content:
          "Mandatory training teaches the rules. PracticeReady teaches how your practice actually works — scenario-based local onboarding for new GP reception and admin staff.",
      },
      { property: "og:title", content: "PracticeReady" },
      {
        property: "og:description",
        content:
          "Scenario-based local onboarding for GP reception and admin teams. Turn your practice's own workflows into interactive training.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <Shell>
      {/* Hero */}
      <section className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            For GP practice managers &amp; reception teams
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Mandatory training teaches the rules.<br />
            <span className="text-primary">PracticeReady teaches how your practice actually works.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            A local onboarding platform for GP reception and admin staff. Turn your
            practice's own appointment rules, clinic responsibilities and reception
            workflows into short, interactive scenario training — so new starters learn
            how you work before they take live calls.
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
            PracticeReady supports local onboarding. It does not replace statutory or
            mandatory training, clinical protocols or manager judgement, and does not
            provide clinical advice.
          </div>
        </div>

        <div className="relative">
          <img
            src={HERO_RECEPTIONIST}
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
              AI drafts the scenarios. Managers approve them before staff see them.
            </p>
          </div>
        </div>
      </section>

      {/* The gap */}
      <section className="mt-24 rounded-3xl border border-border bg-surface p-8 md:p-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            The gap in reception onboarding
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">
            Generic training does not teach your local reception workflows.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every practice runs differently. Which nurse handles asthma reviews? Who
            takes same-day appointments? Which requests go to the pharmacist and which
            need the duty GP? New starters usually pick this up by asking their manager
            the same questions for weeks. PracticeReady captures those answers once and
            turns them into practice.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "Speed up local onboarding",
              d: "New starters practise realistic calls in their first days, not weeks in.",
            },
            {
              t: "Reduce repeated manager explanations",
              d: "Answer each question once — the module teaches every future starter.",
            },
            {
              t: "Capture practice knowledge before it's lost",
              d: "Store staff, clinics and escalation rules so leavers don't take it with them.",
            },
            {
              t: "Learn who does what",
              d: "What to book with GPs, ANPs, nurses, HCAs and pharmacists at your practice.",
            },
            {
              t: "Turn workflows into scenarios",
              d: "Multiple-choice judgement calls and put-the-steps-in-order procedures.",
            },
            {
              t: "Keep training up to date",
              d: "When staff, clinics or processes change, update the Data Hub — modules follow.",
            },
          ].map((f) => (
            <Card key={f.t} className="bg-background">
              <h3 className="font-display text-base font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works with photo */}
      <section className="mt-24 grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-center">
        <img
          src={IMG_TEAM}
          alt="Two GP reception colleagues talking behind the front desk"
          width={1280}
          height={960}
          loading="lazy"
          className="w-full rounded-2xl border border-border object-cover"
        />
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Built around your practice — not a generic script
          </h2>
          <p className="mt-4 text-muted-foreground">
            Managers set up a Practice Data Hub once — clinicians, clinics, escalation
            routes, phrases to use and avoid. PracticeReady uses this to draft
            practice-specific scenarios you review before publishing.
          </p>
          <ol className="mt-6 space-y-4 text-sm">
            {[
              ["Set up your Data Hub", "Add your GPs, ANPs, nurses, HCAs, pharmacists and local rules."],
              ["Create a module", "Pick a topic and answer the module-specific questions."],
              ["Review AI drafts", "Approve, edit, regenerate or delete each scenario before it goes live."],
              ["Trainees practise", "Staff work through approved scenarios with clear learning points."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-foreground">{t}. </span>
                  <span className="text-muted-foreground">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Photo strip */}
      <section className="mt-24 grid gap-4 md:grid-cols-2">
        <figure className="overflow-hidden rounded-2xl border border-border">
          <img
            src={IMG_TRAINING}
            alt="Colleagues reviewing a training module on a laptop together"
            width={1280}
            height={860}
            loading="lazy"
            className="h-64 w-full object-cover md:h-72"
          />
          <figcaption className="border-t border-border bg-background p-4 text-sm">
            <span className="font-semibold">Scenario-based practice.</span>{" "}
            <span className="text-muted-foreground">
              Multiple-choice judgement calls and put-the-steps-in-order procedures.
            </span>
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-2xl border border-border">
          <img
            src={IMG_DESK}
            alt="GP reception desk with computer and admin workspace"
            width={1280}
            height={860}
            loading="lazy"
            className="h-64 w-full object-cover md:h-72"
          />
          <figcaption className="border-t border-border bg-background p-4 text-sm">
            <span className="font-semibold">Local, not generic.</span>{" "}
            <span className="text-muted-foreground">
              Every scenario is drawn from your practice's own answers and Data Hub.
            </span>
          </figcaption>
        </figure>
      </section>

      {/* Roles */}
      <section className="mt-24 grid gap-4 md:grid-cols-3">
        {[
          {
            t: "For managers",
            d: "Build modules from your local protocols, review AI-assisted drafts, publish when ready and track staff progress.",
          },
          {
            t: "For trainees",
            d: "See modules assigned to you and practise real calls in a safe, guided way with supportive feedback.",
          },
          {
            t: "For the practice",
            d: "Consistent onboarding, confident new starters and a clear record of who has completed what.",
          },
        ].map((f) => (
          <Card key={f.t}>
            <h3 className="font-display text-base font-semibold">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </Card>
        ))}
      </section>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        AI-assisted draft generation · manager review required · not clinical advice · not a
        replacement for mandatory training.
      </p>
    </Shell>
  );
}
