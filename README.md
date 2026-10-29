# PracticeReady Cyber

**COMP3000 Computing Project (2026/27)** · **Supervisor:** Dr Muhammad Asad

Scenario-based social engineering and UK GDPR training for GP reception staff.

**Keywords:** social engineering, pretexting, identity verification, UK GDPR, healthcare cyber security, security awareness training

## Vision

GP reception teams are the first point of contact for patients, which makes them the first target
for social engineering. Callers pose as patients, relatives or other professionals and use
pretexting, impersonation and urgency to get confidential health data. Most data protection
training is a yearly slideshow, not a rehearsal of the actual conversations.

PracticeReady Cyber lets reception staff practise realistic phone and front-desk scenarios, so they
learn to spot and handle attempts to obtain patient data. A practice manager describes how their
practice works, the app generates training modules from that configuration, trainees answer them,
and the manager reviews the results.

## Aims

- Train the human layer of security: pretexting, impersonation, urgency pressure and phishing.
- Teach staff to apply the correct identity checks before releasing information.
- Make progress measurable: every answer is scored, with a confidence rating, so managers can
  track improvement over time.
- Keep generated content safe: questions come from deterministic generators, never invent local
  facts, and stay draft until a manager approves them.

## Scope

- **Roles:** manager (sets up the practice, builds and assigns training, reviews results) and
  trainee (completes assigned modules).
- **Question types:** multiple choice, matching and ordering steps, each with a confidence rating.
- **Training areas:** social engineering calls, identity verification, and phishing and email.

## Ethics and data

The platform uses **placeholder data only**. All patients, callers and practices are fictional.
No real patient data is stored and no real users take part in testing, so evaluation is based on
automated tests and scenario walkthroughs rather than user studies. This is discussed in the
report's legal, social, ethical and professional (LSEP) section.

## Project documents

| Document | Purpose |
| --- | --- |
| [Supervisor meeting 1](docs/supervisor-meeting-1.md) | Project idea, plan and questions for the supervisor |
| [Risk register](docs/risk-register.md) | Risks scored by likelihood and impact, with mitigations |
| [Gantt chart](docs/gantt-chart.pdf) | Sprint plan ([HTML](docs/gantt-chart.html), [image](docs/gantt-chart.png)) |
| [Documentation checklist](docs/documentation-checklist.md) | Assignment deliverables and deadlines |
| [Changelog](docs/CHANGELOG.md) | What changed, when and why |

### Key deadlines

| Deliverable | Deadline |
| --- | --- |
| Project initiation (PID) | 9 Nov 2026 |
| Poster draft / print-ready | 8 Mar / 5 Apr 2027 |
| Project ePortfolio (report, video, software) | 4 May 2027 |
| Showcase | 6 May 2027 |
| Viva | Week of 10 May 2027 |

## Technical documentation

- [Project overview](docs/PROJECT-OVERVIEW.md): users, journeys, architecture and code map
- [Backend map](docs/BACKEND-MAP.md)
- [Setup and deployment](docs/SETUP.md), including local development without Supabase
- [Security](docs/SECURITY.md) and [GDPR](docs/GDPR.md)
- [Core training library](docs/CORE-TRAINING.md) and [predefined module creation](docs/predefined-module-creation.md)
- [Product review](docs/PRODUCT-REVIEW.md)

## Running it locally

```sh
npm i
npm run dev      # http://localhost:8080
npm test
```

Without a `.env.local`, local development uses mock Manager and Trainee accounts (see
[docs/SETUP.md](docs/SETUP.md#local-development-without-supabase)). Copy `.env.example` to
`.env.local` to connect a real Supabase project.

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

- **Frontend:** React 19 + TypeScript, TanStack Start and Router, Zustand, Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, row-level security) with one Edge Function, `practice-api`
- **Hosting:** Vercel
- **Email:** Resend, for invitations and the contact form
- **Testing:** Node's built-in test runner, Playwright, GitHub Actions CI
