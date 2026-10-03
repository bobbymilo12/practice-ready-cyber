import { test, expect } from "@playwright/test";

for (const width of [390, 768, 1024, 1440]) {
  test(`public pages and contact navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Training built around your practice." }),
    ).toBeVisible();
    await expect(page.locator("main img")).toHaveCount(3);
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.getByRole("link")).toHaveText(["About Us", "FAQs", "Contact Us"]);
    for (const [link, heading] of [
      ["About Us", "Local knowledge. Confident new starters."],
      ["FAQs", "Answers about how PracticeReady works."],
    ]) {
      await nav.getByRole("link", { name: link, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      await page.screenshot({
        path: `test-results/${link === "About Us" ? "about" : "faqs"}-${width}.png`,
        fullPage: true,
      });
      await nav.getByRole("link", { name: "Contact Us", exact: true }).click();
      await expect(page).toHaveURL(/\/contact$/);
      await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeEnabled();
      await expect(
        page.getByRole("heading", { name: "Interested in PracticeReady?" }),
      ).toBeInViewport();
    }
    await page.goto("/contact");
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByLabel("GP practice (optional)")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeEnabled();
    await page.screenshot({ path: `test-results/contact-${width}.png`, fullPage: true });
    await page.goto("/");
    await expect(page.getByRole("form")).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Contact Us", exact: true })).not.toHaveClass(
      /active/,
    );
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("main img")).toHaveCount(3);
    await page.locator("main img").evaluateAll(async (images) => {
      await Promise.all(images.map((img) => (img as HTMLImageElement).decode()));
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const hero = await page.locator(".home-hero").boundingBox();
    const header = await page.locator("header").boundingBox();
    expect(hero?.x).toBe(0);
    expect(hero?.width).toBe(width);
    expect(header!.y + header!.height).toBeLessThan(hero!.y + hero!.height);
    if (width === 1024) expect(hero!.height).toBeLessThanOrEqual(555);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `test-results/marketing-${width}.png`, fullPage: true });
  });
}

test("contact validates, submits, shows loading/success and retains entries on failure", async ({
  page,
}) => {
  await page.goto("/contact");
  const form = page.getByRole("form", { name: "Contact PracticeReady" });
  let submissions = 0;
  let fail = true;
  await page.route("**/api/contact", async (route) => {
    submissions++;
    const body = route.request().postData() ?? "";
    expect(body).toContain("Alex");
    expect(body).toContain("Oak Practice");
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.fulfill(
      fail
        ? { status: 500, contentType: "text/plain", body: "Test failure" }
        : {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result: { success: true } }),
          },
    );
  });
  await form.getByRole("button", { name: "Send message" }).click();
  expect(submissions).toBe(0);
  await form.getByLabel("Name", { exact: true }).fill("Alex");
  await form.getByLabel("Email", { exact: true }).fill("invalid");
  await form.getByLabel("Message", { exact: true }).fill("Please tell us more.");
  await form.getByRole("button", { name: "Send message" }).click();
  expect(submissions).toBe(0);
  await form.getByLabel("Email", { exact: true }).fill("alex@example.test");
  await form.getByLabel("GP practice (optional)").fill("Oak Practice");
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(form.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Your entries have been kept");
  await expect(form.getByLabel("Message", { exact: true })).toHaveValue("Please tell us more.");
  fail = false;
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Thank you for your message." })).toBeVisible();
  expect(submissions).toBe(2);
  await page.getByRole("button", { name: "Send another message" }).click();
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("");
});

test("marketing header retains manager/trainee dashboard routes and logout", async ({ page }) => {
  for (const role of ["Manager", "Trainee"]) {
    await page.goto("/auth");
    await page.getByRole("button", { name: `Continue as ${role}`, exact: true }).click();
    await expect(page).toHaveURL(role === "Manager" ? /dashboard/ : /staff/);
    await page.goto("/");
    await expect(
      page.locator("header").getByRole("link", { name: "Dashboard", exact: true }),
    ).toHaveAttribute("href", role === "Manager" ? "/dashboard" : "/staff");
    await page.locator("header").getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page).toHaveURL(role === "Manager" ? /dashboard/ : /staff/);
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Log out", exact: true }).click();
    await expect(
      page.locator("header").getByRole("link", { name: "Log in", exact: true }),
    ).toBeVisible();
  }
});
