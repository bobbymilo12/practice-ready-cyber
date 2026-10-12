# Appointment Booking matching: local visual check

The matching implementation is already present in commit `3d8050a`. This check
uses a controlled fictional configuration equivalent to the tested fixture.
It does not represent clinical guidance or suggested responsibilities for real roles.

1. Run `npm run dev` and open the localhost URL printed in the terminal.
2. Open `/auth` and choose **Continue as Manager**. Use the mock workspace,
   not a real practice account.
3. In **Practice Setup → Roles**, use **Add another role** to add the four
   fictional roles below. Select only the listed standard request types for
   these four roles and save each role configuration.

| Fictional role | Standard request selections |
| --- | --- |
| Test role 1 | Chest infections; Ear problems; Asthma reviews |
| Test role 2 | UTIs; Minor skin problems; Diabetes reviews |
| Test role 3 | Coughs; Minor injuries; Blood pressure checks |
| Test role 4 | Sore throats; Eye problems; Medication reviews |

Use the existing request checkboxes, not custom requests with similar labels.
Confirm any other active role configurations too. No named employees are needed.
Do not remove existing data to run this check.

4. Create a new **Appointment Booking** module. Select **Learn**, request **10**
   questions, and generate draft scenarios. Do not open an older generated module:
   saved modules are deliberately not changed by later configuration edits.
5. The tested fixture produces **3 Core MCQs + 6 local MCQs + 1 matching board**.
   Look for **MATCHING** on the manager review page. It shows the complete board
   solution and all valid presented role relationships.
6. Approve the scenarios and use manager preview to inspect the two card columns.
   Select a request, then a role. Select an already paired request and its role
   again to unpair; selecting another role changes the pair. In a one-to-one board,
   choosing an occupied role releases its previous request. Try Tab, Enter and Space.
7. To test persistence and results, publish and assign to the mock trainee.
   Switch through the local development login in the **same browser tab**.
   Complete the board, go to the next question, then Previous: saved pairs remain.
   Change a pair and finish all questions. Correctness appears only after final
   submission; the board counts as one scenario with per-pair feedback.
8. Generate an **Apply** module with the same configuration: it should have no matching.

If matching is omitted, review displays a diagnostic based on the current role
configuration. Matching requires a unique complete 4-by-4 or 3-by-3 solution.
Several roles handling the same request is permitted, but a board with multiple
complete valid solutions is skipped. Custom request identities remain excluded
in this conservative version. Individual employee exceptions are not used for
these role-default exercises.

The mock workspace is tab-local. Production-account testing also requires the
Supabase practice API to use the updated shared training code.

Automated, non-browser checks:

```sh
npm run test:matching
node --experimental-strip-types tests/module-config.test.ts
node --experimental-strip-types tests/training.test.ts
npm run test:core-library
npx tsc --noEmit
npm run build
```
