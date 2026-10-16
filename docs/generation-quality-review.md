# Generation-quality completion review

This review compares the configured module-generation path against the seven requirements in the supplied generation-quality prompt. It covers newly generated questions and regeneration; it does not rewrite saved modules or trainee attempts.

## Requirement assessment

| Requirement | State on inspection | Completion in this change |
| --- | --- | --- |
| 1. Foundational Learn prefers roles, preserving meaningful named contacts and individual overrides | Mostly implemented in shared role generation; incomplete in the additional prescription-query fact path | Removed automatic duplicate query facts derived from arbitrary staff names. Explicitly selected contacts remain available. Added coverage across applicable topics and for individual overrides. |
| 2. Allowed method is distinct from a detailed process | Implemented for recognised channel lists; partial for mixed channel/instruction lists | Recognised channels still teach permission only. Additional supplied guidance is taught separately, without turning the channel label into invented instructions. |
| 3. Render structured configuration as natural prose | Partial: shared role/channel formatting existed, but some contact routes, lists and urgent prescription facts used display summaries | Shared contact and list rendering now handles these paths. Structured urgent routes use only the active saved route/actions. Acronyms and supplied instructions retain their casing and meaning. Appointment Booking Core/local escalation also uses natural method wording. |
| 4. Shared final copy layer/guard | Present, but provenance-bearing MCQs bypassed the guard and Core regeneration was not checked | Core and local generated MCQs now receive the guard, including regeneration. Empty copy and standalone channel options are rejected alongside known broken templates. Exact procedure sequences are preserved. |
| 5. Every topic, both Learn and Apply | Shared architecture and both training types already implemented; audit/coverage incomplete | Inspected representative generated output for all ten exposed topics in both modes; extended shared-path regression tests. |
| 6. Grounding and validated behaviour | Existing provenance, individual overrides, procedure fidelity and attempt behaviour already implemented | Preserved these mechanisms; added tests for unchanged evidence/input and inactive route exclusion. Preserved additional safeguarding guidance alongside structured contacts. No migration or saved-content rewrite. |
| 7. Regression tests and representative output inspection | Initial shared-copy tests existed; edge-case and cross-topic coverage partial | Expanded copy tests to ten cases, plus the existing full suite. Inspected actual generated examples for all twenty topic/type combinations. |

No numbered requirement was wholly absent. The missing subcases above explain why the earlier implementation was not complete.

## Representative generated-output inspection

The inspection used explicitly configured fictional test data. Both Learn and Apply examples were inspected for every row.

| Topic | Output checked |
| --- | --- |
| Appointment Booking | Learn booking choices use roles; Apply retains its appointment choices. Core and local escalation say “by telephone on …” while evidence retains the saved method label. |
| Prescriptions | Allowed methods teach acceptance, not a how-to process. Learn routing uses roles. Urgent requests retain the active contact route, actions and supplied instructions. |
| Urgent symptoms & escalation | Explicit backup contacts stay named; safeguarding contact and additional saved guidance both survive. |
| Test results | Saved release restrictions remain intact; Learn query routing uses a role. |
| Vaccines | Saved booking permissions remain intact; Learn routing uses a role. |
| Fit notes | Submission methods teach permission only; Learn routing uses a role. |
| Home visits | Saved documentation destinations form complete instructions; Apply adds a competing handover situation without inventing a process. |
| Difficult calls | Explicit support contacts remain named; saved safeguarding guidance remains available. |
| First week | Explicit induction buddies remain named; general request routing uses roles in Learn; shared prescription/contact facts use the same formatting. |
| Custom | Supplied guidance is preserved in both modes; no local facts are fabricated to fill missing configuration. |

## Scope and limitations

- The underlying issue was treating setup display summaries and labels as finished training prose. Formatting now occurs using structured context wherever that structure exists.
- The final guard detects known unfinished templates, not every possible grammatical problem. Arbitrary manager-authored free text and exact Local Procedure steps remain authored content; automatically expanding or paraphrasing them could change their meaning.
- Missing configuration is not filled in. Generated modules can contain fewer questions when there are insufficient grounded candidates.
- Existing saved modules and trainee attempts are unchanged. Older saved content needs explicit regeneration to receive the new wording. The legacy/demo generator is not migrated into the configured creation flow by this change.
- Manager review still checks local accuracy and appropriateness. No clinical rules, responsibilities, urgency or procedure steps were added.
