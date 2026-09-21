import { test, expect, type Page } from "@playwright/test";
import { defaultPracticeData } from "../../src/lib/store";

async function manager(page: Page) {
  const account = {
    id: "manager",
    email: "manager@example.test",
    name: "Manager",
    role: "manager",
    practiceId: "oak",
    phone: "",
    mustResetPassword: false,
  };
  let state = {
    practiceData: {
      ...defaultPracticeData,
      practiceName: "",
      hours: "",
      outOfHoursTimes: "",
      staff: [],
      sameDayReasons: [],
      dutyContact: "",
      prescriptionOrdering: "",
      repeatTurnaround: "",
      repeatEmergency: "",
      localConfidentiality: "",
      localSafeguarding: "",
      rolePolicies: { ...defaultPracticeData.rolePolicies, gpsSameDay: "", gpsRoutine: "" },
    },
    modules: [],
    assignments: [],
    setupComplete: false,
    answers: { staleTopic: "Unrelated old answer" },
    emojiMarks: {},
    currentDraftId: null,
  };
  let version = 0;
  let fail = false;
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: "manager", exp: expiresAt })).toString("base64url")}.signature`;
  await page.addInitScript(
    ({ token, expiresAt }) =>
      localStorage.setItem(
        "sb-journey-test-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "test-refresh",
          expires_at: expiresAt,
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "manager",
            email: "manager@example.test",
            app_metadata: {},
            user_metadata: {},
          },
        }),
      ),
    { token, expiresAt },
  );
  await page.route("https://journey-test.supabase.co/**", async (route) => {
    const req = route.request();
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const body = req.postDataJSON();
    if (body.action === "save-practice") {
      if (fail)
        return route.fulfill({
          status: 503,
          headers,
          json: { error: "Save unavailable. Please retry." },
        });
      state = body.state;
      version++;
      return route.fulfill({ headers, json: { version } });
    }
    return route.fulfill({
      headers,
      json: { account, state, version, trainees: [], sessions: [] },
    });
  });
  return {
    state: () => state,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}

test("landing separates manager registration and login", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Create a practice account" }).click();
  await expect(page.getByRole("heading", { name: "Create a manager account" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
});

test("guided setup validates, resumes, preserves details and waits for a successful save", async ({
  page,
}) => {
  const backend = await manager(page);
  await page.goto("/practice/setup");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Complete these details" })).toBeVisible();
  await page.getByLabel("Practice name", { exact: true }).fill("Oak Practice");
  await page.getByLabel("Opening hours", { exact: true }).fill("Monday to Friday 8–6");
  await page.getByLabel("Out-of-hours process").fill("Use our recorded out-of-hours service.");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByRole("button", { name: "Add team member", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Dr Oak");
  await page.getByLabel("Clinics or responsibilities").fill("Routine appointments");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "How are appointments handled?" })).toBeVisible();
  await page.getByLabel("Same-day criteria").fill("Use locally agreed triage criteria");
  await page.getByLabel("Escalation contact").fill("Call duty team on extension 123");
  await page
    .getByLabel("Same-day booking process")
    .fill("Duty team reviews requests before booking");
  await page.getByLabel("Routine booking process").fill("Offer an available routine slot");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByLabel("Prescription ordering").fill("Request through the practice portal");
  await page.getByLabel("Prescription turnaround").fill("Follow the posted turnaround policy");
  await page.getByLabel("Medication run-out process").fill("Contact duty pharmacist");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page
    .getByLabel("Confidentiality process")
    .fill("Verify identity and consent before sharing");
  await page.getByLabel("Safeguarding process").fill("Contact our safeguarding lead via duty team");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("Dr Oak · Doctor: Routine appointments")).toBeVisible();
  backend.fail(true);
  await page.getByRole("button", { name: "Create starter drafts" }).click();
  await expect(page.getByRole("heading", { name: "Your practice is set up" })).toHaveCount(0);
  await expect(
    page.getByRole("alert").filter({ hasText: "Save unavailable" }).first(),
  ).toBeVisible();
  backend.fail(false);
  await page.getByRole("button", { name: "Create starter drafts" }).click();
  await expect(page.getByRole("heading", { name: "Your practice is set up" })).toBeVisible();
  const saved = backend.state();
  expect(saved.modules).toHaveLength(5);
  expect(JSON.stringify(saved.modules)).not.toContain("Unrelated old answer");
  expect(JSON.stringify(saved.modules)).toContain("Contact our safeguarding lead");
  expect(saved.practiceData.address).toBe(defaultPracticeData.address);
  expect(saved.practiceData.rolePolicies.nursesRoutine).toBe(
    defaultPracticeData.rolePolicies.nursesRoutine,
  );
});
