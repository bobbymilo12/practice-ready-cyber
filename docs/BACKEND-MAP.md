# Backend & database map (pilot sprint, Day 1)

Snapshot of how data is stored today (10 Oct). Sources: `supabase/migrations/*`, `drizzle/migrations/*`, `supabase/functions/practice-api/index.ts`, and a read-only check of the live project `yuatwxjnodfumvxdoydw` (see "Live database vs repo" below).

## How access works

- The browser never reads or writes app tables directly. Every table has RLS on, **no policies**, and `anon`/`authenticated` have no grants. Only `service_role` can touch them.
- All app traffic goes through one Edge Function, `practice-api`. It checks the Supabase Auth token, loads the caller's `profiles` row, and takes `practice_id` and `role` from there, never from the request body.
- So practice isolation is enforced **in Edge Function code** (every query filters on `profile.practice_id`), not by RLS policies. RLS is a deny-all backstop.
- Exception: `contact_messages` has an insert-only policy for `anon`/`authenticated` (public contact form). Contact, cookie consent and page views are written by TanStack server functions (`src/lib/contact.functions.ts`, `src/lib/cookie-data.functions.ts`) using the server-side admin client.

## Tables

| Table | One row per | What it holds | Personal data? |
|---|---|---|---|
| `auth.users` (Supabase Auth) | user | email, password hash, metadata | Yes. Passwords live **only** here |
| `practices` | practice | `state` JSONB blob (modules, packages, assignments, see below) + `version` for optimistic locking | Indirectly (trainee IDs in assignments) |
| `profiles` | user | `practice_id`, `role` (`manager`/`trainee`), name, email, job role, invite status, `must_reset_password` | Yes: name, email |
| `training_sessions` | training attempt | `data` JSONB: snapshot of scenarios, answers, result/score, confidence. `version` for locking | Yes: answers and scores per trainee |
| `practice_settings` | practice | name, hours, address, phone/contact text, local policy text, booking/prescription config | Mostly practice info. Free-text fields could contain names |
| `practice_staff` | staff member | name, role, clinics, capabilities, **`notes` (free text)** | Yes: staff names, notes |
| `practice_roles` | practice × role | which request types each role handles | No |
| `practice_local_procedures` | practice × request type | local procedure steps (JSONB) | Possibly, in free text |
| `practice_requests` | practice × request type | custom request labels | No |
| `role_templates` | global role | seeded role list (GP, nurse, HCA…), shared by all practices | No |
| `contact_messages` | website message | name, email, message. Purged after 24 months | Yes |
| `cookie_consents` | banner choice | random visitor ID, accept/reject, policy version. Purged after 3 years | Pseudonymous |
| `page_views` | page view | random visitor ID, path, referrer host. Purged after 13 months | Pseudonymous |

The `practice_*` tables are written all at once by `save_practice_data()` (deletes and re-inserts the child rows) and read back by `load_practice_data()`, which rebuilds the `PracticeData` object the frontend expects.

## Where modules, assignments and questions are stored

**All in the `practices.state` JSONB blob**, not in their own tables:

| Key in `state` | Contents |
|---|---|
| `modules[]` | each module with its `scenarios[]` (the questions), `published`, `needsReview` |
| `packages[]` | groups of modules (`kind: "induction"` is auto-assigned on invite), has a `version` field |
| `assignments[]` | `{ traineeId, moduleId, packageId, status, dueDate }` |
| `emojiMarks` | per-trainee marks keyed `"<traineeId>:..."` |
| `answers`, `currentDraftId`, `setupComplete` | manager-side draft/setup state |

Answers and results are **not** in the blob. They're in `training_sessions`.

Write paths for the blob:
- `save-practice` (manager): replaces the whole blob from an allowlist of keys, version-checked. Validates that assignments point at real trainees and published modules, and that published modules have every scenario approved.
- `invite`: appends induction assignments.
- `remove-trainee`: strips that trainee's assignments and emoji marks, then deletes the auth user.

## Answers to the board's "questions to confirm"

