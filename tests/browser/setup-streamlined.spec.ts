import { addPracticeRole } from "./setup-helpers";
import { test, expect } from "@playwright/test";
for (const mobile of [false, true]) {
  test(`streamlined setup preserves local data and shares role configuration ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth");
    await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
    await page.goto("/practice/setup?step=2");
    await addPracticeRole(page, "Doctor");
    await addPracticeRole(page, "Nurse Practitioner");
    for (const name of ["Catherine Smith", "Sarah Smith", "Emily Smith"]) {
      await page.getByLabel("Name", { exact: true }).fill(name);
      await page.getByLabel("Role", { exact: true }).selectOption("Nurse Practitioner");
      await page.getByRole("button", { name: "Add employee", exact: true }).click();
    }
    await expect(page.getByRole("article").getByRole("checkbox")).toHaveCount(0);
    await expect(
      page.getByText("Existing individual appointment types", { exact: false }),
    ).toHaveCount(0);
    await page
      .getByRole("article", { name: "Employee Catherine Smith" })
      .getByRole("button", { name: "View / edit Nurse Practitioner role", exact: true })
      .click();
    const role = page
      .locator("details")
      .filter({ has: page.locator("summary").filter({ hasText: /^Nurse Practitioner$/ }) })
      .last();
    await expect(
      page.getByRole("heading", { name: "What this role handles", exact: true }),
    ).toHaveCount(1);
    await expect(role.getByLabel("Chest infections", { exact: true })).not.toBeVisible();
    await role.getByText("Minor illness & same-day care · 0 selected", { exact: true }).click();
    await role.getByLabel("Chest infections", { exact: true }).check();
    await role.getByLabel("UTIs", { exact: true }).check();
    await role.getByLabel("UTIs", { exact: true }).uncheck();
    await role.getByText("Minor illness & same-day care · 1 selected", { exact: true }).click();
    await expect(role.getByLabel("Chest infections", { exact: true })).not.toBeVisible();
    await role.getByText("Minor illness & same-day care · 1 selected", { exact: true }).click();
    await role.getByRole("button", { name: "+ Add another request", exact: true }).first().click();
    await role.getByLabel("Custom request name").fill("Local review clinic");
    await role.getByLabel("Select Local review clinic", { exact: true }).check();
    await role.getByRole("button", { name: "+ Add custom category", exact: true }).click();
    await role.getByText("Custom category · 0 selected", { exact: true }).click();
    await role.getByLabel("Custom category name").fill("Local service");
    const custom = role.locator("details").filter({ has: page.getByLabel("Custom category name") });
    await custom.getByRole("button", { name: "+ Add another request", exact: true }).click();
    await custom.getByLabel("Custom request name").fill("Review appointment");
    await custom.getByLabel("Select Review appointment", { exact: true }).check();
    await role.getByRole("button", { name: "Save role", exact: true }).click();
    await expect(role.getByRole("status")).toHaveText("Role saved");
    await role.getByLabel("Custom request name").first().fill("Local review clinic updated");
    await role.getByLabel("Custom category name").fill("Local service updated");
    await custom.getByRole("button", { name: "Remove Review appointment", exact: true }).click();
    await custom.getByRole("button", { name: "Remove category", exact: true }).click();
    await role.getByRole("button", { name: "Save role", exact: true }).click();
    await page.getByRole("button", { name: "Save and exit", exact: true }).click();
    await page.goto("/practice/setup?step=2");
    await expect(page.getByRole("article", { name: "Employee Catherine Smith" })).toBeVisible();
    await page
      .getByRole("article", { name: "Employee Emily Smith" })
      .getByRole("button", { name: "View / edit Nurse Practitioner role", exact: true })
      .click();
    await role.getByText("Minor illness & same-day care · 2 selected", { exact: true }).click();
    await expect(role.getByLabel("Chest infections", { exact: true })).toBeChecked();
    await expect(
      role.getByLabel("Select Local review clinic updated", { exact: true }),
    ).toBeChecked();
    await expect(
      page.getByRole("heading", { name: "What this role handles", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page).toHaveURL(/step=2/);
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page).toHaveURL(/step=3/);
    await page.getByRole("button", { name: /^(Back|Back to Practice)$/, exact: true }).click();
    await expect(page).toHaveURL(/step=2/);
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page).toHaveURL(/step=3/);
    await expect(page.getByRole("heading", { name: "Roles", exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
  });
}
