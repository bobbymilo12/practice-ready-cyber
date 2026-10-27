import assert from "node:assert/strict";
import test from "node:test";
import {
  requestPasswordRecovery,
  finishPasswordRecovery,
  recoveryMessage,
} from "../src/lib/password-recovery.ts";
import { withdrawAssignments, validateAssignmentLifecycle } from "../src/lib/staff-lifecycle.ts";
import { managerActionPatch } from "../src/lib/manager-actions.ts";
import { assignmentProgress } from "../src/lib/training.ts";

test("password requests return the same response for existing, unknown and rejected emails", async () => {
  for (const response of [null, { message: "No account" }, { message: "Rate limited" }]) {
    let request: any;
    const auth: any = {
      resetPasswordForEmail: async (...args: any[]) => {
        request = args;
        return { error: response };
      },
    };
    assert.equal(
      await requestPasswordRecovery(auth, " person@example.test ", "https://practice.test"),
      recoveryMessage,
    );
    assert.deepEqual(request, [
      "person@example.test",
      { redirectTo: "https://practice.test/auth?mode=recovery" },
    ]);
  }
  assert.equal(
    await requestPasswordRecovery(
      {
        resetPasswordForEmail: async () => {
          throw new Error("network");
        },
      } as any,
      "x@example.test",
      "https://practice.test",
    ),
    recoveryMessage,
  );
});

test("recovery requires a verified recovery session and activates an invited user only after the password is set", async () => {
  let updated = 0;
  const auth: any = {
    getUser: async () => ({ data: { user: { id: "person" } }, error: null }),
    updateUser: async () => {
      updated++;
      return { error: null };
    },
  };
  const password = "long-test-password";
  await assert.rejects(
    finishPasswordRecovery(auth, null, password, password, async () => ({})),
    /invalid or has expired/,
  );
  await assert.rejects(
    finishPasswordRecovery(auth, "someone-else", password, password, async () => ({})),
    /invalid or has expired/,
  );
  assert.equal(updated, 0);
  let activated = 0;
  await finishPasswordRecovery(
    auth,
    "person",
    password,
    password,
    async () => ({ mustResetPassword: true }),
    async () => {
      activated++;
    },
  );
  assert.equal(updated, 1);
  assert.equal(activated, 1);
  await finishPasswordRecovery(auth, "person", password, password, async () => ({
    mustResetPassword: false,
  }));
  assert.equal(updated, 2);
  assert.equal(activated, 1);
  await assert.rejects(
    finishPasswordRecovery(auth, "person", password, "different", async () => ({})),
    /match/,
  );
});

const assignment: any = {
  id: "a",
  moduleId: "m",
  traineeId: "t",
  assignedAt: 1,
  status: "assigned",
};
const base: any = {
  account: { id: "manager" },
  trainees: [{ id: "t" }],
  modules: [{ id: "m", published: true }],
  assignments: [assignment, { ...assignment, id: "other", traineeId: "other" }],
  packages: [],
};
test("withdrawal is confirmed-manager state, preserves IDs/history, and leaves other assignments alone", () => {
  const state = structuredClone(base);
  const patch = managerActionPatch(
    state,
    { kind: "withdraw", moduleId: "m", traineeId: "t", assignmentId: "a" },
    { id: "operation", at: 123 },
  );
  assert.equal(state.assignments[0].withdrawnAt, undefined);
  assert.equal(patch.assignments![0].id, "a");
  assert.equal(patch.assignments![0].withdrawnAt, 123);
  assert.deepEqual(patch.assignments![1], state.assignments[1]);
  assert.equal(assignmentProgress(patch.assignments![0], []).fraction, 0);
  assert.equal(assignmentProgress(patch.assignments![0], []).status, "Withdrawn");
  const reassigned = managerActionPatch(
    { ...state, ...patch },
    { kind: "assign", moduleId: "m", traineeId: "t" },
    { id: "new-assignment", at: 124 },
  );
  assert.equal(reassigned.assignments!.length, 3);
  assert.equal(reassigned.assignments![0].withdrawnAt, 123);
  assert.equal(reassigned.assignments![2].id, "new-assignment");
});
test("inactive staff cannot be assigned, and withdrawn history cannot be erased or reopened", () => {
  const state = structuredClone(base);
  state.trainees[0].inactiveAt = "2026-10-19";
  for (const kind of ["assign", "reassign"] as const)
    assert.throws(() =>
      managerActionPatch(state, { kind, moduleId: "m", traineeId: "t" }, { id: "new", at: 2 }),
    );
  const withdrawn = withdrawAssignments(state.assignments, "t", 123, "manager");
  assert.deepEqual(withdrawn[1], state.assignments[1]);
  assert.throws(
    () => validateAssignmentLifecycle(withdrawn, state.assignments, new Set()),
    /history/,
  );
  assert.throws(
    () => validateAssignmentLifecycle([], state.assignments, new Set(["t"])),
    /Inactive/,
  );
});
