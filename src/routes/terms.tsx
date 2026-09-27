import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms — PracticeReady" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketingShell>
      <div className="marketing-wrap marketing-page legal-page">
        <section>
          <p className="marketing-eyebrow mb-6">Legal</p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Terms of Use
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            These draft terms describe the intended use of PracticeReady while the service is being
            developed.
          </p>
        </section>
        <section className="legal-content">
          <h2>Using PracticeReady</h2>
          <p>
            PracticeReady provides onboarding and training tools for GP reception and administrative
            teams. It complements mandatory training and does not replace clinical protocols,
            statutory training, professional judgement or practice policies.
          </p>
          <h2>Accounts and access</h2>
          <p>
            Keep account credentials private and only give access to people authorised by your
            practice. Managers are responsible for reviewing invitations, roles and training
            assignments.
          </p>
          <h2>Content and acceptable use</h2>
          <p>
            Do not upload patient-identifiable information, unlawful material, credentials, or data
            that you are not authorised to share. Do not attempt to bypass security or access
            another practice&apos;s information.
          </p>
          <h2>Service terms</h2>
          <p>
            Pricing, service levels, cancellation, refunds, governing law, business identity and
            liability provisions must be added and reviewed before paid subscriptions or production
            use are offered.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
