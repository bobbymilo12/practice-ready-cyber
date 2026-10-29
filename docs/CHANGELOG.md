# Changelog

Newest entries first.

## 2026-10-29: Assignment-focused README

**Files:** `README.md`, `.gitignore`, `docs/CHANGELOG.md` (new), `docs/SETUP.md`

**What changed**
- Rewrote `README.md` around the COMP3000 assignment: title, supervisor, keywords, vision, aims,
  scope, placeholder-data ethics, project documents and key deadlines. The run commands and tech
  stack are kept, but shortened.
- Moved the "Reusable local Mock Manager baseline" instructions from the README into
  `docs/SETUP.md`, under "Local development without Supabase".
- Started this changelog, with a "Commit history" section listing my own commits from both
  repositories.

**Why**
The brief requires the repo README to state the project title, vision and supervisor, and the
final ePortfolio needs an informative README. The developer-only mock workspace detail belongs
with the other local-development notes in SETUP.md.

**How it works**
Documentation only, so no code or behaviour changed. The README links to the planning documents
(risk register, Gantt chart, checklist, supervisor notes) and the technical docs. The dates in
"Key deadlines" come from `docs/documentation-checklist.md`.

## Commit history

All commits, newest first, grouped by date. Merge commits are left out.

### Current `main`

#### 2026-10-29

- `9109f38` Restore project docs (Gantt chart, risk register, checklist, supervisor meeting)

#### 2026-10-27

- `85454f0` test: map analytics module in API and dev-backend harnesses
- `8897052` feat: platform admin page listing every practice
- `9e29743` feat: split dashboard modules into Ready to assign and Drafts cards
- `c7868cf` feat: Continue saves answers, reassign from dashboard, say 'questions'
- `797fa03` feat: simpler manager and staff dashboards for older users
- `8510382` feat: analytics portal with sign-in and module timing
- `0fcc58e` feat: shared module library across practices
- `3cb5a24` feat: GDPR risk fixes (invite links, staff erasure, consent-gated analytics, limits)

#### 2026-10-24

- `2bc527e` fix: refine training setup and Learn questions
- `b4221d5` fix: differentiate Learn + Apply training
- `fde9332` fix: improve shared training question generation

#### 2026-10-22

- `42ec8e0` fix(ci): restore @emnapi entries dropped from lock file by Windows npm
- `3d0c3d4` fix: invite orphan practices and password-change sign-in
- `df36d3d` security: pre-pilot hardening and audit record
- `2928c0b` fix: improve training generation and multi select

#### 2026-10-21

- `cd44455` feat: add mamager needs support view

#### 2026-10-19

- `335c6d3` feat: add staff lifecycle and password recovery
- `8e3b016` fix: prevent outdated training and module review

#### 2026-10-16

- `d58e487` fix: improve training copy across all module topic
- `02ba974` test: update appt quality expectations

#### 2026-10-13

- `5f98217` feat: standardise module creation and training gen

#### 2026-10-12

- `400d765` Mock data persistance
- `9383826` half way through standardising module creations
- `f4c4900` length and difficulty button added
- `a67a50e` feat: add question-level review for changed train

#### 2026-10-11

- `4e1db29` fix: add manager review flow for changed training
- `60a473a` improve: refine training question wording and dif
- `99e7a69` chore: add reusable Mock Manager test baseline

#### 2026-10-10

- `f9354ed` feat: add practice change review tracking
- `49b3e68` Module DB table
- `4222ef0` fix: confirm persistence for manager actions
- `27124fe` DB migration fix & graphify
- `74e3bdf` Update package-lock.json
- `8392215` Vercel Analytics & cookies
- `c0dc41e` GDPR
- `3780630` package lock
- `aa261ed` Cookies
- `a76e18e` Module Creation Update

#### 2026-10-09

- `f339673` Port cff40f7 from kfn8gy65fd-hash/practice-ready-hub: refine local procedures UX and appointment training generation
- `dd6e7c5` Project Overview md
- `aea7d07` Cookies
- `683c5dc` Restore optional @emnapi entries dropped from package-lock
- `3508e6a` Update README.md
- `cda6044` Graphify Update
- `fc7e77a` Remove hosted-builder tooling and build for Vercel directly
- `d6eae44` Gitignore Changes
- `d061ad2` Graphify Update
- `f3baa6f` ﻿Store practice setup data in database tables
- `75ef01d` ﻿Fix audit findings: trainee removal, contact form, saves, CI

#### 2026-10-07

- `096d98d` integrate local procedures into learn sequencing
- `b06b0dc` local procedures + practice specific booking info

#### 2026-10-06

- `df0c8e9` Build safe sequencing interaction foundation
- `0824bf8` Polish matching interaction and local role training content

#### 2026-10-05

- `c185c9b` trying to make mcq match questions

#### 2026-10-03

- `567412e` Email fixes
- `2608c87` new email fixes
- `d912cbf` 1
- `95c8c64` Change contact form to use Resend for email delivery
- `b05782a` Potentially fixed contact us form
- `8cc08b5` Login issues fixed
- `019565d` Error Fix
- `7f4d62e` Contact Update: Added new contact form submission handling and updated Supabase integration for improved authentication and client management. Updated environment variables in .env.example and revised setup instructions in docs/SETUP.md to reflect changes.

#### 2026-10-02

- `642b4db` Complete Appointment Booking Learn/Apply local question quality

#### 2026-09-30

