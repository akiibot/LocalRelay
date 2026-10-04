import type { OperatorProfile, RelayRequest } from "../../domain/schema";
import type { Scores } from "../../ai/features";
import { addDays, dhakaDay, validateCard } from "../../domain/validation";
import { parseFields } from "../../parsing/fields";
import { renderBangla, acceptance, wireDate } from "../../templates/render";
import { action, applyReply } from "../../domain/state";
import { parseReply } from "../../sms/reply";

export type Scenario = "standard" | "alternative" | "decline";
export type Message = {
  id: number;
  from: "visitor" | "operator";
  body: string;
  meaning: string;
};
export function sampleRequest(
  operator: OperatorProfile,
  now = new Date(),
): RelayRequest {
  const card = {
    operatorId: operator.id,
    localDate: addDays(dhakaDay(now), 7),
    localTime: "15:00",
    adults: 2,
    children: 1,
    vegetarianMeals: operator.mealIncluded ? 1 : null,
    currency: "BDT" as const,
    timezone: "Asia/Dhaka" as const,
    askTotalPrice: true as const,
    confirmedAt: now.toISOString(),
  };
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    wireId: "Q7M2K9.1",
    revision: 1,
    mode: "simulation",
    entryMode: "form",
    originalText: sampleText(card.localDate),
    card,
    templateVersion: operator.templateVersion,
    operatorSnapshot: { ...operator, phoneE164: null },
    renderedRequest: renderBangla(card, "Q7M2K9.1"),
    state: "READY_TO_SEND",
    events: [],
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 86400000).toISOString(),
    deleteAfter: new Date(now.getTime() + 7 * 86400000).toISOString(),
  };
}
export function sampleText(date: string) {
  return `Two adults and one child on ${date} at 3 pm. One vegetarian meal. What is the total price?`;
}
export function interpretSample(record: RelayRequest, scores: Scores) {
  const parsed = parseFields(record.originalText!);
  const card = {
    ...record.card,
    localDate: String(parsed.fields.localDate ?? ""),
    localTime: String(parsed.fields.localTime ?? ""),
    adults: Number(parsed.fields.adults ?? NaN),
    children: Number(parsed.fields.children ?? NaN),
    vegetarianMeals: record.operatorSnapshot.mealIncluded
      ? Number(parsed.fields.vegetarianMeals ?? NaN)
      : null,
  };
  const reasons = parsed.flags.map((flag) => flag.reason);
  if (
    !["booking_request", "availability_query", "price_query"].includes(
      scores.topIntent,
    )
  )
    reasons.push(
      `AI classified this as ${scores.topIntent.replaceAll("_", " ")}.`,
    );
  if (
    scores.intent[scores.topIntent] < scores.intentMin ||
    scores.margin < scores.marginMin
  )
    reasons.push("The model did not meet its confidence thresholds.");
  for (const [key, score] of Object.entries(scores.requirements))
    if (
      key !== "vegetarian" &&
      score >= scores.thresholds[key as keyof Scores["thresholds"]]
    )
      reasons.push(`AI flagged ${key.replaceAll("_", " ")}.`);
  reasons.push(
    ...parsed.clarifications,
    ...validateCard(card, record.operatorSnapshot),
  );
  // A fixed scenario must not silently demonstrate a different interpretation.
  if (
    Object.keys(parsed.fields).length &&
    ["localDate", "localTime", "adults", "children", "vegetarianMeals"].some(
      (key) =>
        card[key as keyof typeof card] !==
        record.card[key as keyof typeof card],
    )
  )
    reasons.push(
      "Extracted fields differ from the sample; review the preset form instead.",
    );
  return {
    reasons: [...new Set(reasons)],
    record: {
      ...record,
      card,
      entryMode: "ai" as const,
      modelVersion: scores.modelVersion,
      renderedRequest: renderBangla(card, record.wireId),
    },
  };
}
export function operatorReply(record: RelayRequest, scenario: Scenario) {
  if (scenario === "decline") return `#${record.wireId} 2`;
  if (scenario === "alternative")
    return `#${record.wireId} 3 ${wireDate(record.card.localDate)} 16:00 1600`;
  return `#${record.wireId} 1 1500`;
}
export function receiveOperatorReply(record: RelayRequest, body: string) {
  const reply = parseReply(body, record);
  if (reply.command !== 2) reply.offer.source = "simulator";
  return applyReply(record, reply);
}
export function acknowledgement(record: RelayRequest) {
  if (!record.offer)
    throw new Error("An offer is needed before acknowledgement.");
  return `#${record.wireId} 5 ${wireDate(record.offer.localDate)} ${record.offer.localTime} ${record.offer.totalBdt}`;
}
export function sendEnquiry(record: RelayRequest) {
  return action(record, "sent");
}
export function prepareAcceptance(record: RelayRequest) {
  return action(record, "accept");
}
export function sendAcceptance(record: RelayRequest) {
  if (!record.offer) throw new Error("An offer is needed before acceptance.");
  return {
    record: action(record, "sent"),
    body: acceptance(record.wireId, record.offer),
  };
}
