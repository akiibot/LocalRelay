import type { RelayRequest, Offer } from "../domain/schema";
import { validateSchedule } from "../domain/validation";
export type Reply = { command: 1 | 3 | 5; offer: Offer } | { command: 2 };
export function parseReply(
  raw: string,
  r: RelayRequest,
  now = new Date(),
): Reply {
  const text = raw
    .replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6))
    .trim();
  const tokens = text.split(/\s+/);
  if (tokens[0] !== `#${r.wireId}`)
    throw new Error("Wrong request ID or stale revision.");
  const cmd = tokens[1];
  if (!["1", "2", "3", "5"].includes(cmd))
    throw new Error("Unknown reply command; use 1, 2, 3 or 5.");
  if (tokens.length !== (cmd === "2" ? 2 : cmd === "1" ? 3 : 5))
    throw new Error("Wrong number of terms; do not append extra text.");
  if (cmd === "2") return { command: 2 };
  let day = r.card.localDate,
    time = r.card.localTime;
  if (cmd !== "1") {
    const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(tokens[2]);
    if (!m) throw new Error("Use DD-MM-YY for the reply date.");
    day = `20${m[3]}-${m[2]}-${m[1]}`;
    time = tokens[3];
  }
  const errors = validateSchedule(day, time, r.operatorSnapshot, now);
  if (errors.length) throw new Error(errors.join(" "));
  const price = tokens[cmd === "1" ? 2 : 4];
  if (
    !/^[1-9]\d*$/.test(price) ||
    !Number.isSafeInteger(Number(price)) ||
    Number(price) > r.operatorSnapshot.maxQuoteBdt
  )
    throw new Error(
      "Enter a positive integer total BDT price within the profile limit.",
    );
  return {
    command: Number(cmd) as 1 | 3 | 5,
    offer: {
      localDate: day,
      localTime: time,
      totalBdt: Number(price),
      receivedAt: now.toISOString(),
      source: r.mode === "simulation" ? "simulator" : "manually_entered_sms",
    },
  };
}
