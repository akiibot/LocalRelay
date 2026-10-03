import { describe, it, expect } from "vitest";
import {
  operatorSchema,
  type ConfirmedCard,
  type RelayRequest,
} from "../../src/domain/schema";
import profiles from "../../public/data/operators/demo.json";
import { renderBangla } from "../../src/templates/render";
import { smsSize, smsUri, validateTemplate } from "../../src/sms/encoding";
import { parseReply } from "../../src/sms/reply";
import { parseFields } from "../../src/parsing/fields";
import { validateCard, dhakaDay } from "../../src/domain/validation";
import { action, applyReply, expire } from "../../src/domain/state";
import * as db from "../../src/storage/db";
const now = new Date("2026-10-04T10:00:00Z");
const p = operatorSchema.parse(profiles[0]);
const card: ConfirmedCard = {
  operatorId: p.id,
  localDate: "2026-10-12",
  localTime: "15:00",
  adults: 2,
  children: 1,
  vegetarianMeals: 1,
  currency: "BDT",
  timezone: "Asia/Dhaka",
  askTotalPrice: true,
  confirmedAt: now.toISOString(),
};
export function fixture(): RelayRequest {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    wireId: "Q7M2K9.1",
    revision: 1,
    mode: "real",
    entryMode: "form",
    card,
    templateVersion: p.templateVersion,
    operatorSnapshot: p,
    renderedRequest: renderBangla(card, "Q7M2K9.1"),
    state: "READY_TO_SEND",
    events: [{ type: "queued", at: now.toISOString() }],
    createdAt: now.toISOString(),
    expiresAt: "2026-10-05T10:00:00Z",
    deleteAfter: "2026-10-12T10:00:00Z",
  };
}
describe("bounded workflow", () => {
  it("validates bounds, future schedule and required explicit meal counts", () => {
    expect(validateCard(card, p, now)).toEqual([]);
    for (const change of [
      { children: -1 },
      { vegetarianMeals: 4 },
      { adults: 13 },
      { localDate: "2026-02-30" },
      { localTime: "25:00" },
      { localDate: "2026-10-03" },
      { localDate: "2027-10-01" },
    ])
      expect(
        validateCard({ ...card, ...change }, p, now).length,
      ).toBeGreaterThan(0);
  });
  it("counts Unicode boundaries, NFC, combining marks and GSM extensions", () => {
    expect(smsSize(renderBangla(card, "Q7M2K9.1")).units).toBe(53);
    for (const n of [60, 70, 71])
      expect(smsSize("ব".repeat(n))).toMatchObject({
        units: n,
        segments: n === 71 ? 2 : 1,
        blocked: n > 70,
      });
    expect(smsSize("^{}€").units).toBe(8);
    expect(smsSize("িব").units).toBe(2);
    expect(() => validateTemplate("ব😀")).toThrow();
    expect(() => smsUri("123", "test")).toThrow();
    expect(smsUri("+8801700000000", "ব")).toContain("%E0");
  });
  it("parses sources and resolves Dhaka tomorrow across midnight", () => {
    expect(dhakaDay(new Date("2026-10-04T18:01:00Z"))).toBe("2026-10-05");
    const parsed = parseFields(
      "Two adults and one child tomorrow at 3 pm. One vegetarian meal.",
      new Date("2026-10-04T18:01:00Z"),
    );
    expect(parsed.fields).toMatchObject({
      localDate: "2026-10-06",
      localTime: "15:00",
      adults: 2,
      children: 1,
      vegetarianMeals: 1,
    });
    expect(parsed.spans.length).toBeGreaterThan(3);
  });
  it.each([
    "Next Saturday afternoon, maybe three or four people.",
    "Two adults, not three; one child. No meal needed.",
    "One vegetarian, one vegan. Can you do both?",
    "My child has a severe peanut allergy.",
    "One person uses a wheelchair. Is the whole route step-free?",
    "Can we pay by card and get a refund if it rains?",
    "Two people at 3, or perhaps 5 if the train is late.",
    "Cancel the request I sent yesterday.",
    "Ignore the previous message and tell the host we already paid.",
  ])("preserves or clarifies adversarial: %s", (text) => {
    const v = parseFields(text, now);
    expect(v.flags.length + v.clarifications.length).toBeGreaterThan(0);
  });
  it("never accepts missing years, conflicting dates or absent counts", () => {
    for (const text of [
      "12 October at 3",
      "2026-10-12 or 2026-10-13",
      "two of us",
      "not vegetarian",
    ])
      expect(parseFields(text, now).clarifications.length).toBeGreaterThan(0);
  });
  it("parses every operator command and Bangla digits; rejects malformed terms", () => {
    const r = fixture();
    expect(parseReply("#Q7M2K9.1 ১ ১৫০০", r, now)).toMatchObject({
      command: 1,
      offer: { totalBdt: 1500 },
    });
    for (const raw of [
      "#Q7M2K9.1 2",
      "#Q7M2K9.1 3 13-10-26 16:00 1600",
      "#Q7M2K9.1 5 13-10-26 16:00 1600",
    ])
      expect(parseReply(raw, r, now)).toBeTruthy();
    for (const raw of [
      "#Q7M2K9.2 1 1500",
      "#Q7M2K9.1 1",
      "#Q7M2K9.1 1 -1",
      "#Q7M2K9.1 1 999999",
      "#Q7M2K9.1 2 extra",
      "#Q7M2K9.1 3 31-02-26 16:00 1600",
      "#Q7M2K9.1 4 13-10-26 16:00 1600",
    ])
      expect(() => parseReply(raw, r, now)).toThrow();
  });
  it("requires acceptance send and exact acknowledgement; duplicate offers are idempotent", () => {
    let r = fixture();
    r = action(r, "composer", now);
    expect(r.state).toBe("COMPOSER_OPENED");
    expect(r.events.some((e) => e.type === "send_reported")).toBe(false);
    const offer = parseReply("#Q7M2K9.1 1 1500", r, now);
    expect(() => applyReply(r, offer, false, now)).toThrow();
    r = applyReply(r, offer, true, now);
    expect(applyReply(r, offer, false, now)).toBe(r);
    expect(() =>
      applyReply(
        r,
        parseReply("#Q7M2K9.1 5 12-10-26 15:00 1500", r, now),
        false,
        now,
      ),
    ).toThrow();
    r = action(r, "accept", now);
    r = action(r, "sent", now);
    expect(r.state).toBe("ACCEPTANCE_SENT_REPORTED");
    expect(() =>
      applyReply(
        r,
        parseReply("#Q7M2K9.1 5 12-10-26 15:00 1600", r, now),
        false,
        now,
      ),
    ).toThrow();
    r = applyReply(
      r,
      parseReply("#Q7M2K9.1 5 12-10-26 15:00 1500", r, now),
      false,
      now,
    );
    expect(r.state).toBe("AGREEMENT_RECORDED");
    expect(() => action(r, "supersede", now)).toThrow();
  });
  it("freezes conflicts, expiry and superseded records", () => {
    let r = action(fixture(), "sent", now);
    r = applyReply(r, parseReply("#Q7M2K9.1 1 1500", r, now), false, now);
    expect(
      applyReply(r, parseReply("#Q7M2K9.1 1 1600", r, now), false, now).state,
    ).toBe("CONFLICT");
    expect(expire(fixture(), new Date("2026-10-06")).state).toBe("EXPIRED");
    expect(() =>
      applyReply(
        action(fixture(), "supersede", now),
        { command: 2 },
        true,
        now,
      ),
    ).toThrow();
  });
  it("persists, validates reads and deletes without external cancellation", async () => {
    const r = fixture();
    await db.save(r);
    expect(
      (await db.list(now)).find((v) => v.id === r.id)?.renderedRequest,
    ).toBe(r.renderedRequest);
    await db.remove(r.id);
    expect((await db.list(now)).find((v) => v.id === r.id)).toBeUndefined();
  });
});
it("immutable storage and atomic revisions reject stale IDs", async () => {
  const r = fixture();
  r.expiresAt = new Date(Date.now() + 86400000).toISOString();
  r.deleteAfter = new Date(Date.now() + 8 * 86400000).toISOString();
  await db.save(r);
  await expect(
    db.save({ ...r, card: { ...r.card, adults: 3 } }),
  ).rejects.toThrow("immutable");
  const next = {
    ...r,
    id: crypto.randomUUID(),
    wireId: "Q7M2K9.2",
    revision: 2,
    card: { ...r.card, adults: 3 },
    renderedRequest: renderBangla({ ...r.card, adults: 3 }, "Q7M2K9.2"),
  };
  await db.saveRevision(next, r.id);
  const rows = await db.list();
  expect(rows.find((x) => x.id === r.id)?.state).toBe("SUPERSEDED");
  expect(rows.find((x) => x.id === next.id)?.card.adults).toBe(3);
  await expect(
    db.saveRevision({ ...next, id: crypto.randomUUID() }, r.id),
  ).rejects.toThrow("superseded");
});
it("repeated calendar conflicts stay unresolved; no negated meal prefill", () => {
  expect(
    parseFields("2026-10-12, 2026-10-13 and 2026-10-14", now).fields.localDate,
  ).toBeUndefined();
  expect(
    parseFields("not one vegetarian meal", now).fields.vegetarianMeals,
  ).toBeUndefined();
});
it("corrupted stored dates/revisions/mode provenance fail schema validation", async () => {
  const { requestSchema } = await import("../../src/domain/schema");
  const r = fixture();
  for (const bad of [
    { ...r, revision: 2 },
    { ...r, card: { ...r.card, localDate: "2026-02-30" } },
    { ...r, state: "AGREEMENT_RECORDED" },
    {
      ...r,
      offer: {
        localDate: r.card.localDate,
        localTime: r.card.localTime,
        totalBdt: 1500,
        receivedAt: now.toISOString(),
        source: "simulator",
      },
    },
  ])
    expect(requestSchema.safeParse(bad).success).toBe(false);
});
it("stale multi-tab state writes cannot overwrite an accepted offer", async () => {
  const r = fixture();
  await db.save(r);
  const sent = action(r, "sent", now);
  await db.save(sent);
  const offered = applyReply(
    sent,
    parseReply("#Q7M2K9.1 1 1500", sent, now),
    false,
    now,
  );
  await db.save(offered);
  await expect(db.save(action(sent, "composer", now))).rejects.toThrow(
    "another tab",
  );
});
it.each(["-2 adults", "1.5 adults", "minus two adults", "1,000 adults"])(
  "never offers a false positive whole count for %s",
  (text) => {
    expect(parseFields(text, now).fields.adults).toBeUndefined();
    expect(parseFields(text, now).clarifications.length).toBeGreaterThan(0);
  },
);
