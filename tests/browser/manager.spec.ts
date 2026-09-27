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
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Complete these details" })).toBeVisible();
  await page.getByLabel("Practice name", { exact: true }).fill("Oak Practice");
  await page.getByLabel("Opening hours", { exact: true }).fill("Monday to Friday 8–6");
  await page.getByLabel("Out-of-hours process").fill("Use our recorded out-of-hours service.");
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await expect(page.getByRole("heading", { name: "Roles at your practice" })).toBeVisible();
  await addPracticeRole(page, "Doctor");
  await page.getByLabel("Name", { exact: true }).fill("Dr Oak");
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "How are appointments handled?" })).toBeVisible();
  await page.getByRole("button", { name: "+ Add another criterion", exact: true }).click();
  await page
    .getByLabel("Local criterion 1", { exact: true })
    .fill("Use locally agreed triage criteria");
  await page
    .getByLabel("Who should reception contact when they are unsure?")
    .selectOption("role:Duty GP");
  await page.getByLabel("How should reception contact them?").selectOption("phone");
  await page.getByLabel("Phone / extension number").fill("123");
  await page.getByLabel("Clinical triage is required before booking", { exact: true }).check();
  await page.getByLabel("Reception books directly", { exact: true }).check();
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await page.getByLabel("NHS App", { exact: true }).check();
  await page.getByLabel("48 working hours", { exact: true }).check();
  await page.getByLabel("Contact responsible clinician", { exact: true }).check();
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await page.getByText("Choose safeguarding leads · 0 selected", { exact: true }).click();
  await page.getByLabel("Dr Oak — Doctor", { exact: true }).check();
  await page.getByLabel("How should staff raise a concern?").selectOption("person");
  await page.locator("summary").filter({ hasText: "Local confidentiality instructions" }).click();
  await page
    .getByLabel("Local confidentiality instructions")
    .fill("Verify identity and consent before sharing");
  await page
    .locator("summary")
    .filter({ hasText: "Practice-specific safeguarding instructions" })
    .click();
  await page
    .getByLabel("Practice-specific safeguarding instructions")
    .fill("Contact our safeguarding lead via duty team");
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
  expect(saved.modules).toHaveLength(5);
  expect(JSON.stringify(saved.modules)).not.toContain("Unrelated old answer");
  expect(JSON.stringify(saved.modules)).toContain("Contact our safeguarding lead");
  expect(saved.practiceData.address).toBe(defaultPracticeData.address);
  expect(saved.practiceData.rolePolicies.nursesRoutine).toBe(
    defaultPracticeData.rolePolicies.nursesRoutine,
  );
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

