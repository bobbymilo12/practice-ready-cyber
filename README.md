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

- [Setup and deployment](docs/SETUP.md)
- [Contact form](docs/CONTACT.md)
- [Product review](docs/PRODUCT-REVIEW.md)
