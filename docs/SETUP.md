# Connect PracticeReady to Supabase and Resend

The integration is prepared but is not deployed or connected to live services. Without the two public frontend variables, the app displays setup guidance and disables account submission. It does not simulate successful invitations.

## 1. Create the services

1. Create a Supabase project and record its project reference, project URL and public publishable key (the legacy anonymous key also works). Keep the database password and service-role key private.
2. Create a Resend account, verify a domain you control and choose a sender such as `PracticeReady <training@yourdomain.co.uk>`.
3. Decide the app's final HTTPS URL. Use the existing Lovable-connected hosting if desired; no hosting migration is required.

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

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions. Never expose a service-role key or Resend key in a `VITE_` variable or commit them. The migration enables RLS and revokes browser access to all application tables; the Edge Function authenticates the JWT with Supabase and enforces role/practice ownership before accessing records.

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

1. Manager: complete practice setup, review **both primary and follow-up scenarios**, approve and publish a module. Generated scenarios are templates quoting your saved rules; there is no external AI service.
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
- Existing modules without approved follow-up scenarios still show explanations and areas to practise. New generated modules include paired follow-ups for manager review.
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
