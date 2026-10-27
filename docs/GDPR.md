Accepted |

Working record of how PracticeReady meets UK GDPR / DPA 2018. Items marked **TODO (owner)** need a
human decision or a real-world action; everything else describes what the code does today.
Review whenever a table, supplier or free-text field is added.

## 1. Roles

- **Practice** = controller of its staff training data. **PracticeReady** = processor (acts on the
  practice's instructions).
- **PracticeReady** = controller for website visitors, enquiries, cookie/analytics data and its own
  account administration.
- TODO (owner): confirm this split with the first real practice and record it in the DPA (section 9).

## 2. Data map

| Data | Where | Why needed | Lawful basis | Retention |
| --- | --- | --- | --- | --- |
| Staff name, work email | `profiles`, `auth.users` | Log in, invitations, show manager who is who | Contract / practice's legitimate interests | Until practice deleted (deactivation keeps the record; TODO (owner): per-person erasure route) |
| Deactivation time | `profiles.inactive_at` | Block access while keeping training history | As above | As above |
| Manager action log (actor id, action, target id, time) | `audit_events` | Accountability for deactivation, withdrawal, publication | Legitimate interests | Until practice deleted |
| Job role (free text) | `profiles.job_role` | Assign role-relevant modules | As above | As above |
| App role (manager/trainee) | `profiles.role` | Access control | As above | As above |
| Password | Supabase Auth only (hashed). Never in our tables | Authentication | Contract | Until user deleted |
| Assigned modules, progress, answers, scores, confidence | `training_sessions`, `practices.state` | The service itself; manager monitors progress | As above | Until practice deleted |
| Practice settings, roles, local procedures | `practice_*` tables | Generate training | Contract | Until practice deleted |
| Staff names in `practice_staff` (name, role, clinics, legacy `notes`) | `practice_staff` | Legacy team list; **names appear in generated scenarios** | Legitimate interests | Until practice deleted |
| Enquiry name, email, message | `contact_messages` | Reply to enquiries | Legitimate interests | 24 months (purge function) |
| Cookie consent choice | `cookie_consents` | Proof of consent (Art. 7(1)) | Legal obligation | 3 years (purge function) |
| Page views (random visitor id, path, referrer host) | `page_views` | Analytics, only after consent | Consent | 13 months (purge function) |
| IP address, server logs | Vercel / Supabase logs | Security | Legitimate interests | Supplier log retention; privacy notice says up to 90 days |

**Not collected:** phone (the API returns `phone: ""`), date of birth, address, special-category
data, patient data.

Removed / to remove: nothing needs removing from the schema. `practice_staff.notes` is a legacy
free-text field that is no longer editable in the UI; managers should review and clear any content
in it (TODO owner: one-off query for non-empty `notes` across practices).

## 3. Patient data

PracticeReady must not hold patient-identifiable information.

- Notice shown on `/practice/setup` and `/data-hub` (the screens with free-text fields).
- Privacy notice and Terms already state it.
- TODO (owner): add the same line to the Terms acceptable-use clause and the DPA; decide whether to
  add automatic detection of NHS-number-shaped strings (10 digits) in `save-practice`. Not built:
  it would only catch one pattern and give false assurance.

Free-text fields (risk of unintended personal data): local procedures, practice-process fields,
staff names in scenarios, legacy staff notes, contact form message (max 2000 chars).

## 4. Authentication and access control

- Passwords are handled by Supabase Auth; the app never stores them. Minimum 12 characters.
- All 9 tables plus cookie/contact tables have RLS enabled. The app tables grant nothing to
  `anon`/`authenticated`, so only the `practice-api` Edge Function (service role) can touch them.
  `contact_messages` allows INSERT only.
- Isolation is enforced in the Edge Function: every query is filtered by the caller's
  `profiles.practice_id`, taken from the verified JWT, never from the request body. Tests in
  `tests/api.test.mjs` cover: trainees blocked from manager actions, trainees see only their own
  assignments/sessions, and a manager cannot remove or list another practice's trainees.
- Known weakness (design trade-off): because the Edge Function uses the service role, RLS is not
  the second line of defence for practice isolation. TODO (owner): consider per-practice RLS
  policies (`practice_id = auth.jwt() -> app_metadata -> practice_id`) if direct client access is ever added.
- Invitations email a one-time set-password link (R1); no password travels by email. Older invitations that carry a temporary password stay valid until the 7-day expiry.
- TODO (owner): confirm in Supabase/Vercel dashboards: HTTPS-only, secrets only in function/Vercel
  env (never `VITE_`), automatic backups enabled and their retention, MFA on supplier accounts.

## 5. Retention and deletion

- `public.purge_expired_personal_data()` (migration `202610100002`) deletes expired visitor/enquiry
  rows. TODO (owner): schedule it (pg_cron line in the migration header).
- **Staff removal:** manager > Trainees > Remove (`remove-trainee`): deletes the auth user, which
  cascades to profile and training sessions, and strips assignments.
- **Practice deletion:** manager > Practice information > Delete practice (`delete-practice`):
  deletes all logins, profiles, sessions and settings for that practice. Typed confirmation required.
- Backups keep deleted data until they roll off. TODO (owner): state backup retention in the
  privacy notice once known.
- Practice account closure by email is handled by the owner running the same deletion.
  TODO (owner): verify the requester is the practice manager first.

## 6. Data-subject rights (access, correction, deletion, restriction)

Requests arrive at practicereadyuk@gmail.com. Respond within one month.

1. Log the request (date, who, what) in a private tracker.
2. Verify identity (reply from the registered work email).
3. If the person is practice staff, the practice is controller: tell the practice manager and act on their instruction, unless the practice has asked us to handle it.
4. Access: export that person's `profiles` row and `training_sessions` rows (SQL editor, filter by user id).
5. Correction: manager edits via the app, or owner edits `profiles`.
6. Deletion: use `remove-trainee` / delete the auth user.
7. Restriction: set the account aside by removing assignments; do not delete.
8. Record the outcome and date.

No self-service export exists. At current scale this manual process is enough. Build
a one-click export if requests become frequent.

## 7. Breach procedure

1. **Contain**: revoke leaked keys (Supabase service key, Resend key), rotate secrets, disable the affected account or function.
2. **Record** what happened, when discovered, which practices/people, which data. Keep a breach log even for non-notifiable breaches.
3. **Assess risk to individuals** (work emails and training scores are low risk; leaked patient data or credentials are higher).
4. **Notify the ICO within 72 hours of becoming aware** if there is a risk to individuals: 0303 123 1113 / ico.org.uk. Notify affected individuals without undue delay if the risk is high.
5. **Tell each affected practice immediately** (as processor we must notify the controller without undue delay; promise "within 24 hours" in the DPA).
6. **Fix and review**: root cause, change, add a test.

## 8. DPIA screening

Large-scale special category data: no. Systematic monitoring: limited (training scores visible to
the employer). Vulnerable subjects: staff in an employment relationship (power imbalance). Innovative
tech/profiling: no automated decisions. Conclusion: **a full DPIA is probably not mandatory**, but
because employee performance data is shown to managers, complete a short DPIA and keep it. Many
practices' IG teams will ask for one.
TODO (owner): fill the ICO DPIA template with this document as the data map; supply the
DSPT answers and any DCB0129 / PCN IG questionnaire if asked.

## 9. Contract with practices

TODO (owner, legal): Data Processing Agreement covering the Article 28(3) terms: instructions,
confidentiality, security, sub-processors (list in section 10, notify changes), assistance with
data-subject requests, deletion/return at end, audits, breach notification (24h).
Reference it from the Terms (`/terms`, still a draft).

## 10. Processors and transfers

| Supplier | Purpose | Location | TODO (owner) |
| --- | --- | --- | --- |
| Supabase | DB, auth, edge functions | Ireland (`eu-west-1`), EEA, covered by UK adequacy | Sign Supabase DPA |
| Vercel | App hosting, logs | London (`eu-west-2`, `lhr1`); US parent | Accept Vercel DPA; confirm logs and Analytics processing stay in region |
| Resend | Invitation and contact email | US/EU | Accept Resend DPA; confirm region |
| Google (Gmail) | Inbound contact mail | US/EU | Covered by Google Workspace terms |

Transfers outside the UK rely on UK adequacy regulations, the IDTA or the UK Addendum
(already stated in the privacy notice). Confirm each supplier's DPA includes them.

## 11. ICO data protection fee

Most organisations that process personal data must pay the ICO fee (£52 or £78 a year for micro and
small organisations, £3,763 for large; check current amounts). Limited exemptions (e.g. purely
personal use, some not-for-profit) are unlikely to apply to a company selling a service.
TODO (owner): run the ICO self-assessment (ico.org.uk/fee-self-assessment), register, pay, and
record the registration number here. **Registration number: ______**

## 12. Evidence to show a GP practice

Privacy notice (`/privacy`), cookie policy and consent log, this record, supplier DPAs, DPIA,
breach and DSR procedures, RLS/isolation tests (`npm test`), ICO registration number.

## 13. Risk register

Raised by the GDPR check on 2026-10-26. Update **Status** as each one is closed; add new risks at the
bottom. Items already tracked as TODOs above are cross-referenced, not duplicated.

| ID | Sev | Risk | Article | Fix | Status |
| --- | --- | --- | --- | --- | --- |
| R1 | High | Invitation email contains a temporary password in plaintext (`practice-api/index.ts`, section 4) | 5(1)(f), 25, 32 | Invite email now carries a one-time set-password link; no password is sent. New `activate` action in `practice-api`. Deploy the function and set Supabase Auth email link expiry (Auth > Email) to 24h. Old invitations with temporary passwords still work until they expire | Fixed in code, deploy pending |
| R2 | High | No Art. 28 DPA with practices; Terms still a draft (section 9) | 28(3) | Draft written at `docs/DPA-draft.md`. Solicitor review, then link from `/terms` and sign before first real practice | Draft ready |
| R3 | High | Supplier DPAs and transfer terms unconfirmed (section 10) | 28, 44-46 | Regions confirmed 2026-10-27 (Vercel London, Supabase Ireland) and `/privacy` updated. Still to do: sign Supabase, Vercel and Resend DPAs, confirm Resend region, add sub-processor list | Partly done |
| R4 | High | No per-person erasure or anonymisation; deactivated staff keep name, email and answers until practice deleted (sections 2, 5) | 17, 18 | `erase-staff` action and Erase button (deactivated staff only, type ERASE). Deletes login and profile; training rows stay, unlinked. Apply `202610270002_staff_erasure.sql` first | Fixed in code, migration pending |
| R5 | High | `purge_expired_personal_data()` not scheduled, so published retention limits are not enforced (section 5) | 5(1)(e) | Migration `202610270001_schedule_retention_purge.sql` written. Apply it to live, then check `cron.job` | Ready to apply |
| R6 | Med | Data-subject requests are fully manual; no requester verification step for practice closure (sections 5, 6) | 12, 15, 20 | Export script added at `scripts/dsar-export.sql`; identity check is step 2 of section 6. Still to do: verify the requester is the practice manager before a closure (section 5) | Partly done |
| R7 | Med | Manager sees staff scores/answers; DPIA not completed and staff not told (section 8) | 35, 13, 88 | Trainee notice added to the results page. Still to do: complete ICO DPIA template | Partly done |
| R8 | Med | Free-text fields (`practice_staff.notes`, local procedures) may hold patient or unintended personal data (section 3) | 5(1)(c), 9 | Terms, privacy notice and contact form already carry the no-patient-data line. `scripts/dsar-export.sql` has the query to find non-empty `notes`; clear them, and add the clause to the DPA | Partly done |
| R9 | Med | No rate limiting on contact, consent and page-view endpoints; any UUID accepted as `visitorId` | 32 | DB triggers cap page views, consents and enquiries (`202610270003_public_endpoint_limits.sql`). Turnstile on the contact form not added yet (needs a site key) | Partly done |
| R10 | Med | Backup and log retention unrecorded; `/privacy` says logs up to 90 days without evidence | 5(1)(e), 13 | Supabase Free has no backups; `/privacy` now says so. Any manual `supabase db dump` is a backup: store encrypted and delete within a set period (decide N). Moving to Pro would need the notice changed | Partly done |
| R11 | Med | ICO fee registration number blank (section 11) | DPA 2018 charges regs | Self-assess, pay, record number | Open |
| R12 | Low | `<Analytics />` (Vercel) loads regardless of banner choice while banner says analytics need permission (`__root.tsx`, `CookieBanner.tsx`) | PECR reg. 6, 5(1)(a) | Vercel Analytics now loads only after Accept all; `/cookies` and `/privacy` updated to match | Fixed |
| R13 | Low | Consent log links `visitor_id` to accept/withdraw events | 7(1) | Accept; note in RoPA | Accepted |
| R14 | Low | Sidebar UI cookie (`ui/sidebar.tsx`) may not be listed in the `/cookies` essential table | PECR reg. 6 | `SidebarProvider` is not used anywhere, so no cookie is set. Delete the file if never needed | Closed (not in use) |
| R15 | Low | `audit_events` kept until practice deleted, no stated period | 5(1)(e) | Kept until the practice is deleted, as an accountability record. Stated in section 2 | Accepted |
| R16 | Low | Legacy `practice-ready-store` localStorage import still in `backend.ts` | 5(1)(c) | Import code, dashboard button and `/cookies` row removed | Fixed |

Order of work: R1, R2, R3, R5 before any real practice joins; R4 and R7 next; the rest during the pilot.

## 14. Remaining checklist

Updated 2026-10-27. Tick items as they are done and update the risk register (section 13) to match.

### Before any real practice joins
- [ ] Confirm the live Supabase project (only one is visible, "COMP3000 Cyber", paused) and restore it if needed
- [ ] Take a manual `supabase db dump` first (Free plan has no backups); store it encrypted outside the repo
- [ ] Apply migrations 11-13 in order (`docs/SECURITY.md` section 2): purge schedule, staff erasure, public rate limits
- [ ] Check the purge job exists: `select * from cron.job`
- [ ] Deploy `practice-api` (new `activate` and `erase-staff` actions) and the web app
- [ ] Set Supabase Auth email link expiry to 24h (Auth > Email)
- [ ] Test one real invite end to end: email arrives, link sets a password, login works, expired link is resent. Check an email scanner does not consume the link
- [ ] Test Erase on a deactivated test user: login gone, training rows remain unlinked
- [ ] Have a solicitor review `docs/DPA-draft.md`, fill the brackets, link it from `/terms`, and finish the Terms
- [ ] Sign the Supabase, Vercel and Resend DPAs; confirm Resend's region; add a sub-processor list
- [ ] Confirm Vercel log and Analytics processing stays in the UK/EU region
- [ ] Pay the ICO fee and record the registration number in section 11

### During the pilot
- [ ] Complete the ICO DPIA using this file as the data map; keep it with the evidence pack
- [ ] Run the `practice_staff.notes` query in `scripts/dsar-export.sql` and clear any content
- [ ] Decide how long manual database dumps are kept, then state it in `/privacy`
- [ ] Add Cloudflare Turnstile to the contact form (needs a site key)
- [ ] Add the no-patient-data clause to the DPA once drafted
- [ ] Add a requester check before closing a practice account (section 5)
- [ ] Rerun `scripts/security-check.mjs` after deploy; run the manual items in `docs/SECURITY.md` section 4
- [ ] Remove the "Temporary password" login branch in `auth.tsx` once all old invitations have expired (7 days after deploy)
- [ ] Delete `src/components/ui/sidebar.tsx` if it stays unused

### Review
- [ ] Re-run `/gdpr-check` after any new table, supplier or free-text field
- [ ] Review this register and the cookie policy version at least yearly
