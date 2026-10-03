import { chromium, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const origin = new URL(process.argv[2] || "https://localrelay-test.vercel.app");
if (origin.protocol !== "https:") throw new Error("Supply an HTTPS origin");
const results = {
  recordedAt: new Date().toISOString(),
  origin: origin.origin,
  environment: "Desktop Playwright Chromium, fresh browser context, 360x800",
  physicalSms: false,
  physicalAndroid: false,
  routes: [],
  assets: [],
};
const routes = [
  "/",
  "/operators",
  "/operators/demo-riverside",
  "/request/new",
  "/request/test",
  "/outbox",
  "/reply/test",
  "/evaluation",
  "/diagnostics",
  "/simulate",
];
results.routes = await Promise.all(
  routes.map(async (path) => {
    const response = await fetch(new URL(path, origin));
    const body = await response.text();
    if (response.status !== 200 || !body.includes('<div id="root">'))
      throw new Error(`Route failed: ${path}`);
    if (
      !response.headers
        .get("content-security-policy")
        ?.includes("worker-src 'self'")
    )
      throw new Error(`Missing CSP: ${path}`);
    return {
      path,
      status: response.status,
      contentType: response.headers.get("content-type"),
    };
  }),
);
const missing = await fetch(new URL("/models/v1/missing.bin", origin));
if (missing.status !== 404) throw new Error("Missing model is not 404");
results.missingModelStatus = missing.status;
const manifestResponse = await fetch(new URL("/offline-assets.json", origin));
if (!manifestResponse.ok) throw new Error("Readiness manifest unavailable");
const manifest = await manifestResponse.json();
results.assets = await Promise.all(
  manifest.assets.map(async (asset) => {
    const response = await fetch(new URL(asset.path, origin));
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (!response.ok || bytes.length !== asset.bytes || sha256 !== asset.sha256)
      throw new Error(`Asset mismatch: ${asset.path}`);
    const contentType = response.headers.get("content-type");
    if (
      asset.path.endsWith(".bin") &&
      !contentType?.includes("application/octet-stream")
    )
      throw new Error("Wrong model MIME");
    if (asset.path.endsWith(".js") && !contentType?.includes("javascript"))
      throw new Error("Wrong JS MIME");
    return {
      path: asset.path,
      bytes: bytes.length,
      sha256,
      contentType,
      cacheControl: response.headers.get("cache-control"),
      contentEncoding: response.headers.get("content-encoding"),
    };
  }),
);
const sw = await fetch(new URL("/sw.js", origin));
if (!sw.ok || !sw.headers.get("content-type")?.includes("javascript"))
  throw new Error("Service worker unavailable");
results.serviceWorker = {
  status: sw.status,
  contentType: sw.headers.get("content-type"),
  cacheControl: sw.headers.get("cache-control"),
};

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  const cspErrors = [];
  const pageErrors = [];
  const inputNetwork = [];
  page.on("console", (message) => {
    if (/content security policy|violates.*directive/i.test(message.text()))
      cspErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (
      request.url().startsWith("http") &&
      (new URL(request.url()).origin !== origin.origin || request.postData())
    )
      inputNetwork.push(request.url());
  });
  await page.goto(origin.origin);
  await expect(
    page.getByText("Ready for offline use", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  results.onlineReadiness = "passed";
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText("Ready for offline use", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  results.offlineReload = "passed";
  const date = new Date(Date.now() + 6 * 3600000 + 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  await page.goto(new URL("/request/new", origin).href);
  await page
    .getByLabel("English enquiry")
    .fill(
      `Please tell me the total fee. Two adults and one child on ${date} at 3 pm. One vegetarian meal.`,
    );
  await page.getByRole("button", { name: "Analyze enquiry" }).click();
  await expect(page.getByText("Review and confirm every field")).toBeVisible();
  results.offlineLocalAi = "passed";
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Time", { exact: true }).fill("15:00");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Children (").fill("1");
  await page.getByLabel("Vegetarian meals (").fill("1");
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
  await page.getByRole("button", { name: "Preview and queue locally" }).click();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  const id = (await page.locator("pre").first().innerText()).split(" ")[0];
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I sent this enquiry" }).click();
  async function reply(raw) {
    await page.getByRole("link", { name: "Enter operator reply" }).click();
    await page.getByLabel("Exact reply").fill(raw);
    await page.getByLabel("I checked the SMS sender").check();
    await page
      .getByRole("button", { name: "Validate and review reply" })
      .click();
    await page.getByRole("button", { name: "Record reviewed reply" }).click();
  }
  await reply(`${id} 1 1500`);
  await expect(
    page.getByRole("heading", { name: "Offer received", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept offer and prepare" }).click();
  await page.getByRole("button", { name: "I sent this acceptance" }).click();
  const day = date.split("-");
  await reply(`${id} 5 ${day[2]}-${day[1]}-${day[0].slice(2)} 15:00 1500`);
  await expect(
    page.getByRole("heading", { name: "Agreement recorded" }),
  ).toBeVisible();
  const second = await context.newPage();
  await second.goto(new URL("/outbox", origin).href);
  await expect(second.getByText(/Agreement recorded/)).toHaveCount(1);
  results.offlineSyntheticAgreementAndNewTab = "passed";
  results.cspErrors = cspErrors;
  results.pageErrors = pageErrors;
  results.externalOrPayloadRequests = inputNetwork;
  if (cspErrors.length || pageErrors.length || inputNetwork.length)
    throw new Error("Unexpected browser error or network payload");
} finally {
  await browser.close();
}
await writeFile(
  "docs/deployment-checks.json",
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  `Passed HTTPS route/MIME/hash checks for ${results.assets.length} assets; offline AI, reload, synthetic agreement and new tab. ${origin.origin}`,
);
