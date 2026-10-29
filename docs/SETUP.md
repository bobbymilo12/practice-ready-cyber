# Connect PracticeReady to Supabase and Resend

The frontend has local public configuration. The database/API deployment and email configuration still need to be completed. Without the two public frontend variables, the app displays setup guidance and disables account submission. It does not simulate successful invitations.

## 1. Create the services

1. Create a Supabase project and record its project reference, project URL and public publishable key (the legacy anonymous key also works). Keep the database password and service-role key private.
2. Create a Resend account, verify a domain you control and choose a sender such as `PracticeReady <training@yourdomain.co.uk>`.
3. Decide the app's final HTTPS URL and choose a hosting provider for the app server.

## 2. Apply the database migration and deploy the API

From the project root, with the Supabase CLI installed:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REFERENCE
supabase db push
```

The migration creates `practices`, `profiles` and `training_sessions`. Each manager signup gets a new practice. Invited trainees belong to that manager's practice. Do this **before** creating the first account.

Set these in the Supabase dashboard's Edge Function secrets:

| Secret            | Value                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`  | Private Resend sending API key                                                                       |
| `INVITE_FROM`     | Sender on your verified Resend domain                                                                |
| `APP_URL`         | Final app URL, e.g. `https://practice-ready.example`                                                 |
| `ALLOWED_ORIGINS` | Comma-separated exact origins; include your final URL and any local/preview origins you actually use |

For contact-form submissions, set the Supabase server credentials in the hosting environment
that runs the TanStack server function. Do not expose them as `VITE_` variables:

| Secret                       | Value                                      |
| --------------------------- | ------------------------------------------ |
| `SUPABASE_URL`              | Supabase project URL                       |
| `SUPABASE_SECRET_KEYS`      | JSON object containing a private `sb_secret_...` key |

If the deployment already has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, the
contact form can use that public pair as a fallback because the table permits inserts but no reads.
`SUPABASE_SECRET_KEY` is also accepted for a single secret key, while the deprecated
`SUPABASE_SERVICE_ROLE_KEY` remains a compatibility fallback. Secret keys remain preferred for
server deployments.

For contact-form notifications, set these in the same hosting environment:

| Secret           | Value                                                                                |
| ---------------- | ------------------------------------------------------------------------------------ |
| `RESEND_API_KEY` | Private Resend sending API key                                                       |
| `CONTACT_FROM`   | Sender on your verified Resend domain, e.g. `PracticeReady <hello@yourdomain.co.uk>` |
| `CONTACT_TO`     | Inbox that should receive contact enquiries; defaults to `practicereadyuk@gmail.com`    |
| `RESEND_WEBHOOK_SECRET` | Signing secret for the Resend `email.received` webhook                         |

The contact form sends a plain-text notification through Resend to `CONTACT_TO` (or
`practicereadyuk@gmail.com` when unset), with the visitor's email in `Reply-To`. `CONTACT_FROM`
must be a verified Resend sender; the visitor's address cannot be used as the `From` address.
The message is also stored in `contact_messages` when Supabase server credentials are configured.
If database storage is unavailable, a successful email still returns success and the server logs
the storage failure.

To forward emails sent to a Resend receiving address to `CONTACT_TO`, create a receiving webhook
in the Resend dashboard with the event `email.received` and this URL:

```text
https://YOUR_APP_URL/api/resend-receiving
```

The endpoint verifies Resend's Svix signature before forwarding the original email and its
attachments. Copy the webhook's signing secret into `RESEND_WEBHOOK_SECRET`; do not expose it to
the browser or commit it.

Never expose a service-role key or Resend key in a `VITE_` variable or commit them. The contact
server function uses the service-role client only on the server to insert validated messages.
The migration enables RLS and revokes browser access to all application tables; the Edge Function
authenticates the JWT with Supabase and enforces role/practice ownership before accessing records.

```sh
supabase functions deploy practice-api
```

