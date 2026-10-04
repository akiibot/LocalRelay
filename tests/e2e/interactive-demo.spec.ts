import { test, expect, type Page } from "@playwright/test";
async function click(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}
async function visit(page: Page, scenario = "Standard offer") {
  await page.goto("/demo");
  if (scenario !== "Standard offer")
    await page.getByRole("button", { name: new RegExp(scenario) }).click();
  await click(page, "Use preset manual form");
  await expect(
    page.getByText("Preset manual form", { exact: true }),
  ).toBeVisible();
  await click(page, "Confirm sample details");
  await click(page, "Send simulated enquiry");
}
async function agree(page: Page) {
  await click(page, "Send offer SMS");
  await click(page, "Check sender & review reply");
  await click(page, "Accept reviewed offer");
  await click(page, "Send acceptance SMS");
  await click(page, "Send acknowledgement SMS");
  await click(page, "Record matching acknowledgement");
}
test("click-only standard and alternative agreements use matching SMS with no real request writes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Ready for offline use", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole("link", { name: "Try the interactive two-phone demo" })
    .click();
  const errors: string[] = [];
  const outbound: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.postData() || r.url().startsWith("sms:")) outbound.push(r.url());
  });
  await visit(page);
  await agree(page);
  await expect(
    page.getByRole("heading", { name: "Agreement recorded", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByLabel("Visitor SMS conversation").locator("article"),
  ).toHaveCount(4);
  const standard = await page
    .getByLabel("Operator SMS conversation")
    .locator("article")
    .last()
    .innerText();
  expect(standard).toContain(" 5 ");
  expect(standard).toContain("15:00 1500");
  await page.screenshot({
    path: "test-results/demo/standard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Different time/ }).click();
  await click(page, "Use preset manual form");
  await click(page, "Confirm sample details");
  await click(page, "Send simulated enquiry");
  await click(page, "Send offer SMS");
  await click(page, "Check sender & review reply");
  await expect(page.getByText(/Different date or time/)).toBeVisible();
  await click(page, "Accept reviewed offer");
  await click(page, "Send acceptance SMS");
  await click(page, "Send acknowledgement SMS");
  await click(page, "Record matching acknowledgement");
  const alternative = await page
    .getByLabel("Operator SMS conversation")
    .locator("article")
    .last()
    .innerText();
  expect(alternative).toContain("16:00 1600");
  await page.goto("/outbox");
  await expect(
    page.getByRole("heading", { name: "No requests yet" }),
  ).toBeVisible();
  expect(outbound).toEqual([]);
  expect(errors).toEqual([]);
});
test("decline ends the exchange and restart clears both phone inboxes", async ({
  page,
}) => {
  await visit(page, "Operator declines");
  await click(page, "Send decline SMS");
  await click(page, "Check sender & review reply");
  await expect(
    page.getByRole("heading", { name: "Request declined" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept reviewed offer" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Visitor SMS conversation").locator("article"),
  ).toHaveCount(2);
  await click(page, "Restart demo");
  await expect(page.getByLabel("Visitor SMS conversation")).toHaveCount(0);
  await expect(
    page.getByText("Ready for a request", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Operator declines/ }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("real local AI reports actual scores or explicit fallback and prepared demo works offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Ready for offline use", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await context.setOffline(true);
  await page.goto("/demo");
  await page.reload();
  await click(page, "Analyze sample request");
  const guide = page.getByRole("region", { name: "Current demo step" });
  await expect(guide).toContainText("Review the visit details", {
    timeout: 15000,
  });
  await expect(
    page.getByText("Actual AI result", { exact: true }),
  ).toBeVisible();
  await page.getByText("Actual AI result", { exact: true }).click();
  await expect(page.getByText(/model seed-v1/)).toBeVisible();
  if (
    await page
      .getByRole("button", { name: "Review preset manual form" })
      .count()
  )
    await click(page, "Review preset manual form");
  await click(page, "Confirm sample details");
  await click(page, "Send simulated enquiry");
  await agree(page);
  await expect(guide).toContainText("Agreement recorded");
  await page.goto("/outbox");
  await expect(
    page.getByRole("heading", { name: "No requests yet" }),
  ).toBeVisible();
});
test("demo phone controls reflow at six widths and large text; keyboard actions and reduced motion work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demo");
  for (const width of [320, 360, 390, 412, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const scale of ["17px", "34px"]) {
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = scale;
      }, scale);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
    }
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "17px";
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/demo/intro-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Use preset manual form" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Confirm sample details" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Send simulated enquiry" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Send offer SMS" }),
  ).toBeFocused();
  expect(
    await page
      .getByLabel("Operator SMS conversation")
      .locator("article")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/demo/enquiry-mobile.png",
    fullPage: true,
  });
});
