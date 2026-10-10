import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Notice — PracticeReady" }] }),
  component: PrivacyPage,
});

const EMAIL = "practicereadyuk@gmail.com";

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
            This notice explains how PracticeReady collects and uses personal information when you
            visit this website, create or use an account, or contact us. It is written to meet the
            UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: 9 October 2026</p>
        </section>
        <section className="legal-content">
          <h2>Who we are</h2>
          <p>
            PracticeReady provides scenario-based onboarding and training tools for GP reception and
            administrative teams in the UK. For website visitors, enquiries and account management,
            PracticeReady is the data controller. You can contact us about anything in this notice
            at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
          <p>
            When a GP practice uses PracticeReady to train its own staff, the practice decides why
            and how staff training records are used. For that information the practice is the
            controller and PracticeReady processes it on the practice&apos;s behalf. Staff members
            may also contact their practice directly about their training records.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account details:</strong> name, work email address, role (for example manager
              or staff), and the practice you belong to.
            </li>
            <li>
              <strong>Practice set-up information:</strong> practice name, team structure, local
              procedures and training modules entered by managers.
            </li>
            <li>
              <strong>Training activity:</strong> modules assigned, answers given, scores, progress
              and completion dates.
            </li>
            <li>
              <strong>Enquiries:</strong> your name, email address, practice and the content of any
              message you send through the contact form or by email.
            </li>
            <li>
              <strong>Technical information:</strong> sign-in session data, IP address and basic
              server logs needed to keep the service running and secure.
            </li>
          </ul>
          <p>
            PracticeReady is not designed to hold patient information. Please do not enter patient
            names, NHS numbers or any other confidential clinical information into training content,
            local procedures or messages. We do not knowingly collect special category data.
          </p>

          <h2>How we use information and our lawful basis</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Purpose</th>
                <th scope="col">Lawful basis (UK GDPR Article 6)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Creating and managing accounts, inviting staff and providing training</td>
                <td>Contract, or legitimate interests of the practice using the service</td>
              </tr>
              <tr>
                <td>Keeping the service secure, preventing misuse and fixing faults</td>
                <td>Legitimate interests</td>
              </tr>
              <tr>
                <td>Responding to enquiries sent through the contact form or by email</td>
                <td>Legitimate interests</td>
              </tr>
              <tr>
                <td>Sending service emails such as invitations and account messages</td>
                <td>Contract or legitimate interests</td>
              </tr>
              <tr>
                <td>Meeting legal, tax or regulatory obligations</td>
                <td>Legal obligation</td>
              </tr>
            </tbody>
          </table>
          <p>
            We do not sell personal information, use it for advertising, or make decisions about you
            based solely on automated processing that have legal or similarly significant effects.
          </p>

          <h2>Who we share information with</h2>
          <p>
            We use trusted service providers who process data only on our instructions and under
            written contracts:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — database, authentication and file hosting.
            </li>
            <li>
              <strong>Vercel</strong> — website and application hosting.
            </li>
            <li>
              <strong>Resend</strong> — sending and receiving service and contact emails.
            </li>
          </ul>
          <p>
            Within a practice, managers can see the account details and training activity of staff
            in their practice. We may also share information where required by law, or to protect
            the rights, safety or property of PracticeReady, our users or others.
          </p>

          <h2>International transfers</h2>
          <p>
            Some of our providers may store or access data outside the UK, including in the European
            Economic Area and the United States. Where this happens we rely on UK adequacy
            regulations, the UK International Data Transfer Agreement, or the UK Addendum to the EU
            Standard Contractual Clauses to keep your information protected.
          </p>

          <h2>How long we keep information</h2>
          <ul>
            <li>
              Account and training records: while the practice&apos;s account is active, then
              deleted within 90 days of the account closing unless the practice asks us to delete
              them sooner.
            </li>
            <li>Contact enquiries: up to 24 months after we last correspond with you.</li>
            <li>Security and server logs: up to 90 days.</li>
          </ul>
          <p>
            We may keep information longer where the law requires it or where it is needed to
            establish, exercise or defend legal claims.
          </p>

          <h2>How we protect information</h2>
          <p>
            Data is encrypted in transit, access is restricted by role and by practice, and we limit
            staff access to what is needed to run the service. No system is completely secure, so
            please keep your sign-in details private and tell us straight away if you think your
            account has been misused.
          </p>

          <h2>Your rights</h2>
          <p>Under UK data protection law you have the right to:</p>
          <ul>
            <li>access the personal information we hold about you;</li>
            <li>have inaccurate information corrected;</li>
            <li>have information deleted in certain circumstances;</li>
            <li>restrict or object to how we use your information;</li>
            <li>receive information you gave us in a portable format; and</li>
            <li>withdraw consent at any time, where we rely on consent.</li>
          </ul>
          <p>
            To make a request, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. We will respond within
            one month, and we may need to confirm your identity first. There is normally no charge.
            If your request is about a practice&apos;s staff training records, we may pass it to
            that practice as the controller.
          </p>

          <h2>Complaints</h2>
          <p>
            Please contact us first so we can try to put things right. You also have the right to
            complain to the Information Commissioner&apos;s Office (ICO), the UK data protection
            regulator, at{" "}
            <a href="https://ico.org.uk/make-a-complaint/" rel="noreferrer" target="_blank">
              ico.org.uk/make-a-complaint
            </a>{" "}
            or by calling 0303 123 1113.
          </p>

          <h2>Cookies</h2>
          <p>
            We use essential cookies and similar storage, plus first-party analytics only if you
            accept them. See our <a href="/cookies">Cookie Policy</a> for details.
          </p>

          <h2>Children</h2>
          <p>PracticeReady is a workplace tool and is not intended for anyone under 16.</p>

          <h2>Changes to this notice</h2>
          <p>
            We will update this notice when our practices change. The date at the top shows when it
            was last revised, and we will tell account holders about significant changes.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
