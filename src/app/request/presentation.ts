import type { RelayRequest } from "../../domain/schema";
export const presentation: Record<
  RelayRequest["state"],
  { next: string; tone: "neutral" | "success" | "attention"; action: string }
> = {
  READY_TO_SEND: {
    next: "Your request is saved on this device. Open your SMS app to send it.",
    tone: "neutral",
    action: "Send enquiry",
  },
  COMPOSER_OPENED: {
    next: "After sending in your SMS app, record that you sent this enquiry. Opening the app alone does not confirm sending.",
    tone: "attention",
    action: "Record sending",
  },
  REQUEST_SENT_REPORTED: {
    next: "You reported sending the enquiry. When the operator replies, check the sender and record their SMS here.",
    tone: "neutral",
    action: "Record operator reply",
  },
  OFFER_RECEIVED: {
    next: "Review the operator’s date, time and full total before preparing your acceptance.",
    tone: "attention",
    action: "Review offer",
  },
  ACCEPTANCE_READY: {
    next: "Your acceptance is ready. Send it from your SMS app to agree to the reviewed offer.",
    tone: "neutral",
    action: "Send acceptance",
  },
  ACCEPTANCE_COMPOSER_OPENED: {
    next: "After sending in your SMS app, record that you sent the acceptance. Sending is still unverified.",
    tone: "attention",
    action: "Record sending",
  },
  ACCEPTANCE_SENT_REPORTED: {
    next: "You reported sending acceptance. Record the operator’s matching acknowledgement to complete this exchange.",
    tone: "neutral",
    action: "Record acknowledgement",
  },
  AGREEMENT_RECORDED: {
    next: "The entered acknowledgement matches your accepted offer. This record relies on SMS messages you entered; it does not verify payment, inventory or service delivery.",
    tone: "success",
    action: "View receipt",
  },
  DECLINED: {
    next: "The operator declined. Contact them directly before trying different terms.",
    tone: "attention",
    action: "View declined request",
  },
  CONFLICT: {
    next: "The entered replies conflict. Contact the operator directly to resolve the terms.",
    tone: "attention",
    action: "Review conflict",
  },
  EXPIRED: {
    next: "This local request expired. Confirm directly with the operator before renewing; expiry does not cancel a reservation.",
    tone: "attention",
    action: "View expired request",
  },
  SUPERSEDED: {
    next: "A newer revision replaced this request. Use the latest revision for your exchange.",
    tone: "neutral",
    action: "Find latest revision",
  },
  ARCHIVED: {
    next: "This record is archived on this device. It cannot continue the SMS exchange.",
    tone: "neutral",
    action: "View archived record",
  },
};
export const exceptional = [
  "DECLINED",
  "CONFLICT",
  "EXPIRED",
  "SUPERSEDED",
  "ARCHIVED",
];
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "Asia/Dhaka",
  }).format(new Date(`${date}T12:00:00+06:00`));
}
