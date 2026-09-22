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
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByLabel("NHS App", { exact: true }).check();
  await page.getByLabel("48 working hours", { exact: true }).check();
  await page.getByLabel("Contact responsible clinician", { exact: true }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page
    .getByLabel("Confidentiality process")
    .fill("Verify identity and consent before sharing");
  await page.getByLabel("Safeguarding process").fill("Contact our safeguarding lead via duty team");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(/Dr Oak · Doctor: Routine appointments/)).toBeVisible();
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

test("inline appointment types use role defaults and preserve individual overrides", async ({
  page,
}) => {
  await manager(page);
  await page.goto("/practice/setup?step=1");
  for (const name of ["Alex", "Robin"]) {
    await page.getByRole("button", { name: "Add team member", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).last().fill(name);
    await page.getByLabel("Role", { exact: true }).last().fill("Nurse Practitioner");
    await page.getByLabel("Clinics or responsibilities").last().fill("Clinical appointments");
  }
  const cards = page
    .locator("div.rounded-xl")
    .filter({ has: page.getByLabel("Name", { exact: true }) });
  const alex = cards.nth(0);
  const robin = cards.nth(1);
  await expect(alex.getByText("Edit appointment types (9 selected)")).toBeVisible();
  await expect(alex.getByLabel("Breast examination", { exact: true })).not.toBeVisible();
  await alex.getByText("Edit appointment types (9 selected)").click();
  await alex.getByLabel("Breast examination", { exact: true }).uncheck();
  await expect(alex.getByText("Edit appointment types (8 selected)")).toBeVisible();
  await alex.getByLabel("Medication review", { exact: true }).check();
  await expect(alex.getByText("Edit appointment types (9 selected)")).toBeVisible();
  await robin.getByText("Edit appointment types (9 selected)").click();
  await expect(robin.getByLabel("Breast examination", { exact: true })).toBeChecked();
  await expect(robin.getByLabel("Medication review", { exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByRole("heading", { name: "How are appointments handled?" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await alex.getByText("Edit appointment types (9 selected)").click();
  await expect(alex.getByLabel("Breast examination", { exact: true })).not.toBeChecked();
  await expect(alex.getByLabel("Medication review", { exact: true })).toBeChecked();
  await robin.getByLabel("Role", { exact: true }).fill("HCA");
  await expect(robin.getByText("Edit appointment types (4 selected)")).toBeVisible();
  await robin.getByLabel("Role", { exact: true }).fill("Reception");
  await expect(robin.getByText(/Edit appointment types/)).toHaveCount(0);
  await robin.getByLabel("Role", { exact: true }).fill("Practice Nurse");
  await expect(robin.getByText("Edit appointment types (7 selected)")).toBeVisible();
  await expect(
    page.getByText("Clinical team member — configure appointment capabilities"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Setup steps" }).getByRole("button"),
  ).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("structured processes preserve legacy guidance and resolve shared staff contacts after reload", async ({
  page,
}) => {
  const backend = await manager(page);
  backend.state().practiceData.repeatEmergency = "";
  await page.goto("/practice/setup?step=1");
  await page.getByRole("button", { name: "Add team member", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Sarah Khan");
  await page.getByLabel("Role", { exact: true }).fill("Pharmacist");
  // No responsibility text is required for a role with appointment defaults.
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(
    page.getByLabel("New or worsening infection symptoms", { exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Fever in a child", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ Add another criterion", exact: true }).click();
  await page.getByLabel("Local criterion 1", { exact: true }).fill("Local pathway example");
  await page
    .getByLabel("Who should reception contact when they are unsure?")
    .selectOption({ label: "Sarah Khan — Pharmacist" });
  await page.getByLabel("How should reception contact them?").selectOption("teams");
  await page.getByRole("button", { name: "Save and continue" }).click();
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
  await page.getByRole("combobox", { name: "Weekends", exact: true }).selectOption("exclude");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByRole("button", { name: "2. Team", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Sarah Updated");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.reload();
  await expect(page.getByLabel("Local criterion 1", { exact: true })).toHaveValue(
    "Local pathway example",
  );
  await expect(
    page.getByRole("option", { name: "Sarah Updated — Pharmacist", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "4. Prescriptions", exact: true }).click();
  await expect(page.getByText(/Sarah Updated — Pharmacist\s+Microsoft Teams/)).toBeVisible();
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
  await page.goto("/practice/setup?step=3");
  await expect(page.getByLabel("Phone / extension number")).toHaveValue("789");
  await page.getByLabel("Use the same contact and method as appointment escalation").check();
  await expect(page.getByText(/Your separate contact details are retained/)).toBeVisible();
  await page.getByRole("button", { name: "Save and exit" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/practice/setup?step=3");
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

test("review highlights unconfirmed and legacy settings, prompts instruction checks and shows appointment overrides", async ({
  page,
}) => {
  const backend = await manager(page);
  const p: PracticeData = backend.state().practiceData;
  p.dutyContact = "Use the duty rota";
  p.rolePolicies.gpsSameDay = "Use our agreed pathway";
  p.staff = [
    {
      id: "alex",
      name: "Alex",
      role: "Pharmacist",
      clinics: "Legacy responsibilities",
      appointmentCapabilities: {
        defaults: { "medication-review": true },
        overrides: { "medication-review": false, "bp-check": true },
      },
    },
  ];
  await page.goto("/practice/setup?step=3");
  await page.getByLabel("Telephone", { exact: true }).check();
  const instruction = page.getByLabel("Ordering instructions (including existing guidance)");
  await expect(instruction).toHaveValue(defaultPracticeData.repeatOrderMethods);
  await expect(
    page.getByText(/Review this instruction against your current selections/),
  ).toBeVisible();
  await expect(instruction).toHaveAttribute("aria-describedby", /.+/);
  await page.getByRole("button", { name: "6. Review", exact: true }).click();
  await expect(
    page.getByText(/Existing guidance only — awaiting structured review:.*Appointment escalation/),
  ).toBeVisible();
  await expect(
    page.getByText(/Not yet confirmed:.*Weekend turnaround rules.*Bank-holiday turnaround rules/),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Local instructions to check against current selections:.*Prescription ordering/,
    ),
  ).toBeVisible();
  const team = page.getByText(/Alex · Pharmacist: Legacy responsibilities/);
  await expect(team).toContainText("Appointment types (1 selected): Blood pressure check");
  await expect(team).not.toContainText("Medication review");
  await page.getByRole("button", { name: "Edit prescriptions", exact: true }).click();
  await page.getByRole("combobox", { name: "Weekends", exact: true }).selectOption("exclude");
  await page.getByRole("combobox", { name: "Bank holidays", exact: true }).selectOption("exclude");
  await instruction.fill("Telephone requests accepted through the reception team");
  await page.getByRole("button", { name: "Save and exit" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/practice/setup?step=5");
  await expect(page.getByText(/Not yet confirmed:.*Weekend turnaround rules/)).toHaveCount(0);
  await expect(
    page.getByText(/Telephone requests accepted through the reception team/),
  ).toBeVisible();
});
