import { addPracticeRole } from "./setup-helpers";
import { test, expect, type Page } from "@playwright/test";

for (const mobile of [false, true]) {
  test(`employee exceptions inherit role changes and persist (${mobile ? "mobile" : "desktop"})`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth");
    await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
    await page.goto("/practice/setup?step=2");
    await addPracticeRole(page, "Nurse Practitioner");
    for (const name of ["Catherine", "Sarah"]) {
      await page.getByLabel("Name", { exact: true }).fill(name);
      await page.getByLabel("Role", { exact: true }).selectOption("Nurse Practitioner");
      await page.getByRole("button", { name: "Add employee", exact: true }).click();
    }
    const employee = (name: string) =>
      page.getByRole("article", { name: `Employee ${name}`, exact: true });
    await expect(employee("Catherine").getByRole("checkbox")).toHaveCount(0);
    const role = page
      .locator("details")
      .filter({ has: page.locator("summary").filter({ hasText: /^Nurse Practitioner$/ }) })
      .last();
    await employee("Catherine")
      .getByRole("button", { name: "View / edit Nurse Practitioner role", exact: true })
      .click();
    await role.getByText("Women's health · 0 selected", { exact: true }).click();
    await role.getByLabel("Breast examination", { exact: true }).check();
    await role.getByText("Minor illness & same-day care · 0 selected", { exact: true }).click();
    await role.getByLabel("Chest infections", { exact: true }).check();
    await role.getByText("Long-term condition care · 0 selected", { exact: true }).click();
    const longTerm = role
      .locator("details")
      .filter({ has: page.locator("summary").filter({ hasText: /^Long-term condition care/ }) });
    await longTerm.getByRole("button", { name: "+ Add another request", exact: true }).click();
    await longTerm.getByLabel("Custom request name").fill("Specialist diabetes clinic");
    await role.getByRole("button", { name: "Save role", exact: true }).click();
    await expect(role.getByRole("status")).toHaveText("Role saved");
    await page.getByRole("button", { name: "3. Team", exact: true }).click();
    async function customise(name: string) {
      await employee(name)
        .getByRole("button", { name: `Customise for ${name}`, exact: true })
        .click();
      return page.getByRole("region", { name: `Customise ${name}`, exact: true });
    }
    await addPracticeRole(page, "Nurse Practitioner");
    for (const name of ["Catherine", "Sarah"]) {
      const editor = await customise(name);
      await expect(editor.getByLabel("Breast examination", { exact: true })).not.toBeVisible();
      await editor.getByText("Women's health · No exceptions", { exact: true }).click();
      await expect(editor.getByLabel("Breast examination", { exact: true })).toBeChecked();
    }
    let editor = await customise("Catherine");
    await editor.getByText("Women's health · No exceptions", { exact: true }).click();
    await editor.getByLabel("Breast examination", { exact: true }).uncheck();
    await expect(editor.getByText("Women's health · 1 exception", { exact: true })).toBeVisible();
    await editor.getByText("Long-term condition care · No exceptions", { exact: true }).click();
    await editor.getByLabel("Specialist diabetes clinic", { exact: true }).check();
    await editor.getByRole("button", { name: "Save exceptions", exact: true }).click();
    await expect(editor.getByRole("status")).toHaveText("Employee exceptions saved");
    await page.reload();
    editor = await customise("Catherine");
    await editor.getByText("Women's health · 1 exception", { exact: true }).click();
    await expect(editor.getByLabel("Breast examination", { exact: true })).not.toBeChecked();
    await editor.getByText("Long-term condition care · 1 exception", { exact: true }).click();
    await expect(editor.getByLabel("Specialist diabetes clinic", { exact: true })).toBeChecked();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    // Edit a default; unaffected requests inherit it while explicit exceptions remain.
    await employee("Sarah")
      .getByRole("button", { name: "View / edit Nurse Practitioner role", exact: true })
      .click();
    await role.getByText("Minor illness & same-day care · 1 selected", { exact: true }).click();
    await role.getByLabel("Chest infections", { exact: true }).uncheck();
    await role.getByLabel("UTIs", { exact: true }).check();
    await role.getByRole("button", { name: "Save role", exact: true }).click();
    await expect(role.getByRole("status")).toHaveText("Role saved");
    await page.getByRole("button", { name: "3. Team", exact: true }).click();
    await addPracticeRole(page, "Nurse Practitioner");
    for (const name of ["Catherine", "Sarah"]) {
      editor = await customise(name);
      await editor
        .getByText("Minor illness & same-day care · No exceptions", { exact: true })
        .click();
      await expect(editor.getByLabel("Chest infections", { exact: true })).not.toBeChecked();
      await expect(editor.getByLabel("UTIs", { exact: true })).toBeChecked();
      await editor
        .getByText(`Women's health · ${name === "Catherine" ? "1 exception" : "No exceptions"}`, {
          exact: true,
        })
        .click();
      await expect(editor.getByLabel("Breast examination", { exact: true })).toBeChecked({
        checked: name === "Sarah",
      });
    }
    editor = await customise("Catherine");
    await editor.getByText("Women's health · 1 exception", { exact: true }).click();
    await editor
      .getByRole("button", { name: "Reset Breast examination to role default", exact: true })
      .click();
    await expect(editor.getByLabel("Breast examination", { exact: true })).toBeChecked();
    await expect(
      editor.getByRole("button", { name: "Reset Breast examination to role default", exact: true }),
    ).toHaveCount(0);
    await editor.getByRole("button", { name: "Save exceptions", exact: true }).click();
    await expect(editor.getByRole("status")).toHaveText("Employee exceptions saved");
    const remaining = await readOverrides(page);
    expect(Object.values(remaining!["role:nurse practitioner"])).toEqual([true]);
    await editor
      .getByRole("button", { name: "Reset all to Nurse Practitioner defaults", exact: true })
      .click();
    await editor.getByRole("button", { name: "Save exceptions", exact: true }).click();
    await expect(editor.getByRole("status")).toHaveText("Employee exceptions saved");
    expect(await readOverrides(page)).toBeUndefined();
    await page.reload();
    editor = await customise("Catherine");
    await editor.getByText("Long-term condition care · No exceptions", { exact: true }).click();
    await expect(
      editor.getByLabel("Specialist diabetes clinic", { exact: true }),
    ).not.toBeChecked();
    await page
      .getByRole("button", { name: /^(Save and continue|Continue to Team)$/, exact: true })
      .click();
    await expect(page).toHaveURL(/step=3/);
  });
}
async function readOverrides(page: Page) {
  return page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem("practiceready-dev-workspace-v1")!);
    return w.state.practiceData.staff.find((s: { name: string }) => s.name === "Catherine")
      .requestOverrides as Record<string, Record<string, boolean>> | undefined;
  });
}
