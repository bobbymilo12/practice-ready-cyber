# Predefined module creation

## Inspection and scope

The original Create Module route offered nine predefined topics and Custom Module. Each predefined topic used a sequence of large free-text questions, followed by format, answer-order and 5/10/15-question options. `draftsForTopic` called `practiceScenarios`, which quoted saved rules but used generic distractors, appended all staff to every topic, and fell back to booking content for several topics. Regeneration read transient answers rather than saved module-specific settings.

Practice Setup stores shared booking/prescription configuration, contacts, safety routes, legacy local protocols, confirmed role/request catalogues and sparse individual overrides. Existing modules, assignments and practice configuration are persisted together in the existing practice-state JSON. The assessment engine uses approved primary scenarios and linked recovery scenarios, and snapshots in-progress attempts.

## Topic audit and implemented flow

| Topic | Previous free-text requests | Shared information now reused | Additional structured choices |
|---|---|---|---|
| Appointment booking | Same-day sequence, urgent symptoms, children, mental health, visits, appointment mode, DNAs, escalation, extras | Request methods; same-day/routine processes; escalation; request responsibilities and employee exceptions; DNAs, interpreters, out-of-hours | Unavailable appointments; uncertainty only if no saved instruction |
| Prescription requests | Run-out nuances, acute requests, overdue reviews, safeguarding, queries, escalation, extras | Ordering, turnaround and calendar rules; urgent route/actions; controlled medication and monitoring procedures; pharmacy; relevant responsibilities and exceptions | Non-repeat submission channel; query contact only if responsibilities do not already supply it; overdue-review handling only if missing |
| Urgent symptoms & escalation | Separate symptom responses and red flags, emergencies, duty contact, backup, documentation, prohibitions | Saved urgent contact information; same-day criteria (kept distinct from emergency guidance); validated escalation; safeguarding; out-of-hours | Backup person/role; handover recording location |
| Test results & confidentiality | Releasing/sharing results, identity, third parties, urgent results, children, system steps, escalation, tone | Confidentiality procedure; escalation; result-query responsibilities and exceptions | Release permission; unreviewed enquiries; identity checks only if confidentiality procedure is absent |
| Vaccine bookings | Vaccine types, administrators, clinics, eligibility, unclear cases, escalation, wording, mistakes, advice, local rules | Relevant confirmed request types, roles and individual exceptions; escalation | Source of booking authorisation; unclear booking instructions |
| Fit notes | Request process, issuers, self-certification, backdating, collection, promises, urgency, escalation | Fit-note request responsibilities/individual exceptions; confidentiality | Submission, delivery and extension/backdating pathways |
| Home visit requests | Cut-off, reviewers, information collection, red flags, housebound checks, promises, escalation, after-hours | Home-visit request responsibilities/individual exceptions; escalation; out-of-hours | Recording location; reviewing person/role; late-request handling |
| Difficult calls & de-escalation | Triggers, wording, abuse/call-ending policy, callbacks, escalation, safeguarding, logging, prohibitions, tone | Complaints, confidentiality, safeguarding, recorded phrases and promises to avoid | Support contact; complaint route and acknowledgement approach only where missing; incident recording |
| First week on reception | Systems, buddy, shadowing, greetings, confidentiality, safeguarding, escalation, mistakes | Hours/address; booking and prescription processes; escalation; safety/confidentiality; roles, requests and employee exceptions; DNAs/interpreters/out-of-hours | Named buddy or role; readiness for independent work |

All topics have an optional local-procedure text field, followed by Quick (target 6), Standard (target 12), Thorough (target 22), or Custom length (1–100). All selections are initially unconfirmed. Unsupported procedures are omitted. Missing shared booking/prescription information can be completed using the existing shared components, updating Practice Setup rather than a module copy.

Custom Module now uses the shared setup with manager-provided main-task and exception instructions. It does not infer facts from another topic. Older custom modules retain their saved questions; rebuilding them through shared settings requires supplying the relevant instructions. Existing modules retain their compatibility. Newly generated Practice Setup starter drafts use the same structured generator and default Standard settings, which can be edited from review.

## Generation and persistence

`module-config.ts` derives topic facts from `practiceSummary` and current confirmed role configuration. It resolves saved staff/role IDs at generation time, uses `effectiveRequestsForStaff`/`staffForRequest`, excludes unconfirmed and archived responsibilities, and honours individual additions/removals. It generates procedural decisions, routing choices and explicit employee-exception checks. Topic-specific distractors and manager-selected alternative procedures replace the single shared distractor set. Primary scenarios are interleaved across procedural and routing coverage, with module-specific decisions prioritised. Correct-answer positions vary.

No clinical criteria, responsibilities or policies are inferred. Symptom-specific clinical-response scenarios and ordered clinical procedures are not generated from incomplete data. Free-text procedures remain verbatim. Unrecognised/stale answers and deleted contacts are excluded. For explicit Learn/Apply settings, the selected count is the total stored question count. Older settings without a level retain linked follow-up generation.

