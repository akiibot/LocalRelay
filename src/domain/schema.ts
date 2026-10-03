import { z } from "zod";
export const TEMPLATE_VERSION = "bn-draft-1";
export const operatorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  serviceName: z.string(),
  standardMeal: z.string(),
  phoneE164: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/)
    .nullable(),
  language: z.literal("bn"),
  currency: z.literal("BDT"),
  timezone: z.literal("Asia/Dhaka"),
  maxGuests: z.number().int().positive().max(99),
  maxAdvanceDays: z.number().int().positive(),
  mealIncluded: z.boolean(),
  maxQuoteBdt: z.number().int().positive(),
  checkedAt: z.iso.date(),
  templateVersion: z.string(),
  isDemo: z.boolean(),
});
export type OperatorProfile = z.infer<typeof operatorSchema>;
export const cardSchema = z.object({
  operatorId: z.string(),
  localDate: z.iso.date(),
  localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  adults: z.number().int().min(1),
  children: z.number().int().min(0),
  vegetarianMeals: z.number().int().min(0).nullable(),
  currency: z.literal("BDT"),
  timezone: z.literal("Asia/Dhaka"),
  askTotalPrice: z.literal(true),
  confirmedAt: z.iso.datetime(),
});
export type ConfirmedCard = z.infer<typeof cardSchema>;
export const offerSchema = z.object({
  localDate: z.iso.date(),
  localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  totalBdt: z.number().int().positive(),
  receivedAt: z.iso.datetime(),
  source: z.enum(["manually_entered_sms", "simulator"]),
});
export type Offer = z.infer<typeof offerSchema>;
export const states = [
  "READY_TO_SEND",
  "COMPOSER_OPENED",
  "REQUEST_SENT_REPORTED",
  "OFFER_RECEIVED",
  "ACCEPTANCE_READY",
  "ACCEPTANCE_COMPOSER_OPENED",
  "ACCEPTANCE_SENT_REPORTED",
  "AGREEMENT_RECORDED",
  "DECLINED",
  "CONFLICT",
  "EXPIRED",
  "SUPERSEDED",
  "ARCHIVED",
] as const;
export const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("queued"), at: z.iso.datetime() }),
  z.object({
    type: z.literal("composer_opened"),
    at: z.iso.datetime(),
    phase: z.enum(["request", "acceptance"]),
  }),
  z.object({
    type: z.literal("send_reported"),
    at: z.iso.datetime(),
    phase: z.enum(["request", "acceptance"]),
  }),
  z.object({
    type: z.literal("reply"),
    at: z.iso.datetime(),
    command: z.number().int(),
    terms: offerSchema.optional(),
  }),
  z.object({ type: z.literal("accept"), at: z.iso.datetime() }),
  z.object({ type: z.literal("expired"), at: z.iso.datetime() }),
  z.object({ type: z.literal("superseded"), at: z.iso.datetime() }),
  z.object({ type: z.literal("archived"), at: z.iso.datetime() }),
]);
export type RequestEvent = z.infer<typeof eventSchema>;
export const requestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().uuid(),
    wireId: z.string().regex(/^[A-HJ-NP-Z2-9]{6}\.[1-9]\d*$/),
    revision: z.number().int().min(1),
    mode: z.enum(["real", "simulation"]),
    entryMode: z.enum(["ai", "form"]),
    originalText: z.string().max(500).optional(),
    card: cardSchema,
    modelVersion: z.string().optional(),
    templateVersion: z.string(),
    operatorSnapshot: operatorSchema,
    renderedRequest: z.string().min(1).max(70),
    offer: offerSchema.optional(),
    state: z.enum(states),
    events: z.array(eventSchema),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    deleteAfter: z.iso.datetime(),
  })
  .superRefine((r, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (r.revision !== Number(r.wireId.split(".")[1]))
      fail("Wire revision mismatch");
    if (
      r.card.operatorId !== r.operatorSnapshot.id ||
      r.templateVersion !== r.operatorSnapshot.templateVersion
    )
      fail("Profile/template snapshot mismatch");
    if (r.card.adults + r.card.children > r.operatorSnapshot.maxGuests)
      fail("Party exceeds profile bounds");
    if (
      r.operatorSnapshot.mealIncluded
        ? r.card.vegetarianMeals === null ||
          r.card.vegetarianMeals > r.card.adults + r.card.children
        : r.card.vegetarianMeals !== null
    )
      fail("Meal semantics mismatch");
    if (
      r.offer &&
      (r.offer.totalBdt > r.operatorSnapshot.maxQuoteBdt ||
        r.offer.source !==
          (r.mode === "simulation" ? "simulator" : "manually_entered_sms"))
    )
      fail("Offer bounds/provenance mismatch");
    if (
      [
        "OFFER_RECEIVED",
        "ACCEPTANCE_READY",
        "ACCEPTANCE_COMPOSER_OPENED",
        "ACCEPTANCE_SENT_REPORTED",
        "AGREEMENT_RECORDED",
      ].includes(r.state) &&
      !r.offer
    )
      fail("Offer required for current state");
  });
export type RelayRequest = z.infer<typeof requestSchema>;
export const labels: Record<RelayRequest["state"], string> = {
  READY_TO_SEND: "Ready to send",
  COMPOSER_OPENED: "SMS app opened — sending unverified",
  REQUEST_SENT_REPORTED: "You reported sending the enquiry",
  OFFER_RECEIVED: "Offer received",
  ACCEPTANCE_READY: "Acceptance ready to send",
  ACCEPTANCE_COMPOSER_OPENED: "Acceptance SMS app opened",
  ACCEPTANCE_SENT_REPORTED: "Awaiting operator acknowledgement",
  AGREEMENT_RECORDED: "Agreement recorded",
  DECLINED: "Operator declined",
  CONFLICT: "Conflicting replies — contact operator",
  EXPIRED: "Expired — contact operator",
  SUPERSEDED: "Superseded by a new revision",
  ARCHIVED: "Archived locally",
};
