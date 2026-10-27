# Security, launch configuration and pilot sign-off

Working record for the pre-pilot security work. Update the sign-off table as each check is run.
Related: `docs/GDPR.md` (data map, DPIA facts), `docs/account-lifecycle-handover.md` (lifecycle and
password-recovery detail), `docs/BACKEND-MAP.md`.

## 1. How access control works

- **All app data goes through one Edge Function**, `supabase/functions/practice-api`, using the
  service role. Every table has RLS on with **no policies**, and app tables revoke everything from
  `anon`/`authenticated`. A browser key, with or without a user JWT, can read or write nothing
  directly. The one exception is `contact_messages`, which allows public INSERT only.
- **Practice and role come from the database, never from the client.** Each request is checked with
  `auth.getUser(token)`, which calls Supabase Auth so revoked sessions fail. The function then loads
  `profiles` by user id and filters every query by that profile's `practice_id`.
- **Manager-only actions** (`save-practice`, `invite`, `set-staff-active`, `delete-practice`) are
  checked on the server. The frontend's role gating is only for convenience.
- **Inactive staff** (`profiles.inactive_at`) get 403 on every action.
- **SQL functions** are `SECURITY DEFINER` with `search_path = ''`, and only `service_role` can
  execute them.

### Decisions

| Decision | Reason |
| --- | --- |
| Deactivation is an app-level block (`inactive_at` plus API 403). Supabase Auth bans are not used. | No data is reachable except through `practice-api`, which rejects inactive profiles on every request. A ban would also block password recovery and make reactivation two-step. Revisit if any direct-table, Storage or second API is added. |
| A password change ends every session, including the current one. The app then signs straight back in with the new password. | Supabase Auth revokes all sessions on an admin password change (confirmed live 2026-10-22), so stolen or old-device sessions stop working. |
| `remove-trainee` is refused; Deactivate replaces it. | Hard delete cascaded away training history. |
| The invite flow still tells a manager that an email "is already in use". | Any outcome of an invite (sent or refused) reveals whether the email exists, so it can't be hidden without silently failing invites. The risk is limited to authenticated managers, invites are rate-limited to one per minute per address, and the message doesn't name the other practice. **Accepted risk.** |
| Audit log: `audit_events` records staff deactivate/reactivate, assignment withdrawal and module publish/republish. Writes are best-effort. | The action has already been committed when the log is written, so a logging failure must not make the UI report a successful save as failed. Practice deletion removes its log as part of erasure. |

## 2. Migrations (apply in this order)

| # | File | Notes |
| --- | --- | --- |
| 0 | `drizzle/migrations/0000_create_contact_messages.sql` | Must run before #4 |
| 1 | `202609210001_trainee_journey.sql` | |
| 2 | `202610090001_practice_tables.sql` | |
| 3 | `202610100001_cookie_data.sql` | |
| 4 | `202610100002_retention_purge.sql` | `purge_expired_personal_data()` is **not scheduled**. Add pg_cron or run it manually each month. |
| 5 | `202610100003_practice_modules.sql` | |
| 6 | `202610130001_shared_topic_settings.sql` | A null `topicSettings` keeps the old value (for older clients); `{}` clears it. |
| 7 | `202610160001_superseded_attempts.sql` | Replaces the unique open-attempt index |
| 8 | `202610190001_staff_lifecycle.sql` | Required before deploying the current `practice-api` |
| 9 | `202610220001_revoke_analytics_client_grants.sql` | Defence in depth |
| 10 | `202610220002_audit_events.sql` | Required before deploying the current `practice-api` |
| 11 | `202610270001_schedule_retention_purge.sql` | Schedules the daily purge with pg_cron |
| 12 | `202610270002_staff_erasure.sql` | Required before deploying the `erase-staff` action |
| 13 | `202610270003_public_endpoint_limits.sql` | Rate-limit triggers on public tables |

Before applying to the live project:
1. Check `supabase migration list` against this table.
2. Take a backup (Dashboard → Database → Backups, or `supabase db dump`).
3. Apply the migrations.
4. Deploy `practice-api`.
5. Run `scripts/security-check.mjs`.

## 3. Launch configuration checklist

- [ ] **Hosting (Vercel) env:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (must start with
  `sb_publishable_`, **never** `sb_secret_`). Server-only: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
  `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`.
- [ ] **Edge Function secrets:** `APP_URL`, `ALLOWED_ORIGINS` (exact origins, comma-separated),
  `RESEND_API_KEY`, `INVITE_FROM`. `SUPABASE_URL` and the service key are provided by Supabase.
  The function is deployed with `verify_jwt=false` because it verifies tokens itself.
- [ ] **Auth → URL configuration:** Site URL is the production origin. Redirect URLs list exactly
  `<origin>/auth?mode=recovery` for each real origin, with no wildcards.
- [ ] **Auth → Email:** custom SMTP (Resend) with a verified sender domain. Review the reset-password
  template, link expiry, rate limits and the minimum password length (12).
- [ ] **Auth → Sign-ups:** public sign-up creates a new practice with a manager account. Decide
  whether to keep this open for the pilot or switch to invite-only.
