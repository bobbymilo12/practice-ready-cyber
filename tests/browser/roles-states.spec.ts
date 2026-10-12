import { test, expect } from "@playwright/test";
for (const mobile of [false, true]) {
  test(`Roles stay on one page with inline selection and editing (${mobile ? "mobile" : "desktop"})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth");
    await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
    await page.goto("/practice/setup?step=1");
    const role = (name: string) => page.locator(`[aria-label="Practice role ${name}"]`);
    const toggle = (name: string) =>
      page.getByRole("checkbox", { name: `Use ${name}`, exact: true });
    await expect(
      page.getByRole("heading", { name: "Roles at your practice", exact: true }),
    ).toBeVisible();
    for (const name of [
      "Use selected roles",
      "Back to role list",
      "Choose common roles",
      "Add or remove roles",
    ])
      await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
    await expect(page.getByText(/^(Needs review|Configured|Suggested setup ready)$/)).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Back to Practice", exact: true }).click();
    await expect(page).toHaveURL(/step=0/);
    await page.getByRole("button", { name: "Save and continue", exact: true }).click();
    await expect(page).toHaveURL(/step=1/);
    await expect(toggle("Doctor")).toBeChecked();
    await expect(toggle("Doctor")).toBeDisabled();
    const roleOrder = await page
      .getByRole("checkbox", { name: /^Use / })
      .evaluateAll((inputs) => inputs.map((input) => input.getAttribute("aria-label")));
    await toggle("Practice Nurse").check();
    await toggle("Healthcare Assistant").check();
    expect(
      await page
        .getByRole("checkbox", { name: /^Use / })
        .evaluateAll((inputs) => inputs.map((input) => input.getAttribute("aria-label"))),
    ).toEqual(roleOrder);
    await expect(page).toHaveURL(/step=1/);
    await expect(toggle("Paramedic")).not.toBeChecked();
    await role("Practice Nurse").locator("summary").first().click();
    await role("Practice Nurse")
      .getByText("Tests & procedures · 0 selected", { exact: true })
      .click();
    await role("Practice Nurse")
      .getByRole("checkbox", { name: "Blood tests", exact: true })
      .check();
    await role("Practice Nurse").locator("summary").first().click();
    await expect(
      role("Practice Nurse").getByRole("heading", { name: "What this role handles" }),
    ).not.toBeVisible();
    await toggle("Healthcare Assistant").uncheck();
    // Custom roles join the same list and keep their edits when deselected/reselected.
    await page.getByRole("button", { name: "+ Add another role", exact: true }).click();
    await page.getByLabel("Role name", { exact: true }).fill("Local test role");
    await page.getByRole("button", { name: "Add role", exact: true }).click();
    await expect(toggle("Local test role")).toBeChecked();
    await role("Local test role")
      .getByText("Tests & procedures · 0 selected", { exact: true })
      .click();
    await role("Local test role")
      .getByRole("button", { name: "+ Add another request", exact: true })
      .click();
    await page.getByRole("button", { name: "Continue to Team", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Name or remove empty custom entries");
    await role("Local test role").getByLabel("Custom request name").fill("Local booking request");
    await role("Local test role")
      .getByLabel("Select Local booking request", { exact: true })
      .check();
    await toggle("Local test role").uncheck();
    await expect(role("Local test role").locator("summary")).toHaveCount(0);
    await toggle("Local test role").check();
    await role("Local test role").locator("summary").first().click();
    await role("Local test role")
      .getByText("Tests & procedures · 1 selected", { exact: true })
      .click();
    await expect(
      role("Local test role").getByLabel("Select Local booking request", { exact: true }),
    ).toBeChecked();
    // No per-role confirmation needed: Continue saves and confirms the page together.
    await page.getByRole("button", { name: "Continue to Team", exact: true }).click();
    await expect(page).toHaveURL(/step=2/);
    await page.getByLabel("Name", { exact: true }).fill("Catherine");
    await page.getByLabel("Role", { exact: true }).selectOption("Practice Nurse");
    await expect(
      page
        .getByLabel("Role", { exact: true })
        .locator("option", { hasText: "Healthcare Assistant" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Add employee", exact: true }).click();
    await page.getByRole("button", { name: "Customise for Catherine", exact: true }).click();
    const exceptions = page.getByRole("region", { name: "Customise Catherine", exact: true });
    await exceptions.getByText("Tests & procedures · No exceptions", { exact: true }).click();
    await expect(
      exceptions.getByRole("checkbox", { name: "Blood tests", exact: true }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Save and exit", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/practice/setup?step=1");
    await expect(toggle("Practice Nurse")).toBeChecked();
    await expect(toggle("Healthcare Assistant")).not.toBeChecked();
    await expect(toggle("Local test role")).toBeChecked();
    await role("Practice Nurse").locator("summary").first().click();
    await role("Practice Nurse")
      .getByText("Tests & procedures · 1 selected", { exact: true })
      .click();
    await expect(
      role("Practice Nurse").getByRole("checkbox", { name: "Blood tests", exact: true }),
    ).toBeChecked();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
  });
}
