# PracticeReady product review

## Changes made

- Landing page: separate practice registration and login, a short explanation and three steps. New managers go directly to setup after login.
- Guided manager setup: practice basics → team → bookings → prescriptions → safety → review. Required details are checked before completing setup; optional policies remain available. The current step survives refresh and Save and exit supports partial setup.
- Setup preserves existing practice fields and creates drafts only after all required information is present. Success is shown after the server confirms the save. Retrying a failed save does not duplicate starter modules.
- Starter generation no longer includes answers from unrelated module setup. First-week drafts include the saved safeguarding procedure.
- Dashboard: an actionable next step replaces repeated marketing copy. Practice information, invitations and module setup use shorter, consistent wording.
- Module creation: one topic per new module, a working custom title, and a separate link to combine existing modules. Previously, selecting several topics opened the existing-module merge screen and discarded the selections.
- Generation descriptions now match the implementation: templates, fixed/shuffled answer order, and question limits. Removed unsupported AI and advanced-difficulty claims. New drafts wait for a successful save before opening review.
- Fixed the practice-information form’s initial staff role: it displayed Doctor while storing an empty role, which disabled Add.

## Work still needed

| Priority | Finding | Next action |
| --- | --- | --- |
| Launch blocker | The last recorded backend check found Auth available but application tables and the API missing. Public frontend configuration alone does not enable accounts or invitations. | Finish deployment and email configuration in [SETUP.md](./SETUP.md), then verify with real test accounts on two devices. This review did not deploy or re-check live services. |
| High | Activated users have no forgotten-password recovery screen. | Add password recovery emails, redirect handling and a reset form before broad rollout. |
| High | Training uses rule-quoting templates with generic incorrect options; ordering questions share a generic sequence. Shuffled options do not make questions meaningfully harder. | Pilot with practice managers; improve topic-specific situations, plausible choices and practice-specific ordered steps. Keep manager review mandatory. |
| High | Updating practice information does not automatically update or flag every existing module. Started attempts retain their original scenario snapshots. | Add change tracking and a clear review/reassignment workflow. For now, managers must review affected modules and reassign corrected training. |
| Medium | Some stored details (such as role-specific booking policies and optional protocols) are not systematically covered by the generator. Setup information is retained, but storage does not guarantee training coverage. | Map each topic to its relevant fields and show managers which information a draft uses or lacks. |
| Medium | Results training lacks a dedicated results-release process; it primarily covers confidentiality. | Capture the practice’s results process and generate/review scenarios for it. |
| Medium | All assigned modules count toward completion; there are no separate required/optional labels or pass thresholds. | Agree the completion policy before calling it formal onboarding sign-off. |
| Medium | Accounts belong to one practice, and another manager signup creates a new practice. | Add an explicit manager invitation flow if several managers need to administer the same practice. |
| Lower | Unsubmitted answer choices and reordered steps are not persisted. | Decide whether saving checked answers is sufficient or whether in-question drafts should also resume. |

## Validation

Automated checks cover types, the training state machine, API authorization and mocked browser journeys. The manager browser test checks required fields, refresh/resume, preservation of existing details, failed-save retry, starter draft count and exclusion of unrelated answers. Mocked tests do not verify real email delivery, live database policies or deployment.
