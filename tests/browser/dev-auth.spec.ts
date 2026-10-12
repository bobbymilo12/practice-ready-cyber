import { test, expect } from "@playwright/test";

test("local mock roles save isolated data, resume training and enforce trainee routes", async ({
  page,
}) => {
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
  // Changing practice information puts induction modules back into manager review.
  await page.goto("/modules/review?id=dev-module-0");
  await page.getByRole("button", { name: "Publish module", exact: true }).first().click();
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
  await page.goto("/train?id=dev-module-0");
  await page.getByRole("button", { name: "Begin training" }).click();
  await page
    .getByRole("button", {
      name: "Use the process from a previous workplace without checking local guidance.",
    })
    .click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByText("Your checked answer is recorded and cannot be changed.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Your checked answer is recorded and cannot be changed.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  // Complete remaining primary and recovery questions using each recorded rule (second option).
  for (let i = 0; i < 2; i++) {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const w = JSON.parse(localStorage.getItem("practiceready-dev-workspace-v1")!);
          return w.sessions[0].index;
        }),
      )
      .toBe(i + 1);
    // Use the persisted mock scenario to choose the actual approved answer.
    const label = await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem("practiceready-dev-workspace-v1")!);
      const s = w.sessions[0];
      const q = s.scenarios.find((q: { id: string }) => q.id === s.queue[s.index]);
      return q.options[q.correctIndex] as string;
    });
    await page.getByRole("button", { name: label }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page
      .getByRole("button", { name: i === 0 ? "Continue →" : "Review answers →", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Submit module" }).click();
  await expect(page).toHaveURL(/\/results/);
  await page.getByRole("link", { name: "Switch mock role" }).click();
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  await expect(page.getByText("Jamie Example (Mock Trainee)").first()).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/auth/);
  expect(await page.evaluate(() => sessionStorage.getItem("practiceready-dev-role-v1"))).toBeNull();
});
