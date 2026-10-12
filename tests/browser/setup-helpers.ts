import { expect, type Page } from "@playwright/test";
export async function addPracticeRole(page: Page, name: string) {
  await page.goto("/practice/setup?step=1");
  await page.getByRole("button", { name: "+ Add another role", exact: true }).click();
  await page.getByLabel("Role name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Add role", exact: true }).click();
  await page.getByRole("button", { name: "Save role", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Role saved" })).toBeVisible();
  await page.getByRole("button", { name: "3. Team", exact: true }).click();
}
