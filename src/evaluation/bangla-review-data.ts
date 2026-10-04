import { z } from "zod";
import { TEMPLATE_VERSION, type ConfirmedCard } from "../domain/schema";
import { renderBangla, renderEnglish, wireDate } from "../templates/render";
import { smsSize } from "../sms/encoding";

export const BANGLA_REVIEW_VERSION = "bangla-review-1";
export type ReviewItem = {
  id: string;
  title: string;
  kind: "current_sms" | "candidate_sms" | "operator_guide";
  text: string;
  intendedMeaning: string;
  units: number | null;
};
export function reviewItems(operatorGuide: string): ReviewItem[] {
  const base: ConfirmedCard = {
    operatorId: "demo-craft",
    localDate: "2026-10-11",
    localTime: "02:56",
    adults: 2,
    children: 1,
    vegetarianMeals: 1,
    currency: "BDT",
    timezone: "Asia/Dhaka",
    askTotalPrice: true,
    confirmedAt: "2026-10-04T00:00:00.000Z",
  };
  const samples = [
    {
      id: "meal-example",
      title: "Current message: meal package",
      card: base,
      wireId: "Q7M2K9.1",
    },
    {
      id: "meal-maximum",
      title: "Current message: maximum party and meals",
      card: {
        ...base,
        localTime: "15:00",
        adults: 10,
        children: 2,
        vegetarianMeals: 12,
      },
      wireId: "ZZZZZZ.999",
    },
    {
      id: "meal-zero",
      title: "Current message: no children or vegetarian meals",
      card: {
        ...base,
        localTime: "15:00",
        adults: 3,
        children: 0,
        vegetarianMeals: 0,
      },
      wireId: "Q7M2K9.1",
    },
    {
      id: "no-meal",
      title: "Current message: package without meals",
      card: { ...base, operatorId: "demo-weaving", vegetarianMeals: null },
      wireId: "Q7M2K9.1",
    },
  ];
  const current: ReviewItem[] = samples.map(({ id, title, card, wireId }) => {
    const text = renderBangla(card, wireId);
    return {
      id,
      title,
      kind: "current_sms",
      text,
      intendedMeaning: `Request ID #${wireId}. ${renderEnglish(card)}`,
      units: smsSize(text).units,
    };
  });
  const candidate =
    `#Q7M2K9.1\n${wireDate(base.localDate)} ${base.localTime}\nবড়:${base.adults} শিশু:${base.children}\nনিরামিষ:${base.vegetarianMeals}\nমোট মূল্য জানান।`.normalize(
      "NFC",
    );
  return [
    ...current,
    {
      id: "organized-candidate",
      title: "Proposed wording: review draft only",
      kind: "candidate_sms",
      text: candidate,
      intendedMeaning: current[0].intendedMeaning,
      units: smsSize(candidate).units,
    },
    {
      id: "operator-guide",
      title: "Operator instructions: draft",
      kind: "operator_guide",
      text: operatorGuide,
      intendedMeaning:
        "The guide must explain one service per profile; exact request ID/revision; DD-MM-YY and 24-hour Asia/Dhaka time; adult/child counts; vegetarian replacements and standard meals, or no meals; full-party BDT total including required charges; reply codes 1 offer, 2 decline, 3 alternative, 4 visitor acceptance and 5 matching operator acknowledgement; exact matching terms; expiry; unsupported needs requiring direct contact; SMS charges and no payment/service guarantee.",
      units: null,
    },
  ];
}
export const reviewResponseSchema = z.object({
  itemId: z.string(),
  interpretation: z.string().trim().min(1).max(3000),
  interpretationLockedAt: z.iso.datetime(),
  assessment: z.enum(["meaning_clear", "changes_needed", "uncertain"]),
  naturalness: z.enum(["natural", "awkward", "uncertain"]),
  comments: z.string().trim().min(1).max(3000),
  suggestedWording: z.string().max(3000),
});
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export function makeReviewExport(
  reviewer: string,
  device: string,
  items: ReviewItem[],
  responses: ReviewResponse[],
  materialSha256: string,
  attestations: {
    consentToExport: boolean;
    nativeBanglaSpeaker: boolean;
    reviewedIndependently: boolean;
  },
) {
  if (
    !attestations.consentToExport ||
    !attestations.nativeBanglaSpeaker ||
    !attestations.reviewedIndependently
  )
    throw new Error(
      "Native-speaker, independent-review and export-consent confirmations are required.",
    );
  if (!reviewer.trim() || reviewer.length > 32)
    throw new Error("Use a reviewer pseudonym of 1–32 characters.");
  if (
    responses.length !== items.length ||
    items.some(
      (item) => responses.filter((r) => r.itemId === item.id).length !== 1,
    )
  )
    throw new Error("Complete every review item once before exporting.");
  const checked = responses.map((r) => reviewResponseSchema.parse(r));
  if (!/^[a-f0-9]{64}$/.test(materialSha256))
    throw new Error("Review material hash is unavailable.");
  return {
    schemaVersion: 1,
    reviewVersion: BANGLA_REVIEW_VERSION,
    templateVersion: TEMPLATE_VERSION,
    exportedAt: new Date().toISOString(),
    reviewerPseudonym: reviewer.trim(),
    deviceDescription: device.trim(),
    attestations: {
      ...attestations,
      verification: "reviewer self-report, not independently verified",
    },
    materialSha256,
    items,
    responses: checked,
    templateApprovalStatus: "pending_external_assessment",
    physicalSmsEvidence: false,
    scope:
      "Native draft review only. Does not complete comprehension, physical SMS, or visitor studies. Does not change deployed wording or approval status.",
  };
}
