import { test, expect } from "@playwright/test";
import { initialiseRoleFromTemplate } from "../../src/lib/role-requests";
import { roleTemplates } from "../../src/lib/role-templates";

test("reviewed template selections appear inline and local edits survive restoring and reloading", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
  // Synthetic test-only template, not released clinical guidance.
  const template = structuredClone(roleTemplates.find((t) => t.id === "practice-nurse")!);
  template.suggestions = { status: "reviewed", selectedRequestIds: ["blood-tests"] };
  const role = initialiseRoleFromTemplate(template);
  role.archived = true;
  await page.evaluate((role) => {
    const key = "practiceready-dev-workspace-v2";
    const workspace = JSON.parse(localStorage.getItem(key)!);
    workspace.state.practiceData.roleRequests = { [role.roleId]: role };
    localStorage.setItem(key, JSON.stringify(workspace));
  }, role);
  await page.goto("/practice/setup?step=1");
  const nurse = page.locator('[aria-label="Practice role Practice Nurse"]');
  await page.getByRole("checkbox", { name: "Use Practice Nurse", exact: true }).check();
  await nurse.locator("summary").first().click();
  await nurse.getByText("Tests & procedures · 1 selected", { exact: true }).click();
  await expect(nurse.getByRole("checkbox", { name: "Blood tests", exact: true })).toBeChecked();
  await nurse.getByRole("checkbox", { name: "Blood tests", exact: true }).uncheck();
  await nurse.getByRole("checkbox", { name: "ECG", exact: true }).check();
  await page.getByRole("checkbox", { name: "Use Practice Nurse", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Use Practice Nurse", exact: true }).check();
  await nurse.locator("summary").first().click();
  await nurse.getByText("Tests & procedures · 1 selected", { exact: true }).click();
  await expect(nurse.getByRole("checkbox", { name: "Blood tests", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Continue to Team", exact: true }).click();
  await expect(page).toHaveURL(/step=2/);
  await page.reload();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await nurse.locator("summary").first().click();
  await nurse.getByText("Tests & procedures · 1 selected", { exact: true }).click();
  await expect(nurse.getByRole("checkbox", { name: "ECG", exact: true })).toBeChecked();
  await expect(nurse.getByRole("checkbox", { name: "Blood tests", exact: true })).not.toBeChecked();
});
