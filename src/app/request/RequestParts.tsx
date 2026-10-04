import type {
  ConfirmedCard,
  OperatorProfile,
  RelayRequest,
  Offer,
} from "../../domain/schema";
import { labels } from "../../domain/schema";
import { smsSize } from "../../sms/encoding";
import { dateLabel, exceptional, presentation } from "./presentation";

export function RequestSummary({
  card,
  operator,
}: {
  card: ConfirmedCard;
  operator: OperatorProfile;
}) {
  return (
    <dl className="summary-grid">
      <div>
        <dt>Experience</dt>
        <dd>{operator.serviceName}</dd>
      </div>
      <div>
        <dt>Date</dt>
        <dd>{dateLabel(card.localDate)}</dd>
      </div>
      <div>
        <dt>Bangladesh time</dt>
        <dd>{card.localTime} · Asia/Dhaka</dd>
      </div>
      <div>
        <dt>Guests</dt>
        <dd>
          {card.adults} adults · {card.children} children
        </dd>
      </div>
      <div>
        <dt>Meals</dt>
        <dd>
          {operator.mealIncluded
            ? `${card.vegetarianMeals} vegetarian; all other guests receive the standard meal`
            : "No meals included"}
        </dd>
      </div>
      {operator.mealIncluded && (
        <div>
          <dt>Standard meal</dt>
          <dd>{operator.standardMeal}</dd>
        </div>
      )}
      <div>
        <dt>Price request</dt>
        <dd>Full total in BDT, including required charges</dd>
      </div>
    </dl>
  );
}
export function SmsPanel({
  body,
  temporary = false,
  title,
}: {
  body: string;
  temporary?: boolean;
  title?: string;
}) {
  const size = smsSize(body);
  const Heading = title ? "h2" : "h3";
  return (
    <div className="sms-panel">
      <div className="section-heading">
        <Heading>{title ?? "Exact Bangla SMS"}</Heading>
        <span className="badge">Draft template</span>
      </div>
      {temporary && (
        <p className="muted">Preview — request ID assigned when saved.</p>
      )}
      <pre lang="bn">{body}</pre>
      <p className="sms-estimate">
        Estimated {size.segments} SMS segment(s). Carrier charges apply.
      </p>
      <details className="technical">
        <summary>Message length details</summary>
        <p>
          {size.units}{" "}
          {size.encoding === "Unicode" ? "UTF-16 units" : "GSM-7 septets"}
          {size.warning ? " · above the conservative 60-unit target" : ""}. This
          estimate does not verify carrier segmentation.
        </p>
      </details>
    </div>
  );
}
export function RequestProgress({ record }: { record: RelayRequest }) {
  const events = record.events;
  const sentRequest =
    events.some((e) => e.type === "send_reported" && e.phase === "request") ||
    events.some(
      (e) =>
        e.type === "reply" &&
        (e.command === 1 || e.command === 3 || e.command === 4),
    );
  const sentAcceptance =
    events.some(
      (e) => e.type === "send_reported" && e.phase === "acceptance",
    ) || record.state === "AGREEMENT_RECORDED";
  const steps = [
    { label: "Enquiry send reported", done: sentRequest },
    { label: "Operator offer recorded", done: !!record.offer },
    { label: "Acceptance send reported", done: sentAcceptance },
    {
      label: "Acknowledgement recorded",
      done: record.state === "AGREEMENT_RECORDED",
    },
  ];
  const stopped = exceptional.includes(record.state);
  const current = steps.findIndex((s) => !s.done);
  return (
    <details className="progress-card" aria-label="SMS exchange progress">
      <summary>
        <span>SMS exchange progress</span>
        <span className="progress-summary">
          {stopped
            ? `Stopped · ${labels[record.state]}`
            : current < 0
              ? "4 of 4 steps recorded"
              : `Step ${current + 1} of 4 · ${steps[current].label}`}
        </span>
      </summary>
      <ol className="exchange-progress">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={
              !stopped && s.done
                ? "done"
                : !stopped && i === current
                  ? "current"
                  : ""
            }
            aria-current={!stopped && i === current ? "step" : undefined}
          >
            <span className="step-dot" aria-hidden="true">
              {!stopped && s.done ? "✓" : i + 1}
            </span>
            <span>
              {s.label}
              {!stopped && i === current && <small>Next step</small>}
            </span>
          </li>
        ))}
      </ol>
      {stopped && (
        <p className="muted">Exchange stopped: {labels[record.state]}.</p>
      )}
      <small>
        Progress reflects local reports and manually entered replies, not
        carrier delivery receipts.
      </small>
    </details>
  );
}
export function OfferSummary({
  offer,
  card,
  acknowledgement = false,
}: {
  offer: Offer;
  card: ConfirmedCard;
  acknowledgement?: boolean;
}) {
  const changed =
    offer.localDate !== card.localDate || offer.localTime !== card.localTime;
  return (
    <div className="offer-summary">
      <p className="quote">
        {offer.totalBdt.toLocaleString("en-BD")} <span>BDT full total</span>
      </p>
      <p>
        <strong>{dateLabel(offer.localDate)}</strong> at{" "}
        <strong>{offer.localTime}</strong> · Asia/Dhaka
      </p>
      {changed && (
        <div className="warning">
          <strong>Different date or time</strong>
          <p>
            You requested {dateLabel(card.localDate)} at {card.localTime}.{" "}
            {acknowledgement
              ? "This acknowledgement matches the accepted alternative offer."
              : "Review this alternative before accepting."}
          </p>
        </div>
      )}
      <p className="muted">
        The original guest and meal terms remain part of this request.
      </p>
    </div>
  );
}
export function StatusBadge({ record }: { record: RelayRequest }) {
  return (
    <span className={`badge state-badge ${presentation[record.state].tone}`}>
      {labels[record.state]}
    </span>
  );
}
