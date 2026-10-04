import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  makeReviewExport,
  makeDemoReview,
  reviewItems,
  type ReviewResponse,
} from "../../src/evaluation/bangla-review-data";
import { templateStatus } from "../../src/templates/render";
const items = reviewItems(readFileSync("docs/operator-guide-bn.md", "utf8"));
const hash = createHash("sha256").update(JSON.stringify(items)).digest("hex");
const attestations = {
  consentToExport: true,
  nativeBanglaSpeaker: true,
  reviewedIndependently: true,
};
it("keeps filled demonstration data distinct from real reviews and rejects its attestations", () => {
  const demo = makeDemoReview(items, hash);
  expect(demo.documentType).toBe("synthetic_review_demo");
  expect(demo.synthetic).toBe(true);
  expect(demo.humanReviewerCount).toBe(0);
  expect(demo.templateApprovalStatus).toBe("unreviewed");
  expect(demo.examples).toHaveLength(2);
  for (const example of demo.examples) {
    expect(example.responses).toHaveLength(6);
    expect(
      example.responses.every(
        (r) =>
          r.source === "synthetic_demo" && r.interpretationLockedAt === null,
      ),
    ).toBe(true);
  }
  expect(() =>
    makeReviewExport("DEMO-A", "", items, responses, hash, demo.attestations),
  ).toThrow(/confirmations/);
});
const responses: ReviewResponse[] = items.map((item) => ({
  itemId: item.id,
  interpretation: "Synthetic test only",
  interpretationLockedAt: "2026-10-04T00:00:00.000Z",
  assessment: "changes_needed",
  naturalness: "awkward",
  comments: "Synthetic concern retained",
  suggestedWording: "",
}));
it("refuses export without consent/independent/native attestations or every distinct item", () => {
  for (const key of Object.keys(attestations))
    expect(() =>
      makeReviewExport("R1", "", items, responses, hash, {
        ...attestations,
        [key]: false,
      }),
    ).toThrow(/confirmations/);
  expect(() =>
    makeReviewExport("R1", "", items, responses.slice(1), hash, attestations),
  ).toThrow(/every review item/);
  expect(() =>
    makeReviewExport(
      "R1",
      "",
      items,
      responses.map(() => responses[0]),
      hash,
      attestations,
    ),
  ).toThrow(/every review item/);
  expect(() =>
    makeReviewExport(
      "R1",
      "",
      items,
      responses.map((r) => ({ ...r, comments: "" })),
      hash,
      attestations,
    ),
  ).toThrow();
});
it("retains adverse reviews, frozen materials and hash without approving deployed templates", () => {
  const data = makeReviewExport(
    "R1",
    "test browser",
    items,
    responses,
    hash,
    attestations,
  );
  expect(data.templateApprovalStatus).toBe("pending_external_assessment");
  expect(data.physicalSmsEvidence).toBe(false);
  expect(data.responses.every((r) => r.assessment === "changes_needed")).toBe(
    true,
  );
  expect(data.materialSha256).toBe(hash);
  expect(data.items).toEqual(items);
  expect(templateStatus).toMatchObject({ status: "unreviewed", reviewers: 0 });
});
