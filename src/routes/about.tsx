import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — PracticeReady" },
      {
        name: "description",
        content:
          "PracticeReady exists because new GP reception and admin staff can finish training and still feel unprepared. See why we're building it and how we're developing it with primary care.",
      },
      { property: "og:title", content: "About Us — PracticeReady" },
      {
        property: "og:description",
        content:
          "A more practical approach to onboarding GP reception and admin teams, built around how each practice actually works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const PILLARS: [string, string][] = [
  [
    "Your procedures",
    "Tailor training around the processes, information and ways of working that are specific to your practice.",
  ],
  [
    "Your training",
    "Use PracticeReady modules alongside custom modules and training packages created for your own team.",
  ],
  [
    "Your people",
    "Employees practise realistic situations while managers monitor progress and identify where additional support may be needed.",
  ],
];

function AboutPage() {
  return (
    <MarketingShell>
      <div className="marketing-wrap marketing-page">
        <section className="pb-14 pt-2 lg:pt-6">
          <p className="marketing-eyebrow mb-6">About PracticeReady</p>
          <h1 className="max-w-3xl text-balance font-display text-[1.625rem] font-bold leading-tight sm:text-5xl">
            Local knowledge. Confident new starters.
          </h1>
          <div className="mt-6 max-w-2xl space-y-4 text-lg leading-8 text-muted-foreground">
            <p>
              PracticeReady was created to solve a problem we saw first-hand in general practice:
              new reception and administrative staff can complete training and still feel unprepared
              for the realities of the role.
            </p>
            <p>
              We’re building a more practical approach to onboarding — combining structured training
              with realistic scenarios based on how each individual practice actually works.
            </p>
          </div>
        </section>

        <section aria-labelledby="built-around" className="border-t border-border py-14 lg:py-16">
          <h2 id="built-around" className="font-display text-3xl font-bold leading-tight">
            Built around your practice
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {PILLARS.map(([title, text]) => (
              <div key={title} className="marketing-pillar">
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="why" className="border-t border-border py-14 lg:py-16">
          <div className="rounded-md border border-border bg-surface px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-sm font-semibold text-primary">Why we built PracticeReady</p>
            <h2 id="why" className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight">
              Built from experience in general practice
            </h2>
            <div className="mt-5 max-w-2xl space-y-4 leading-7 text-muted-foreground">
              <p>
                The idea for PracticeReady came from first-hand experience working in GP reception
                and seeing how difficult it can be to prepare new starters for the realities of the
                role.
              </p>
              <p>
                Mandatory training is important, but knowing the rules isn’t always the same as
                knowing what to do when the phone rings, a patient is standing at the desk or an
                unfamiliar situation arises.
              </p>
              <p>
                PracticeReady is being built to make that transition easier — giving new employees
                somewhere to learn, practise and make mistakes before they’re expected to handle
                those situations independently.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="approach" className="border-t border-border py-14 lg:py-16">
          <h2 id="approach" className="max-w-2xl font-display text-3xl font-bold leading-tight">
            Built with primary care, not just for it
          </h2>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            PracticeReady is currently being developed with input from people who understand primary
            care. We’re speaking with practices and industry professionals to make sure the platform
            solves real onboarding problems rather than simply adding another training system.
          </p>

          <div className="mt-8 flex flex-col items-start justify-between gap-6 rounded-lg bg-secondary px-6 py-8 sm:flex-row sm:items-center md:px-10">
            <div className="max-w-xl">
              <h3 className="font-display text-xl font-bold sm:text-2xl">
                Interested in helping shape PracticeReady?
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We’re looking to work with GP practices and primary care organisations as we develop
                and pilot the platform.
              </p>
            </div>
            <Button asChild size="lg" className="h-12 shrink-0 px-6">
              <Link to="/auth" search={{ mode: "create" }}>
                Register your interest <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
