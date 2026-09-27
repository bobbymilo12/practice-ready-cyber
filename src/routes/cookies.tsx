import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy — PracticeReady" }] }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <MarketingShell>
      <div className="marketing-wrap marketing-page legal-page">
        <section>
          <p className="marketing-eyebrow mb-6">Legal</p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Cookie Policy
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            PracticeReady currently uses cookies and similar storage only where needed to operate
            accounts, security and core functionality.
          </p>
        </section>
        <section className="legal-content">
          <h2>Essential storage</h2>
          <p>
            Authentication and security storage may be required for sign-in, session management and
            protecting the service. These technologies are necessary for requested functionality.
          </p>
          <h2>Optional technologies</h2>
          <p>
            Analytics, advertising pixels, embedded media and other non-essential technologies must
            not be enabled until you have made an appropriate choice. No optional technology should
            be added without updating this policy and implementing consent controls.
          </p>
          <h2>Managing your choice</h2>
          <p>
            A final version of this page should explain how to change or withdraw consent once
            optional cookies or similar technologies are introduced.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
