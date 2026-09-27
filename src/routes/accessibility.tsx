import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";

export const Route = createFileRoute("/accessibility")({
  head: () => ({ meta: [{ title: "Accessibility — PracticeReady" }] }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <MarketingShell>
      <div className="marketing-wrap marketing-page legal-page">
        <section>
          <p className="marketing-eyebrow mb-6">Accessibility</p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Accessibility Statement
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            PracticeReady is being developed to be usable by as many people as possible and to
            target WCAG 2.2 AA practices.
          </p>
        </section>
        <section className="legal-content">
          <h2>What we are working towards</h2>
          <p>
            The site is designed to support keyboard navigation, visible focus, readable contrast,
            responsive layouts, labelled forms, meaningful headings and alternative text for
            informative images.
          </p>
          <h2>Known limitations</h2>
          <p>
            This statement should be updated after a full assistive-technology audit. Report any
            barriers you encounter so they can be investigated and prioritised.
          </p>
          <h2>Contact</h2>
          <p>
            Use the <a href="/contact">Contact Us</a> page to report an accessibility problem. Add a
            dedicated accessibility contact and target response time before launch.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
