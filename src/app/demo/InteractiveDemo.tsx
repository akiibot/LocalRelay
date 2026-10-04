import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { OperatorProfile } from "../../domain/schema";
import type { Scores } from "../../ai/features";
import { analyzeLocal } from "../../ai/client";
import { renderEnglish, acceptance } from "../../templates/render";
import { RequestSummary, OfferSummary } from "../request/RequestParts";
import {
  sampleRequest,
  interpretSample,
  sendEnquiry,
  operatorReply,
  receiveOperatorReply,
  prepareAcceptance,
  sendAcceptance,
  acknowledgement,
  type Scenario,
  type Message,
} from "./workflow";

type Phase =
  | "start"
  | "review"
  | "ready"
  | "enquiry"
  | "reply"
  | "offer"
  | "acceptance"
  | "sentAcceptance"
  | "ack"
  | "complete"
  | "declined";
const stages: Record<
  Phase,
  { step: number; who: "visitor" | "operator"; title: string; detail: string }
> = {
  start: {
    step: 1,
    who: "visitor",
    title: "Describe a sample visit",
    detail:
      "Everything is filled in. Run the real local AI, or choose the preset form.",
  },
  review: {
    step: 2,
    who: "visitor",
    title: "Review the visit details",
    detail:
      "Check the guests, meals, date and time before preparing the Bangla SMS.",
  },
  ready: {
    step: 3,
    who: "visitor",
    title: "Send the enquiry",
    detail: "The visitor sends a Bangla SMS using cellular service.",
  },
  enquiry: {
    step: 4,
    who: "operator",
    title: "The operator receives an SMS",
    detail:
      "A feature phone can read the request and reply with a short code. No app or internet is needed on this phone.",
  },
  reply: {
    step: 4,
    who: "visitor",
    title: "Review the operator’s reply",
    detail:
      "In the real app, check the sender in your SMS app and enter the reply. This demo supplies the matching message for you.",
  },
  offer: {
    step: 5,
    who: "visitor",
    title: "Check the offer",
    detail:
      "Review the full price and time before accepting. An alternative offer changes the visit time and price.",
  },
  acceptance: {
    step: 5,
    who: "visitor",
    title: "Send your acceptance",
    detail: "Acceptance repeats the agreed date, time and full total.",
  },
  sentAcceptance: {
    step: 6,
    who: "operator",
    title: "The operator receives acceptance",
    detail:
      "The operator checks the terms and sends a matching acknowledgement.",
  },
  ack: {
    step: 6,
    who: "visitor",
    title: "Record the acknowledgement",
    detail:
      "The app checks that the acknowledgement matches the accepted offer.",
  },
  complete: {
    step: 6,
    who: "visitor",
    title: "Agreement recorded",
    detail:
      "Four simulated SMS messages completed the exchange. The visitor has an agreement record; the operator used only SMS.",
  },
  declined: {
    step: 4,
    who: "visitor",
    title: "The operator declined",
    detail:
      "The app stops the exchange. No acceptance or agreement is created.",
  },
};
const choices: { id: Scenario; label: string; detail: string }[] = [
  { id: "standard", label: "Standard offer", detail: "15:00 · 1,500 BDT" },
  { id: "alternative", label: "Different time", detail: "16:00 · 1,600 BDT" },
  { id: "decline", label: "Operator declines", detail: "No agreement" },
];
function Conversation({
  messages,
  phone,
}: {
  messages: Message[];
  phone: "visitor" | "operator";
}) {
  return (
    <div
      className="demo-thread"
      aria-label={
        phone === "visitor"
          ? "Visitor SMS conversation"
          : "Operator SMS conversation"
      }
    >
      {messages.map((item) => (
        <article
          className={`demo-bubble ${item.from === phone ? "outgoing" : "incoming"}`}
          key={item.id}
        >
          <small>
            {item.from === phone ? "Sent to" : "Received from"}{" "}
            {phone === "visitor" ? "operator" : "visitor"}
            {phone === "visitor" ? " · simulated" : ""}
          </small>
          <pre lang={item.id === 1 ? "bn" : undefined}>{item.body}</pre>
          <p>{item.meaning}</p>
        </article>
      ))}
    </div>
  );
}
export default function InteractiveDemo({
  operator,
}: {
  operator: OperatorProfile;
}) {
  const [record, setRecord] = useState(() => sampleRequest(operator));
  const [phase, setPhase] = useState<Phase>("start");
  const [scenario, setScenario] = useState<Scenario>("standard");
  const [messages, setMessages] = useState<Message[]>([]);
  const [scores, setScores] = useState<Scores | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const lock = useRef(false);
  const initial = useRef(true);
  const step = stages[phase];
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    document
      .querySelector<HTMLButtonElement>(`.demo-phone.is-active .demo-next`)
      ?.focus();
  }, [phase, reasons.length]);
  function restart(next = scenario) {
    generation.current++;
    lock.current = false;
    setBusy(false);
    setScores(null);
    setReasons([]);
    setError("");
    setMessages([]);
    setRecord(sampleRequest(operator));
    setScenario(next);
    setPhase("start");
  }
  async function analyze() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const token = generation.current;
    try {
      const result = await analyzeLocal(record.originalText!);
      if (token !== generation.current) return;
      setScores(result);
      const interpreted = interpretSample(record, result);
      setReasons(interpreted.reasons);
      if (!interpreted.reasons.length) setRecord(interpreted.record);
      setPhase("review");
    } catch (e) {
      if (token !== generation.current) return;
      setReasons([
        e instanceof Error ? e.message : "The local AI is unavailable.",
      ]);
      setPhase("review");
    } finally {
      if (token === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  function message(from: Message["from"], body: string, meaning: string) {
    setMessages((items) => [
      ...items,
      { id: items.length + 1, from, body, meaning },
    ]);
  }
  function advance() {
    if (lock.current) return;
    lock.current = true;
    setError("");
    try {
      switch (phase) {
        case "review":
          if (reasons.length)
            throw new Error("Choose the preset form before continuing.");
          setPhase("ready");
          break;
        case "ready":
          setRecord(sendEnquiry(record));
          message(
            "visitor",
            record.renderedRequest,
            renderEnglish(record.card),
          );
          setPhase("enquiry");
          break;
        case "enquiry": {
          const body = operatorReply(record, scenario);
          message(
            "operator",
            body,
            scenario === "decline"
              ? "The operator cannot accept this request."
              : scenario === "alternative"
                ? "Alternative offer: 16:00, full total 1,600 BDT. Original guests and meals stay the same."
                : "The requested visit is offered for a full total of 1,500 BDT.",
          );
          setPhase("reply");
          break;
        }
        case "reply": {
          const next = receiveOperatorReply(record, messages.at(-1)!.body);
          setRecord(next);
          setPhase(next.state === "DECLINED" ? "declined" : "offer");
          break;
        }
        case "offer":
          setRecord(prepareAcceptance(record));
          setPhase("acceptance");
          break;
        case "acceptance": {
          const next = sendAcceptance(record);
          setRecord(next.record);
          message(
            "visitor",
            next.body,
            `Visitor accepts ${record.offer!.localTime}, for the full total of ${record.offer!.totalBdt.toLocaleString("en-BD")} BDT.`,
          );
          setPhase("sentAcceptance");
          break;
        }
        case "sentAcceptance":
          message(
            "operator",
            acknowledgement(record),
            "The operator acknowledges the same date, time and full total.",
          );
          setPhase("ack");
          break;
        case "ack":
          setRecord(receiveOperatorReply(record, messages.at(-1)!.body));
          setPhase("complete");
          break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The demo could not progress.");
    } finally {
      lock.current = false;
    }
  }
  function useForm() {
    setRecord(sampleRequest(operator));
    setReasons([]);
    setPhase("review");
  }
  const buttonLabel: Partial<Record<Phase, string>> = {
    review: "Confirm sample details",
    ready: "Send simulated enquiry",
    enquiry: scenario === "decline" ? "Send decline SMS" : "Send offer SMS",
    reply: "Check sender & review reply",
    offer: "Accept reviewed offer",
    acceptance: "Send acceptance SMS",
    sentAcceptance: "Send acknowledgement SMS",
    ack: "Record matching acknowledgement",
  };
  const terminal = phase === "complete" || phase === "declined";
  const actionButton = (phone: "visitor" | "operator") =>
    step.who !== phone ? null : phase === "start" ? (
      <div className="demo-phone-actions">
        <button
          className="demo-next"
          disabled={busy}
          onClick={() => void analyze()}
        >
          {busy ? "Analyzing on this device…" : "Analyze sample request"}
        </button>
        <button className="secondary" disabled={busy} onClick={useForm}>
          Use preset manual form
        </button>
      </div>
    ) : phase === "review" && reasons.length ? (
      <button className="demo-next" onClick={useForm}>
        Review preset manual form
      </button>
    ) : terminal ? (
      <button className="demo-next" onClick={() => restart()}>
        Replay this scenario
      </button>
    ) : (
      <button className="demo-next" onClick={advance}>
        {buttonLabel[phase]}
      </button>
    );
  return (
    <div className="interactive-demo">
      <div className="demo-intro">
        <span className="badge">INTERACTIVE DEMO · SIMULATED SMS</span>
        <h1 tabIndex={-1}>Two phones. One local agreement.</h1>
        <p className="lead">
          Click through a visit request. The visitor uses LocalRelay; the
          operator uses an ordinary feature phone. No typing needed.
        </p>
        <p className="muted">
          No real SMS is sent and no demo request is saved. AI runs on this
          device; Bangla templates are draft wording.
        </p>
      </div>
      <div className="demo-scenarios" role="group" aria-label="Demo scenario">
        {choices.map((choice) => (
          <button
            key={choice.id}
            className={scenario === choice.id ? "selected" : "secondary"}
            aria-pressed={scenario === choice.id}
            onClick={() => restart(choice.id)}
          >
            <strong>{choice.label}</strong>
            <span>{choice.detail}</span>
          </button>
        ))}
      </div>
      <section className="demo-guide" aria-label="Current demo step">
        <div role="status" aria-live="polite" aria-atomic="true">
          <p className="eyebrow">
            STEP {step.step} OF 6 ·{" "}
            {step.who === "visitor" ? "VISITOR’S" : "OPERATOR’S"} TURN
          </p>
          <h2>{step.title}</h2>
          <p>{step.detail}</p>
        </div>
        <button className="secondary" onClick={() => restart()}>
          Restart demo
        </button>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="demo-devices">
        <section
          className={`demo-device visitor-device ${step.who === "visitor" ? "active-device" : ""}`}
          aria-label="Visitor smartphone"
        >
          <h2>Visitor’s smartphone</h2>
          <p className="muted">LocalRelay app · works offline once prepared</p>
          <div
            className={`demo-phone smartphone ${step.who === "visitor" ? "is-active" : ""}`}
          >
            <div className="smartphone-camera" aria-hidden="true" />
            <div className="smartphone-screen">
              <div className="demo-app-bar">
                <strong>◈ LocalRelay</strong>
                <span>DEMO</span>
              </div>
              <div className="demo-screen-content">
                {phase === "start" ? (
                  <>
                    <h3>Sample visit request</h3>
                    <p className="demo-sample">{record.originalText}</p>
                    <p className="muted">
                      Experimental AI classifies intent and requirements. Dates
                      and guest counts are extracted by the app’s rules. Every
                      field still needs review.
                    </p>
                  </>
                ) : phase === "review" ? (
                  <>
                    <h3>Review before sending</h3>
                    {reasons.length ? (
                      <div className="warning">
                        <strong>Manual review needed</strong>
                        <p>{reasons.join(" ")}</p>
                        <p>
                          Continue with the explicitly labelled preset form. No
                          model result is being substituted.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="badge">
                          {record.entryMode === "ai"
                            ? "Local AI + rule extraction"
                            : "Preset manual form"}
                        </p>
                        <RequestSummary
                          card={record.card}
                          operator={operator}
                        />
                        <p className="demo-confirmation">
                          Confirm the displayed date, guests and meals. The
                          standard fish meal is acceptable for the other two
                          guests.
                        </p>
                      </>
                    )}
                  </>
                ) : null}
                {scores && (
                  <details className="demo-model-details">
                    <summary>Actual AI result</summary>
                    <p>
                      Intent: {scores.topIntent.replaceAll("_", " ")} · score{" "}
                      {Math.round(scores.intent[scores.topIntent] * 100)}%.
                      These scores are not calibrated probabilities.
                    </p>
                    <p>
                      Margin {scores.margin.toFixed(3)} · inference{" "}
                      {scores.ms.toFixed(1)} ms · model {scores.modelVersion}
                    </p>
                    <p>
                      The model’s synthetic release accuracy target remains
                      unmet.
                    </p>
                  </details>
                )}
                {phase === "ready" && (
                  <>
                    <h3>Reviewed Bangla enquiry</h3>
                    <pre lang="bn">{record.renderedRequest}</pre>
                    <p>{renderEnglish(record.card)}</p>
                  </>
                )}
                {phase === "offer" && record.offer && (
                  <>
                    <h3>Review the operator’s terms</h3>
                    <OfferSummary offer={record.offer} card={record.card} />
                    <p>
                      All three guests and the same meal choices remain
                      included.
                    </p>
                  </>
                )}
                {phase === "acceptance" && record.offer && (
                  <>
                    <h3>Acceptance SMS</h3>
                    <pre>{acceptance(record.wireId, record.offer)}</pre>
                    <p>
                      Accept the reviewed date, {record.offer.localTime}, and
                      full total of{" "}
                      {record.offer.totalBdt.toLocaleString("en-BD")} BDT.
                    </p>
                  </>
                )}
                {terminal && (
                  <div
                    className={`demo-outcome ${phase === "complete" ? "success" : ""}`}
                  >
                    <h3>
                      {phase === "complete"
                        ? "Agreement recorded"
                        : "Request declined"}
                    </h3>
                    {record.offer && (
                      <OfferSummary
                        offer={record.offer}
                        card={record.card}
                        acknowledgement
                      />
                    )}
                    <p>
                      {phase === "complete"
                        ? "Four SMS messages. One matching agreement. Changes or cancellation need direct contact."
                        : "No agreement was recorded. Contact the operator for other options."}
                    </p>
                    <Link to="/operators">Try preparing your own request</Link>
                  </div>
                )}
                {messages.length > 0 &&
                  (["offer", "acceptance", "complete", "declined"].includes(
                    phase,
                  ) ? (
                    <details className="demo-transcript">
                      <summary>
                        SMS transcript · {messages.length} messages
                      </summary>
                      <Conversation messages={messages} phone="visitor" />
                    </details>
                  ) : (
                    <Conversation messages={messages} phone="visitor" />
                  ))}
                {step.who !== "visitor" && !terminal && (
                  <p className="demo-wait">
                    Waiting for the operator’s next SMS.
                  </p>
                )}
                {actionButton("visitor")}
              </div>
            </div>
            <div className="smartphone-home" aria-hidden="true" />
          </div>
        </section>
        <div className="demo-connection" aria-hidden="true">
          <span>↔</span>
          <strong>SMS</strong>
          <small>Cellular service</small>
          <span className="demo-message-count">{messages.length} / 4</span>
        </div>
        <section
          className={`demo-device operator-device ${step.who === "operator" ? "active-device" : ""}`}
          aria-label="Operator feature phone"
        >
          <h2>Operator’s feature phone</h2>
          <p className="muted">SMS only · no app or internet required</p>
          <div
            className={`demo-phone feature-phone ${step.who === "operator" ? "is-active" : ""}`}
          >
            <div className="feature-speaker" aria-hidden="true" />
            <div className="feature-screen">
              <div className="feature-status">
                <strong>SMS inbox</strong>
                <span>DEMO</span>
              </div>
              <div className="demo-screen-content">
                {messages.length === 0 ? (
                  <div className="feature-empty">
                    <span aria-hidden="true">✉</span>
                    <h3>Ready for a request</h3>
                    <p>The visitor’s SMS will appear here.</p>
                  </div>
                ) : (
                  <Conversation messages={messages} phone="operator" />
                )}
                {phase === "enquiry" && (
                  <div className="feature-composer">
                    <strong>Prepared reply</strong>
                    <pre>{operatorReply(record, scenario)}</pre>
                  </div>
                )}
                {phase === "sentAcceptance" && (
                  <div className="feature-composer">
                    <strong>Matching acknowledgement</strong>
                    <pre>{acknowledgement(record)}</pre>
                  </div>
                )}
                {actionButton("operator")}
              </div>
            </div>
            <div className="feature-controls" aria-hidden="true">
              <span>−</span>
              <span className="feature-dpad">●</span>
              <span>−</span>
            </div>
            <div className="feature-keypad" aria-hidden="true">
              {[
                "1",
                "2 abc",
                "3 def",
                "4 ghi",
                "5 jkl",
                "6 mno",
                "7 pqrs",
                "8 tuv",
                "9 wxyz",
                "*",
                "0",
                "#",
              ].map((key) => (
                <span key={key}>{key}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
      <details className="demo-explanation">
        <summary>What this demo shows</summary>
        <p>
          The demo uses LocalRelay’s actual local inference worker, field
          extraction, SMS renderer, reply parser and agreement guards. The
          message exchange is simulated in memory. In real use, people send
          messages in their SMS apps and check the sender before entering
          replies.
        </p>
        <p>
          Sample request ID and prices are illustrative. This does not verify
          availability, carrier delivery, payment or service fulfilment.
        </p>
        <Link to="/simulate">Open the technical protocol sandbox</Link>
      </details>
    </div>
  );
}
