# Shared question quality and multi-select

Newly generated/regenerated training uses shared question presentation. Saved modules and immutable attempt snapshots are not rewritten.

## Decisions and choices

- Known setup fields supply comparable unselected answer alternatives, excluding selected values and unspecified process/contact placeholders. Short questions are allowed two choices; generation does not require three vague alternatives.
- A recognised single submission channel produces a permission question. Multiple recognised configured channels produce a multi-select exercise when there is at least one distinct unsupported alternative. This applies to matching submission-method patterns across topics, including prescription, fit-note and appointment requests.
- Broad umbrella responsibilities (for example Prescription Queries) are omitted when no specific decision is established. Appointment/review/examination responsibilities support booking wording; other supported specific requests test who can help, without inventing a message route or urgency. Artificial “booking process has confirmed” disclaimers are removed. Learn prefers roles; individual additions/exceptions and explicit contacts remain named.
- Numeric duration choices retain the saved unit, including working hours. No working-hours/day conversion or pharmacy dispensing promise is made. Unrecognised or qualified prose is preserved rather than parsed into a new clinical/workflow rule.
- Default module labels, responsibility selectors, setup labels and newly generated question headings share display-label formatting. Acronyms are retained. Questions/sentences and long narrative headings retain sentence case; answers and local procedure steps are not passed through the label formatter. Existing/custom stored labels are not migrated.

## Conditional permission

Known channel aliases in conditional instructions are excluded from universal method answers. Explicit age lower bounds in bounded permission sentences can produce a patient at the threshold and one below it. Eligible patients receive the union of general and conditional methods; below-threshold patients receive the general methods. The parser is shared across submission topics/channels and keeps explicitly named repeat/fit-note scopes separate. Additional qualifiers, ambiguous conditions and unsupported sentence shapes are not guessed at. Structured condition/action pairs still use the existing bounded scenario frames. Separate instructions remain unchanged in Practice Setup; unsupported standalone instruction questions are omitted.

## Eligibility, optional scenarios and source boundaries

A source needs a supported decision, a correct answer and credible alternatives to become a question. The shared presenter has no generic distractor fallback. Numeric durations use comparable values in the same units; configured fields use alternatives for that same field; contact questions compare destinations/methods without treating a role and its member as different answers. Unsupported free text remains in setup and can yield no question. Requested length is a maximum, not a filler quota. The legacy/custom entry now delegates to this shared generator.

Learn can ask direct knowledge without a scenario. Apply uses decision-specific situations for result release/identity checks, vaccine booking, fit-note delivery, home-visit recording, difficult calls and supervision. Explicit condition scenarios retain the facts needed to choose the answer. Simple knowledge questions can remain direct in Apply when the evidence does not support a more complex decision. The trainee and manager review views omit empty scenario blocks.

Repeat methods never supply a non-repeat pathway. Submission actions are phrased as actions reception asks the patient to take. Urgent prescription questions start from a request already identified as urgent; running out of medication is not an urgency criterion. Contact, action selections and additional notes are not concatenated into mandatory steps. Qualifying contact prose is not silently discarded to claim unconditional permission. Explicit ordered Local Procedures retain their existing eligibility and verbatim steps.

## Multi-select contract

The existing `mcq` JSON shape has optional `correctIndices: number[]`. Its presence identifies a multi-select question; `correctIndex` remains for single-choice compatibility, but all multi-select evaluation, feedback and review use the full set. Selections are stored as unique stringified option indices in the existing string-array answer shape. At least one selection is needed to check. All and only correct choices are required; no partial credit. Draft edits do not score or schedule recovery. First committed answers remain immutable.

Shuffling remaps every correct index. Content comparison uses sorted correct answer text, so reordering alone does not supersede an attempt. Changing the correct set is a content change. Manager review shows all correct choices and lets the manager edit the correct set. Recovery uses the same commitment/scoring rules as other questions.

`configured_fact` provenance captures the source snapshot. Structured prescription methods record `practiceData.prescriptionConfig`; other facts retain their resolved rule snapshot with no guessed practice paths. Those unknown dependencies retain conservative module-level review. Manager edits mark provenance modified. Regeneration matches the recorded source rather than relying on shared headings; an ineligible source produces an actionable error rather than an unrelated replacement. Existing JSON persistence needs no migration, RLS, authentication or live database change. Deploy frontend/shared logic together; an older frontend does not understand multi-select.

## Inspection and limitations

Regression fixtures generate and inspect Learn and Apply output for all ten topics: Appointment Booking, Prescriptions, Urgent Symptoms & Escalation, Test Results, Vaccines, Fit Notes, Home Visits, Difficult Calls, First Week and Custom. Additional fixtures cover structured method lists, conditional telephone permission, numeric turnaround, source changes, shuffling, manager review and real Check Answer interactions.

Topics retain their own practice sources: booking configuration/roles/local procedures; prescription methods/turnaround/routes; urgent and safeguarding contacts; result release/identity rules; vaccine eligibility/booking; fit-note submission/delivery; home-visit intake/review; difficult-call support/complaints; induction/buddy/supervision; and explicit custom instructions. Local Procedure eligibility and verbatim steps are unchanged.

Sparse configuration still yields shorter/simpler training. Free-text conditions, complex opening-hour ranges and ambiguous numeric prose cannot safely acquire invented comparable values or exception scenarios. Manager review remains necessary, particularly for unrestricted custom instructions and overlapping allowed processes. No automated clinical/urgency inference was introduced.
