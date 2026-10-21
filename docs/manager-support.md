# Manager support signals

Support is derived on read from existing assignments, attempt snapshots and results. No stored support status, backend change or migration is required. No changes to scoring, authentication or trainee answer behaviour.

For each active trainee and non-withdrawn assignment, use the latest completed attempt on the module's current teaching content (ordered by completion time, not last edit time). Unresolved result titles are displayed; titles unresolved in both latest attempts are described as repeated. Successful recovery already removes titles from the result's unresolved list. An unfinished retry does not erase the latest completed result, but is labelled in progress.

Confidence 1 (Not yet) and 2 (Shaky) on that same latest result surface a conversation prompt. Missing confidence is unknown, not low confidence; old confidence is not carried forward. Neither completion nor absence of signals certifies understanding or manager sign-off.

Unfinished training paused for manager review, updated training waiting to start after an obsolete attempt, and reassigned training waiting to start also surface action reasons. Reassignment is evidenced by a previous attempt on a different assignment for the same module. Starting the current training clears the waiting-to-start reason. Ordinary first assignments without results do not imply difficulty.

Inactive trainees and withdrawn assignments are excluded. Older-content completions do not automatically require repeat training or create difficulty alerts. Attempt snapshots/results remain unchanged and completed history remains available in the trainee page's expandable history. Legacy results without usable attempt snapshots cannot reliably establish current-content support; they remain historical. Repeated topics use stored result titles, not inferred question dependencies or competency judgements. There are no overdue alerts without an explicit reliable rule.

## Presentation audit

Removed the trainee-detail rule that flagged three historical attempts below 70%, and replaced best-ever score with the latest current result. History no longer dominates the current summary.

`src/routes/results.tsx` retains its existing trainee-facing score labels: Strong at 90% or above, Building at 60–89%, Needs practice below 60%. These do not drive manager alerts. Later, rationalise these labels separately around first-checked performance, recovered/unresolved learning and confidence; avoid treating them as pass/fail or competency thresholds. Completion percentages remain completion measures.

Dashboard links lead to the existing trainee detail page. Completion, support and expandable completed-attempt history are separate sections. Support is informational; assignment actions continue to use the existing confirmed-persistence flow.
