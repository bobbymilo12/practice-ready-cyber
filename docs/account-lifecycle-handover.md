# Account and staff lifecycle: local implementation and deployment handover

No remote database, Auth configuration, RLS policy or Edge Function was changed/deployed by this task. The migration below is an unapplied review artifact.

## Implemented locally

### Forgotten passwords

Sign-in has **Forgot password?**. It requests a Supabase password-reset email via `auth.resetPasswordForEmail`, with `/auth?mode=recovery` as the redirect. All provider outcomes show the same conditional inbox message; the application does not query whether an email exists or display provider error details.

The app listens for Supabase's `PASSWORD_RECOVERY` event and displays the new-password form. Supabase verifies the link and the password update (`auth.updateUser`); the application creates no reset tokens. The form checks the authenticated user and password confirmation, then signs out the local recovery session after success. Invalid/expired links lead to requesting a new link. Refreshing after a link has already been consumed can require a new link; recovery authorization is not persisted in custom browser storage.

This is separate from invitation activation. It never clears `must_reset_password`. An invited user who has not activated is directed back to the invitation flow. Recovery does not reactivate inactive practice membership. Mock sessions never send recovery emails.

### Staff membership

**Deactivate** replaces normal destructive removal. It withdraws current assignments and records `profiles.inactive_at`, retaining the profile, names, marks, attempts, snapshots, results and credentials. **Reactivate** clears the inactive timestamp only; it does not restore withdrawn assignments or automatically send invitations. An unactivated invited user still needs their invitation after reactivation.

The API rejects requests by inactive profiles before processing practice actions. Inactive staff are excluded from assignment choices, assignment/reassignment rejects them, and invitation resend cannot reactivate them. The old `remove-trainee` endpoint now refuses deletion. Existing separately confirmed whole-practice deletion/data-rights mechanisms are outside this feature and unchanged.

### Assignment withdrawal

The trainee detail screen has **Withdraw assignment**, with confirmation and a saving lock. It waits for confirmed persistence. The existing assignment retains its ID with `withdrawnAt`/`withdrawnBy` fields. It disappears from current workload/progress but remains visible as withdrawn history. API training actions reject withdrawn assignments; attempts/results are not deleted. Completed results remain viewable. A later assignment creates a new ID; it does not reopen the withdrawn attempt.

Manager historical pages retain inactive staff and withdrawn training, including older completion results and counts of retained unfinished attempts. Deactivation does not affect unrelated trainees' assignments.

## Collaborator: migration/database review required

Review/apply `supabase/migrations/202610190001_staff_lifecycle.sql` before deploying this version of `practice-api` and the frontend.

- Adds nullable `profiles.inactive_at`. Existing profiles remain active; no data backfill is required.
- Adds a narrow `set_staff_active` function which updates membership and withdraws assignments in one transaction. It locks the practice row, verifies the manager and trainee belong to the same practice, checks the workspace version, and increments that version. Reactivation never changes old assignments.
- Assignment lifecycle fields live in existing JSON state; no new assignment table is created.
- Function execution is revoked from `public`, `anon`, and `authenticated`, and granted only to `service_role`. The Edge Function verifies the caller before invoking it. No existing table grants or RLS policies are relaxed or rewritten.
- Review function ownership/privileges, the service-role-only execution boundary and concurrency with the existing version-guarded save function. Exercise the SQL on a staging database; the local API tests use a deterministic adapter, not a live Postgres instance.
- Any earlier unapplied migrations, including the superseded-attempt index migration, must also be reviewed in order.

## Collaborator: Supabase Auth configuration required

1. Review the project's Site URL and add the exact production callback `<APP_ORIGIN>/auth?mode=recovery` to **Authentication → URL Configuration → Redirect URLs**. Add only the staging/development origins actually needed (e.g. `http://localhost:8080/auth?mode=recovery`); do not add unrestricted production wildcards.
2. Review the **Reset password** email template. Retain Supabase's verified `ConfirmationURL` flow and ensure it respects the requested redirect; do not send users straight to the app without verification. The current client uses the SDK's existing browser flow; this task does not switch the project to a different auth architecture.
3. Verify SMTP/email delivery, rate limits, link expiry and password policies in staging. Test existing, unknown, expired and reused-link cases, including opening links from email scanners/in-app browsers. The application presents a generic initiation message even for delivery/rate-limit failures.
4. Test both activated managers and trainees, and confirm existing temporary-password invitations still work. Test callback query preservation after redirects.
5. Review session policy: deactivation is **application membership suspension**, not an Auth-user ban/deletion or global session revocation. Existing Supabase sessions can still authenticate, but the practice API denies inactive membership. No direct application-table access is granted by this change. If there are additional deployed APIs, Storage policies or direct database policies beyond this repository, review their inactive-member behaviour. Decide separately whether Auth bans/session revocation are required; none are implemented here.
6. Password recovery signs out the local recovery session. Review any requirement to revoke other sessions using Supabase's supported security controls; no production settings were changed here.

Official references: [Supabase password recovery API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [password-based authentication](https://supabase.com/docs/guides/auth/passwords), [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## Verification boundary

Mock lifecycle actions, local application logic, API authorization with a database adapter and regression tests can run locally. Real membership actions require the migration and updated Edge Function. Real password emails and link completion require a connected Supabase project with the reviewed Auth settings. Nothing here claims live email delivery or production database validation.
