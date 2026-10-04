import { test, expect, type Page } from "@playwright/test";
const future = () =>
  new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
async function fields(page: Page) {
  await page.getByLabel("Date", { exact: true }).fill(future());
  await page.getByLabel("Time", { exact: true }).fill("15:00");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Children (").fill("0");
  await page.getByLabel("Vegetarian meals (").fill("0");
}
async function review(page: Page) {
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
}
async function bounds(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
}
test("mobile start, review/edit, exact copy, recipient revision and saved-record navigation", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const start = page.getByRole("link", {
    name: "Choose an experience",
    exact: true,
  });
  const box = await start.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await expect(
    page.getByText("Ready for offline use", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.screenshot({
    path: "test-results/ui-research/after-home-mobile.png",
    fullPage: true,
  });
  await start.click();
  await expect(
    page.getByRole("heading", { name: "Choose an experience" }),
  ).toBeFocused();
  await page.getByRole("link", { name: "View experience" }).first().click();
  await page.getByRole("button", { name: "Create a request" }).click();
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await expect(page.getByLabel("Date", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Children (")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await fields(page);
  await page.screenshot({
    path: "test-results/ui-research/after-form-mobile.png",
    fullPage: true,
  });
  await review(page);
  await expect(
    page.getByRole("button", { name: "Save request on this device" }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/ui-research/after-review-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByLabel("Children (")).toHaveValue("0");
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await expect(page.getByLabel("I verified the exact")).not.toBeChecked();
  await expect(page.getByLabel("Every guest receives")).not.toBeChecked();
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to send", exact: true }),
  ).toBeVisible();
  const originalUrl = page.url(),
    originalBody = await page.locator("pre").first().innerText();
  await expect(
    page.getByRole("button", { name: "Open SMS app" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Copy message", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Message copied" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    originalBody,
  );
  await page.screenshot({
    path: "test-results/ui-research/after-request-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Add number in a new revision" })
    .click();
  await page.getByLabel("Recipient for this revision").fill("+8801700000000");
  await review(page);
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("button", { name: "Open SMS app" }),
  ).toBeEnabled();
  const newUrl = page.url();
  const newBody = await page.locator("pre").first().innerText();
  expect(newBody.split(" ")[0]).toBe(
    originalBody.split(" ")[0].replace(".1", ".2"),
  );
  await page.goto(originalUrl);
  await expect(
    page.getByRole("heading", { name: "Superseded by a new revision" }),
  ).toBeVisible();
  expect(await page.locator("pre").first().innerText()).toBe(originalBody);
  await page.getByRole("link", { name: "Open latest revision" }).click();
  expect(page.url()).toBe(newUrl);
  await page.getByRole("button", { name: "I sent this enquiry" }).click();
  await page
    .getByRole("link", { name: "Record operator reply", exact: true })
    .click();
  await expect(
    page.getByText("Forgot to record that you sent it?", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/ui-research/after-reply-mobile.png",
    fullPage: true,
  });
  await page
    .getByLabel("Exact SMS reply")
    .fill(`${newBody.split(" ")[0]} 1 1500`);
  await page.getByLabel("I checked the SMS sender").check();
  await page.getByRole("button", { name: "Review reply", exact: true }).click();
  await page.getByLabel("I checked the SMS sender").uncheck();
  await expect(
    page.getByRole("button", { name: "Record reviewed reply" }),
  ).toHaveCount(0);
  await page.getByLabel("I checked the SMS sender").check();
  await page.getByRole("button", { name: "Review reply", exact: true }).click();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(
    page.getByRole("heading", { name: "Offer received", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Offer received", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Requests", exact: true }).click();
  await expect(page.locator(".request-card")).toHaveCount(2);
});
test("review and tools reflow across mobile tablet desktop and large text", async ({
  page,
}) => {
  await page.goto("/request/new?mode=form");
  await fields(page);
  await review(page);
  for (const width of [320, 360, 390, 412, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await bounds(page);
    if (width === 1440)
      await page.screenshot({
        path: "test-results/ui-research/after-review-desktop.png",
        fullPage: true,
      });
    if (width <= 412)
      for (const font of ["system-ui", "Verdana", "monospace"]) {
        await page.evaluate((font) => {
          document.documentElement.style.fontSize = "34px";
          document.documentElement.style.fontFamily = font;
        }, font);
        await bounds(page);
        const save = page.getByRole("button", {
          name: "Save request on this device",
        });
        await save.scrollIntoViewIfNeeded();
        const box = await save.boundingBox();
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
      document.documentElement.style.fontFamily = "";
    });
  }
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of [
    "/operators",
    "/operators/demo-craft",
    "/outbox",
    "/diagnostics",
    "/simulate",
  ]) {
    await page.goto(route);
    await page.locator("h1").waitFor();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "34px";
      document.documentElement.style.fontFamily = "Verdana";
    });
    await bounds(page);
  }
});
test("missed send recovery, alternative offer, conflicting reply and early acknowledgement keep protocol guards", async ({
  page,
}) => {
  await page.goto("/request/new?mode=form");
  await fields(page);
  await review(page);
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to send", exact: true }),
  ).toBeVisible();
  const wire = (await page.locator("pre").first().innerText()).split(" ")[0];
  await page
    .getByRole("link", { name: "Record operator reply", exact: true })
    .click();
  const offerDay = future().split("-");
  await page
    .getByLabel("Exact SMS reply")
    .fill(
      `${wire} 3 ${offerDay[2]}-${offerDay[1]}-${offerDay[0].slice(2)} 16:00 1500`,
    );
  await page.getByLabel("I checked the SMS sender").check();
  await page.getByRole("button", { name: "Review reply", exact: true }).click();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Report sending the enquiry",
  );
  await page
    .getByText("Forgot to record that you sent it?", { exact: true })
    .click();
  await page.getByLabel("If I omitted “I sent this”").check();
  await page.getByRole("button", { name: "Review reply", exact: true }).click();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(
    page.getByRole("heading", { name: "Offer received", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Different date or time", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Record operator reply", exact: true })
    .click();
  const parts = future().split("-");
  await page
    .getByLabel("Exact SMS reply")
    .fill(`${wire} 5 ${parts[2]}-${parts[1]}-${parts[0].slice(2)} 16:00 1500`);
  await page.getByLabel("I checked the SMS sender").check();
  await page.getByRole("button", { name: "Review reply", exact: true }).click();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Report sending acceptance",
  );
  await page.getByLabel("Exact SMS reply").fill(`${wire} 1 1600`);
  await page.getByRole("button", { name: "Review reply", exact: true }).click();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Conflicting replies — contact operator",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open SMS app" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Record operator reply", exact: true }),
  ).toHaveCount(0);
});
test("no-meal experience retains explicit children count and does not introduce meal terms", async ({
  page,
}) => {
  await page.goto("/operators/demo-weaving");
  await page.getByRole("button", { name: "Create a request" }).click();
  await page.getByLabel("Date", { exact: true }).fill(future());
  await page.getByLabel("Time", { exact: true }).fill("15:00");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Children (").fill("0");
  await expect(page.getByLabel("Vegetarian meals (")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await expect(page.getByLabel("Every guest receives")).toHaveCount(0);
  await page.getByLabel("I verified the exact").check();
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to send", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/2 adults · 0 children · No meals included/),
  ).toBeVisible();
  await page
    .getByText("Full reviewed details & requirements", { exact: true })
    .click();
  await expect(
    page.getByText("No meals included", { exact: true }),
  ).toBeVisible();
});

test("synthetic direct-contact study outcome returns to evaluation without saving a request", async ({
  page,
}) => {
  await page.goto("/evaluation");
  await page.getByLabel("Pseudonym", { exact: true }).fill("SYNTHETIC-UI-QA");
  await page.getByLabel("Participant sequence number").fill("1");
  await page.getByLabel("Task order").selectOption("4");
  await page.getByLabel("The participant consented").check();
  await page
    .getByRole("button", { name: "Reveal brief and start timer" })
    .click();
  await page.getByRole("button", { name: "Open assigned interface" }).click();
  await page
    .getByLabel("Original enquiry")
    .fill("One guest has a peanut allergy.");
  await page
    .getByRole("button", { name: "Record direct-contact outcome for study" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Consented local evaluation" }),
  ).toBeVisible();
  await expect(page.getByText("Local results: 1 task records")).toBeVisible();
  await page.getByRole("link", { name: "Requests", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No requests yet" }),
  ).toBeVisible();
});
