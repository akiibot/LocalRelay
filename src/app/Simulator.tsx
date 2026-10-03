import { useState } from "react";
import type {
  OperatorProfile,
  RelayRequest,
  ConfirmedCard,
} from "../domain/schema";
import { labels } from "../domain/schema";
import { dhakaDay, addDays } from "../domain/validation";
import { renderBangla, acceptance, wireDate } from "../templates/render";
import { smsSize } from "../sms/encoding";
import { parseReply } from "../sms/reply";
import { applyReply, action } from "../domain/state";
function newSimulation(p: OperatorProfile): RelayRequest {
  const now = new Date();
  const c: ConfirmedCard = {
    operatorId: p.id,
    localDate: addDays(dhakaDay(now), 7),
    localTime: "15:00",
    adults: 2,
    children: 1,
    vegetarianMeals: p.mealIncluded ? 1 : null,
    currency: "BDT",
    timezone: "Asia/Dhaka",
    askTotalPrice: true,
    confirmedAt: now.toISOString(),
  };
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    wireId: "Q7M2K9.1",
    revision: 1,
    mode: "simulation",
    entryMode: "form",
    card: c,
    templateVersion: p.templateVersion,
    operatorSnapshot: { ...p, phoneE164: null },
    renderedRequest: renderBangla(c, "Q7M2K9.1"),
    state: "REQUEST_SENT_REPORTED",
    events: [],
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 86400000).toISOString(),
    deleteAfter: new Date(now.getTime() + 7 * 86400000).toISOString(),
  };
}
export default function Simulator({ operator }: { operator: OperatorProfile }) {
  const [r, setRecord] = useState(() => newSimulation(operator)),
    [raw, setRaw] = useState("#Q7M2K9.1 1 1500"),
    [error, setError] = useState("");
  function run(fn: () => RelayRequest) {
    try {
      setRecord(fn());
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <>
      <span className="badge">
        SIMULATION ONLY · NO SMS OR REAL REQUEST WRITES
      </span>
      <h1>Isolated operator phone</h1>
      <p>
        This in-memory sandbox uses the same renderer, reply grammar and state
        guards. It never accesses real outbox records or a carrier. Closing it
        discards all simulation state.
      </p>
      <section>
        <h2>Simulated incoming enquiry</h2>
        <pre lang="bn">{r.renderedRequest}</pre>
        <p>
          {smsSize(r.renderedRequest).units} UTF-16 units · {labels[r.state]}
        </p>
        <label>
          Simulated operator reply
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} />
        </label>
        <button onClick={() => run(() => applyReply(r, parseReply(raw, r)))}>
          Parse simulated reply
        </button>
        <p>
          Offer: #{r.wireId} 1 1500
          <br />
          Decline: #{r.wireId} 2<br />
          Alternative: #{r.wireId} 3 {wireDate(r.card.localDate)} 16:00 1600
        </p>
      </section>
      {r.offer && (
        <section>
          <h2>Simulated visitor acceptance</h2>
          <pre>{acceptance(r.wireId, r.offer)}</pre>
          {r.state === "OFFER_RECEIVED" && (
            <button onClick={() => run(() => action(r, "accept"))}>
              Prepare simulated acceptance
            </button>
          )}
          {r.state === "ACCEPTANCE_READY" && (
            <button onClick={() => run(() => action(r, "sent"))}>
              Simulate user-reported acceptance send
            </button>
          )}
          <p>
            Matching acknowledgement: #{r.wireId} 5{" "}
            {wireDate(r.offer.localDate)} {r.offer.localTime} {r.offer.totalBdt}
          </p>
        </section>
      )}
      <button
        className="secondary"
        onClick={() => {
          setRecord(newSimulation(operator));
          setError("");
        }}
      >
        Reset simulation
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