- [ ] **Resend:** sender domain verified (SPF/DKIM). `INVITE_FROM` and `CONTACT_FROM` use it.
- [ ] **Backups:** record the plan tier, the daily backup retention and whether point-in-time
  recovery (PITR) is enabled (section 5).
- [ ] **Remove stale live objects** listed in `docs/BACKEND-MAP.md` (e.g.
  `practices_backup_20261009`) after confirming they are unused.

## 4. Pilot sign-off

Automated checks run in CI on every push (`npm test`, typecheck). Live checks need the project's
keys:

```
SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… SUPABASE_SECRET_KEY=… SECURITY_CHECK_CONFIRM=yes node scripts/security-check.mjs
```

It creates two `zz-sectest-*` practices, probes them, deletes everything, and prints PASS/FAIL. It
needs migrations #8 and #10 and the current `practice-api` deployed.

| Area | How tested | Result | Date |
| --- | --- | --- | --- |
| Role and practice checks in API code | `tests/api.test.mjs` (adapter) | PASS | 2026-10-22 |
| Password change revokes other sessions | `tests/api.test.mjs` | PASS | 2026-10-22 |
| Contact form never reports false success | `tests/contact.test.ts` | PASS | 2026-10-22 |
| Secrets in git history | `git log -p --all` scan for key patterns: placeholder only | PASS | 2026-10-22 |
| Secrets in client bundle | `npm run build`, grep `.vercel/output/static`: none | PASS | 2026-10-22 |
| Runtime dependencies | `npm audit --omit=dev`: 0 after `npm audit fix` (vite, source-map-js). Dev-only drizzle-kit has 4 moderate findings; accepted because it never ships. | PASS | 2026-10-22 |
| Practice A cannot reach practice B (live) | `security-check.mjs` | PASS | 2026-10-22 |
| Trainee cannot use manager actions (live) | `security-check.mjs` | PASS | 2026-10-22 |
| Browser key + JWT cannot read or write tables or call RPCs (live) | `security-check.mjs`: 64 checks | PASS | 2026-10-22 |
| Logout, password change and invalid tokens rejected (live) | `security-check.mjs` | PASS. A password change also ended the user's own session; fixed by signing back in (rerun needed after deploy) | 2026-10-22 |
| Deactivated staff blocked, reactivation restores access (live) | `security-check.mjs` | rerun needed after deploy | |
| Supabase security advisors clean | Dashboard → Advisors | not run | |
| Password reset: valid, expired, reused and tampered links | Manual, real inbox | not run | |
| Invites: first login, expired (>7 days), repeat (1/min), used, email in another practice | Manual, real inbox | not run | |
| Concurrent saves: two tabs edit setup, second gets "edited on another device" | Manual | not run | |
| Failed saves never show success (offline/blocked request on save, publish, assign, invite) | Manual, DevTools → block `practice-api` | not run | |
| Cross-device resume of a partly completed module | Manual, two browsers | not run | |
| Full journey (section 6) | Manual, real accounts | not run | |

## 5. Backup and recovery

- TODO (owner): record the Supabase plan. Free tier has no downloadable backups. Pro has 7 daily
  backups, and PITR is a paid add-on.
- Until then, take a manual `supabase db dump` before each migration and weekly during the pilot.
  Store it encrypted, outside the repo.
- **Restore:** Dashboard → Database → Backups (project owner only). A restore replaces the whole
  database, so changes made after the backup are lost. Tell affected practices (see GDPR.md breach
  steps).
- Deactivation and assignment withdrawal never delete history. Only `delete-practice` (typed
  `DELETE` confirmation) and the retention purge remove data.

## 6. Full real-account journey (manual)

Manager registers → logs in → completes setup → invites trainee → trainee activates (temporary
password → new password) → manager assigns a module → trainee completes half → trainee signs in on
another device and resumes → trainee finishes and sees results → manager sees results → manager
changes a practice setting that affects the module → module is flagged for review → manager reviews
and republishes → manager reassigns → trainee completes the new attempt (old attempt kept) → manager
deactivates the trainee (trainee blocked) → manager reactivates. Record any failure in section 7.

## 7. Remaining risks and handover

- **Applied to live 2026-10-22:** migrations #6–#10. Earlier migrations had been applied under
  dashboard-generated version numbers, so the history was repaired with `supabase migration repair`
  (no schema change).
- **Found live:** each trainee invite left an empty practice behind. Auth sets `app_metadata` after
  the signup trigger runs, so the trigger still provisioned a practice. `invite` now deletes it. The
  9 empty practices created before the fix need a one-off cleanup.
- No separate staging project exists. Recommended: a second Supabase project with the same
  migrations and function, used for the live script and the manual checks before real staff join.
- `purge_expired_personal_data()` is not scheduled.
- Public analytics and contact endpoints have no rate limiting.
- Expired invitations (>7 days) can still sign in, but see no data until a manager resends.
- No per-person erasure route exists short of deleting the whole practice (GDPR.md TODO).