test("structured processes preserve legacy guidance and resolve shared staff contacts after reload", async ({
  page,
}) => {
  const backend = await manager(page);
  backend.state().practiceData.repeatEmergency = "";
  await page.goto("/practice/setup?step=2");
  await addPracticeRole(page, "Pharmacist");
  await page.getByLabel("Name", { exact: true }).fill("Sarah Khan");
  await page.getByLabel("Role", { exact: true }).selectOption("Pharmacist");
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  // Employee creation only needs a name and role.
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await page.getByText("Acute illness · 0 selected", { exact: true }).click();
  await expect(
    page.getByLabel("New or worsening infection symptoms", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Clinical triage is required before booking", { exact: true }).check();
  await page.getByLabel("Reception books directly", { exact: true }).check();
  await page.getByRole("button", { name: "+ Add another criterion", exact: true }).click();
  await page.getByLabel("Local criterion 1", { exact: true }).fill("Local pathway example");
  await page
    .getByLabel("Who should reception contact when they are unsure?")
    .selectOption({ label: "Sarah Khan — Pharmacist" });
  await page.getByLabel("How should reception contact them?").selectOption("teams");
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await expect(page.getByLabel("Ordering instructions (including existing guidance)")).toHaveValue(
    defaultPracticeData.repeatOrderMethods,
  );
  await expect(
    page.getByLabel("Use the same contact and method as appointment escalation"),
  ).toBeChecked();
  await expect(page.getByText(/Sarah Khan — Pharmacist\s+Microsoft Teams/)).toBeVisible();
  await page.getByLabel("NHS App", { exact: true }).check();
  await page.getByLabel("48 working hours", { exact: true }).check();
  await page.getByLabel("Contact responsible clinician", { exact: true }).check();
  await page.getByText("More turnaround settings (optional)", { exact: true }).click();
  await page.getByRole("combobox", { name: "Weekends", exact: true }).selectOption("exclude");
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await page.getByRole("button", { name: "3. Team", exact: true }).click();
  await page.getByLabel("Employee name", { exact: true }).fill("Sarah Updated");
  await page.getByRole("button", { name: /^(Save and continue|Continue to Team)$/ }).click();
  await page.reload();
  await expect(page.getByLabel("Local criterion 1", { exact: true })).toHaveValue(
    "Local pathway example",
  );
  await expect(
    page.getByRole("option", { name: "Sarah Updated — Pharmacist", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "5. Prescriptions", exact: true }).click();
  await expect(page.getByText(/Sarah Updated — Pharmacist\s+Microsoft Teams/)).toBeVisible();
  await page.getByText("More turnaround settings (optional)", { exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Weekends", exact: true })).toHaveValue(
    "exclude",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto("/data-hub");
  await expect(page.getByRole("link", { name: "Edit booking configuration" })).toBeVisible();
  await expect(page.getByText(/Use appointment escalation: Sarah Updated/)).toBeVisible();
});

test("urgent contact restoration survives saving and reopening shared mode", async ({ page }) => {
  const backend = await manager(page);
  const p: PracticeData = backend.state().practiceData;
  p.staff = [{ id: "sarah", name: "Sarah", role: "Pharmacist", clinics: "" }];
  p.bookingConfig = bookingFor(p);
  p.bookingConfig.escalation = {
    contact: { kind: "role", role: "Duty GP" },
    method: { id: "teams", other: "" },
    instruction: "",
  };
  p.prescriptionConfig = prescriptionsFor(p);
  p.prescriptionConfig.urgentRoute = {
    source: "separate",
    route: {
      contact: { kind: "staff", staffId: "sarah" },
      method: { id: "phone", other: "789" },
      instruction: "Use the local pharmacy extension",
    },
  };
  await page.goto("/practice/setup?step=4");
  await expect(page.getByLabel("Phone / extension number")).toHaveValue("789");
  await page.getByLabel("Use the same contact and method as appointment escalation").check();
  await expect(page.getByLabel("Phone / extension number")).not.toBeVisible();
  await page.getByRole("button", { name: "Save and exit" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/practice/setup?step=4");
  await expect(
    page.getByLabel("Use the same contact and method as appointment escalation"),
  ).toBeChecked();
  await page.getByLabel("Use the same contact and method as appointment escalation").uncheck();
  await expect(
    page.getByRole("combobox", { name: "Urgent prescription contact", exact: true }),
  ).toHaveValue("staff:sarah");
  await expect(page.getByLabel("Phone / extension number")).toHaveValue("789");
  await expect(page.getByLabel("Contact instructions (including existing guidance)")).toHaveValue(
    "Use the local pharmacy extension",
  );
  await page.getByRole("button", { name: "Save and exit" }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(backend.state().practiceData.prescriptionConfig?.urgentRoute.source).toBe("separate");
});

test("review stays concise while legacy instructions remain editable", async ({ page }) => {
  const backend = await manager(page);
  await page.goto("/practice/setup?step=4");
  const instruction = page.getByLabel("Ordering instructions (including existing guidance)", {
    exact: true,
  });
  await expect(instruction).not.toBeVisible();
  await page.locator("summary").filter({ hasText: "Ordering instructions" }).click();
  await expect(instruction).toHaveValue(defaultPracticeData.repeatOrderMethods);
  await expect(
    page.getByText(/Review this instruction against your current selections/),
  ).toHaveCount(0);
  await instruction.fill("Our local ordering process");
  await page.getByRole("button", { name: "7. Review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Roles", exact: true })).toBeVisible();
  await expect(page.getByText("Our local ordering process", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Save and exit", exact: true }).click();
  expect(backend.state().practiceData.prescriptionConfig?.orderingInstruction).toBe(
    "Our local ordering process",
  );
});
