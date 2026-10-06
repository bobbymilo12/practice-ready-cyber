# Sequencing Stage 1

No new sequencing source is enabled in normal production generation.

## Local mock preview

1. Run `npm run dev` and open the localhost address printed by Vite.
2. Visit `/auth` and choose **Continue as Manager**.
3. Open `/train?id=dev-sequence-preview&sequencePreview=1` in that same tab.
   This explicitly adds a test-only module to the mock workspace. It does not change
   real practice data or call Supabase.
4. Rearrange the token cards by dragging or using the Up/Down buttons.
   This is an artificial test specification: circle → square → triangle → star,
   not a clinical or administrative practice procedure.
5. For persisted trainee answers and results, use the same tab to log out of the
   mock manager, choose **Continue as Trainee**, then open
   `/train?id=dev-sequence-preview`. The opt-in also assigns the module to the
   existing mock trainee. Every move saves; refreshing restores it. Submit to see
   the score and the correct sequence.
6. Manager review is available at `/modules/review?id=dev-sequence-preview`.
   Stage 1 exposes the approved sequence for review, not step-authoring controls.

The opt-in only runs inside the existing development/localhost mock backend.
The fixture lives under `tests/fixtures/sequence.ts`, has test-only provenance,
and cannot be used by the production sequence constructor. It does not appear in
Create Module or the normal mock seed.

## Data contract

Legacy `kind: "order", steps: string[]` scenarios remain unchanged.

Structured `kind: "order"` scenarios instead contain `sequence`:
step IDs/labels, explicit correct ID order, and separately shuffled presentation
IDs. Sequence provenance holds source kind/ID/version and a cloned approval or
confirmation record, evidence and source content.

The constructor accepts only explicit 3–5-step linear sources with unique IDs and
labels, complete ID order, evidence and approval/confirmation. No parsing of free
text, role selections or assumed clinical processes is performed. Core/local
production collection and automatic generation are future work.

Custom/legacy ordering format preferences no longer convert MCQs into invented
procedures. They retain eligible MCQs when there is no ordered source.

Structured answers are permutations of stable IDs. Every rearrangement uses the
existing answer endpoint; scoring remains one exact-order scenario. Up/Down
controls remain available without drag-and-drop. Correctness is only displayed
after final submission. Source order is preserved through review and regeneration.

## Checks

```sh
npm run test:sequence
npm run test:matching
node --experimental-strip-types tests/training.test.ts
node --experimental-strip-types tests/module-config.test.ts
npm run test:core-library
npx tsc --noEmit
npm run build
```
