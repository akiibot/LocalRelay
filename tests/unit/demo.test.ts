import { expect, it } from "vitest";
import type { Scores } from "../../src/ai/features";
import { operatorSchema } from "../../src/domain/schema";
import operators from "../../public/data/operators/demo.json";
import {
  sampleRequest,
  interpretSample,
  sendEnquiry,
  operatorReply,
  receiveOperatorReply,
  prepareAcceptance,
  sendAcceptance,
  acknowledgement,
} from "../../src/app/demo/workflow";
const operator = operatorSchema.parse(operators[0]);
const scores: Scores = {
  intent: {
    booking_request: 0.9,
    availability_query: 0.02,
    price_query: 0.04,
    change_cancel: 0.01,
    directions_transport: 0.01,
    other_tourism: 0.01,
    unsupported: 0.01,
  },
  requirements: {
    vegetarian: 0.9,
    transport: 0,
    accessibility: 0,
    allergy_or_medical: 0,
    payment_condition: 0,
    other_extra_detail: 0,
  },
  thresholds: {
    vegetarian: 0.5,
    transport: 0.5,
    accessibility: 0.5,
    allergy_or_medical: 0.5,
    payment_condition: 0.5,
    other_extra_detail: 0.5,
  },
  topIntent: "booking_request",
  margin: 0.86,
  ms: 2,
  modelVersion: "test",
  intentMin: 0.55,
  marginMin: 0.05,
};
it("only demonstrates AI interpretation after actual extraction and confidence checks pass", () => {
  const r = sampleRequest(operator);
  const result = interpretSample(r, scores);
  expect(result.reasons).toEqual([]);
  expect(result.record.entryMode).toBe("ai");
  expect(result.record.card).toEqual(r.card);
  expect(result.record.mode).toBe("simulation");
});
it("does not silently replace uncertain, unsafe or incorrect extraction with preset fields", () => {
  const r = sampleRequest(operator);
  expect(interpretSample(r, { ...scores, margin: 0 }).reasons).toContain(
    "The model did not meet its confidence thresholds.",
  );
  expect(
    interpretSample(r, {
      ...scores,
      requirements: { ...scores.requirements, allergy_or_medical: 0.8 },
    }).reasons.join(" "),
  ).toContain("allergy or medical");
  expect(
    interpretSample(
      {
        ...r,
        originalText: r.originalText!.replace("Two adults", "Four adults"),
      },
      scores,
    ).reasons.join(" "),
  ).toContain("differ from the sample");
});
it.each(["standard", "alternative"] as const)(
  "%s offer carries matching terms through acceptance and acknowledgement",
  (scenario) => {
    let r = sendEnquiry(sampleRequest(operator));
    r = receiveOperatorReply(r, operatorReply(r, scenario));
    expect(r.offer?.source).toBe("simulator");
    expect(r.offer?.totalBdt).toBe(scenario === "standard" ? 1500 : 1600);
    expect(r.offer?.localTime).toBe(
      scenario === "standard" ? "15:00" : "16:00",
    );
    r = prepareAcceptance(r);
    const sent = sendAcceptance(r);
    expect(sent.body).toContain(` ${r.offer!.localTime} ${r.offer!.totalBdt}`);
    r = receiveOperatorReply(sent.record, acknowledgement(sent.record));
    expect(r.state).toBe("AGREEMENT_RECORDED");
    expect(r.mode).toBe("simulation");
  },
);
it("decline stops the demo and an early or mismatched acknowledgement cannot create an agreement", () => {
  const sent = sendEnquiry(sampleRequest(operator));
  const declined = receiveOperatorReply(sent, operatorReply(sent, "decline"));
  expect(declined.state).toBe("DECLINED");
  expect(() => prepareAcceptance(declined)).toThrow();
  const offer = receiveOperatorReply(sent, operatorReply(sent, "standard"));
  expect(() => receiveOperatorReply(offer, acknowledgement(offer))).toThrow(
    /Report sending acceptance/,
  );
  const accepted = sendAcceptance(prepareAcceptance(offer)).record;
  expect(() =>
    receiveOperatorReply(
      accepted,
      acknowledgement(accepted).replace("1500", "1600"),
    ),
  ).toThrow(/do not match/);
});
