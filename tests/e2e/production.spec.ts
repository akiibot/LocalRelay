import { test, expect, type Page } from "@playwright/test";
function nextDate(days = 7) {
  return new Date(Date.now() + 6 * 3600000 + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
async function prepared(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("Ready for offline use", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
}
async function details(
  page: Page,
  day = nextDate(),
  time = "15:00",
  children = "1",
  meals = "1",
) {
  await page.getByLabel("Date", { exact: true }).fill(day);
  await page.getByLabel("Time", { exact: true }).fill(time);
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Children (").fill(children);
  await page.getByLabel("Vegetarian meals (").fill(meals);
}
async function reviewAndConfirm(page: Page) {
  await page.getByRole("button", { name: "Review request" }).click();
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
}
async function card(page: Page, mode = "form") {
  await page.goto("/request/new" + (mode === "form" ? "?mode=form" : ""));
  if (mode === "ai") {
    await page
      .getByLabel("English enquiry")
      .fill(
        `Please tell me the total fee. Two adults and one child on ${nextDate()} at 3 pm. One vegetarian meal.`,
      );
    await page.getByRole("button", { name: "Analyze enquiry" }).click();
    await expect(
      page.getByRole("heading", { name: "Visit details", exact: true }),
    ).toBeVisible();
  }
  await details(page);
  await reviewAndConfirm(page);
}
async function reply(page: Page, raw: string) {
  await page
    .getByRole("link", {
      name: /^Record (?:another )?(?:operator reply|acknowledgement)$/,
    })
    .click();
  await page.getByLabel("Exact SMS reply").fill(raw);
  await page.getByLabel("I checked the SMS sender").check();
  await page.getByRole("button", { name: "Review reply" }).click();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
}
test("20 offline scripted production runs: local model, queue, reload and full agreement", async ({
  page,
  context,
}) => {
  // This covers 20 complete UI exchanges, not the separate inference latency gate.
  test.setTimeout(180000);
  await prepared(page);
  const appOrigin = new URL(page.url()).origin;
  await context.setOffline(true);
  const network: string[] = [];
  page.on("request", (r) => {
    if (
      r.url().startsWith("http") &&
      (new URL(r.url()).origin !== appOrigin ||
        r.postData() ||
        r.url().includes("adults"))
    )
      network.push(r.url());
  });
  for (let i = 0; i < 20; i++) {
    await card(page, i % 2 === 0 ? "ai" : "form");
    await page
      .getByRole("button", { name: "Save request on this device" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ready to send" }),
    ).toBeVisible();
    const body = await page.locator("pre").first().innerText();
    const id = body.split(" ")[0];
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ready to send" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "I sent this enquiry" }).click();
    await reply(page, `${id} 1 1500`);
    await expect(
      page.getByRole("heading", { name: "Offer received", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Accept offer and prepare" })
      .click();
    await page.getByRole("button", { name: "I sent this acceptance" }).click();
    await expect(
      page.getByRole("heading", { name: "Awaiting operator acknowledgement" }),
    ).toBeVisible();
    const day = nextDate().split("-");
    await reply(
      page,
      `${id} 5 ${day[2]}-${day[1]}-${day[0].slice(2)} 15:00 1500`,
    );
    await expect(
      page.getByRole("heading", { name: "Agreement recorded" }),
    ).toBeVisible();
  }
  const newPage = await context.newPage();
  await newPage.goto("/outbox");
  await expect(newPage.getByText(/Agreement recorded/)).toHaveCount(20);
  expect(network).toEqual([]);
});
test("unsupported requirements block both entry modes", async ({ page }) => {
  await prepared(page);
  await page.goto("/request/new?mode=form");
  await details(page);
  await page
    .getByLabel("Original enquiry / additional requirements")
    .fill("My child has a severe peanut allergy");
  await reviewAndConfirm(page);
  await expect(
    page.getByText("Direct contact required", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save request on this device" }),
  ).toBeDisabled();
  await page.goto("/request/new");
  await page
    .getByLabel("English enquiry")
    .fill("Next Saturday afternoon, maybe three or four people.");
  await page.getByRole("button", { name: "Analyze enquiry" }).click();
  await expect(
    page.getByRole("heading", { name: "Visit details", exact: true }),
  ).toBeVisible();
  await details(page);
  await reviewAndConfirm(page);
  await expect(
    page.getByRole("button", { name: "Save request on this device" }),
  ).toBeDisabled();
});
test("no configured number disables composer; invalid replies cannot progress", async ({
  page,
}) => {
  await prepared(page);
  await card(page);
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("button", { name: "Open SMS app" }),
  ).toBeDisabled();
  const id = (await page.locator("pre").first().innerText()).split(" ")[0];
  await page.getByRole("button", { name: "I sent this enquiry" }).click();
  await page.getByRole("link", { name: "Record operator reply" }).click();
  await page.getByLabel("Exact SMS reply").fill(`${id} 1 -1500`);
  await page.getByLabel("I checked the SMS sender").check();
  await page.getByRole("button", { name: "Review reply" }).click();
  await expect(page.getByRole("alert")).toContainText("positive integer");
  await expect(
    page.getByRole("button", { name: "Record reviewed reply" }),
  ).toHaveCount(0);
});
test("readiness fails honestly for evicted cache and missing assets are 404 under CSP", async ({
  page,
  request,
}) => {
  await prepared(page);
  const missing = await request.get("/models/v1/missing.bin");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-type"]).not.toContain("text/html");
  const shell = await request.get("/request/new");
  expect(shell.headers()["content-security-policy"]).toContain(
    "worker-src 'self'",
  );
  const model = await request.get("/models/v1/weights.bin");
  expect(model.headers()["content-type"]).toBe("application/octet-stream");
  await page.evaluate(async () => {
    for (const name of await caches.keys()) await caches.delete(name);
  });
  await page.getByRole("button", { name: "Recheck offline files" }).click();
  await expect(
    page.getByText("Offline readiness not confirmed", { exact: true }),
  ).toBeVisible();
});
test("consented local study grades shared workflow and exports no raw text/phones", async ({
  page,
}) => {
  await prepared(page);
  await page.goto("/evaluation");
  await page.getByLabel("Pseudonym", { exact: true }).fill("P01");
  await page.getByLabel("Participant sequence number").fill("1");
  await page.getByLabel("The participant consented").check();
  await page
    .getByRole("button", { name: "Reveal brief and start timer" })
    .click();
  await page.getByRole("button", { name: "Open assigned interface" }).click();
  await page.getByLabel("Date", { exact: true }).fill(nextDate(8));
  await page.getByLabel("Time", { exact: true }).fill("15:00");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Children (").fill("0");
  await page.getByLabel("Vegetarian meals (").fill("0");
  await page.getByRole("button", { name: "Review request" }).click();
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  await page.goto("/evaluation");
  await expect(page.getByText("Local results: 1 task records")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export deidentified study JSON" })
    .click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let text = "";
  for await (const c of stream!) text += c.toString();
  expect(text).not.toContain("originalText");
  expect(text).not.toContain("phoneE164");
  expect(JSON.parse(text).results[0].criticalCorrect).toBe(true);
});

test("model-cache loss fails closed to manual form while offline", async ({
  page,
  context,
}) => {
  await prepared(page);
  await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const key of await cache.keys())
        if (key.url.includes("weights.bin")) await cache.delete(key);
    }
  });
  await context.setOffline(true);
  await page.goto("/request/new");
  await page
    .getByLabel("English enquiry")
    .fill("Please tell me the total fee for a visit tomorrow.");
  await page.getByRole("button", { name: "Analyze enquiry" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Model assets are unavailable",
  );
  await page.getByRole("button", { name: "Use a form instead" }).click();
  await expect(page.getByLabel("Adults", { exact: true })).toBeVisible();
});

test("real worker uncertainty allows safe offline manual fallback and ISO date extraction", async ({
  page,
  context,
}) => {
  await prepared(page);
  await context.setOffline(true);
  await page.goto("/request/new");
  const date = nextDate();
  const text = `Please tell me the total fee. Two adults and one child on ${date} at 2:56 am. One vegetarian meal.`;
  await page.getByLabel("English enquiry").fill(text);
  await page.getByRole("button", { name: "Analyze enquiry" }).click();
  await expect(
    page.getByText("AI needs manual review", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue(date);
  await expect(page.getByLabel("Time", { exact: true })).toHaveValue("02:56");
  await expect(page.getByLabel("Adults", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Children (")).toHaveValue("1");
  await expect(page.getByLabel("Vegetarian meals (")).toHaveValue("1");
  await page.getByRole("button", { name: "Review request" }).click();
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
  await expect(
    page.getByRole("button", { name: "Save request on this device" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByRole("button", { name: "Use a form instead" }).click();
  await expect(page.getByLabel("Original enquiry")).toHaveValue(text);
  await reviewAndConfirm(page);
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
});
test("revision atomically supersedes old ID, snapshots stay immutable", async ({
  page,
}) => {
  await prepared(page);
  await card(page);
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  const oldUrl = page.url();
  const oldBody = await page.locator("pre").first().innerText();
  await page
    .getByText("Receipt, revisions & local data", { exact: true })
    .click();
  await page.getByRole("button", { name: "Edit as a new revision" }).click();
  await expect(
    page.getByText(/Editing .* Saving creates revision/),
  ).toBeVisible();
  await page.getByLabel("Adults", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Review request" }).click();
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  const body = await page.locator("pre").first().innerText();
  expect(body.split(" ")[0]).toBe(oldBody.split(" ")[0].replace(".1", ".2"));
  await page.goto(oldUrl);
  await expect(
    page.getByRole("heading", { name: "Superseded by a new revision" }),
  ).toBeVisible();
  expect(await page.locator("pre").first().innerText()).toBe(oldBody);
  await expect(
    page.getByRole("button", { name: "I sent this enquiry" }),
  ).toHaveCount(0);
});
test("360px and 200% text scaling keep critical fields and controls in viewport", async ({
  page,
}) => {
  await prepared(page);
  await page.goto("/request/new?mode=form");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "34px";
  });
  await expect(page.getByLabel("Adults", { exact: true })).toBeVisible();
  // Wider fallback fonts reproduce the Linux brand/native-control overflow on macOS too.
  for (const font of ["system-ui", "Verdana", "monospace"]) {
    await page.evaluate((font) => {
      document.documentElement.style.fontFamily = font;
    }, font);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      font,
    ).toBe(true);
    for (const field of ["Date", "Time", "Adults"]) {
      const box = await page.getByLabel(field, { exact: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(361);
    }
  }
  await page.getByLabel("Date", { exact: true }).fill(nextDate());
  await page.getByLabel("Time", { exact: true }).fill("15:00");
  await page.evaluate(() => {
    document.documentElement.style.fontFamily = "";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-200-percent.png",
    fullPage: true,
  });
});

test("keyboard skip link moves focus to content and queue is keyboard operable", async ({
  page,
}) => {
  await prepared(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await card(page);
  const queue = page.getByRole("button", {
    name: "Save request on this device",
  });
  await page.getByLabel("I verified the exact").focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    if (await queue.evaluate((el) => el === document.activeElement)) break;
  }
  await expect(queue).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
});

test("service-worker update waits for home and keeps existing request snapshot", async ({
  page,
  baseURL,
}) => {
  test.skip(
    !["localhost", "127.0.0.1"].includes(new URL(baseURL!).hostname),
    "This update test modifies local dist/sw.js; remote deployments are immutable.",
  );
  const { readFile, writeFile } = await import("node:fs/promises");
  await prepared(page);
  await card(page);
  await page
    .getByRole("button", { name: "Save request on this device" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  const url = page.url(),
    body = await page.locator("pre").first().innerText();
  const original = await readFile("dist/sw.js", "utf8");
  try {
    await writeFile("dist/sw.js", original + "\n// update test only\n");
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await page.goto("/diagnostics");
    await expect(
      page.getByText(/An application update is available/),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: "Activate update and reload" }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Return home", exact: true }).click();
    await Promise.all([
      page.waitForEvent("load"),
      page.getByRole("button", { name: "Activate update and reload" }).click(),
    ]);
    await expect(
      page.getByText("Ready for offline use", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: "Ready to send" }),
    ).toBeVisible();
    expect(await page.locator("pre").first().innerText()).toBe(body);
  } finally {
    await writeFile("dist/sw.js", original);
  }
});

test("diagnostics measures actual desktop worker load and 50 warm calls", async ({
  page,
}) => {
  await prepared(page);
  await page.goto("/diagnostics");
  await page.getByRole("button", { name: "Measure 50 runs" }).click();
  const result = JSON.parse(await page.locator("pre").first().innerText());
  expect(result.warmSuccessful).toBe(50);
  expect(result.warmFailures).toBe(0);
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    "docs/browser-benchmark.json",
    JSON.stringify(
      {
        ...result,
        environment: "Playwright Chromium desktop; not a low-end smartphone",
        inputSource: "fixed synthetic fixture",
        measurementDate: "2026-10-04",
      },
      null,
      2,
    ),
  );
});
