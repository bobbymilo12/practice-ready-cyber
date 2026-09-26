import { test, expect } from "@playwright/test";
import { addPracticeRole } from "./setup-helpers";
for (const mobile of [false, true]) {
  test(`seven-step setup and named safeguarding leads (${mobile ? "mobile" : "desktop"})`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth");
    await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
    await page.goto("/practice/setup");
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Roles at your practice", exact: true }),
    ).toBeVisible();
    await addPracticeRole(page, "Nurse Practitioner");
    for (const name of ["Catherine", "Sarah"]) {
      await page.getByLabel("Name", { exact: true }).fill(name);
      await page.getByLabel("Role", { exact: true }).selectOption("Nurse Practitioner");
      await page.getByRole("button", { name: "Add employee", exact: true }).click();
    }
    await expect(
      page.getByRole("heading", { name: "What this role handles", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page).toHaveURL(/step=3/);
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page).toHaveURL(/step=4/);
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page).toHaveURL(/step=5/);
    await page.getByText("Choose safeguarding leads · 0 selected", { exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Duty GP", exact: true })).toHaveCount(0);
    await page.getByLabel("Search team members").fill("Catherine");
    await page.getByLabel("Catherine — Nurse Practitioner", { exact: true }).check();
    await expect(page.getByLabel("Sarah — Nurse Practitioner", { exact: true })).toHaveCount(0);
    await page.getByLabel("Search team members").fill("");
    await page.getByLabel("Sarah — Nurse Practitioner", { exact: true }).check();
    await page.getByLabel("How should staff raise a concern?").selectOption("teams");
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page).toHaveURL(/step=6/);
    for (const title of ["Practice", "Roles", "Team", "Bookings", "Prescriptions", "Safety"])
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Edit safety", exact: true }).click();
    await page.getByText("Choose safeguarding leads · 2 selected", { exact: true }).click();
    await expect(page.getByLabel("Catherine — Nurse Practitioner", { exact: true })).toBeChecked();
    await expect(page.getByLabel("Sarah — Nurse Practitioner", { exact: true })).toBeChecked();
    await page.getByRole("button", { name: "3. Team", exact: true }).click();
    const employee = page.getByRole("article", { name: "Employee Catherine", exact: true });
    await employee.getByLabel("Employee name").fill("Catherine Jones");
    await page
      .getByRole("article", { name: "Employee Catherine Jones", exact: true })
      .getByLabel("Employee role")
      .selectOption("Doctor");
    await page.getByRole("button", { name: "6. Safety", exact: true }).click();
    await expect(
      page.getByText("Catherine Jones — Doctor; Sarah — Nurse Practitioner", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "3. Team", exact: true }).click();
    await page.getByRole("button", { name: "Remove Sarah", exact: true }).click();
    await page.getByRole("button", { name: "6. Safety", exact: true }).click();
    await expect(
      page.getByText(/A selected safeguarding lead is no longer available/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("no longer available");
    await expect(page).toHaveURL(/step=5/);
    await page.getByRole("button", { name: "Remove unavailable lead", exact: true }).click();
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await page.getByRole("button", { name: "Edit roles", exact: true }).click();
    await expect(page).toHaveURL(/step=1/);
    // All seven direct navigation buttons and Back remain usable.
    const steps = ["Practice", "Roles", "Team", "Bookings", "Prescriptions", "Safety", "Review"];
    for (let i = 0; i < steps.length; i++) {
      await page.getByRole("button", { name: `${i + 1}. ${steps[i]}`, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`step=${i}`));
    }
    await page.getByRole("button", { name: /^(Back|Back to Practice)$/, exact: true }).click();
    await expect(page).toHaveURL(/step=5/);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.getByRole("button", { name: "Save and exit", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/practice/setup?step=2");
    await expect(
      page.getByRole("article", { name: "Employee Catherine Jones", exact: true }),
    ).toBeVisible();
    while (await page.getByRole("article").count())
      await page
        .getByRole("article")
        .first()
        .getByRole("button", { name: /^Remove / })
        .click();
    await page.getByRole("button", { name: "6. Safety", exact: true }).click();
    await expect(page.getByText(/No team members have been added yet/)).toBeVisible();
    await page.getByRole("link", { name: "Add team members", exact: true }).click();
    await expect(page).toHaveURL(/step=2/);
  });
}
