import { test, expect } from "@playwright/test";

const topics = [
  ["appointment-booking", "Appointment booking"],
  ["prescriptions", "Prescription requests"],
  ["urgent", "Urgent symptoms & escalation"],
  ["results", "Test results & confidentiality"],
  ["vaccines", "Vaccine bookings"],
  ["fit-notes", "Fit notes"],
  ["home-visits", "Home visit requests"],
  ["difficult", "Difficult calls & de-escalation"],
  ["first-week", "First week on reception"],
];
test("every topic uses shared configuration and module controls", async ({ page }) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  test.setTimeout(60000);
  for (const [topic, title] of topics) {
    await page.goto(`/modules/setup?topic=${topic}&title=${encodeURIComponent(title)}`);
    await expect(
      page.getByRole("heading", { name: "Confirm how your practice works" }),
    ).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    expect(await page.locator("fieldset fieldset").count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole("radio").first()).toBeVisible();
    expect(
      await page.getByRole("button", { name: "+ Add another option", exact: true }).count(),
    ).toBe(await page.locator("fieldset fieldset").count());
    await expect(
      page.getByText("+ Add something specific to your practice", { exact: true }),
    ).toBeVisible();
    await page.getByText("+ Add something specific to your practice", { exact: true }).click();
    await page
      .getByLabel("Additional local rule or procedure")
      .fill(`Confirmed ${topic} handover: use the local inbox.`);
    await page.getByRole("button", { name: "Choose module length + difficulty" }).click();
    await expect(
      page.getByRole("heading", { name: "How long should this module be?" }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: /Standard/ })).toBeChecked();
    await page.getByRole("radio", { name: /Custom length/ }).check();
    await page.getByRole("spinbutton", { name: "Number of scenarios", exact: true }).fill("0");
    await expect(page.getByRole("button", { name: "Create module", exact: true })).toBeDisabled();
    await page.getByRole("spinbutton", { name: "Number of scenarios", exact: true }).fill("1");
    await page.getByRole("button", { name: "Create module", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Review draft scenarios" })).toBeVisible();
    await expect(
      page.getByText(`Confirmed ${topic} handover: use the local inbox.`).first(),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("1 scenarios · Requested length: custom (1)")).toBeVisible();
  }
  await page.goto("/modules/setup?topic=custom&title=Manual");
  await expect(
    page.getByText("What should staff do for the main task?", { exact: true }),
  ).toBeVisible();
});

