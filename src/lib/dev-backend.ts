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
import { practiceScenarios } from "./practice-scenarios";
import {
  startSession,
  answerSession,
  advanceSession,
  previousSession,
  submitSession,
  type TrainingSession,
} from "./training";

const storageKey = "practiceready-dev-workspace-v1";
const traineeId = "dev-trainee-jamie";
type Workspace = {
  state: PracticeState;
  trainees: Trainee[];
  sessions: TrainingSession[];
  version: number;
};
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
  const raw = sessionStorage.getItem(storageKey);
  if (raw) return JSON.parse(raw) as Workspace;
  const workspace = seed();
  sessionStorage.setItem(storageKey, JSON.stringify(workspace));
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
      sessionStorage.setItem(storageKey, JSON.stringify(workspace));
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
              modules: state.modules.filter((m) => assignments.some((a) => a.moduleId === m.id)),
              packages: state.packages,
              assignments,
              emojiMarks: state.emojiMarks,
            },
      trainees: role === "manager" ? workspace.trainees : [],
      sessions: workspace.sessions.filter((s) => role === "manager" || s.traineeId === account.id),
    } satisfies Snapshot;
  }
  let result: unknown = { ok: true };
  if (["save-practice", "invite", "remove-trainee"].includes(action)) {
    if (role !== "manager") throw new Error("Manager access required.");
    if (action === "save-practice") {
      if (body.version !== workspace.version)
        throw new Error("Mock practice changed. Reload and try again.");
      workspace.state = body.state as PracticeState;
      result = { version: ++workspace.version };
    } else if (action === "invite") {
      const email = String(body.email ?? "").trim();
      const existing = workspace.trainees.find((t) => t.email === email);
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
      if (body.id === traineeId)
        throw new Error(
          "Keep the built-in Mock Trainee to test role switching. Other mock trainees can be removed.",
        );
      workspace.trainees = workspace.trainees.filter((t) => t.id !== body.id);
      state.assignments = state.assignments.filter((a) => a.traineeId !== body.id);
      workspace.sessions = workspace.sessions.filter((s) => s.traineeId !== body.id);
    }
  } else {
    if (role !== "trainee") throw new Error("Switch to Mock Trainee to record training.");
    const assignment = state.assignments.find(
      (a) => a.id === body.assignmentId && a.traineeId === account.id,
    );
    const module = state.modules.find(
      (m) => m.id === assignment?.moduleId && m.published && !m.needsReview,
    );
    if (!assignment || !module) throw new Error("Assigned module is unavailable.");
    if (action === "start") {
      const session =
        workspace.sessions.find((s) => s.assignmentId === assignment.id && !s.result) ??
        startSession(module, assignment, `dev-session-${crypto.randomUUID()}`);
      if (!workspace.sessions.some((s) => s.id === session.id)) workspace.sessions.push(session);
      result = { session };
    } else {
      const index = workspace.sessions.findIndex(
        (s) =>
          s.id === body.sessionId && s.assignmentId === assignment.id && s.traineeId === account.id,
      );
      if (index < 0) throw new Error("Mock training attempt not found.");
      let session = workspace.sessions[index];
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
  sessionStorage.setItem(storageKey, JSON.stringify(workspace));
  return structuredClone(result);
}