- `ca19974` core concept library + level's added

#### 2026-09-29

- `2864678` half way to merging core gp info with local
- `af8eaaf` updated scenario and module wording

#### 2026-09-28

- `4976b91` updated module scenarios
- `469f64f` module scenarios + setup q's improved
- `550d82e` Integrate structured module creation with induction packages

#### 2026-09-27

- `5eb55a6` Fixed a bug where the practice packages were not being loaded correctly in the dev backend and the main backend. Also updated some UI text to be more clear about how trainees are assigned to modules.
- `9c476c9` updated privacy, accessibility, and contact links in the footer and contact section to point to the correct pages.
- `bc410f6` New styles for the auth page and marketing shell. Updated the marketing shell to include a new background image and adjusted the layout for better responsiveness. Added new CSS classes to improve the visual appeal of the homepage and marketing pages. Updated the about, auth, and faqs routes to reflect the new styles and ensure consistency across the application.
- `c1e2c7d` contact us page and started updating the ui

#### 2026-09-26

- `a2c859c` role and setup changes
- `a8044d8` Changes
- `03472c1` Changes
- `5d4a51a` Changes
- `2024f5c` Changes
- `924fa36` Changes
- `7e91906` Changes
- `df37f41` Test Update
- `d8b3b4d` Update supabase/functions/practice-api/index.ts and tests/api.test.mjs
- `bd5c7d7` update supabase cli to 1.79.0
- `4a41741` Route tree has been updated. .env update.
- `7e83af6` Update backend integration

#### 2026-09-24

- `7d96210` Update Practice Setup role configuration and UX
- `cb07330` Changes
- `860a987` Changes
- `6168349` Changes
- `b8965a9` Changes
- `8530295` Changes
- `04caf35` Changes
- `5f8617b` Changes
- `7f72e83` Changes
- `b793b4f` Changes
- `98bba18` Changes

#### 2026-09-22

- `c1a5c2f` new setup and ui
- `b579878` Changes
- `62cfbeb` Changes
- `0d9ee8c` Changes
- `035481c` Work in progress

#### 2026-09-21

- `6513530` Trainee Basic SIde
- `71bd942` dev mode
- `a3b3f00` finished trainee journey
- `6651b09` trainee setup
- `0aea0ac` Updated

#### 2026-09-16

- `5b907f8` Changes
- `1992d78` Changes
- `9ff4115` Changes
- `f40edc8` Changes
- `85f44d2` Changes
- `124654a` Changes
- `82458e2` Changes
- `628a6a6` Changes
- `0256733` Changes

#### 2026-09-15

- `42a1d16` Changes
- `20df34f` Changes
- `f1702ff` Changes
- `0af2be7` Changes
- `9cb4fa6` Changes

#### 2026-09-14

- `53d87d1` Changes
- `d9fb2b6` Changes
- `4f38e4b` Changes
- `f617b83` Changes
- `da52b63` Changes
- `b356519` Changes
- `587a219` Changes
- `be3114d` Changes
- `ab5e0ca` Changes

#### 2026-09-13

- `7fb907e` Changes
- `1d2a061` Changes
- `d31d790` Work in progress
- `481bbeb` Add project README

#### 2026-07-13

- `d8e1470` Changes
- `815b324` Changes
- `44acc64` Changes
- `2e3b0c1` Work in progress
- `960aa15` Changes
- `3664b45` Changes
- `4fb943a` Changes
- `bf66ce1` Changes
- `7b06fcc` Changes
- `262ce3f` Changes
- `df3d2e2` Changes
- `c2b259d` Changes
- `d5ac329` Changes
- `aa5fd0d` Changes
- `5166075` Changes
- `48663bc` Changes
- `cff36aa` Work in progress

#### 2026-07-12

- `4ed9b3c` Changes
- `946848b` Changes
- `5669da0` Changes
- `f5dd2b1` Changes
- `096b429` Changes
- `cf72ac0` Changes
- `5617345` Changes
- `f3d7541` Changes
- `c772e5d` Changes
- `42a4bc0` Changes
- `3b01ea5` Changes
- `201055d` Changes
- `0d650d7` Changes
- `38b3bf2` Changes
- `ca3f7d0` Changes
- `9fe8097` Changes
- `643d8a4` Changes

#### 2026-07-09

- `c65f860` Changes
- `699a64e` Changes
- `af2161a` Changes
- `bf624d6` Changes
- `ea9348e` Changes
- `ffa5df8` Changes
- `083f151` Changes
- `903152f` Changes
- `f5c85b8` Changes
- `a1ee733` Work in progress

#### 2026-07-08

- `64b21ba` Changes
- `f84c464` Changes
- `7f48601` Changes
- `2fd1893` Work in progress

#### 2026-07-07

- `152f50a` Changes
- `c75b4d1` Changes
- `2e3ec6d` Changes
- `f977931` Work in progress

#### 2026-07-01

- `6ef52b9` template: tanstack_start_ts_current-6f0053eadbb1

### Earlier practice-ready-cyber history (`backup/old-main`)

#### 2026-10-13

- `a181356` Gantt Chart Update & Risks
- `ed2fe34` Remove unneeded information
- `b7f36fe` Practice setup strip down
- `8bcd4b9` Existing module removal
- `1d4e197` Gantt Chart and checklist

#### 2026-10-12

- `42d4412` Update .gitignore
- `d705266` Transferred code from local to repo
- `47aee8e` Initial commit
