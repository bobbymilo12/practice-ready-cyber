# Updated training attempts and combined modules

This change compares the approved teaching content in a module with the content already saved in an attempt. It does not introduce a module revision catalogue or change saved question snapshots.

## Attempt behaviour

- Comparison includes prompts, answers/correct relationships, procedure order, learning points, manager notes and recovery relationships.
- Internal question IDs, display ordering/shuffling, module titles, persistence timestamps, review metadata and provenance metadata alone do not restart attempts.
- Unchanged legacy attempts resume using their existing snapshots; no backfill is required.
- A materially different unfinished attempt cannot be answered, continued or submitted. The trainee is prompted to start updated training. Old answers and snapshots remain intact.
- Starting the replacement adds `supersededAt` to the old attempt's JSON, preserving its existing fields, and creates an ordinary fresh attempt. A failed replacement insert can be retried. Version checks protect against concurrent edits to the old attempt; the database unique index prevents duplicate current attempts.
- Progress excludes outdated unfinished attempts, even before the trainee starts their replacement. The manager trainee page explains whether updated training is waiting, started or completed.
- Completed results continue counting as completed. Managers see when their content differs from the module's current content. No refresher assignments are created automatically.
- This is content comparison, not a chronological revision history. Restoring exactly the same content is considered equivalent. An already archived unfinished attempt remains archived. Historical completed attempts without an available question snapshot cannot be classified reliably.

## Combining modules

Questions copied from a paused module require fresh approval, including when they duplicate an approved question from another source. Existing publish validation prevents publication until all questions are approved. Provenance is retained, and recovery references are remapped to the retained questions.

Deduplication compares meaningful teaching content, provenance and recovery-parent content. Different answers, guidance or source evidence are retained. Equivalent questions can be deduplicated despite different internal IDs or answer display order. Different provenance is deliberately retained rather than dropping source relationships.

## Deployment

Apply `supabase/migrations/202610160001_superseded_attempts.sql` before deploying the updated `practice-api` function. It replaces the unique open-attempt index so historical rows with `supersededAt` do not block their replacements. Existing rows are not rewritten or deleted. The updated frontend and mock backend use the same comparison logic.

The migration and function have not been deployed by this task. Local API tests use the actual handler with a database adapter; they do not verify a live database migration. A post-deployment smoke test should start an attempt, correct/republish the module, and confirm that the old answers remain while a new attempt starts.
