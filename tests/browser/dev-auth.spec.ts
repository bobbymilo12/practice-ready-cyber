import { test, expect } from "@playwright/test";

test("local mock roles save isolated data and enforce trainee routes", async ({ page }) => {
  test.setTimeout(60000);
  const requests: string[] = [];
  await page.route("https://**.supabase.co/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
  await expect(page.getByText(/Development only · Mock manager/)).toBeVisible();
  await page.goto("/practice/setup");
  await page
    .getByRole("textbox", { name: "Practice name", exact: true })
    .fill("Edited Mock Practice");
  await page.getByRole("button", { name: "Save and exit" }).click();
  await page.reload();
  await expect(page.getByText("Edited Mock Practice", { exact: true })).toBeVisible();
  await page.goto("/trainees/invite");
  await page.getByLabel("Trainee work email").fill("another@example.test");
  await page.getByLabel("Name", { exact: true }).fill("Another Example");
  await page.getByRole("button", { name: "Invite employee" }).click();
  await expect(page.getByText("Mock trainee added", { exact: true })).toBeVisible();
  await expect(page.getByText(/No email was sent/)).toBeVisible();
  await page.getByRole("link", { name: "Switch mock role" }).click();
  await page.getByRole("button", { name: "Continue as Trainee", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your training", exact: true })).toBeVisible();
  await expect(page.getByText(/Edited Mock Practice/)).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/staff$/);
  await page.getByRole("link", { name: "Switch mock role" }).click();
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  await expect(page.getByText("Jamie Example (Mock Trainee)").first()).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/auth/);
  expect(await page.evaluate(() => sessionStorage.getItem("practiceready-dev-role-v1"))).toBeNull();
});
