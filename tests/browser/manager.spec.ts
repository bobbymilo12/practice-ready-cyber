import { addPracticeRole } from "./setup-helpers";
import { bookingFor, prescriptionsFor } from "../../src/lib/practice-config";
import { test, expect, type Page } from "@playwright/test";
import { defaultPracticeData, type PracticeData } from "../../src/lib/store";

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
  await page.getByRole("link", { name: "Create a practice account" }).first().click();
  await expect(page.getByRole("heading", { name: "Create a manager account" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
});

test("guided setup validates, resumes, preserves details and waits for a successful save", async ({
  page,
}) => {
  const backend = await manager(page);
  await page.goto("/practice/setup");
  await page.getByLabel("Practice name", { exact: true }).fill("");
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Complete these details" })).toBeVisible();
  await page.getByLabel("Practice name", { exact: true }).fill("Oak Practice");
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await expect(page.getByRole("heading", { name: "Roles at your practice" })).toBeVisible();
  await addPracticeRole(page, "Doctor");
  await page.getByLabel("Name", { exact: true }).fill("Dr Oak");
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Who works at your practice?" })).toBeVisible();
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
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
  expect(saved.practiceData.practiceName).toBe("Oak Practice");
  expect(saved.practiceData.address).toBe(defaultPracticeData.address);
});

test("employee edits keep the shared role and historical records intact", async ({ page }) => {
  const backend = await manager(page);
  const p = backend.state().practiceData as PracticeData;
  const legacy = {
    id: "legacy",
    name: "Catherine",
    role: "Nurse Practitioner",
    clinics: "Local clinic",
    notes: "Tuesday only",
    capabilities: ["Asthma reviews"],
    appointmentCapabilities: {
      defaults: { "asthma-review": true },
      overrides: { "blood-test": false },
    },
  };
  p.staff = [legacy];
  await addPracticeRole(page, "Practice Nurse");
  await page.goto("/practice/setup?step=2");
  const employee = page.getByRole("article", { name: "Employee Catherine", exact: true });
  await expect(employee.getByRole("checkbox")).toHaveCount(0);
  await expect(
    employee.getByText("Catherine uses your practice’s Nurse Practitioner role configuration."),
  ).toBeVisible();
  await expect(page.getByText("Tuesday only", { exact: true })).not.toBeVisible();
  await page.getByText("Preserved individual information", { exact: true }).click();
  await expect(page.getByText("Tuesday only", { exact: true })).toBeVisible();
  await employee.getByLabel("Employee role").selectOption("Practice Nurse");
  await page.getByRole("button", { name: "Save and exit", exact: true }).click();
  expect((backend.state().practiceData as PracticeData).staff[0]).toEqual({
    ...legacy,
    role: "Practice Nurse",
  });
  await page.goto("/data-hub");
  await expect(
    page.getByRole("button", { name: "View / edit Practice Nurse role", exact: true }),
  ).toBeVisible();
});
