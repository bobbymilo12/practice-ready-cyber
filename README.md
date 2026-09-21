# Practice Ready Hub

Build a professional web app called PracticeReady.

PracticeReady is a scenario-based onboarding platform for GP reception and admin teams. It helps practices turn local processes into short interactive training modules for new reception/admin staff.

The app should have two user roles:

Manager

Staff trainee

The app should feel clean, professional, trustworthy and suitable for GP practices. Use a white background, dark navy text, soft blue/green accents, rounded cards, simple navigation and a calm healthcare/education style. Do not use the NHS logo. Do not describe the product as NHS-approved, certified, clinically validated or a replacement for mandatory training.

Core pages:

Landing page

Manager dashboard

Create module

AI setup assistant

Draft scenarios review

Staff training module

Results page

Landing page:

Headline: Scenario-based onboarding for GP reception teams

Subheadline: PracticeReady helps new reception/admin staff practise realistic situations before they take live calls.

Include safety note: PracticeReady supports local onboarding and does not replace statutory or mandatory training, clinical protocols or manager judgement.

Button: Start demo

Manager dashboard:

Show cards for:

Create new module

Draft modules awaiting review

Published modules

Staff completion

Include sample stats:

3 draft scenarios

1 module published

4 trainees invited

Create module page:

Ask manager to choose module type:

First week on reception

Appointment booking

Prescription requests

Test results and confidentiality

Urgent symptoms and escalation

Difficult calls

Custom module

AI setup assistant page:
Create a guided form/chat-style flow that asks the manager questions:

What role are you training?

What are the top things new starters struggle with?

What common patient calls should they practise?

What local rules should the training include?

Who handles key appointment types?

What should staff escalate immediately?

What should staff never promise?

What tone or phrases should staff use with patients?

After the manager answers, add a button:
Generate draft scenarios

For now, simulate AI generation using sample outputs. The generated content should appear as draft scenario cards.

Draft scenarios review page:
Show AI-generated draft scenario cards with:

Scenario title

Patient quote

Question

Option A

Option B

Best answer

Learning point

Status: Requires manager review

Buttons: Approve, Edit, Regenerate, Delete

Use example scenario:
Title: Repeat prescription request
Patient quote: “I’ve run out of my repeat medication. Can the doctor do it today?”
Question: What should the receptionist do?
Option A: Promise the patient it will be issued today.
Option B: Follow the practice’s repeat prescription process, explain expected timescales, and escalate if there is a clinical concern.
Best answer: Option B
Learning point: Reception staff should avoid promising immediate prescriptions unless the practice protocol allows it. The correct response depends on the local repeat prescription process and whether the situation needs escalation.

Staff training module page:
Show approved scenarios one at a time, like a clean training quiz. After the trainee selects an answer, show:

Best answer

Learning point

Continue button

Results page:
Show:

Module completed

Score

Areas to review

Confidence check

Disclaimer that results are for support and training, not punishment.

Data structure:
Create database tables for:

practices

users

modules

manager_answers

scenarios

scenario_options

module_attempts

trainee_answers

AI behaviour:
Design the app so AI-generated training is always marked as draft content until a manager approves it. Do not auto-publish AI-generated content.

Important wording:
Use “AI-assisted draft generation” and “manager review required.”
Do not use “certified training,” “NHS-approved,” “clinically validated,” or “replaces mandatory training.”

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3f688222-1644-483d-a34b-75cb28fed827).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Real accounts and trainee training

The Supabase/Resend integration, required first-login password change, shared training progress and manager-reviewed follow-up practice are prepared. See [the setup guide](docs/SETUP.md) to configure and deploy the services before inviting real users.
