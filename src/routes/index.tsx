import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PracticeReady — Training for your practice" },
      {
        name: "description",
        content:
          "Turn your practice procedures into short training modules. Guide new starters and track their progress.",
      },
    ],
  }),
  component: Home,
});
function Home() {
  const account = useApp((s) => s.account);
  return (
    <Shell>
      <section className="rounded-3xl bg-primary/5 px-6 py-12 md:p-16">
        <p className="text-sm font-semibold text-primary">For GP reception and admin teams</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight md:text-5xl">
          Train your team in how your practice works.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Turn your local procedures into short training modules. Help new starters learn and see
          how they’re progressing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {account ? (
            <Link
              to={account.role === "manager" ? "/dashboard" : "/staff"}
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "create" }}
                className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
              >
                Create a practice account
              </Link>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="rounded-xl border border-border bg-background px-6 py-3 font-semibold"
              >
                Log in
              </Link>
            </>
          )}
        </div>
        {!account && (
          <p className="mt-4 text-sm text-muted-foreground">
            Joining as a trainee? Use the login details in your practice invitation.
          </p>
        )}
      </section>
      <section aria-label="How it works" className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["1. Set up your practice", "Add your team, booking rules and local procedures."],
          ["2. Review your training", "Check and approve the draft scenarios before sharing."],
          ["3. Invite your team", "Assign modules and track each trainee’s progress."],
        ].map(([title, text]) => (
          <Card key={title}>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </Card>
        ))}
      </section>
    </Shell>
  );
}
