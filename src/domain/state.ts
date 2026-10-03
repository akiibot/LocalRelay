import type { RelayRequest, RequestEvent, Offer } from "./schema";
import type { Reply } from "../sms/reply";
export function sameOffer(a: Offer, b: Offer) {
  return (
    a.localDate === b.localDate &&
    a.localTime === b.localTime &&
    a.totalBdt === b.totalBdt
  );
}
const terminal = ["DECLINED", "CONFLICT", "EXPIRED", "SUPERSEDED", "ARCHIVED"];
export function expire(r: RelayRequest, now = new Date()): RelayRequest {
  if (
    now.getTime() >= Date.parse(r.expiresAt) &&
    !terminal.includes(r.state) &&
    r.state !== "AGREEMENT_RECORDED"
  )
    return {
      ...r,
      state: "EXPIRED",
      events: [...r.events, { type: "expired", at: now.toISOString() }],
    };
  return r;
}
export function action(
  r: RelayRequest,
  type: "composer" | "sent" | "accept" | "archive" | "supersede",
  now = new Date(),
): RelayRequest {
  const current = expire(r, now);
  if (current.state === "EXPIRED" && type !== "archive")
    throw new Error("Request expired; contact the operator before renewing.");
  let state: RelayRequest["state"];
  let event: RequestEvent;
  const at = now.toISOString();
  if (type === "archive") {
    state = "ARCHIVED";
    event = { type: "archived", at };
  } else if (type === "supersede") {
    if (
      ["AGREEMENT_RECORDED", "ARCHIVED", "SUPERSEDED"].includes(current.state)
    )
      throw new Error("Changes now require human contact.");
    state = "SUPERSEDED";
    event = { type: "superseded", at };
  } else if (type === "accept") {
    if (current.state !== "OFFER_RECEIVED" || !current.offer)
      throw new Error("A valid offer is required first.");
    state = "ACCEPTANCE_READY";
    event = { type: "accept", at };
  } else {
    const request = [
      "READY_TO_SEND",
      "COMPOSER_OPENED",
      "REQUEST_SENT_REPORTED",
    ].includes(current.state);
    const acceptance = [
      "ACCEPTANCE_READY",
      "ACCEPTANCE_COMPOSER_OPENED",
      "ACCEPTANCE_SENT_REPORTED",
    ].includes(current.state);
    if (!request && !acceptance)
      throw new Error("This action is not permitted in the current state.");
    const phase = request ? "request" : "acceptance";
    state =
      type === "composer"
        ? request
          ? "COMPOSER_OPENED"
          : "ACCEPTANCE_COMPOSER_OPENED"
        : request
          ? "REQUEST_SENT_REPORTED"
          : "ACCEPTANCE_SENT_REPORTED";
    event =
      type === "composer"
        ? { type: "composer_opened", phase, at }
        : { type: "send_reported", phase, at };
  }
  if (
    type === "composer" &&
    ["REQUEST_SENT_REPORTED", "ACCEPTANCE_SENT_REPORTED"].includes(
      current.state,
    )
  )
    state = current.state;
  return { ...current, state, events: [...current.events, event] };
}
export function applyReply(
  r: RelayRequest,
  reply: Reply,
  resolveMissingReport = false,
  now = new Date(),
): RelayRequest {
  const current = expire(r, now);
  if (current.state === "DECLINED" && reply.command === 2) return current;
  if (terminal.includes(current.state))
    throw new Error("This request cannot progress. Contact the operator.");
  if (reply.command === 5) {
    if (!current.offer || !sameOffer(current.offer, reply.offer))
      throw new Error("Acknowledgement terms do not match the frozen offer.");
    if (current.state === "AGREEMENT_RECORDED") return current;
    if (current.state !== "ACCEPTANCE_SENT_REPORTED") {
      if (
        !resolveMissingReport ||
        !["ACCEPTANCE_READY", "ACCEPTANCE_COMPOSER_OPENED"].includes(
          current.state,
        )
      )
        throw new Error(
          "Report sending acceptance, or explicitly resolve the omitted report from the matching SMS.",
        );
    }
    return {
      ...current,
      state: "AGREEMENT_RECORDED",
      deleteAfter: new Date(now.getTime() + 30 * 86400000).toISOString(),
      events: [
        ...current.events,
        {
          type: "reply",
          command: 5,
          terms: reply.offer,
          at: now.toISOString(),
        },
      ],
    };
  }
  if (reply.command === 2) {
    if (current.state === "AGREEMENT_RECORDED" || current.offer)
      return {
        ...current,
        state: "CONFLICT",
        events: [
          ...current.events,
          { type: "reply", command: 2, at: now.toISOString() },
        ],
      };
  } else if (current.offer) {
    if (sameOffer(current.offer, reply.offer)) return current;
    return {
      ...current,
      state: "CONFLICT",
      events: [
        ...current.events,
        {
          type: "reply",
          command: reply.command,
          terms: reply.offer,
          at: now.toISOString(),
        },
      ],
    };
  }
  if (
    current.state !== "REQUEST_SENT_REPORTED" &&
    !(
      resolveMissingReport &&
      ["READY_TO_SEND", "COMPOSER_OPENED"].includes(current.state)
    )
  )
    throw new Error(
      "Report sending the enquiry, or explicitly resolve the omitted report from the SMS.",
    );
  return {
    ...current,
    state: reply.command === 2 ? "DECLINED" : "OFFER_RECEIVED",
    offer: reply.command === 2 ? undefined : reply.offer,
    events: [
      ...current.events,
      {
        type: "reply",
        command: reply.command,
        terms: reply.command === 2 ? undefined : reply.offer,
        at: now.toISOString(),
      },
    ],
  };
}
