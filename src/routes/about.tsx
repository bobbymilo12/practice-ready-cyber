import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Card } from "@/components/Shell";
export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About PracticeReady" }] }),
  component: AboutPage,
});
function AboutPage() {
  return (
    <Shell>
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold">
          Local knowledge. Confident new starters.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          PracticeReady helps GP reception and admin teams learn their practice’s procedures through
          short, interactive scenarios.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          [
            "Built from your procedures",
            "Managers record who does what, how bookings work and when to escalate.",
          ],
          [
            "Reviewed by your manager",
            "Scenario templates use your practice information. Managers check and approve every draft.",
          ],
          [
            "Practice with feedback",
            "Trainees get explanations, revisit mistakes and pick up where they left off.",
          ],
        ].map(([title, text]) => (
          <Card key={title}>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </Card>
        ))}
      </div>
      <Link to="/" className="mt-8 inline-block font-semibold text-primary">
        Get started →
      </Link>
    </Shell>
  );
}
