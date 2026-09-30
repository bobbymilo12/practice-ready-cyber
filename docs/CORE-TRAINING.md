# Appointment Booking Core v1 — first production integration

Core content is maintained in the source-controlled PracticeReady registry, separate from practice configuration and module answers. Existing saved training is not regenerated automatically.

## Editorial approval

The product owner explicitly authorised PracticeReady editorial approval on 2026-09-30:

| Concept | Approved concept version | Recipes |
| --- | --- | --- |
| AB01 — Purpose of care navigation | 4 | Learn / Apply, version 2 |
| AB03 — Explain why information is requested | 3 | Learn / Apply, version 2 |
| AB04 — Listening/open communication | 3 | Learn / Apply, version 2 |
| AB15 — Effective communication | 3 | Learn / Apply, version 2 |

The registry records concept/source reviews and recipe approval. This is internal PracticeReady approval, not NHS endorsement. Existing NHS England source identity, URL, edition, access date and available sections are preserved. All eleven other concepts, including AB14, remain draft and unavailable.

`approvedAppointmentCoreVersions` pins the approved versions. Content changes must increment their version and receive explicit review/approval; changing the allowlist must never silently regenerate stored questions. Managers approve generated modules, not the Core registry.

## Controlled generation

Templates hold stable IDs, levels, interaction, intent, required/optional binding IDs and optional constraints. Only the four approved concepts have executable recipes. Each recipe defines the correct behaviour, a finite set of fictional situations, distractor themes/responses, bindings and eight forbidden-inference categories.

The existing Core generator checks editorial/source/recipe approval and template eligibility before executing. It selects authored presentation variants and rotates answers deterministically. There is no model call, arbitrary prompt execution or free-text interpolation. The editorial answer key determines correctness. Incorrect options describe inappropriate response strategies, not purported local facts.

These four concepts require no local bindings. Diagnosis, clinical urgency, clinician suitability, condition-specific clinical questions, local routing/booking policy, availability, escalation destinations and staff responsibilities cannot be added by generation. New constraints or binding-dependent recipes require a reviewed executor. Editorial semantic review is still required for any future prose/content changes.

## Create Module selection

`selectedModuleScenarios` feeds the Appointment Booking preview and `generateConfiguredModule`:

- Target Core count: `Math.round(total * 0.3)`, capped by the finite eligible Core pool.
- Fill remaining capacity with the existing safe local pool.
- Interleave one Core question with up to two local questions until the selection is exhausted.
- No padding or duplicate Core situations to meet a quota. Current capacity is ten distinct situations across the four concepts.
- A situation appears once, not separately for Learn and Apply. Explicit Learn/Apply selection governs every Core question. Only legacy settings without a level alternate by concept index and presentation round. There is no Handle support.
- If local information is insufficient, return a shorter module and use the existing availability message. Do not increase Core beyond its target simply to fill missing local material.
- The selected number is the total stored question count for newly generated Appointment Booking modules. Additional recovery questions are not appended beyond that total. Existing saved recovery questions and other topics retain their behaviour.

With sufficient local content, totals 10/20/30 produce 3/6/9 Core questions. Larger requests exhaust the ten distinct Core situations and use local content for the remainder.

Other predefined topics and Custom Module retain their existing generation path.

## Provenance, editing and regeneration

Generated Core scenarios retain concept ID/version, level, template ID, executable recipe ID/version, variation ID and input snapshots. Optional fields preserve compatibility with legacy scenarios.

Single-question Core regeneration stays in the same approved concept version and recipe. It chooses another unused authored variation. If none exists, or the stored version is no longer available/approved, it leaves the scenario unchanged rather than substituting another concept or silently upgrading it.

Manual editing retains provenance from the stored original even if the edit payload omits it, sets `managerModified: true`, and returns the scenario to draft. Regenerating successfully creates fresh constrained output and removes the modified flag. Whole-module generation explicitly selects from currently eligible content and requires existing manager review.

No assigned or in-progress training is automatically changed. There is no content-update notification UI.

## Reserved bindings and future scope

Existing adapters cover confirmed roles, effective responsibilities with employee overrides, explicit booking processes, escalation contacts/methods, and a recognised module clinician-preference selection. Required missing inputs fail closed; optional missing inputs omit dependent content. No arbitrary prose is inferred.

Continuity, specific next-step/timeframe, information-gathering and recording-process contracts still need suitable typed adapters. Access-channel data exists in Practice Setup but its Core adapter is deferred. None blocks these four general-principle recipes. AB14, Handle and other interaction formats remain unimplemented/unactivated.

Validation: Core/recipe/integration tests, the 22 module-generation regressions, TypeScript and production build. No browser/E2E suite.

## Manager-selected Learn / Apply

New Appointment Booking modules default to Learn and offer Learn/Apply radio options alongside length. The optional `settings.trainingLevel` is stored with the module and shown in review. Other topics do not expose or use it. Existing settings without a level retain mixed-level selection until the manager chooses one; stored scenarios are never rewritten on load.

Explicit Learn uses only Learn recipes and straightforward recognition questions. Explicit Apply uses only Apply recipes with more contextual conversations and competing receptionist response strategies. Local Apply generation prioritises configured responsibilities/employee exceptions, retains safely transformed scenarios, and omits untransformed free-text fallback questions rather than interpreting them. It can therefore produce a shorter module when safe local material is scarce. Learn retains the existing local coverage with a recognition-oriented question prompt.

Core scenario titles are situational, not internal concept names. Both levels retain the 30/70 target and finite ten-situation pool. Regeneration respects the stored level and pinned concept/recipe versions.

The requested presentation/distractor revision is recipe version 2: AB01 concept version 4; AB03/AB04/AB15 concept version 3. Prior generated questions retain their original text and provenance. Single-question regeneration of an unavailable older revision remains a no-op; explicitly regenerate a whole module to use current content and review it again. No new concepts, clinical facts, interactions or Handle content were introduced.

## Stronger level separation and local Apply coverage

Learn local exercises explicitly ask receptionists to recognise a named procedure. Apply retains patient-context decisions and now includes closed exercises for explicit same-day/routine process selections and a resolvable escalation route. These local exercises do not activate AB14. Qualifying instructions are not discarded: if they prevent safe use of a typed rule, that exercise is omitted.

Role-based questions prefer confirmed role responsibilities over staff names for explicit levels. Employee-specific exception questions remain available separately. No named clinician is required. Structured booking exercises are prioritised before the interleaved role/fact pool; the 30/70 selection and requested total are unchanged.

A local generation guard removes Apply exercises whose situation, question and correct answer match Learn. The Core executor rejects presentation text shared between opposite levels. These safeguards also cover single-question regeneration. No clinical inference or new Core content is involved.

Handle is displayed as a disabled Coming soon radio option. Its input cannot be selected; Appointment Booking generation rejects unsupported levels even if injected into settings. No Handle exercises or new interaction formats are implemented.

To compare: use the same confirmed practice roles and booking settings, create one ten-question Learn Appointment Booking module and one ten-question Apply module, and compare their review screens. With enough local data, each has three Core and seven local questions. Look for the same-day, routine and uncertainty examples: the underlying action is shared but Learn tests recognition and Apply asks for a decision in context. Existing drafts are unchanged unless explicitly regenerated.
