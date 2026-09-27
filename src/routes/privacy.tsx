import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Notice — PracticeReady" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <MarketingShell>
      <div className="marketing-wrap marketing-page legal-page">
        <section>
          <p className="marketing-eyebrow mb-6">Legal</p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Privacy Notice
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            This notice explains how PracticeReady handles personal information when you use this
            website or contact us.
          </p>
        </section>
        <section className="legal-content">
          <h2>Information we collect</h2>
          <p>
            We may collect your name, email address, GP practice, account details, training activity
            and messages you send through the contact form. Please do not include patient or other
            confidential clinical information in messages or training content.
          </p>
          <h2>How we use information</h2>
          <p>
            We use information to provide and secure PracticeReady, respond to enquiries, manage
            accounts, support training, and improve the service. The specific lawful basis,
            retention period and controller details must be confirmed before this notice is
            published as a final legal document.
          </p>
          <h2>Service providers</h2>
          <p>
            PracticeReady uses carefully selected service providers to host data and operate the
            service. A final version of this notice will identify relevant processors, locations,
            international transfers and safeguards.
          </p>
          <h2>Your rights</h2>
          <p>
            Depending on the circumstances, you may have rights to access, correct, delete or
            restrict use of your personal information, and to object to certain processing. Contact
            details and the process for making a request must be added before launch.
          </p>
          <h2>Contact and updates</h2>
          <p>
            This notice will be reviewed as PracticeReady develops. Add the legal entity name,
            registered address, privacy contact and effective date before relying on this notice.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
