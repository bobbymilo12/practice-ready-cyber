# Shared question quality and multi-select

Newly generated/regenerated training uses shared question presentation. Saved modules and immutable attempt snapshots are not rewritten.

## Decisions and choices

- Known setup fields supply comparable unselected answer alternatives, excluding selected values and unspecified process/contact placeholders. Short questions are allowed two choices; generation does not require three vague alternatives.
- A recognised single submission channel produces a permission question. Multiple recognised configured channels produce a multi-select exercise when there is at least one distinct unsupported alternative. This applies to matching submission-method patterns across topics, including prescription, fit-note and appointment requests.
- Broad responsibility categories become responsibility-knowledge questions. Appointment/review/examination labels can produce booking questions with an explicit scenario that the booking process has confirmed an appointment is needed. Neither a category label nor a role assignment establishes urgency. Roles are preferred in Learn and Apply; individual additions/exceptions and explicit configured contacts remain named.
- Numeric duration choices retain the saved unit, including working hours. No working-hours/day conversion or pharmacy dispensing promise is made. Unrecognised or qualified prose is preserved rather than parsed into a new clinical/workflow rule.
- Default module labels, responsibility selectors, setup labels and newly generated question headings share display-label formatting. Acronyms are retained. Questions/sentences and long narrative headings retain sentence case; answers and local procedure steps are not passed through the label formatter. Existing/custom stored labels are not migrated.

## Conditional permission

Known channel aliases (including phone/telephone) appearing in conditional instructions are excluded from universal method answers. The authored instruction remains separate. Where a condition cannot reliably be attributed to a method, universal method claims are suppressed. This is deliberately conservative: arbitrary free text is not a structured rule language. It may produce fewer questions and still needs manager review. The method question explicitly excludes separately configured exceptions.

## Multi-select contract

The existing `mcq` JSON shape has optional `correctIndices: number[]`. Its presence identifies a multi-select question; `correctIndex` remains for single-choice compatibility, but all multi-select evaluation, feedback and review use the full set. Selections are stored as unique stringified option indices in the existing string-array answer shape. At least one selection is needed to check. All and only correct choices are required; no partial credit. Draft edits do not score or schedule recovery. First committed answers remain immutable.

Shuffling remaps every correct index. Content comparison uses sorted correct answer text, so reordering alone does not supersede an attempt. Changing the correct set is a content change. Manager review shows all correct choices and lets the manager edit the correct set. Recovery uses the same commitment/scoring rules as other questions.

`configured_fact` provenance captures the source snapshot. Structured prescription methods record `practiceData.prescriptionConfig`; generic method facts retain their resolved rule/settings snapshot with no guessed practice paths. Those unknown dependencies retain conservative module-level review. Manager edits mark provenance modified. Existing JSON persistence needs no migration, RLS, authentication or live database change. Deploy frontend/shared logic together; an older frontend does not understand multi-select.

## Inspection and limitations

Regression fixtures generate and inspect Learn and Apply output for all ten topics: Appointment Booking, Prescriptions, Urgent Symptoms & Escalation, Test Results, Vaccines, Fit Notes, Home Visits, Difficult Calls, First Week and Custom. Additional fixtures cover structured method lists, conditional telephone permission, numeric turnaround, source changes, shuffling, manager review and real Check Answer interactions.

Topics retain their own practice sources: booking configuration/roles/local procedures; prescription methods/turnaround/routes; urgent and safeguarding contacts; result release/identity rules; vaccine eligibility/booking; fit-note submission/delivery; home-visit intake/review; difficult-call support/complaints; induction/buddy/supervision; and explicit custom instructions. Local Procedure eligibility and verbatim steps are unchanged.

Sparse configuration still yields shorter/simpler training. Free-text conditions, complex opening-hour ranges and ambiguous numeric prose cannot safely acquire invented comparable values or exception scenarios. Manager review remains necessary, particularly for unrestricted custom instructions and overlapping allowed processes. No automated clinical/urgency inference was introduced.
