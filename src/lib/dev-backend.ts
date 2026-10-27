import { withdrawAssignments, validateAssignmentLifecycle } from "./staff-lifecycle.ts";
import { flagPracticeChanges, enforceReviewDecisions } from "./practice-change-tracking.ts";
import { suggestedRole } from "./role-requests.ts";
import { confirmProcedure, procedureTargets, validateLocalProcedures } from "./local-procedures.ts";
// Loaded dynamically only for a local development mock session. No network operations belong here.
import {
  defaultPracticeData,
  type Account,
  type Module,
  type Trainee,
  type TrainingPackage,
} from "./store";
import type { PracticeState, Snapshot } from "./backend";
import { devRole } from "./dev-mode";
import { practiceOverview } from "./analytics";
import { copyPublicModule, type PublicModuleSummary } from "./shared-modules";
import { practiceScenarios } from "./practice-scenarios";
import {
  startSession,
  resumableAttempt,
  answerSession,
  advanceSession,
  previousSession,
  submitSession,
  type TrainingSession,
} from "./training";

const storageKey = "practiceready-dev-workspace-v1";
const traineeId = "dev-trainee-jamie";
const mockTrainee = (): Trainee => ({
  id: traineeId,
  name: "Jamie Example (Mock Trainee)",
  email: "jamie.trainee@example.test",
  role: "Receptionist",
  status: "active",
  invitedAt: Date.now(),
});
type Workspace = {
  state: PracticeState;
  trainees: Trainee[];
  sessions: TrainingSession[];
  version: number;
};
/** User-supplied visual-test baseline only; never clinical guidance or a real practice default. */
function managerSeed(): Workspace {
  const practiceData = {
    ...Object.fromEntries(Object.keys(defaultPracticeData).map((key) => [key, ""])),
    practiceName: "Mock practice — visual testing only",
    staff: [],
    sameDayReasons: [],
    rolePolicies: Object.fromEntries(
      Object.keys(defaultPracticeData.rolePolicies).map((key) => [key, ""]),
    ),
  } as unknown as typeof defaultPracticeData;
  const doctor = {
    ...suggestedRole("Doctor"),
    confirmed: true,
    selectedRequestIds: [
      "medication-reviews",
      "prescription-queries",
      "mental-health-appointments",
      "utis",
      "breast-examination",
      "test-result-queries",
    ],
  };
  const nurse = {
    ...suggestedRole("Nurse Practitioner"),
    confirmed: true,
    selectedRequestIds: [
      "chest-infections",
      "coughs",
      "sore-throats",
      "ear-problems",
      "minor-skin-problems",
      "minor-injuries",
      "eye-problems",
    ],
  };
  practiceData.roleRequests = { [doctor.roleId]: doctor, [nurse.roleId]: nurse };
  // Fictional local-development choices, never defaults for registered practices.
  practiceData.address = "1 Example Lane, Demo Town";
  practiceData.hours = "Monday to Friday, 08:00–18:30";
  practiceData.localConfidentiality =
    "Confirm the patient's full name and date of birth before sharing information. Check recorded consent for requests made on someone else's behalf.";
  practiceData.prescriptionConfig = {
    version: 1,
    methods: ["nhs-app", "website", "paper"],
    otherMethod: "",
    orderingInstruction: "",
    orderingInstructions: [
      "Telephone ordering is available for patients aged 60 and over.",
      "Include the patient's full name, date of birth and the medicines requested.",
    ],
    turnaround: { id: "48", other: "" },
    turnaroundInstruction: "",
    weekends: { id: "exclude", other: "" },
    bankHolidays: { id: "exclude", other: "" },
    urgentRoute: {
      source: "separate",
      route: {
        contact: { kind: "role", role: doctor.label, roleId: doctor.roleId },
        method: { id: "system", other: "" },
        instruction: "Record the patient's request and callback number for the Doctor to review.",
      },
    },
    urgentActions: ["system"],
    otherAction: "",
    urgentInstruction: "Do not promise that a prescription will be issued.",
  };
  // Existing Practice Setup topic settings; contacts/responsibilities still resolve through Roles.
  practiceData.topicSettings = {
    prescriptions: {
      answers: {
        acute: "Practice website / online form",
        monitoring: "Offer a medication review appointment where the clinician has requested one",
        chasing: "Check the request’s progress and explain any update to the patient",
        pharmacyIssue:
          "Check whether the prescription has been issued and which pharmacy it was sent to",
      },
      extra: "",
    },
    results: {
      answers: {
        release: "Only when marked as reviewed and authorised for reception to share",
        pending: "Explain that the result needs clinician review before it can be shared",
        followup: "Arrange the follow-up requested by the reviewing clinician",
      },
      extra: "",
    },
    vaccines: {
      answers: { eligibility: "Check booking instructions provided by a clinician" },
      extra: "",
    },
    "fit-notes": {
      answers: {
        request: "Practice website / online form",
        delivery: "Secure digital message",
        extension: "Use the same request pathway as a new fit note",
      },
      extra: "",
    },
    "home-visits": {
      answers: { intake: "Clinical system task", review: "role:" + doctor.roleId },
      extra: "",
    },
    difficult: {
      answers: {
        complaint: "Write to the practice",
        record: "Practice incident reporting system",
        phrasing: "Acknowledge the concern and explain what can happen next",
      },
      extra: "",
    },
    "first-week": {
      answers: { supervision: "A supervisor observes them handling requests and gives feedback" },
      extra: "",
    },
  };

  const target = procedureTargets(practiceData).find((target) => target.id === "utis")!;
  practiceData.localProcedures = {
    utis: confirmProcedure(
      target,
      undefined,
      {
        steps: [
          {
            id: "sample",
            text: "Receptionist asks the patient to come to the practice and drop off a urine sample at reception.",
          },
          {
            id: "booking",
            text: "Once the sample has been handed in, book the patient into a UTI slot with a GPA.",
          },
          {
            id: "collection",
            text: "Place the urine sample into the GPA urine sample collection box in reception.",
          },
        ],
        stepOrder: ["sample", "booking", "collection"],
        appliesWhen: "",
        orderRequirement: "required_linear",
      },
      "dev-manager-morgan",
    ),
  };
  return {
    state: {
      practiceData,
      modules: [],
      packages: [],
      assignments: [],
      setupComplete: true,
      emojiMarks: {},
      answers: {},
      currentDraftId: null,
    },
    trainees: [mockTrainee()],
    sessions: [],
    version: 0,
  };
}
// Built from the default fictional practice, standing in for another practice's data.
const demoSharedModule = (): Module => ({
  id: "dev-shared-module",
  type: "Demo training",
  title: "Demo shared reception onboarding",
  topicKey: "first-week",
  published: true,
  visibility: "public",
  createdAt: Date.now(),
  scenarios: practiceScenarios("first-week", "Demo training", defaultPracticeData, {})
    .slice(0, 3)
    .map((s) => ({ ...s, status: "approved" })),
});
function seed(): Workspace {
  const practiceData = structuredClone(defaultPracticeData);
  practiceData.practiceName = "Demo Willow Practice (fictional)";
  practiceData.address = "1 Example Lane, Demo Town";
  practiceData.staff = [
    {
      id: "dev-doctor",
      name: "Dr Alex Example",
      role: "Doctor",
      clinics: "Routine appointments and duty triage",
    },
  ];
  const modules: Module[] = ["appointment-booking", "prescriptions", "first-week"].map(
    (topic, i) => ({
      id: `dev-module-${i}`,
      type: "Demo training",
      title: [
        "Demo appointment booking",
        "Demo prescription requests",
        "Demo reception onboarding",
      ][i],
      topicKey: topic,
      published: i < 2,
      createdAt: Date.now(),
      scenarios: practiceScenarios(topic, "Demo training", practiceData, {})
        .slice(0, 4)
        .map((s) => ({ ...s, status: i < 2 ? "approved" : "draft" })),
    }),
  );
  const induction: TrainingPackage = {
    id: "dev-induction",
    title: "Induction Package",
    description: "Basic local onboarding for new GP reception and administrative starters.",
    kind: "induction",
    moduleIds: modules.map((m) => m.id),
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  modules.forEach((m) => {
    m.packageId = induction.id;
  });
  return {
    state: {
      practiceData,
      modules,
      packages: [induction],
      assignments: modules.slice(0, 2).map((m, i) => ({
        id: `dev-assignment-${i}`,
        moduleId: m.id,
        traineeId,
        assignedAt: Date.now(),
        status: "assigned",
        packageId: induction.id,
      })),
      setupComplete: true,
      emojiMarks: {},
      answers: {},
      currentDraftId: null,
    },
    trainees: [
      {
        id: traineeId,
        name: "Jamie Example (Mock Trainee)",
        email: "jamie.trainee@example.test",
        role: "Receptionist",
        status: "active",
        invitedAt: Date.now(),
      },
    ],
    sessions: [],
    version: 0,
  };
}
function read(): Workspace {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    const workspace = JSON.parse(raw) as Workspace;
    // Repair older Manager baselines without resetting their practice or assigning training.
    if (devRole() === "manager" && !workspace.trainees.some((t) => t.id === traineeId)) {
      workspace.trainees.push(mockTrainee());
      workspace.version++;
      localStorage.setItem(storageKey, JSON.stringify(workspace));
    }
    return workspace;
  }
  const workspace = devRole() === "manager" ? managerSeed() : seed();
  localStorage.setItem(storageKey, JSON.stringify(workspace));
  return workspace;
}
export async function devApi(action: string, body: Record<string, unknown>): Promise<unknown> {
  const role = devRole();
  if (!role) throw new Error("No local mock session.");
  const workspace = read();
  const { state } = workspace;
  const account: Account = {
    id: role === "manager" ? "dev-manager-morgan" : traineeId,
    practiceId: "dev-practice",
    name: role === "manager" ? "Morgan Example (Mock Manager)" : "Jamie Example (Mock Trainee)",
    email: role === "manager" ? "morgan.manager@example.test" : "jamie.trainee@example.test",
    phone: "",
    role,
    mustResetPassword: false,
  };
  if (role === "trainee" && workspace.trainees.find((t) => t.id === account.id)?.inactiveAt)
    throw new Error("Your practice access is inactive. Contact your practice manager.");
  if (action === "remove-trainee") throw new Error("Use Deactivate. No history was deleted.");
  if (action === "admin_overview") {
    const now = Date.now();
    return practiceOverview(
      {
        practices: [{ id: "dev-practice", name: "Mock practice — visual testing only" }],
        people: [
          { practiceId: "dev-practice", role: "manager", email: account.email },
          ...workspace.trainees.map((t) => ({
            practiceId: "dev-practice",
            role: "trainee",
            email: t.email,
            inactiveAt: t.inactiveAt,
          })),
        ],
        logins: Array.from({ length: 12 }, (_, i) => ({
          practiceId: "dev-practice",
          at: now - i * 2 * 86400000,
        })),
        completions: workspace.sessions
          .filter((s) => s.result)
          .map((s) => ({ practiceId: "dev-practice", at: s.result!.completedAt })),
      },
      now,
    );
  }
  if (action === "analytics") {
    // Mock sign-ins: real ones come from the auth.sessions trigger.
    const now = Date.now();
    const staff = [{ id: account.id!, name: account.name }, ...workspace.trainees];
    return {
      practices: [{ id: "dev-practice", name: "Mock practice — visual testing only" }],
      staff: staff.map((t, i) => ({
        id: t.id,
        name: t.name,
        role: i ? "trainee" : "manager",
        inactiveAt: "inactiveAt" in t ? t.inactiveAt : undefined,
      })),
      logins: staff.flatMap((t, i) =>
        Array.from({ length: 30 - i * 8 }, (_, n) => ({
          userId: t.id,
          at: now - (n * (i + 2) + i) * 86400000,
        })),
      ),
      modules: state.modules.map((m) => ({ id: m.id, title: m.title })),
      assignments: state.assignments,
      attempts: workspace.sessions.map((s) => ({
        traineeId: s.traineeId,
        assignmentId: s.assignmentId,
        moduleId: s.moduleId,
        startedAt: s.startedAt,
        completedAt: s.result?.completedAt,
        correct: s.result?.correct,
        total: s.result?.total,
        supersededAt: s.supersededAt,
      })),
    };
  }
  if (action === "load") {
    // Explicit opt-in only, inside the existing localhost development mock boundary.
    if (
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get("sequencePreview") === "1" &&
      !state.modules.some((m) => m.id === "dev-sequence-preview")
    ) {
      const { sequencePreviewModule } = await import("../../tests/fixtures/sequence.ts");
      const module = sequencePreviewModule();
      state.modules.push(module);
      state.assignments.push({
        id: "dev-sequence-assignment",
        moduleId: module.id,
        traineeId,
        assignedAt: Date.now(),
        status: "assigned",
      });
      workspace.version++;
      localStorage.setItem(storageKey, JSON.stringify(workspace));
    }
    const assignments = state.assignments.filter((a) => a.traineeId === account.id);
    return {
      account,
      version: workspace.version,
      state:
        role === "manager"
          ? state
          : {
              practiceData: { ...state.practiceData, staff: [] },
              modules: state.modules
                .filter((m) => assignments.some((a) => a.moduleId === m.id))
                .map(
                  ({
                    reviewConfirmations: _history,
                    reviewChanges: _changes,
                    reviewedQuestions: _approvals,
                    ...module
                  }) => module,
                ),
              packages: state.packages,
              assignments,
              emojiMarks: state.emojiMarks,
            },
      trainees: role === "manager" ? workspace.trainees : [],
      sessions: workspace.sessions.filter((s) => role === "manager" || s.traineeId === account.id),
    } satisfies Snapshot;
  }
  let result: unknown = { ok: true };
  if (action === "erase-staff") throw new Error("Erasing people is not available in mock mode.");
  if (action === "list-public-modules" || action === "copy-public-module") {
    if (role !== "manager") throw new Error("Manager access required.");
    // Mock mode has one practice, so the library shows a fictional other practice's module.
    const source = demoSharedModule();
    if (action === "list-public-modules")
      return {
        modules: [
          {
            practiceId: "dev-other-practice",
            id: source.id,
            title: source.title,
            topicKey: source.topicKey,
            type: source.type,
            scenarioCount: source.scenarios.length,
          },
        ] satisfies PublicModuleSummary[],
      };
    if (body.moduleId !== source.id) throw new Error("This module is no longer shared.");
    return { module: copyPublicModule(source, crypto.randomUUID(), Date.now()) };
  }
  if (["save-practice", "invite", "set-staff-active"].includes(action)) {
    if (role !== "manager") throw new Error("Manager access required.");
    if (action === "save-practice") {
      validateLocalProcedures((body.state as PracticeState)?.practiceData?.localProcedures);
      if (body.version !== workspace.version)
        throw new Error("Mock practice changed. Reload and try again.");
      const next = body.state as PracticeState;
      validateAssignmentLifecycle(
        state.assignments,
        next.assignments,
        new Set(workspace.trainees.filter((t) => t.inactiveAt).map((t) => t.id)),
      );
      next.modules = enforceReviewDecisions(
        workspace.state.modules,
        next.modules,
        next.practiceData,
        { id: account.id ?? "dev-manager", name: account.name },
        new Date().toISOString(),
        workspace.state.practiceData,
      );
      next.modules = flagPracticeChanges(
        workspace.state.practiceData,
        next.practiceData,
        next.modules,
      );
      workspace.state = next;
      result = {
        version: ++workspace.version,
        reviewConfirmations: Object.fromEntries(
          next.modules
            .filter((m) => m.reviewConfirmations?.length)
            .map((m) => [m.id, m.reviewConfirmations]),
        ),
      };
    } else if (action === "invite") {
      const email = String(body.email ?? "").trim();
      const existing = workspace.trainees.find((t) => t.email === email);
      if (existing?.inactiveAt) throw new Error("Reactivate this staff member first.");
      if (existing?.status === "active")
        throw new Error("This mock trainee already has an active account.");
      if (!existing)
        workspace.trainees.push({
          id: `dev-invite-${crypto.randomUUID()}`,
          name: String(body.name),
          email,
          role: String(body.role),
          status: "invited",
          inviteStatus: "Mock only — no email sent",
          invitedAt: Date.now(),
        });
      const trainee = workspace.trainees.find((t) => t.email === email);
      const induction = state.packages.find((p) => p.kind === "induction");
      if (trainee && induction) {
        for (const moduleId of induction.moduleIds) {
          const module = state.modules.find((m) => m.id === moduleId);
          if (
            module?.published &&
            !module.needsReview &&
            !state.assignments.some((a) => a.traineeId === trainee.id && a.moduleId === moduleId)
          ) {
            state.assignments.push({
              id: `dev-assignment-${crypto.randomUUID()}`,
              traineeId: trainee.id,
              moduleId,
              packageId: induction.id,
              assignedAt: Date.now(),
              status: "assigned",
            });
          }
        }
      }
    } else {
      const trainee = workspace.trainees.find((t) => t.id === body.id);
      if (!trainee || typeof body.active !== "boolean") throw new Error("Staff member not found.");
      if (!body.active) {
        trainee.inactiveAt = trainee.inactiveAt ?? new Date().toISOString();
        state.assignments = withdrawAssignments(
          state.assignments,
          trainee.id,
          Date.now(),
          account.id!,
        );
      } else delete trainee.inactiveAt;
      workspace.version++;
    }
  } else {
    if (role !== "trainee") throw new Error("Switch to Mock Trainee to record training.");
    const assignment = state.assignments.find(
      (a) => a.id === body.assignmentId && a.traineeId === account.id && !a.withdrawnAt,
    );
    const module = state.modules.find(
      (m) => m.id === assignment?.moduleId && m.published && !m.needsReview,
    );
    if (!assignment || !module) throw new Error("Assigned module is unavailable.");
    if (action === "start") {
      workspace.sessions = workspace.sessions.map((s) =>
        s.assignmentId === assignment.id &&
        !s.result &&
        !s.supersededAt &&
        !resumableAttempt(s, module)
          ? { ...s, supersededAt: Date.now() }
          : s,
      );
      const session =
        workspace.sessions.find(
          (s) => s.assignmentId === assignment.id && resumableAttempt(s, module),
        ) ?? startSession(module, assignment, `dev-session-${crypto.randomUUID()}`);
      if (!workspace.sessions.some((s) => s.id === session.id)) workspace.sessions.push(session);
      result = { session };
    } else {
      const index = workspace.sessions.findIndex(
        (s) =>
          s.id === body.sessionId && s.assignmentId === assignment.id && s.traineeId === account.id,
      );
      if (index < 0) throw new Error("Mock training attempt not found.");
      let session = workspace.sessions[index];
      if (!session.result && !resumableAttempt(session, module))
        throw new Error(
          "Your training has been updated. Return to your training and start the updated module. Your earlier answers are kept.",
        );
      if (
        action === "answer" ||
        action === "continue" ||
        action === "previous" ||
        action === "submit"
      ) {
        if (!session.result && session.queue[session.index] !== body.scenarioId)
          throw new Error("Reload your training to continue.");
        session =
          action === "answer"
            ? answerSession(session, body.value)
            : action === "continue"
              ? advanceSession(session, module.title)
              : action === "previous"
                ? previousSession(session)
                : submitSession(session, module.title);
        if (session.result) session.result.traineeName = account.name;
      } else if (
        action === "confidence" &&
        session.result &&
        Number.isInteger(body.value) &&
        Number(body.value) >= 1 &&
        Number(body.value) <= 5
      ) {
        session = { ...session, result: { ...session.result, confidence: Number(body.value) } };
      } else throw new Error("Unsupported mock action.");
      workspace.sessions[index] = session;
      result = { session };
    }
  }
  localStorage.setItem(storageKey, JSON.stringify(workspace));
  return structuredClone(result);
}
