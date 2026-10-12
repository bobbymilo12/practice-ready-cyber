# PracticeReady — project overview

PracticeReady is scenario-based onboarding for GP reception and admin teams. A practice manager
describes how their practice works (team, appointments, prescriptions, safety, local procedures);
the app turns that into short interactive training modules; trainees practise them and the manager
reviews their progress. AI-generated or auto-generated content stays draft until a manager approves it.

For setup, commands and the tech stack, see the [README](../README.md).

## Who uses it

| User | What they do | Main routes |
| --- | --- | --- |
| Visitor | Learns about the product, contacts the team | `/`, `/about`, `/faqs`, `/contact` |
| Manager | Sets up the practice, builds modules, invites and monitors trainees | `/practice/setup`, `/data-hub`, `/modules/*`, `/dashboard`, `/trainees/*`, `/results` |
| Trainee | Completes assigned modules | `/staff`, `/train` |

`/auth` handles log in, practice registration and accepting invitations. `AccountGate`
(`src/components/AccountGate.tsx`) sends signed-in users to the right area for their role.

## Main journeys

1. **Practice setup** (`/practice/setup`) — a guided, resumable wizard: practice basics → team →
   bookings → prescriptions → safety → review. Saved details can be edited later in `/data-hub`.
2. **Module creation** (`/modules/create` → `/modules/setup` → `/modules/review`) — the manager
   picks a predefined topic or a custom module. Questions are generated from the practice's saved
   configuration plus the source-controlled core library, then reviewed and approved as drafts.
   `/modules/merge` combines modules.
3. **Training** (`/staff` → `/train`) — trainees answer multiple-choice, matching
   (`MatchingBoard`) and ordering (`SequenceBoard`) questions, with confidence ratings.
4. **Monitoring** (`/dashboard`, `/trainees/$id`, `/results`) — the manager invites trainees
   (`/trainees/invite`, emailed via Resend) and reviews scores and progress.

## Architecture

```
Browser (React 19, TanStack Router/Query, Zustand)
   │  src/lib/store.ts  ← client state (useApp)
   │  src/lib/backend.ts ← talks to Supabase
   ▼
Supabase Auth ──► Edge Function `practice-api` (Deno, supabase/functions/practice-api)
                   actions: load, save-practice, invite, remove-trainee, start, answer,
                   confidence, previous, continue, submit, password
                   ▼
                 Postgres with row-level security

TanStack Start server (Nitro on Vercel)
   /api/contact           → contact form → contact_messages table + Resend email
   /api/resend-receiving  → verified Resend webhook that forwards inbound mail
```

Without Supabase environment variables, local development uses mock Manager/Trainee accounts
(`src/lib/dev-backend.ts`, `src/lib/dev-mode.ts`, workspace in `localStorage`, mock role in `sessionStorage`).

### Database tables

- `supabase/migrations/`: `practices`, `profiles`, `training_sessions`, `practice_settings`,
  `practice_roles`, `practice_staff`, `practice_requests`, `practice_local_procedures`,
  `role_templates`
- `drizzle/`: `contact_messages`

## Code map

| Path | Contents |
| --- | --- |
| `src/routes/` | File-based routes ([conventions](../src/routes/README.md)); `__root.tsx` is the app shell |
| `src/components/` | Feature components: setup steps (`TeamFields`, `RolesStep`, `SafeguardingFields`, `LocalProcedures`, `SameDayRequests`…), question UIs (`ModuleQuestion`, `MatchingBoard`, `SequenceBoard`), shells (`Shell` for the app, `MarketingShell` for public pages), `CookieBanner` |
| `src/components/ui/` | shadcn/ui primitives |
| `src/lib/store.ts`, `backend.ts` | Client state (`useApp`, `PracticeData`) and backend calls |
| `src/lib/practice-*.ts`, `role-*.ts` | Practice configuration, roles, staff requests and role matching |
| `src/lib/core-*.ts`, `appointment-*.ts` | Core appointment-booking training library and question generation ([CORE-TRAINING](CORE-TRAINING.md)) |
| `src/lib/module-config*.ts`, `training*.ts`, `scenario-applications.ts` | Module settings and scenario generation (`configuredScenarios`) |
| `src/lib/sequence.ts`, `matching-interaction.ts`, `local-procedure*.ts` | Ordering, matching and local-procedure question logic |
| `src/lib/contact*.ts`, `resend-receiving.ts` | Contact form and inbound email |
| `supabase/` | Edge Function, SQL migrations, config |
| `tests/` | Node unit tests (`npm test`), Playwright browser tests in `tests/browser/`, shared fixtures |
| `scripts/check-backend.mjs` | Read-only check of the deployed backend |

## Legal and compliance pages

Public pages use `MarketingShell`, whose footer links to Privacy (`/privacy`), Cookies
(`/cookies`), Terms (`/terms`) and Accessibility (`/accessibility`), plus a "Cookie settings"
button. `CookieBanner` (mounted in `__root.tsx`) shows on first visit and stores the choice in
`localStorage` under `cookie-consent`. Only strictly necessary storage is used today; anything
optional (analytics etc.) must read that choice before loading and be added to the cookie table.

The privacy notice names Supabase, Vercel and Resend as processors. The legal entity, address,
retention periods and Supabase region still need confirming before launch, and the Terms page is
still a draft.

## Other docs

- [Setup and deployment](SETUP.md)
- [Contact form](CONTACT.md)
- [Core training library](CORE-TRAINING.md)
- [Predefined module creation](predefined-module-creation.md)
- [Sequencing stage 1](SEQUENCING-STAGE1.md)
- [Matching local check](MATCHING-LOCAL-CHECK.md)
- [Marketing photography](PHOTOGRAPHY.md)
- [Product review](PRODUCT-REVIEW.md)