`supabase/config.toml` disables the platform's legacy JWT precheck because the handler validates every request itself with `auth.getUser`. Keep that validation in place. Deploy from this repository root: the function imports the shared training state machine under `src/lib/training.ts`.

Reference: [Supabase Edge Function deployment](https://supabase.com/docs/guides/functions/deploy).

## 3. Configure account confirmation emails

In Supabase Authentication:

- Enable email/password authentication and keep email confirmation enabled for manager signups.
- Set the Site URL to the final app URL.
- Add `https://YOUR_APP/auth` and your development `/auth` URL to allowed redirect URLs.
- Configure custom SMTP for real manager confirmation emails. You can use Resend SMTP with the verified sender; use the SMTP credentials shown in your Resend account.
- Set the minimum password length to 12 characters to match the app.

Invited trainees are created by the server and receive a Resend email containing their username, temporary password and practice-specific login link. They must change that password before the API returns any training data. The invitation expires after seven days; managers can resend inactive invitations. Active accounts cannot be reset via the invitation form.

References: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [server-only account creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Resend email API](https://resend.com/docs/api-reference/emails/send-email).

## 4. Connect the frontend

Copy `.env.example` to `.env.local` and fill in:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
```

Set the same two variables in the frontend hosting/build environment, then rebuild. They are public configuration; secret keys stay in Supabase.

```sh
npm install
npm run dev
```

Create and confirm a manager account. If this browser contains the original demo, the empty manager dashboard offers **Import saved demo practice**. This copies practice information and modules only. It leaves the original local storage untouched and never imports plaintext passwords, demo accounts or synthetic results. Invite real trainees and assign modules again.

## 5. Verify the live journey before inviting staff

Use two test inboxes you control and two separate browser profiles/devices:

1. Manager: review **both primary and follow-up scenarios** of a module, approve and publish it. (The cyber module generators are not built yet; until then, copy a shared module from the library.)
2. Invite a trainee. Confirm the email actually arrives, contains the correct practice link and permits login with the temporary password. “Accepted for email delivery” means Resend accepted the request; delivery/bounces can be inspected in Resend.
3. Try opening `/staff` before changing the password. It should return to the password-change screen. Change the password, then confirm the homepage opens automatically. Verify the temporary password no longer works.
4. Assign two modules. Check Not Started, then start one, answer incorrectly and refresh while its explanation is visible. Confirm the answer is retained. Sign out and resume on a second device.
5. Finish the primary questions and the approved follow-up. Confirm the original score and recovered topics are shown separately. Start the next assigned module, then confirm the all-training-completed message.
6. Manager: refresh progress, inspect results and reassign a module. The trainee should see the new assignment as Not Started while the manager retains prior attempts.
7. Verify a second trainee cannot see the first trainee's assignments/results and cannot open manager pages. Direct API attempts must also be rejected.
8. Temporarily use an invalid Resend key in a test environment. An invitation must report an email failure and offer resend, not successful delivery.

## Behaviour and limits

- Training saves after each checked answer and Continue action. Failed network requests keep the trainee on the current question with a retryable error. Unsubmitted step rearrangements are not saved.
- Manager forms autosave to the shared practice. A stale version is rejected rather than overwriting another device's work. The error banner offers retry or an explicit reload that discards unsaved edits.
- Published modules awaiting review are unavailable to trainees. Already started attempts retain their approved scenario snapshot; after a content correction, reassign the module to require a fresh attempt using the revised content.
- All assignments currently count toward onboarding/training completion. There is no separate required/optional assignment type or pass threshold. A completed module can still show areas needing practice.
- Modules without approved follow-up scenarios still show explanations and areas to practise.
- Each account belongs to one practice. New manager signup creates a separate practice; joining additional managers to an existing practice is outside this trainee journey.
- Forgotten-password recovery for already activated users is not part of this first-login password-change flow. Account support currently requires the Supabase administrator.
- Initial provisioning, database RLS behaviour against real Postgres, actual email delivery and cross-device synchronization need the live verification above; local tests use mocked services.

## Local validation

Requires Node 24 for the TypeScript test files.

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The browser suite uses mocked Supabase responses and does not send email. Install its browser once with `npx playwright install chromium`.

## Current connection status

The supplied public configuration has been saved to the ignored `.env.local` file for project `yuatwxjnodfumvxdoydw`. A read-only check confirmed that Supabase Auth accepts the public key. The application tables and `practice-api` function returned HTTP 404 and still need deployment. No database password or Resend secret was saved in this repository.

After deployment, run `npm run backend:check`. This checks the public Auth endpoint, verifies that anonymous database access is denied, and verifies that the Edge Function rejects unauthenticated requests. It does not send email or change records.

Deployment still needs a Supabase CLI login, the final app URL, and a verified Resend sender. Put a fresh Resend API key into the Edge Function secrets. Also set the two public frontend variables in the Vercel project's environment variables; the ignored local file is not deployed through Git.

## Local development without Supabase

Run `npm run dev` and open the local server at `http://localhost:5173/auth` (or the port Vite prints). Choose **Continue as Manager** or **Continue as Trainee**. No Supabase project or environment variables are needed for this mode.

- The fictional practice has a manager and Jamie Example as the trainee, with no modules. Manager edits and trainee results share the same mock workspace in this tab. Add `?sequencePreview=1` to a URL to add and assign a test-only ordering module.
- The development banner links back to the role selector. Switching roles reloads the app to isolate mock and real authentication. **Log out** exits mock mode; any pre-existing real Supabase session is left untouched.
- Mock invitations create local records only and explicitly report that no email was sent. The built-in trainee cannot be removed, so role switching remains usable. Newly invited mock records do not create real accounts.
- Data survives refresh and restarts in `localStorage`, not the real database. Clear the `practiceready-dev-workspace-v2` local-storage entry and reload to reset the sample data. Clear `practiceready-dev-role-v1` (session storage) to exit mock mode manually; closing the tab clears it.
- Only Vite development builds on `localhost`, `127.0.0.1` or IPv6 loopback allow this bypass. It is unavailable on hosted/forwarded preview domains, production builds and `npm run preview`, even if a mock role is stored. To use it from a remote development environment, forward the port to localhost on your machine.

### Reusable local Mock Manager baseline

On localhost development, a fresh **Mock Manager** workspace has a fictional practice name and
address and no modules. Existing mock workspaces are reused without overwriting edits.

Mock Manager includes Jamie Example (Mock Trainee), using the same identity as the Mock Trainee
login. Loading an older Manager workspace adds Jamie only if missing, preserving existing data.
No modules are assigned automatically. Refresh Mock Manager, then on a published module click
**Assign to employees → Jamie Example (Mock Trainee) → Assign**. Switch to Mock Trainee in the
same browser tab to start that training; no invitation or workspace reset is needed.

To reset, open browser developer tools while in the local mock session, go to **Application →
Local Storage → your local app origin**, delete only `practiceready-dev-workspace-v2`, then
reload. This discards that mock workspace's edits, modules and attempts and reloads the baseline.
The equivalent browser-console command is:

```js
localStorage.removeItem("practiceready-dev-workspace-v2");
location.reload();
```

Real authenticated accounts continue loading their own Supabase practice; this seed is never
imported into a database. Browser-session edits do not update the baseline in source.

The removable implementation is in `src/lib/dev-mode.ts` and the dynamically loaded `src/lib/dev-backend.ts`. Integration points are marked by `devRole`/`devAuthAvailable` in the backend, account gate, login and invitation pages. The Supabase API, database permissions and real account types are unchanged. Remove those hooks, the two files and its tests (`tests/browser/dev-auth.spec.ts`, `tests/dev-mode.test.mjs` and the corresponding npm test command) when the bypass is no longer needed.
