import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileInput, ChartColumnIncreasing, UsersRound } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import "@/homepage.css";

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
  const accountAction = (
    <Button asChild className="home-primary">
      <Link
        to={account ? (account.role === "manager" ? "/dashboard" : "/staff") : "/auth"}
        search={account ? undefined : { mode: "create" }}
      >
        {account ? "Go to dashboard" : "Create a practice account"}
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );
  return (
    <MarketingShell home>
      <section className="home-hero" aria-labelledby="home-title">
        <img
          className="home-hero-image"
          src="/assets/marketing/clinic-reception.jpg"
          width={1600}
          height={1068}
          fetchPriority="high"
          alt="A receptionist helping a visitor at a clinic reception desk"
        />
        <div className="home-hero-shade" />
        <div className="home-wrap home-hero-content">
          <p className="home-label">Local onboarding for GP teams</p>
          <h1 id="home-title">
            Training built
            <br />
            around your
            <br />
            practice.
          </h1>
          <p className="home-hero-description">
            Turn your local workflows, team responsibilities and everyday procedures into clear,
            interactive scenarios for reception and admin staff.
          </p>
          <div className="home-actions">
            {accountAction}
            {!account && (
              <Button asChild variant="outline" className="home-outline">
                <Link to="/auth" search={{ mode: "login" }}>
                  Log in
                </Link>
              </Button>
            )}
          </div>
          {!account && (
            <p className="home-invitation">
              Joining as a trainee? Log in with the details in your practice invitation.
            </p>
          )}
        </div>
      </section>

      <section className="home-positioning">
        <div className="home-wrap home-positioning-inner">
          <h2>
            Mandatory training teaches the rules.
            <br />
            PracticeReady teaches how your
            <br className="home-desktop-break" /> practice actually works.
          </h2>
          <p>
            <span>Practical</span>
            <span>Relevant</span>
            <span>Local</span>
          </p>
        </div>
      </section>

      <section className="home-value" aria-labelledby="home-value-title">
        <div className="home-value-copy">
          <p className="home-label">Local knowledge, shared</p>
          <h2 id="home-value-title">
            The things your team knows.
            <br />
            The confidence new starters need.
          </h2>
          <p className="home-value-description">
            Capture your local knowledge once and turn it into realistic, role-specific training.
          </p>
          <ul className="home-benefits">
            {[
              [UsersRound, "Speed up onboarding and reduce repeated explanations"],
              [FileInput, "Turn real local workflows into interactive scenarios"],
              [ChartColumnIncreasing, "Keep training aligned with changes in your practice"],
            ].map(([Icon, text]) => (
              <li key={text as string}>
                <span className="home-benefit-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>{text as string}</span>
              </li>
            ))}
          </ul>
        </div>
        <img
          className="home-value-image"
          src="/assets/marketing/reception-paperwork.jpg"
          width={1400}
          height={2100}
          loading="lazy"
          alt="A member of clinic staff reviewing paperwork with a visitor at reception"
        />
      </section>

      <section className="home-process" aria-labelledby="how-it-works">
        <div className="home-wrap">
          <h2 id="how-it-works" className="home-label">
            How PracticeReady works
          </h2>
          <ol>
            {[
              ["01", "Set up your practice", "Add your team, roles and local procedures."],
              ["02", "Review every scenario", "Turn your workflows into interactive training."],
              [
                "03",
                "Assign and follow progress",
                "Give modules to your team and track completion.",
              ],
            ].map(([number, title, text]) => (
              <li key={number}>
                <div className="home-step-number">
                  {number}
                  <span />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-final" aria-labelledby="home-final-title">
        <div className="home-final-photo">
          <img
            src="/assets/marketing/waiting-room.jpg"
            width={1200}
            height={800}
            loading="lazy"
            alt="Seating and plants in a bright healthcare waiting area"
          />
        </div>
        <div className="home-final-copy">
          <p className="home-label">Ready to get started?</p>
          <h2 id="home-final-title">Interested in PracticeReady?</h2>
          <p>Join the practices exploring a better way to train reception and admin teams.</p>
          <div className="home-actions">
            {accountAction}
            <Button asChild variant="outline" className="home-outline">
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
