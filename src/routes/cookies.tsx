import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { OPEN_COOKIE_SETTINGS } from "@/components/CookieBanner";

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
            This policy explains the cookies and similar technologies PracticeReady uses, in line
            with the Privacy and Electronic Communications Regulations (PECR) and UK GDPR.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: 10 October 2026</p>
        </section>
        <section className="legal-content">
          <h2>What cookies and similar storage are</h2>
          <p>
            Cookies are small text files a website saves on your device. Websites can also store
            information in your browser using &quot;local storage&quot; and &quot;session
            storage&quot;. This policy covers all of these technologies.
          </p>

          <h2>What we use</h2>
          <p>
            PracticeReady uses <strong>strictly necessary</strong> storage to sign you in, keep your
            session secure and remember your cookie choice. Under PECR, strictly necessary storage
            does not require consent, but we still tell you about it. We also use one{" "}
            <strong>optional analytics</strong> item, which is only set if you choose &quot;Accept
            all&quot;. If you accept, our hosting provider also collects cookieless, aggregated
            website statistics, described below.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Purpose</th>
                <th scope="col">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>sb-…-auth-token</td>
                <td>Local storage (Supabase)</td>
                <td>Keeps you signed in and securely refreshes your session</td>
                <td>Until you log out</td>
              </tr>
              <tr>
                <td>cookie-consent</td>
                <td>Local storage</td>
                <td>Remembers your choice on the cookie banner so we don&apos;t ask every visit</td>
                <td>Until you clear it</td>
              </tr>
            </tbody>
          </table>

          <h2>Optional analytics (only with your consent)</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Purpose</th>
                <th scope="col">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>analytics-visitor-id</td>
                <td>Local storage (first party)</td>
                <td>
                  A random ID that lets us count visits and see which pages are used, so we can
                  improve PracticeReady
                </td>
                <td>Until you reject cookies or clear it</td>
              </tr>
            </tbody>
          </table>
          <p>
            If you accept, we record the random ID, the page address (without any search or form
            details), the website that linked you to us on your first page, and the time. We do not
            record your name, account, IP address or device details. This data stays in our own
            database and is not shared with analytics or advertising companies. Our lawful basis is
            your consent. If you reject or later withdraw consent, the ID is deleted from your
            browser and no further visits are recorded. We also keep a record of each cookie choice
            (accept or reject, the date and the policy version) to show we asked for consent.
          </p>
          <p>
            Our fonts are hosted on our own servers, so loading a page does not send your
            information to font providers.
          </p>

          <h2>Cookieless website statistics (Vercel Web Analytics)</h2>
          <p>
            Our hosting provider, Vercel, gives us aggregated visitor statistics such as page views,
            referring websites, country, browser and device type. Vercel Web Analytics does not set
            cookies or store anything on your device, and it only runs if you accept optional
            analytics. Vercel identifies a visit using a hash of the request (including the IP
            address and browser details) that is discarded after 24 hours, and we only see totals,
            never individual visitors. Vercel acts as our processor. See our{" "}
            <a href="/privacy">Privacy Notice</a> for more detail.
          </p>

          <h2>What we don&apos;t use</h2>
          <p>
            We do not use advertising, social media or third-party tracking cookies, and we do not
            share cookie data with third parties for marketing. If we add any other optional
            cookies, we will update this policy and ask for your consent again.
          </p>

          <h2>Managing your choice</h2>
          <p>
            You can review your choice at any time using{" "}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}
              className="cursor-pointer text-primary underline underline-offset-4"
            >
              cookie settings
            </button>
            , which is also linked in the footer of every page. You can also block or delete cookies
            and site storage in your browser settings. If you block strictly necessary storage, you
            will not be able to sign in.
          </p>

          <h2>More information</h2>
          <p>
            See our <a href="/privacy">Privacy Notice</a> for how we handle personal information, or
            visit{" "}
            <a
              href="https://ico.org.uk/for-the-public/online/cookies/"
              rel="noreferrer"
              target="_blank"
            >
              the ICO&apos;s guidance on cookies
            </a>
            . Questions can be sent to{" "}
            <a href="mailto:practicereadyuk@gmail.com">practicereadyuk@gmail.com</a>.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
