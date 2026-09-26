import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, RefreshCw, UsersRound } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import receptionTeam from "@/assets/hero-receptionist.jpg";
import teamLearning from "@/assets/hero-training.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PracticeReady — Training for your practice" },
      {
        name: "description",
        content:
          "Turn your GP practice's local procedures into interactive onboarding scenarios for reception and admin teams.",
      },
      { property: "og:title", content: "PracticeReady — Local onboarding for GP teams" },
      {
        property: "og:description",
        content: "Help new reception and admin staff learn how your GP practice actually works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});
function Home() {
  const account = useApp((s) => s.account);
  return (
    <Shell>
      <section className="grid items-center gap-10 pb-16 pt-2 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pb-24 lg:pt-8">
        <div className="max-w-2xl">
          <p className="mb-6 inline-flex rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase text-secondary-foreground">
            Local onboarding for GP teams
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Help new starters learn how your practice actually works.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Turn your local workflows, team responsibilities and everyday procedures into clear,
            interactive scenarios for reception and admin staff.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {account ? (
              <Button asChild size="lg" className="h-12 px-6">
                <Link to={account.role === "manager" ? "/dashboard" : "/staff"}>
                  Go to dashboard <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-12 px-6">
                  <Link to="/auth" search={{ mode: "create" }}>
                    Create a practice account <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <Link to="/auth" search={{ mode: "login" }}>Log in</Link>
                </Button>
              </>
            )}
          </div>
          {!account && (
            <p className="mt-4 text-sm text-muted-foreground">
              Joining as a trainee? Log in with the details in your practice invitation.
            </p>
          )}
        </div>

        <figure className="relative overflow-hidden rounded-lg bg-surface-muted">
          <img
            src={receptionTeam}
            alt="A receptionist helping people at a healthcare reception desk"
            className="aspect-[4/3] h-full w-full object-cover"
          />
          <figcaption className="absolute bottom-4 left-4 right-4 rounded-md bg-background/95 p-4 shadow-lg backdrop-blur-sm">
            <p className="text-sm font-semibold text-foreground">Built around your local procedures</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              So new starters can practise realistic situations before handling them alone.
            </p>
          </figcaption>
        </figure>
      </section>

      <section className="border-y border-border bg-surface py-10 text-center md:py-12">
        <p className="mx-auto max-w-4xl font-display text-2xl font-semibold leading-snug md:text-3xl">
          Mandatory training teaches the rules. PracticeReady teaches how your practice actually
          works.
        </p>
      </section>

      <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 lg:py-24">
        <div className="overflow-hidden rounded-lg bg-surface-muted">
          <img
            src={teamLearning}
            alt="Office colleagues reviewing information together at a laptop"
            className="aspect-[16/11] h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">Knowledge that stays useful</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
            Capture it once. Keep everyone up to date.
          </h2>
          <p className="mt-5 leading-7 text-muted-foreground">
            Store the local knowledge managers explain every week, then reuse it across training
            modules. When responsibilities change, you can see what needs reviewing.
          </p>
          <ul className="mt-8 space-y-5">
            {[
              [UsersRound, "Speed up onboarding and reduce repeated explanations"],
              [BookOpenCheck, "Turn real local workflows into interactive scenarios"],
              [RefreshCw, "Keep training aligned with changes in your practice"],
            ].map(([Icon, text]) => (
              <li key={text as string} className="flex items-start gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="pt-1.5 text-sm font-medium leading-6">{text as string}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="border-t border-border py-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Simple to manage</p>
          <h2 id="how-it-works" className="mt-3 font-display text-3xl font-bold">
            From local knowledge to ready-to-use training
          </h2>
        </div>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ["01", "Set up your practice", "Add your team, booking rules and local procedures."],
            ["02", "Review every scenario", "Check and approve each draft before staff can see it."],
            ["03", "Assign and follow progress", "Invite trainees, assign modules and review results."],
          ].map(([number, title, text]) => (
            <li key={number} className="border-t-2 border-primary pt-5">
              <span className="text-xs font-bold text-primary">{number}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {!account && (
        <section className="mb-6 flex flex-col items-start justify-between gap-6 rounded-lg bg-secondary px-6 py-8 sm:flex-row sm:items-center md:px-10">
          <div>
            <h2 className="font-display text-2xl font-bold">Ready to set up your practice?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with your local knowledge, then review before sharing anything with staff.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 px-6">
            <Link to="/auth" search={{ mode: "create" }}>
              Create an account <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      )}
    </Shell>
  );
}