An optional, versioned `Module.settings` object stores additional answers, local extras, Learn/Apply level, difficulty and the requested length/count. No SQL migration or new table is required. Shared practice information is not copied into settings. Existing backend persistence and manager access controls are retained. Review supports settings edits/full regeneration and single-scenario regeneration using saved settings. Regenerated content requires approval before publication; assignments, results and in-progress snapshots are preserved.

## Deliberate limits

The requested length is an upper target, not a reason to fabricate content. A topic with few confirmed facts may produce fewer than five scenarios. The length page explicitly displays the available count and shortfall before creation. Longer selections expand distinct coverage up to the available pool; they do not paraphrase primaries to reach a quota. More extensive modules require additional confirmed practice procedures or responsibilities. Custom length is capped at 100 primaries.

Generation is deterministic and source-grounded; it does not call an external AI service. Recovery practice reinforces the same recorded decision in a colleague-check context. Existing published modules are never silently migrated to the new generator.

## Files changed

- `src/components/PredefinedModuleSetup.tsx`: structured topic flow, saved-information summary, shared-data completion, optional local instructions, length and persistence.
- `src/lib/module-config.ts`: topic definitions, source selection, scenario generation, length limits and review/regeneration helpers.
- `src/lib/store.ts`: optional settings persistence, settings edits, configured regeneration and new setup starter drafts.
- `src/lib/training-types.ts`: optional versioned module settings.
- `src/routes/modules.create.tsx`: initialise new-module navigation.
- `src/routes/modules.setup.tsx`: select structured predefined flow or existing Custom Module flow.
- `src/routes/modules.review.tsx`: edit settings, display requested length, edit best answers and refresh the editor from current scenarios.
- `tests/module-config.test.ts`: six source-selection, safety, override, length, persistence and regeneration tests.
- `tests/browser/module-config.spec.ts`: all nine topic flows, Custom Module compatibility, length validation, save/reload, editing, regeneration and publication.
- `package.json`: include the new unit tests in `npm test`.
- `docs/predefined-module-creation.md`: audit and implementation record.

## Validation

- `npm test`: passed, including all six new generation/configuration tests and existing API/assessment tests.
- `npm run typecheck`: passed for application and Supabase code.
- `npm run build`: passed; dependency/bundler warnings remain.
- Browser suite: 26 of 27 passed in the final full run; the remaining new test used an incorrect exact-label selector. After correcting that selector, both module browser tests passed on the focused rerun. The previous mobile Roles failure also passed on subsequent runs.
- Targeted ESLint and Prettier checks for new module code, changed routes and new tests: passed. Repository-wide lint remains unsuccessful because of existing repository errors, including extensive formatting in the original store (414 baseline formatting errors independently confirmed).
- `git diff --check`: passed.
- No database migration, commit or push performed.

## Integration with origin/main (2026-09-28)

The `module changes` commit (`ee407c3`, retained on `backup-module-changes`) was
based on `c02c425`. The reflog records an aborted rebase, then a reset to
`991a7e9`. The restored working tree had four store conflicts and also silently
reverted the newer package interfaces, draft deletion control and local setup
input buffering.

The combined store retains the six-module induction package, package membership,
review flags and draft cleanup from main. Its five predefined starters use the
configured generator; the Custom Module starter retains its existing generator.
Settings edits and scenario regeneration preserve package membership, assignments
and historical training snapshots. Package-only state changes now trigger saving.
Package loading and automatic invitation assignment in both backends remain
intact. The package interfaces, draft deletion control and buffered Custom Module
inputs have been restored. A pre-existing optional-result TypeScript error in the
Supabase submit handler was corrected.

Regression coverage includes creation/reload for all nine predefined topics,
configured induction starter creation and repeat setup, review gates, package
cleanup, development invitation assignment, and production-handler package/settings
persistence, trainee filtering and duplicate-free invitation assignment. Existing
browser expectations were updated for six starters, manager re-review after
practice edits, and the current order-answer button label.


## Shared creation controls

All ten Create Module topics use the same Learn/Apply, Easy/Intermediate/Advanced and
Quick/Standard/Thorough/Custom controls. Learn asks directly about saved instructions;
Apply uses the relevant reception situation. Advanced presentations add a competing
handover expectation. Easy presents fewer alternatives; intermediate and advanced add
plausible but less appropriate response strategies. Correct practice facts and staff
exceptions are preserved. No alternative clinical timings or procedures are fabricated.

These controls apply when generating or regenerating content, never retrospectively
to saved trainee attempts. Legacy settings remain valid. Structured matching/sequence
answers retain their safety restrictions regardless of difficulty. Other topics do not
yet have Appointment Booking's authored Core library or procedure-sequence coverage;
they depend on the available confirmed topic information. Exact question-level source
links are not invented; existing conservative change-review rules still apply.
