import { test, expect } from "@playwright/test";
for (const mobile of [false, true]) {
  test(`streamlined setup preserves local data and shares role configuration ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth");
    await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
    await page.goto("/practice/setup?step=1");
    for (const name of ["Catherine Smith", "Sarah Smith", "Emily Smith"]) {
      await page.getByLabel("Name", { exact: true }).fill(name);
      await page.getByLabel("Role", { exact: true }).fill("Nurse Practitioner");
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
      .filter({ has: page.locator("summary").filter({ hasText: /^Nurse Practitioner ·/ }) })
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
    await page.goto("/practice/setup?step=1");
    await expect(
      page.getByText("Nurse Practitioner · 2 selected · Confirmed", { exact: true }),
    ).toHaveCount(1);
    await page
      .getByRole("article", { name: "Employee Emily Smith" })
      .getByRole("button", { name: "View / edit Nurse Practitioner role", exact: true })
      .click();
    await role.getByText("Minor illness & same-day care · 2 selected", { exact: true }).click();
    await expect(role.getByLabel("Chest infections", { exact: true })).toBeChecked();
    await expect(role.getByLabel("Select Local review clinic updated", { exact: true })).toBeChecked();
    await expect(
      page.getByRole("heading", { name: "What this role handles", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save and continue", exact: true }).click();
    await expect(page).toHaveURL(/step=2/);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page).toHaveURL(/step=1/);
    await page.getByRole("button", { name: "3. Bookings", exact: true }).click();
    await page.getByLabel("At reception", { exact: true }).check();
    await page.getByRole("button", { name: "4. Prescriptions", exact: true }).click();
    await page.getByLabel("Telephone", { exact: true }).check();
    await page.getByLabel("72 working hours", { exact: true }).check();
    await expect(
      page.getByLabel("Ordering instructions (including existing guidance)", { exact: true }),
    ).not.toBeVisible();
    await page.locator("summary").filter({ hasText: "Ordering instructions" }).click();
    await page
      .getByLabel("Ordering instructions (including existing guidance)", { exact: true })
      .fill("Our local ordering note");
    await page.getByRole("button", { name: "5. Safety", exact: true }).click();
    await page
      .getByLabel("Safeguarding lead", { exact: true })
      .selectOption({ label: "Nurse Practitioner" });
    await page
      .getByLabel("How should reception contact them?", { exact: true })
      .selectOption("person");
    await page.locator("summary").filter({ hasText: "Local confidentiality instructions" }).click();
    await page
      .getByLabel("Local confidentiality instructions", { exact: true })
      .fill("Local instruction retained");
    await page.getByRole("button", { name: "Save and continue", exact: true }).click();
    await expect(page).toHaveURL(/step=5/);
    await expect(
      page.getByRole("heading", { name: "Role configuration", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.reload();
    await page.getByRole("button", { name: "4. Prescriptions", exact: true }).click();
    await expect(page.getByLabel("72 working hours", { exact: true })).toBeChecked();
    await page.locator("summary").filter({ hasText: "Ordering instructions" }).click();
    await expect(
      page.getByLabel("Ordering instructions (including existing guidance)", { exact: true }),
    ).toHaveValue("Our local ordering note");
  });
}
