import { chromium, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { get } from "node:https";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

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
  "/operators/demo-craft",
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
const swBody = await sw.text();
const workboxModule = swBody.match(/workbox-[a-z0-9]+/)?.[0];
const workboxPath = workboxModule ? `${workboxModule}.js` : null;
if (!workboxPath)
  throw new Error("Service worker runtime reference unavailable");
const transferPaths = [
  ...new Set([
    ...manifest.assets.map((a) => a.path),
    "/offline-assets.json",
    "/sw.js",
    `/${workboxPath}`,
  ]),
];
const transferFiles = await Promise.all(
  transferPaths.map(
    (path) =>
      new Promise((resolve, reject) => {
        const request = get(
          new URL(path, origin),
          { headers: { "accept-encoding": "br, gzip, deflate" } },
          (response) => {
            const chunks = [];
            let length = 0;
            response.on("data", (chunk) => {
              chunks.push(chunk);
              length += chunk.length;
              if (length > 5 * 1024 * 1024)
                request.destroy(new Error("Asset transfer exceeds budget"));
            });
            response.on("error", reject);
            response.on("end", () => {
              try {
                if (response.statusCode !== 200)
                  throw new Error(`Transfer failed: ${path}`);
                const encoded = Buffer.concat(chunks),
                  encoding = response.headers["content-encoding"] || "identity";
                const decoded =
                  encoding === "br"
                    ? brotliDecompressSync(encoded)
                    : encoding === "gzip"
                      ? gunzipSync(encoded)
                      : encoding === "deflate"
                        ? inflateSync(encoded)
                        : encoding === "identity"
                          ? encoded
                          : null;
                if (!decoded)
                  throw new Error(`Unsupported encoding: ${encoding}`);
                const expected = manifest.assets.find((a) => a.path === path);
                if (
                  expected &&
                  (decoded.length !== expected.bytes ||
                    createHash("sha256").update(decoded).digest("hex") !==
                      expected.sha256)
                )
                  throw new Error(
                    `Encoded transfer integrity mismatch: ${path}`,
                  );
                resolve({
                  path,
                  encoding,
                  encodedBytes: encoded.length,
                  decodedBytes: decoded.length,
                });
              } catch (error) {
                reject(error);
              }
            });
          },
        );
        request.setTimeout(30000, () =>
          request.destroy(new Error("Asset transfer timed out")),
        );
        request.on("error", reject);
      }),
  ),
);
results.hostedTransfer = {
  acceptEncoding: "br, gzip, deflate",
  files: transferFiles,
  encodedPayloadBytes: transferFiles.reduce((n, f) => n + f.encodedBytes, 0),
  decodedPayloadBytes: transferFiles.reduce((n, f) => n + f.decodedBytes, 0),
  note: "Actual encoded response bodies for each static offline file once, measured with a desktop HTTPS client. Excludes HTTP/TLS overhead, duplicate requests, cache negotiation and browser-specific install traffic; not a handset transfer measurement.",
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
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  results.keyboardSkipToContent = "passed";
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
  await page.goto(new URL("/request/new", origin).href);
  const uncertainText = `Please tell me the total fee. Two adults and one child on ${date} at 2:56 am. One vegetarian meal.`;
  await page.getByLabel("English enquiry").fill(uncertainText);
  await page.getByRole("button", { name: "Analyze enquiry" }).click();
  await expect(
    page.getByText("AI needs manual review", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue(date);
  await expect(page.getByLabel("Time", { exact: true })).toHaveValue("02:56");
  await expect(page.getByLabel("Adults", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Children (")).toHaveValue("1");
  await expect(page.getByLabel("Vegetarian meals (")).toHaveValue("1");
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
  await expect(
    page.getByRole("button", { name: "Preview and queue locally" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Use a form instead" }).click();
  await expect(page.getByLabel("Original enquiry")).toHaveValue(uncertainText);
  await page.getByLabel("I verified the exact").check();
  await page.getByRole("button", { name: "Preview and queue locally" }).click();
  await expect(
    page.getByRole("heading", { name: "Ready to send" }),
  ).toBeVisible();
  results.offlineUncertainRoutingManualFallback = "passed";
  const storedRequestLinks = second.locator(
    'a[href^="/request/"]:not([href^="/request/new"])',
  );
  await second.reload();
  const beforeUnsupported = await storedRequestLinks.count();
  expect(beforeUnsupported).toBe(2);
  await page.goto(new URL("/request/new?mode=form", origin).href);
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Time", { exact: true }).fill("02:56");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Children (").fill("1");
  await page.getByLabel("Vegetarian meals (").fill("1");
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
  const queueButton = page.getByRole("button", {
    name: "Preview and queue locally",
  });
  await expect(queueButton).toBeEnabled();
  const allergyText = "One guest has a peanut allergy.";
  await page.getByLabel("Original enquiry").fill(allergyText);
  await expect(
    page.getByText("Direct contact required", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Health or allergy needs require direct confirmation.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByLabel("I verified the exact").check();
  await expect(queueButton).toBeDisabled();
  // Neither switching entry modes nor explicit confirmation may erase the note/block.
  await page.getByRole("button", { name: "Use English free text" }).click();
  await expect(page.getByLabel("English enquiry")).toHaveValue(allergyText);
  await page.getByRole("button", { name: "Analyze enquiry" }).click();
  await expect(page.getByText("Review and confirm every field")).toBeVisible();
  await page.getByRole("button", { name: "Use a form instead" }).click();
  await expect(page.getByLabel("Original enquiry")).toHaveValue(allergyText);
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Time", { exact: true }).fill("02:56");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Children (").fill("1");
  await page.getByLabel("Vegetarian meals (").fill("1");
  await page.getByLabel("Every guest receives").check();
  await page.getByLabel("I verified the exact").check();
  await expect(queueButton).toBeDisabled();
  await expect(
    page.getByText("Direct contact required", { exact: true }),
  ).toBeVisible();
  await second.reload();
  await expect(storedRequestLinks).toHaveCount(beforeUnsupported);
  results.offlineUnsupportedAllergy = {
    text: allergyText,
    validCardWithoutUnsupportedNoteQueueEnabled: true,
    warningDisplayed: true,
    blockedWithValidFieldsAndBothConfirmations: true,
    noteAndBlockRetainedAcrossAiAndManualSwitch: true,
    outboxRecordsBefore: beforeUnsupported,
    outboxRecordsAfter: beforeUnsupported,
    physicalSms: false,
  };
  async function queueProtocolRequest() {
    await page.goto(new URL("/request/new?mode=form", origin).href);
    await page.getByLabel("Date", { exact: true }).fill(date);
    await page.getByLabel("Time", { exact: true }).fill("02:56");
    await page.getByLabel("Adults", { exact: true }).fill("2");
    await page.getByLabel("Children (").fill("1");
    await page.getByLabel("Vegetarian meals (").fill("1");
    await page.getByLabel("Every guest receives").check();
    await page.getByLabel("I verified the exact").check();
    await page
      .getByRole("button", { name: "Preview and queue locally" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ready to send" }),
    ).toBeVisible();
    return (await page.locator("pre").first().innerText()).split(" ")[0];
  }
  async function reviewIncoming(raw) {
    await page.getByRole("link", { name: "Enter operator reply" }).click();
    await page.getByLabel("Exact reply").fill(raw);
    await page.getByLabel("I checked the SMS sender").check();
    await page
      .getByRole("button", { name: "Validate and review reply" })
      .click();
  }
  const declineId = await queueProtocolRequest();
  await reviewIncoming(`${declineId} 2`);
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Report sending the enquiry",
  );
  await page.getByLabel("If I omitted").check();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(
    page.getByRole("heading", { name: "Operator declined" }),
  ).toBeVisible();

  const alternativeId = await queueProtocolRequest();
  await page.getByRole("button", { name: "I sent this enquiry" }).click();
  await reviewIncoming(`${alternativeId.replace(/\.1$/, ".999")} 1 1500`);
  await expect(page.getByRole("alert")).toContainText(
    "Wrong request ID or stale revision",
  );
  const wireDay = `${day[2]}-${day[1]}-${day[0].slice(2)}`;
  const alternative = `${alternativeId} 3 ${wireDay} 16:00 1600`;
  await page.getByLabel("Exact reply").fill(alternative);
  await page.getByRole("button", { name: "Validate and review reply" }).click();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(
    page.getByRole("heading", { name: "Offer received", exact: true }),
  ).toBeVisible();
  await reply(alternative);
  await expect(
    page.getByRole("heading", { name: "Offer received", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept offer and prepare" }).click();
  const acceptanceUrl = page.url();
  const matchingAck = `${alternativeId} 5 ${wireDay} 16:00 1600`;
  await reviewIncoming(matchingAck);
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Report sending acceptance",
  );
  await page.goto(acceptanceUrl);
  await page.getByRole("button", { name: "I sent this acceptance" }).click();
  await reviewIncoming(`${alternativeId} 5 ${wireDay} 16:00 1700`);
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Acknowledgement terms do not match",
  );
  await page.getByLabel("Exact reply").fill(matchingAck);
  await page.getByRole("button", { name: "Validate and review reply" }).click();
  await page.getByRole("button", { name: "Record reviewed reply" }).click();
  await expect(
    page.getByRole("heading", { name: "Agreement recorded" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Agreement recorded" }),
  ).toBeVisible();

  const conflictId = await queueProtocolRequest();
  await page.getByRole("button", { name: "I sent this enquiry" }).click();
  await reply(`${conflictId} 1 1500`);
  await expect(
    page.getByRole("heading", { name: "Offer received", exact: true }),
  ).toBeVisible();
  await reply(`${conflictId} 1 1600`);
  await expect(
    page.getByRole("heading", {
      name: "Conflicting replies — contact operator",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Enter operator reply" }),
  ).toHaveCount(0);
  results.offlineProtocolBranches = {
    missingSendReportBlockedAndExplicitRecoveryAllowed: "passed",
    decline: "passed",
    staleRevisionRejected: "passed",
    alternativeOffer: "passed",
    duplicateOffer: "passed",
    prematureAcknowledgementBlocked: "passed",
    mismatchedAcknowledgementRejected: "passed",
    matchingAlternativeAcknowledgementAndReload: "passed",
    conflictingOfferStopsProgress: "passed",
    physicalSms: false,
  };
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
  `Passed HTTPS route/MIME/hash checks for ${results.assets.length} assets; offline AI, reload, synthetic agreement, manual fallback and unsupported allergy blocking. ${origin.origin}`,
);
