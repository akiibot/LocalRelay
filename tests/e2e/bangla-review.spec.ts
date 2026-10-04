import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("offline native-review form locks interpretation and exports adverse answers without approval", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Ready for offline use", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await context.setOffline(true);
  await page.goto("/evaluation");
  await page
    .getByRole("link", { name: "Start independent Bangla review" })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Independent Bangla review",
      exact: true,
    }),
  ).toBeVisible();
  const start = page.getByRole("button", {
    name: "Start independent review",
    exact: true,
  });
  await page.getByLabel("Reviewer pseudonym").fill("SYNTHETIC-QA");
  await page.getByLabel("I am a native Bangla speaker").check();
  await page.getByLabel("I will review independently").check();
  await expect(start).toBeDisabled();
  await page.getByLabel("I agree to export").check();
  await start.click();
  for (let i = 0; i < 6; i++) {
    await expect(
      page.getByRole("heading", { name: new RegExp(`Item ${i + 1} of 6:`) }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: new RegExp(`Item ${i + 1} of 6:`) }),
    ).toBeFocused();
    if (i === 0 || i === 5) {
      for (const font of ["system-ui", "Verdana", "monospace"]) {
        await page.evaluate((font) => {
          document.documentElement.style.fontSize = "34px";
          document.documentElement.style.fontFamily = font;
        }, font);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(361);
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "";
        document.documentElement.style.fontFamily = "";
      });
    }
    await expect(
      page.getByRole("heading", { name: "Intended meaning", exact: true }),
    ).toHaveCount(0);
    const input = page.getByLabel("Explain the meaning in your own words");
    await input.fill(
      `SYNTHETIC SOFTWARE CHECK ${i + 1}; no human review performed.`,
    );
    await page
      .getByRole("button", {
        name: "Lock interpretation and reveal intended meaning",
      })
      .click();
    await expect(input).toHaveAttribute("readonly", "");
    await expect(
      page.getByRole("heading", { name: "Intended meaning", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Does the Bangla convey")
      .selectOption("changes_needed");
    await page.getByLabel("Is the wording natural").selectOption("awkward");
    if (i === 0) {
      await page
        .getByRole("button", { name: "Record item and continue" })
        .click();
      await expect(page.getByRole("alert")).toContainText("comments");
    }
    await page
      .getByLabel("Comments: explain")
      .fill("Synthetic adverse feedback: retained for software QA only.");
    await page
      .getByRole("button", { name: "Record item and continue" })
      .click();
  }
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download reviewer JSON" }).click();
  const downloaded = await pending;
  const payload = JSON.parse(
    await readFile((await downloaded.path())!, "utf8"),
  );
  expect(payload.responses).toHaveLength(6);
  expect(
    payload.responses.every(
      (r: { assessment: string; interpretation: string }) =>
        r.assessment === "changes_needed" &&
        r.interpretation.includes("SYNTHETIC SOFTWARE CHECK"),
    ),
  ).toBe(true);
  expect(payload.materialSha256).toBe(
    createHash("sha256").update(JSON.stringify(payload.items)).digest("hex"),
  );
  expect(payload.templateApprovalStatus).toBe("pending_external_assessment");
  expect(payload.physicalSmsEvidence).toBe(false);
  await page.goto("/diagnostics");
  await expect(page.getByText(/unreviewed, zero reviewers/)).toBeVisible();
});
