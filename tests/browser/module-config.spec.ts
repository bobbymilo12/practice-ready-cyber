import { test, expect } from "@playwright/test";

const topics = [
  "appointment-booking",
  "prescriptions",
  "urgent",
  "results",
  "vaccines",
  "fit-notes",
  "home-visits",
  "difficult",
  "first-week",
];

test("all predefined topics reuse shared practice rules and expose Training Type plus Length", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  for (const topic of topics) {
    const step = topic === "appointment-booking" ? 3 : topic === "prescriptions" ? 5 : 6;
    await page.goto("/practice/setup?step=" + step);
    if (step === 6) await page.getByLabel("Topic", { exact: true }).selectOption(topic);
    const rule = "For this " + topic + " test request, use the agreed reception inbox.";
    await page.getByLabel("Additional confirmed instruction", { exact: true }).fill(rule);
    await page
      .getByRole("group", { name: "Additional confirmed instruction", exact: true })
      .getByRole("button", { name: "Add", exact: true })
      .click();
    await page.goto("/modules/setup?topic=" + topic + "&title=" + topic);
    await page.getByRole("button", { name: "Choose Training Type & Length", exact: true }).click();
    await expect(page.getByRole("group", { name: "Training Type", exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Learn/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /^Handle/ })).toBeDisabled();
    await expect(page.getByText("Difficulty", { exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: /Custom length/ }).check();
    await page.getByRole("spinbutton", { name: "Number of scenarios", exact: true }).fill("1");
    await page.getByRole("button", { name: "Create module", exact: true }).click();
    await expect(page.getByText(rule).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(rule).first()).toBeVisible();
  }
});

test("Custom retains module-specific instructions with the same type and length controls", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  await page.goto("/modules/setup?topic=custom&title=Custom");
  await expect(
    page.getByText("What should staff do for the main task?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose Training Type & Length", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Apply/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Standard/ })).toBeChecked();
  await expect(page.getByText("Difficulty", { exact: true })).toHaveCount(0);
});
