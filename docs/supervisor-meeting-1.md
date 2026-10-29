# Supervisor meeting 1: project overview

**Project:** PracticeReady Cyber, scenario-based social engineering and data protection training for GP reception staff
**Module:** COMP3000 (2026/27) · **Supervisor:** Dr Muhammad Asad · **Date:** October 2026

## The idea in one line

A web platform where GP reception staff practise realistic phone and front-desk scenarios so they learn to spot and handle social engineering attempts on patient data.

## The problem

- Reception teams are the first point of contact for patients, which makes them the first target for social engineering.
- Callers pose as patients, relatives or other professionals and use pretexting, impersonation and urgency to get confidential health data.
- Staff are busy and rarely get realistic practice. Most data protection training is a yearly slideshow, not a rehearsal of the actual conversations.

## Why this project (my reasoning so far)

- **It fits a security degree.** The focus is the human layer: social engineering, identity verification and UK GDPR, not just building a web app.
- **It's practical and testable.** Rehearsing real conversations builds habits better than reading policy. Scenario answers can be scored, so progress can be measured over time.
- **Placeholder data only.** All patients, callers and practices are fictional. No real patient data is stored and no real users take part in testing. This avoids ethics approval and NHS data issues, and I'll justify it in the report's legal, social, ethical and professional section.

## What I plan to build

Three core training modules:
1. **Social engineering calls:** spot pretexting, impersonation and urgency pressure.
2. **Identity verification:** apply the right checks before releasing information.
3. **Phishing and email:** recognise malicious messages aimed at the practice.

Plus manager features: assign modules, score attempts and track progress over time. Two roles: **manager** (sets up and assigns training) and **trainee** (completes it). Question types: multiple choice, matching and ordering steps, with a confidence rating on each answer.

**Code and tech stack** (repo: `practice-ready-cyber`):
- **Frontend:** React 19 with TanStack Start and Router 
- **Backend:** Supabase, with Postgres row-level security, auth and edge functions 
- **Hosting:** Vercel
- **Testing:** Node unit tests and Playwright browser tests

## Plan and expectations

- Two-week sprints, each ending with a supervisor meeting and a sprint diary entry (Gantt chart attached).
- **Sprint 0 (now until 9 Nov):** title, vision, literature review, LSEP and UK GDPR, risk assessment, backlog, then the PID.
- **Sprints 1–6 (Nov–Feb):** app skeleton with auth and roles, scenario question engine, the three modules, then manager scoring and progress.
- **Sprints 7–10 (Feb–Apr):** security hardening (RLS, auth), accessibility and evaluation, feature freeze, demo build.
- **Evaluation:** automated tests and scenario walkthroughs, not user studies, because the project uses placeholder data only.

## Next steps (before the next meeting)

- [ ] Finalise the title, vision and keywords
- [ ] Start the literature review: social engineering in healthcare, pretexting, phishing, NHS DSPT and UK GDPR
- [ ] Draft the risk assessment and initial product backlog
- [ ] Give you access to the GitHub repo
- [ ] Start the sprint diary

## Questions for you

1. Is the scope right: three modules, or should I go deeper on one or two?
2. Is evaluation through automated tests and walkthroughs enough, or would you expect some user feedback (for example from peers using fictional scenarios)?
3. Which literature or frameworks would you point me to first?
4. How often would you like to meet, and what would you like to see at each meeting?
