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
            We want everyone who uses PracticeReady to be able to do so easily, whatever their
            ability or the technology they use.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: 9 October 2026</p>
        </section>
        <section className="legal-content">
          <h2>Using this website</h2>
          <p>This website is designed so that you should be able to:</p>
          <ul>
            <li>
              navigate most of the site using just a keyboard, with a visible focus indicator;
            </li>
            <li>skip straight to the main content using the &quot;Skip to content&quot; link;</li>
            <li>zoom in up to 400% without text spilling off the screen;</li>
            <li>change colours, text size and fonts using your browser or device settings;</li>
            <li>use the site on a phone or tablet in portrait or landscape;</li>
            <li>use a screen reader such as NVDA, JAWS or VoiceOver; and</li>
            <li>read text with sufficient colour contrast.</li>
          </ul>
          <p>
            <a href="https://mcmw.abilitynet.org.uk/" rel="noreferrer" target="_blank">
              AbilityNet
            </a>{" "}
            has advice on making your device easier to use if you have a disability.
          </p>

          <h2>Our standard</h2>
          <p>
            We aim to meet the Web Content Accessibility Guidelines (WCAG) version 2.2 at level AA.
            We build with semantic headings, labelled form fields, meaningful link text and
            alternative text for informative images.
          </p>

          <h2>Compliance status</h2>
          <p>
            This website is partially compliant with WCAG 2.2 AA. It has not yet had a full
            independent accessibility audit, so some parts may not be fully accessible.
          </p>

          <h2>Known limitations</h2>
          <ul>
            <li>
              Some interactive training exercises, such as drag-and-drop matching and sequencing
              boards, may be harder to complete with a keyboard or screen reader.
            </li>
            <li>
              Content written by practices themselves, such as local procedures and custom modules,
              may not always meet accessibility standards.
            </li>
          </ul>
          <p>
            If you cannot complete a training exercise because of an accessibility barrier, contact
            us and we will help you and your practice find an alternative.
          </p>

          <h2>Feedback and contact information</h2>
          <p>
            If you find a problem, or need information in a different format, email{" "}
            <a href="mailto:practicereadyuk@gmail.com">practicereadyuk@gmail.com</a> or use our{" "}
            <a href="/contact">contact form</a>. Tell us the web address of the page, what the
            problem is, and what device and assistive technology you were using. We aim to reply
            within 5 working days.
          </p>

          <h2>Enforcement</h2>
          <p>
            If you are not happy with how we respond, you can contact the{" "}
            <a href="https://www.equalityadvisoryservice.com/" rel="noreferrer" target="_blank">
              Equality Advisory and Support Service (EASS)
            </a>
            . Under the Equality Act 2010, service providers must make reasonable adjustments for
            disabled people.
          </p>

          <h2>How we tested this website</h2>
          <p>
            This statement was prepared on 9 October 2026 based on our own checks during
            development. We will review it after a full audit and at least once a year.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
