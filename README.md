# PracticeReady

Scenario-based onboarding for GP reception and admin teams. Managers turn local processes into short
interactive training modules; trainees practise them and managers review results.

## Getting started

```sh
npm i
npm run dev      # http://localhost:8080
npm test
```

Copy `.env.example` to `.env.local` and fill in the Supabase public values. Without them, local
development still works with mock Manager/Trainee accounts. Real accounts, the Edge Function and
email are set up in [docs/SETUP.md](docs/SETUP.md).
AI-generated content stays draft until a manager approves it.

### Reusable local Mock Manager baseline

On localhost development, a fresh **Mock Manager** workspace loads the agreed visual-test
configuration: Doctor and Nurse Practitioner responsibilities and the three-step UTI procedure.
This is test data, not clinical guidance. Other practice settings are blank, with no staff or
generated modules. Existing mock workspaces are reused without overwriting edits.

Mock Manager includes Jamie Example (Mock Trainee), using the same identity as the Mock Trainee
login. Loading an older Manager workspace adds Jamie only if missing, preserving existing data.
No modules are assigned automatically. Refresh Mock Manager, then on a published module click
**Assign to employees → Jamie Example (Mock Trainee) → Assign**. Switch to Mock Trainee in the
same browser tab to start that training; no invitation or workspace reset is needed.

To reset, open browser developer tools while in the local mock session, go to **Application →
Local Storage → your local app origin**, delete only `practiceready-dev-workspace-v1`, then
reload. This discards that mock workspace's edits, modules and attempts and reloads the baseline.
The equivalent browser-console command is:

```js
localStorage.removeItem("practiceready-dev-workspace-v1");
location.reload();
```

The baseline is only loaded for a fresh Mock Manager workspace. Mock Trainee retains its existing
demo when started first; to use the Manager baseline, switch to Mock Manager and reset as above.
Real authenticated accounts continue loading their own Supabase practice; this seed is never
imported into a database. Browser-session edits do not update the baseline in source.


| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (Vercel output) |
| `npm run typecheck` | Type-check the app and the Edge Function |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright browser tests (run `npx playwright install chromium` once first) |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run backend:check` | Read-only check of the deployed Supabase backend |

## Tech stack

**Frontend**
- React 19 + TypeScript
- [TanStack Start](https://tanstack.com/start) (SSR) with TanStack Router (file-based routes in `src/routes/`)
- TanStack Query for server state, Zustand for client state
- Tailwind CSS v4 + shadcn/ui (Radix UI) components in `src/components/ui/`
- react-hook-form + Zod for forms and validation
- lucide-react, sonner, Recharts, date-fns, embla-carousel, vaul, cmdk
- Inter and Plus Jakarta Sans via Fontsource

**Build and hosting**
- Vite 8, with Nitro producing the server build
- Hosted on Vercel (Nitro `vercel` preset)

**Backend**
- Supabase: Postgres, Auth and row-level security
- Supabase Edge Function `practice-api` (Deno) in `supabase/functions/`
- Drizzle ORM / drizzle-kit for schema and migrations in `drizzle/` (uses `DATABASE_URL`)
- Resend for invitation and contact-form email

**Tooling**
- npm
- Node's built-in test runner for unit tests, Playwright for browser tests in `tests/browser/`
- ESLint, Prettier, `tsc`
- GitHub Actions CI: `npm ci`, type-check, tests (Node 22)

## Docs

- [Project overview](docs/PROJECT-OVERVIEW.md) — users, journeys, architecture and code map
- [Setup and deployment](docs/SETUP.md)
- [Contact form](docs/CONTACT.md)
- [Core training library](docs/CORE-TRAINING.md)
- [Predefined module creation](docs/predefined-module-creation.md)
- [Product review](docs/PRODUCT-REVIEW.md)
