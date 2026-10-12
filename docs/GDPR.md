# GDPR compliance record

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
| Staff name, work email | `profiles`, `auth.users` | Log in, invitations, show manager who is who | Contract / practice's legitimate interests | Until staff removed or practice deleted |
| Job role (free text) | `profiles.job_role` | Assign role-relevant modules | As above | As above |
| App role (manager/trainee) | `profiles.role` | Access control | As above | As above |
| Password | Supabase Auth only (hashed). Never in our tables | Authentication | Contract | Until user deleted |
| Assigned modules, progress, answers, scores, confidence | `training_sessions`, `practices.state` | The service itself; manager monitors progress | As above | Until staff removed or practice deleted |
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
- **Security risk to fix:** invitation emails contain a temporary password in plaintext (forced
  change on first login, 7-day expiry). Prefer Supabase `inviteUserByEmail` / magic link so no
  password travels by email. TODO (dev).
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
| Supabase | DB, auth, edge functions | Project region unrecorded here | Check dashboard region; prefer London (`eu-west-2`); sign Supabase DPA |
| Vercel | App hosting, logs | Global; US parent | Accept Vercel DPA; choose a UK/EU function region |
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
