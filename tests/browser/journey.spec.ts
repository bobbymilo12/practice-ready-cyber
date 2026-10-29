import { test, expect, type Page } from "@playwright/test";
import {
  advanceSession,
  previousSession,
  answerSession,
  startSession,
  submitSession,
  type TrainingSession,
} from "../../src/lib/training";
import type { Assignment, Module } from "../../src/lib/store";

const modules: Module[] = [
  {
    id: "m1",
    title: "Local booking",
    type: "Booking",
    topicKey: "booking",
    published: true,
    createdAt: 1,
    scenarios: [
      {
        id: "q1",
        kind: "mcq",
        title: "A booking request",
        patientQuote: "Can I book today?",
        question: "What should you do?",
        options: ["Guess the process", "Check the local rules"],
        correctIndex: 1,
        learningPoint: "Check the practice rules before making promises.",
        status: "approved",
      },
      {
        id: "q2",
        followUpFor: "q1",
        kind: "mcq",
        title: "A changed booking",
        patientQuote: "Can you change my appointment?",
        question: "How do you handle this?",
        options: ["Promise immediately", "Check the local rules again"],
        correctIndex: 1,
        learningPoint: "The same local rules apply when changing a booking.",
        status: "approved",
      },
    ],
  },
  {
    id: "m2",
    title: "Call handling",
    type: "Calls",
    topicKey: "calls",
    published: true,
    createdAt: 1,
    scenarios: [
      {
        id: "q3",
        kind: "order",
        title: "Handle a call",
        patientQuote: "Please arrange my appointment.",
        question: "Arrange the steps",
        steps: ["Check", "Book", "Record"],
        learningPoint: "Check first, then book and record.",
        status: "approved",
      },
    ],
  },
];
async function mockAccount(page: Page, mustReset = false, empty = false) {
  const account = {
    id: "alice",
    email: "alice@example.test",
    name: "Alice",
    role: "trainee",
    practiceId: "oak",
    phone: "",
    mustResetPassword: mustReset,
  };
  const assignments: Assignment[] = empty
    ? []
    : modules.map((m, i) => ({
        id: `a${i}`,
        moduleId: m.id,
        traineeId: "alice",
        status: "assigned",
        assignedAt: 1,
      }));
  const sessions: TrainingSession[] = [];
  let failAnswer = false;
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: "alice", exp: expiresAt })).toString("base64url")}.signature`;
  await page.addInitScript(
    ({ token, expiresAt }) => {
      localStorage.setItem(
        "sb-journey-test-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "test-refresh",
          expires_at: expiresAt,
          expires_in: 3600,
          token_type: "bearer",
          user: { id: "alice", email: "alice@example.test", app_metadata: {}, user_metadata: {} },
        }),
      );
    },
    { token, expiresAt },
  );
  await page.route("https://journey-test.supabase.co/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      });
    // Changing the password revokes sessions, so the page signs in again with the new one.
    if (request.url().includes("/auth/v1/token"))
      return route.fulfill({
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          access_token: token,
          refresh_token: "test-refresh",
          expires_in: 3600,
          expires_at: expiresAt,
          token_type: "bearer",
          user: { id: "alice", email: "alice@example.test", app_metadata: {}, user_metadata: {} },
        }),
      });
    const body = request.postDataJSON();
    let payload: unknown = {};
    let status = 200;
    if (body.action === "load")
      payload = {
        account,
        version: 0,
        state: {
          practiceData: { practiceName: "Oak Practice" },
          modules: empty ? [] : modules,
          assignments,
        },
        trainees: [],
        sessions,
      };
    else if (body.action === "password") {
      account.mustResetPassword = false;
      payload = { ok: true };
    } else if (body.action === "start") {
      const assignment = assignments.find((a) => a.id === body.assignmentId)!;
      const session = startSession(
        modules.find((m) => m.id === assignment.moduleId)!,
        assignment,
        `session-${sessions.length}`,
      );
      sessions.push(session);
      payload = { session };
    } else {
      const i = sessions.findIndex((s) => s.id === body.sessionId);
      if (body.action === "answer" && failAnswer) {
        failAnswer = false;
        status = 503;
        payload = { error: "Could not save. Please retry." };
      } else {
        if (body.action === "previous") sessions[i] = previousSession(sessions[i]);
        if (body.action === "answer") sessions[i] = answerSession(sessions[i], body.value);
        if (body.action === "continue")
          sessions[i] = advanceSession(
            sessions[i],
            modules.find((m) => m.id === sessions[i].moduleId)!.title,
          );
        if (body.action === "submit")
          sessions[i] = submitSession(
            sessions[i],
            modules.find((m) => m.id === sessions[i].moduleId)!.title,
          );
        if (body.action === "confidence") sessions[i].result!.confidence = body.value;
        payload = { session: sessions[i] };
      }
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(payload),
    });
  });
  return {
    sessions,
    failNextAnswer: () => {
      failAnswer = true;
    },
  };
}

const startLink = (page: Page) => page.getByRole("link", { name: "Start training →" });
const saved = "Your answer is saved and cannot be changed.";

test("password change, saved answers, different followup, next module and completion", async ({
  page,
}) => {
  const { sessions } = await mockAccount(page, true);
  await page.goto("/staff");
  await expect(page.getByRole("heading", { name: "Choose your own password" })).toBeVisible();
  await page.getByLabel("Temporary password").fill("temporary-password");
  await page.getByLabel("New password", { exact: true }).fill("my-new-password-123");
  await page.getByLabel("Confirm new password").fill("my-new-password-123");
  await page.getByRole("button", { name: "Save password and start training" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Alice", exact: true })).toBeVisible();
  await startLink(page).click();
  await page.getByRole("button", { name: "Begin training" }).click();
  await page.getByRole("button", { name: "Guess the process" }).click();
  // A wrong first answer adds the approved follow-up instead of showing feedback.
  await page.getByRole("button", { name: "Review answers →" }).click();
  await expect(page.getByRole("heading", { name: "A changed booking" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "A changed booking" })).toBeVisible();
  await page.getByRole("button", { name: "← Previous question" }).click();
  await expect(page.getByText(saved, { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /Guess the process/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page.getByRole("button", { name: "Check the local rules again" }).click();
  await page.getByRole("button", { name: "Review answers →" }).click();
  await page.getByRole("button", { name: "Submit module" }).click();
  await expect(page.getByRole("heading", { name: "Improved with extra practice" })).toBeVisible();
  expect(sessions[0].result?.correct).toBe(0);
  await page.getByRole("button", { name: "4 — Confident", exact: true }).click();
  await expect(page.getByText("Saved. You can change this any time.")).toBeVisible();
  await page.getByRole("link", { name: "Continue Training" }).click();
  await page.getByRole("button", { name: "Begin training" }).click();
  await page.getByRole("button", { name: "Move step 3 up" }).click();
  await page.getByRole("button", { name: "Move step 2 up" }).click();
  await page.getByRole("button", { name: "Review answers →" }).click();
  await page.getByRole("button", { name: "Submit module" }).click();
  await expect(
    page.getByRole("heading", { name: "All assigned training completed!" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to your training" }).first().click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
});

test("failed answer can be retried, and trainee cannot open manager routes", async ({ page }) => {
  const mock = await mockAccount(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/staff$/);
  await startLink(page).click();
  await page.getByRole("button", { name: "Begin training" }).click();
  mock.failNextAnswer();
  await page.getByRole("button", { name: "Check the local rules" }).click();
  await page.getByRole("button", { name: "Review answers →" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not save");
  await expect(page.getByRole("heading", { name: "Review your answers" })).toHaveCount(0);
  await page.getByRole("button", { name: "Review answers →" }).click();
  await expect(page.getByRole("heading", { name: "Review your answers" })).toBeVisible();
});

test("unassigned trainee has an empty homepage, not the published library", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAccount(page, false, true);
  await page.goto("/staff");
  await expect(page.getByRole("heading", { name: "No training yet" })).toBeVisible();
  await expect(page.getByText("Local booking", { exact: true })).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.goto("/train?id=m1");
  await expect(page.getByRole("heading", { name: "Module unavailable" })).toBeVisible();
});

test("previous and continue preserve saved answers and first-answer scoring", async ({ page }) => {
  const { sessions } = await mockAccount(page);
  await page.goto("/staff");
  await startLink(page).click();
  await page.getByRole("button", { name: "Begin training" }).click();
  await expect(page.getByRole("button", { name: "← Previous question" })).toBeDisabled();
  await page.getByRole("button", { name: "Guess the process" }).click();
  await page.getByRole("button", { name: "Review answers →" }).click();
  await page.getByRole("button", { name: "← Previous question" }).click();
  await expect(page.getByRole("button", { name: /Guess the process/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Check the local rules", exact: false }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("button", { name: /Guess the process/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText(saved, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Check the local rules again" }).click();
  await page.getByRole("button", { name: "Review answers →" }).click();
  await page.getByRole("button", { name: "Submit module" }).click();
  await expect(page).toHaveURL(/results/);
  expect(sessions[0].result?.correct).toBe(0);
});