| Question | Answer today |
|---|---|
| Where are modules and assignments stored? | `practices.state` JSONB (above) |
| Is versioning handled if a module is edited? | Partly. Modules have no version number. But `startSession` **copies the approved scenarios into the session** when an attempt starts, so editing a module doesn't change an attempt already in progress or completed results. New attempts get the new content. There's no history of earlier module versions |
| Is practice isolation enforced at DB level (RLS)? | **No.** RLS is deny-all, and isolation is enforced by Edge Function code. Safe as long as every query filters on `profile.practice_id` (they currently do). It's a single point of failure, so worth confirming on Security day |
| Passwords handled by Supabase Auth, not profiles? | **Yes.** `profiles` has no password column. Note: the invite email sends a **temporary password in plain text** (expires 7 days, must be changed on first login) |
| Can a manager view results clearly? | Data's there: `load` gives managers every `training_sessions` row for their practice. Whether the dashboard shows it clearly is a Day 5 task |
| Can data be deleted on request? | Trainee: `remove-trainee` deletes the auth user, which cascades to `profiles` and `training_sessions`. Whole practice: `delete-practice`. Website data: `purge_expired_personal_data()` (needs pg_cron scheduled, see migration) |
| Unnecessary sensitive fields? | Candidates: `practice_staff.notes` (free text), and the free-text `practice_settings` / local procedure fields. Also `profiles.job_role` |

## Live database vs repo (checked 10 Oct, read-only)

Row counts: 10 practices, 5 profiles (2 managers, 3 trainees), 2 training sessions, 3 practice_settings, 7 staff, 11 role templates, 2 cookie consents, 11 page views.

| Repo says | Live has | Impact |
|---|---|---|
| `contact_messages` table (drizzle migration) | ✅ **Applied 10 Oct** (was missing) | Contact form can insert now. Note: Supabase default privileges also gave `anon` SELECT, but RLS has only an insert policy, so reads return nothing |
| `202610100002_retention_purge` migration | ✅ **Function applied 10 Oct.** Still no `pg_cron`, so it never runs | Enable pg_cron and schedule it (see migration comment) so the `docs/GDPR.md` retention periods actually apply |
| — | `practices_backup_20261009` table (10 rows, 3 with old `practiceData` incl. staff names) | Untracked duplicate of personal data, made by migration `practices_state_backup_before_tables`, which isn't in the repo. Delete once the table migration is confirmed good |
| — | **8 of 10 practices have no members** | Orphans. Signup creates a practice; deleting a user from the dashboard (not via `delete-practice`) leaves it behind with its data |
| — | Edge Function `resend-email` (v17, JWT on) | Deployed, but its code is **not in the repo**. Probably the Resend webhook (`RESEND_WEBHOOK_SECRET`). Pull its source or delete it |
| — | Function `rls_auto_enable` | Not in the repo. Likely a Supabase helper, worth confirming |
| `cookie_consents`/`page_views`: RLS on, no policies | Same, but `anon`/`authenticated` still hold **full table grants** (Supabase defaults) | RLS blocks access today. Add `revoke all ... from anon, authenticated` for defence in depth, like the other tables |
| `practice-api` | Deployed v22, `verify_jwt: false` | Fine. The function checks the token itself. Can't confirm deployed code matches the repo |

`practices.state` keys live match the code: `answers, assignments, currentDraftId, emojiMarks, modules, packages, setupComplete`. No leftover `practiceData` in live `practices`.

## Things I noticed (for the P0/P1/P2 list)

1. **Whole-blob saves.** Any manager edit rewrites all modules + assignments. Two tabs or devices give a 409 "edited elsewhere". Fine for a pilot, but it gets painful as content grows (2 MB cap).
2. **Isolation lives in code only** (see above). Option for Day 3: add RLS policies anyway, or at least a test that tries cross-practice access through the function.
3. **Plain-text temporary password in email.** A Supabase invite/magic link would be better. Probably P1, not pilot-blocking.
4. **Two migration sources.** `contact_messages` is created in `drizzle/migrations/`, everything else in `supabase/migrations/`, and `drizzle/schema.ts` is blank. The retention purge function references `contact_messages`, so order matters on a fresh database.
5. **`training_sessions` has no `created_at`.** Timestamps only live inside the JSON (`updatedAt`, `completedAt`). Retention or reporting queries will need to read the JSON.
6. **Legacy import.** `readLegacyPractice()` in `src/lib/backend.ts` still pulls old `localStorage` data (`practice-ready-store`). Decide whether to keep it for the pilot.
7. **`purge_expired_personal_data` isn't scheduled** by any migration. It has to be set up by hand with pg_cron. Live, it doesn't even exist yet (see above).
8. **Repo and live DB have drifted.** Two migrations are missing live, and one live migration plus one Edge Function are missing from the repo. Before Day 9 deploy: `supabase db pull` / `supabase migration list` and get them back in sync.