test("module settings persist, can be edited and regenerate into unapproved scenarios", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  await page.goto("/modules/setup?topic=results&title=Test%20results");
  await page
    .getByRole("radio", { name: "All result enquiries go to the reviewing clinician", exact: true })
    .check();
  await page.getByText("+ Add something specific to your practice", { exact: true }).click();
  await page
    .getByLabel("Additional local rule or procedure")
    .fill("Use the local results inbox for a handover.");
  await page.getByRole("button", { name: "Choose module length + difficulty" }).click();
  await page.getByRole("radio", { name: /Custom length/ }).check();
  await page.getByRole("spinbutton", { name: "Number of scenarios", exact: true }).fill("2");
  await page.getByRole("button", { name: "Create module", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review draft scenarios" })).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "Edit settings and regenerate module" }).click();
  await expect(
    page.getByRole("radio", {
      name: "All result enquiries go to the reviewing clinician",
      exact: true,
    }),
  ).toBeChecked();
  await expect(page.getByLabel("Additional local rule or procedure")).toHaveValue(
    "Use the local results inbox for a handover.",
  );
  await page.getByRole("button", { name: "Choose module length + difficulty" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Number of scenarios", exact: true }),
  ).toHaveValue("2");
  await page.getByRole("spinbutton", { name: "Number of scenarios", exact: true }).fill("1");
  await page.getByRole("button", { name: "Save settings and regenerate" }).click();
  await expect(page.getByText("1 scenarios · Requested length: custom (1)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish module" }).first()).toBeDisabled();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.getByRole("combobox", { name: "Best answer", exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  for (const button of await page.getByRole("button", { name: "Approve", exact: true }).all())
    await button.click();
  await expect(page.getByRole("button", { name: "Publish module" }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Publish module" }).first().click();
  await expect(page).toHaveURL(/dashboard/);
});

for (const topic of ["appointment-booking", "prescriptions"]) {
  test(`${topic}: saved setup, visible choices, custom answers and module information survive generation and reload`, async ({
    page,
  }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
    await page.goto(`/modules/setup?topic=${topic}&title=${topic}`);
    await page.getByText(/View saved procedures/).click();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    if (topic === "appointment-booking") {
      await expect(page.getByText("Same-day booking", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("group", {
          name: "How are appropriate same-day requests normally handled?",
          exact: true,
        }),
      ).toHaveCount(0);
      const parent = page.getByRole("group", {
        name: "What happens if a patient requests a particular GP or clinician?",
        exact: true,
      });
      await parent
        .getByRole("radio", {
          name: "It depends on whether the request is routine or same-day",
          exact: true,
        })
        .check();
      const followup = page.getByRole("group", {
        name: "Which processes apply when the clinician preference cannot be met?",
        exact: true,
      });
      await expect(followup).toBeVisible();
      await followup.getByRole("checkbox").nth(0).check();
      await followup.getByRole("checkbox").nth(1).check();
      await expect(followup.getByRole("checkbox").nth(0)).toBeChecked();
      await expect(followup.getByRole("checkbox").nth(1)).toBeChecked();
      await parent
        .getByRole("radio", {
          name: "Send the preference to the booking team for review",
          exact: true,
        })
        .check();
      await expect(followup).toHaveCount(0);
      await parent
        .getByRole("radio", {
          name: "It depends on whether the request is routine or same-day",
          exact: true,
        })
        .check();
      await expect(followup.getByRole("checkbox").nth(0)).toBeChecked();
    } else {
      await expect(page.getByText("Repeat requests", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("group", {
          name: "How should an urgent prescription request be handed over?",
          exact: true,
        }),
      ).toHaveCount(0);
      const multi = page.getByRole("group", {
        name: "How should a non-repeat prescription request be submitted?",
        exact: true,
      });
      await multi.getByRole("checkbox", { name: "NHS App", exact: true }).check();
      await multi.getByRole("checkbox", { name: "Telephone", exact: true }).check();
      await expect(multi.getByRole("checkbox", { name: "NHS App", exact: true })).toBeChecked();
      await expect(multi.getByRole("checkbox", { name: "Telephone", exact: true })).toBeChecked();
      await multi.getByRole("checkbox", { name: /We don’t want/ }).check();
      await expect(multi.getByRole("checkbox", { name: "NHS App", exact: true })).not.toBeChecked();
      await multi.getByRole("checkbox", { name: "NHS App", exact: true }).check();
      await expect(multi.getByRole("checkbox", { name: /We don’t want/ })).not.toBeChecked();
    }
    const label =
      topic === "appointment-booking"
        ? "When the appropriate appointment is unavailable, what should reception do?"
        : "What happens when a patient chases a prescription beyond the recorded turnaround?";
    const group = page.getByRole("group", { name: label, exact: true });
    const local = `Send the ${topic} request to our local review inbox`;
    await group.getByRole("radio").first().check();
    await group.getByRole("button", { name: "+ Add another option", exact: true }).click();
    await group.getByLabel("Your additional option", { exact: true }).fill(local);
    await group.getByRole("button", { name: "Add", exact: true }).click();
    await expect(group.getByRole("radio", { name: local, exact: true })).not.toBeChecked();
    await group.getByRole("radio", { name: local, exact: true }).check();
    await expect(group.getByRole("radio").first()).not.toBeChecked();
    await page.getByText("+ Add something specific to your practice", { exact: true }).click();
    await page
      .getByLabel("Additional local rule or procedure")
      .fill("Record the local handover reference in the request.");
    await page.getByRole("button", { name: "Choose module length + difficulty" }).click();
    await page.getByRole("radio", { name: /Thorough/ }).check();
    await page.getByRole("button", { name: "Create module", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Review draft scenarios" })).toBeVisible();
    await expect(page.getByText(local).first()).toBeVisible();
    await expect(
      page.getByText("Record the local handover reference in the request.").first(),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("link", { name: "Edit settings and regenerate module" }).click();
    await expect(page.getByRole("radio", { name: local, exact: true })).toBeChecked();
    if (topic === "prescriptions")
      await expect(page.getByRole("checkbox", { name: "NHS App", exact: true })).toBeChecked();
    await expect(page.getByLabel("Additional local rule or procedure")).toHaveValue(
      "Record the local handover reference in the request.",
    );
    await page.getByRole("button", { name: "Choose module length + difficulty" }).click();
    await expect(page.getByRole("radio", { name: /Thorough/ })).toBeChecked();
  });
}
