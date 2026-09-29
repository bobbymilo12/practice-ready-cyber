# Core Training Library — foundation

`core-training-types.ts` describes centrally maintained concepts; `core-training-library.ts` contains three draft Appointment Booking examples. The topic key reuses `Module.topicKey`. Core levels and interaction types are deliberately separate from existing module difficulty, length and `Scenario.kind`: declaring `multi_select` here does not enable it in the trainee renderer.

The library is source-controlled PracticeReady content, not part of Zustand practice state or the Supabase practice payload. It imports no store, resolver or generator. No stored data migration, runtime eligibility check, generation path or UI is introduced.

Sources identify a reference, edition/section and access date. `reference_only` is not verification of each teaching claim; source assessment and editorial concept approval are separate. All examples remain draft. The content version changes independently of the schema version; the stable concept ID does not change on revision. Future generated content should pin both concept ID and version.

Binding keys declare dependencies, not new practice fields. A future adapter should reuse existing roleRequests and effective employee overrides, bookingConfig/escalation, and module settings rather than copying them into Core. Some example module bindings do not yet have exact existing fields; they must remain unavailable until explicitly resolved. Required missing bindings declare `unavailable`; absent optional bindings declare `omit_dependent_content`. Neither permits inference. Constraints have stable IDs and editorial descriptions; enforcement is future work, not a current safety gate.

Before Stage 2, decide:
- Editorial ownership, source-to-claim review, approval authority and re-review/retirement policy.
- Binding contracts and mappings, including how confirmed, incomplete, stale or conflicting local data is treated.
- Whether dependencies are concept-wide (as here) or scoped to a particular level/interaction.
- How approved concept versions are pinned to generated modules and how updates trigger manager review.
- Interaction contracts for future routing/multi_step and how constraints/availability will be enforced before generation.

Run `npm run test:core-library` for the focused model/fixture checks.
