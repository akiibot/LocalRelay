import { useEffect, useState, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Routes,
  Route,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  operatorSchema,
  labels,
  TEMPLATE_VERSION,
  type RelayRequest,
  type ConfirmedCard,
} from "../domain/schema";
import operatorsJson from "../../public/data/operators/demo.json";
import { addDays, dhakaDay, validateCard } from "../domain/validation";
import { analyzeLocal } from "../ai/client";
import type { Scores } from "../ai/features";
import Simulator from "./Simulator";
import Evaluation from "../evaluation/Evaluation";
import ModelDiagnostics from "./Diagnostics";
import {
  resumeStudy,
  countStudy,
  finishStudy,
  currentStudy,
} from "../evaluation/study";
import { checkOffline, activateUpdate, updateAvailable } from "./offline";
import { parseFields, type Parsed } from "../parsing/fields";
import { safetyFlags } from "../safety/gate";
import { renderBangla, renderEnglish, acceptance } from "../templates/render";
import { smsSize, smsUri, validateTemplate } from "../sms/encoding";
import { parseReply } from "../sms/reply";
import { action, applyReply } from "../domain/state";
import * as db from "../storage/db";
const operators = operatorsJson.map((p) => operatorSchema.parse(p));
function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="warning" role="status">
      {children}
    </div>
  );
}
function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <div role="alert" className="error">
      {error}
    </div>
  ) : null;
}
const errorText = (e: unknown) =>
  e && typeof e === "object" && "message" in e
    ? String(e.message)
    : "An unexpected error occurred.";
export default function App() {
  const [error, setError] = useState("");
  useEffect(() => {
    void resumeStudy().catch((e) => setError(errorText(e)));
    void db.list().catch((e) => setError(errorText(e)));
    const tap = () => countStudy("taps");
    document.addEventListener("click", tap);
    const handler = () =>
      setError(
        "Local storage is blocked by another tab. Close other LocalRelay tabs.",
      );
    window.addEventListener("storage-blocked", handler);
    return () => {
      window.removeEventListener("storage-blocked", handler);
      document.removeEventListener("click", tap);
    };
  }, []);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header>
        <Link className="brand" to="/">
          ◈ LocalRelay
        </Link>
        <nav aria-label="Main">
          <NavLink to="/operators">Operators</NavLink>
          <NavLink to="/outbox">Outbox</NavLink>
          <NavLink to="/diagnostics">Diagnostics</NavLink>
        </nav>
      </header>
      <main id="main">
        <ErrorMessage error={error} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/operators" element={<Operators />} />
          <Route path="/operators/:operatorId" element={<Profile />} />
          <Route path="/request/new" element={<NewRequest />} />
          <Route path="/request/:requestId" element={<RequestPage />} />
          <Route path="/outbox" element={<Outbox />} />
          <Route path="/reply/:requestId" element={<ReplyPage />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route
            path="/simulate"
            element={<Simulator operator={operators[0]} />}
          />
          <Route
            path="*"
            element={
              <>
                <h1>Page not found</h1>
                <Link to="/">Return home</Link>
              </>
            }
          />
        </Routes>
      </main>
      <footer>
        On-device interpretation · Cellular SMS exchange
        <br />
        <Link to="/evaluation">Evaluation tools</Link> ·{" "}
        <Link to="/simulate">Phone simulator</Link>
      </footer>
    </>
  );
}
function Home() {
  const [error, setError] = useState("");
  return (
    <>
      <p className="eyebrow">VISITOR PHONE → OPERATOR PHONE</p>
      <h1>
        The visitor’s smartphone does the AI work. The local operator keeps the
        phone they already own.
      </h1>
      <p className="lead">
        Prepare and interpret supported requests offline; exchange them by SMS
        when cellular service is available.
      </p>
      <OfflineStatus />
      <div className="steps">
        <section>
          <b>01 · Describe</b>
          <p>Choose one local experience. Write in English or use the form.</p>
        </section>
        <section>
          <b>02 · Review</b>
          <p>
            Confirm every date, guest and meal. Preview the exact Bangla
            message.
          </p>
        </section>
        <section>
          <b>03 · Exchange SMS</b>
          <p>
            Open your SMS app, enter the operator’s reply and send your
            acceptance.
          </p>
        </section>
      </div>
      <Link className="button" to="/operators">
        Choose an operator
      </Link>
      <section>
        <h2>Before you go</h2>
        <p>
          First use needs internet to prepare files. On Android Chrome, use the
          browser menu → “Install app” or “Add to Home screen”. Browser storage
          can be cleared or evicted; recheck readiness before travelling.
        </p>
        <p>
          You need an SMS-capable SIM. Carrier charges apply; a normal agreement
          uses at least four SMS messages. SMS is not end-to-end encrypted.
          Local records stay on this device and origin and are accessible to
          anyone using it.
        </p>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const persisted = await navigator.storage?.persist?.();
              setError(
                persisted
                  ? "Persistent storage granted; this is still subject to user/browser deletion."
                  : "Persistent storage was not granted. Recheck preparation before travel.",
              );
            } catch (e) {
              setError(errorText(e));
            }
          }}
        >
          Request persistent storage
        </button>
        <button
          className="secondary"
          onClick={async () => {
            if (
              window.confirm(
                "Delete all local records and study data? This does not cancel any service.",
              )
            )
              try {
                await db.clearAll();
                setError(
                  "All local records deleted. Offline application files remain.",
                );
              } catch (e) {
                setError(errorText(e));
              }
          }}
        >
          Delete all local data
        </button>
        <p role="status">{error}</p>
      </section>
    </>
  );
}
function Operators() {
  return (
    <>
      <h1>Choose one experience</h1>
      <p>
        AI entry is experimental and missed its synthetic release target. The
        manual form is the recommended pilot default.
      </p>
      <p>
        Bundled profiles are demonstrations. There is no live availability or
        operator verification.
      </p>
      {operators.map((p) => (
        <section key={p.id}>
          <span className="badge">Demo operator</span>
          <h2>{p.displayName}</h2>
          <p>{p.serviceName}</p>
          <p>
            {p.maxGuests} guests maximum ·{" "}
            {p.mealIncluded ? "Meals included" : "No meals"} · BDT
          </p>
          <Link className="button" to={`/operators/${p.id}`}>
            View profile
          </Link>
        </section>
      ))}
    </>
  );
}
function Profile() {
  const { operatorId } = useParams();
  const p = operators.find((p) => p.id === operatorId);
  const [phone, setPhone] = useState(""),
    [status, setStatus] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    void db
      .preference(`phone:${operatorId}`)
      .then((v) => setPhone(typeof v === "string" ? v : ""))
      .catch((e) => setStatus(errorText(e)));
  }, [operatorId]);
  if (!p) return <h1>Operator not found</h1>;
  return (
    <>
      <span className="badge">Demo operator · template unreviewed</span>
      <h1>{p.displayName}</h1>
      <p className="lead">{p.serviceName}</p>
      <section>
        <dl>
          <dt>Language</dt>
          <dd>Bangla</dd>
          <dt>Currency / timezone</dt>
          <dd>BDT / Asia/Dhaka</dd>
          <dt>Profile checked</dt>
          <dd>{p.checkedAt}; no live availability</dd>
          <dt>Meal terms</dt>
          <dd>{p.standardMeal}</dd>
          <dt>Bounds</dt>
          <dd>
            {p.maxGuests} guests; within {p.maxAdvanceDays} days; total quote ≤{" "}
            {p.maxQuoteBdt} BDT
          </dd>
          <dt>Phone</dt>
          <dd>{phone || "No number configured"}</dd>
        </dl>
        <label>
          Consented test recipient (E.164)
          <input
            type="tel"
            value={phone}
            placeholder="Enter privately on this device"
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <p>
          Use only a number whose owner agreed to this pilot. It remains on this
          device. These draft templates need two independent native Bangla
          reviews before field use.
        </p>
        <button
          onClick={async () => {
            try {
              if (phone && !/^\+[1-9]\d{7,14}$/.test(phone))
                throw new Error("Use +countrycode followed by 8–15 digits.");
              await db.preference(`phone:${p.id}`, phone);
              await db.preference("operator", p.id);
              navigate("/request/new?mode=form");
            } catch (e) {
              setStatus(errorText(e));
            }
          }}
        >
          Select this experience
        </button>
        <ErrorMessage error={status} />
      </section>
      <Warning>
        Verify the operator number in your SMS app and confirm the package
        directly before a field pilot. This app does not verify inventory,
        delivery or payment.
      </Warning>
    </>
  );
}
function NewRequest() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [operator, setOperator] = useState(operators[0]);
  const [previous, setPrevious] = useState<RelayRequest | null>(null);
  const [text, setText] = useState(""),
    [manual, setManual] = useState(search.get("mode") === "form"),
    [parsed, setParsed] = useState<Parsed | null>(null),
    [error, setError] = useState(""),
    [review, setReview] = useState(false),
    [complete, setComplete] = useState(false),
    [mealOk, setMealOk] = useState(false),
    [busy, setBusy] = useState(false),
    [scores, setScores] = useState<Scores | null>(null),
    [routingUncertain, setRoutingUncertain] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    localDate: "",
    localTime: "",
    adults: "",
    children: "",
    vegetarianMeals: "",
  });
  useEffect(() => {
    void db
      .preference("operator")
      .then(async (v) => {
        const p = operators.find((p) => p.id === v) ?? operators[0];
        const phone = await db.preference(`phone:${p.id}`);
        if (!search.get("revise"))
          setOperator({
            ...p,
            phoneE164: typeof phone === "string" && phone ? phone : null,
          });
      })
      .catch((e) => setError(errorText(e)));
  }, [search]);
  useEffect(() => {
    const id = search.get("revise");
    if (id)
      void db
        .list()
        .then((rows) => {
          const old = rows.find((r) => r.id === id);
          if (
            !old ||
            ["AGREEMENT_RECORDED", "SUPERSEDED", "ARCHIVED"].includes(old.state)
          )
            throw new Error(
              "This record cannot be revised; contact the operator.",
            );
          setPrevious(old);
          setOperator(old.operatorSnapshot);
          setManual(true);
          setText(old.originalText ?? "");
          setValues({
            localDate: old.card.localDate,
            localTime: old.card.localTime,
            adults: String(old.card.adults),
            children: String(old.card.children),
            vegetarianMeals: String(old.card.vegetarianMeals ?? ""),
          });
        })
        .catch((e) => setError(errorText(e)));
  }, [search]);
  function edit(key: string, value: string) {
    countStudy("corrections");
    setValues((v) => ({ ...v, [key]: value }));
    setComplete(false);
  }
  const flags = parsed?.flags ?? safetyFlags(text);
  const example = `Two adults and one child on ${addDays(dhakaDay(new Date()), 7)} at 3 pm. One vegetarian meal. What is the total price?`;
  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const result = await analyzeLocal(text);
      setScores(result);
      const p = parseFields(text);
      if (
        !["booking_request", "availability_query", "price_query"].includes(
          result.topIntent,
        )
      )
        p.flags.push({
          text,
          reason: `Model routes this as ${result.topIntent}. Use direct contact for changes or unsupported enquiries.`,
          critical: true,
        });
      setRoutingUncertain(
        result.intent[result.topIntent] < result.intentMin ||
          result.margin < result.marginMin,
      );
      for (const [k, score] of Object.entries(result.requirements)) {
        if (
          k !== "vegetarian" &&
          score >= result.thresholds[k as keyof typeof result.thresholds]
        )
          p.flags.push({
            text,
            reason: `Local model flagged ${k.replaceAll("_", " ")}; direct confirmation is required. Correct the input if misclassified.`,
            critical: true,
          });
      }
      setParsed(p);
      setValues(
        Object.fromEntries(
          [
            "localDate",
            "localTime",
            "adults",
            "children",
            "vegetarianMeals",
          ].map((k) => [k, String(p.fields[k as keyof typeof p.fields] ?? "")]),
        ),
      );
      setReview(true);
      setComplete(false);
      setMealOk(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const previewCard: ConfirmedCard = {
    operatorId: operator.id,
    localDate: values.localDate,
    localTime: values.localTime,
    adults: values.adults === "" ? NaN : Number(values.adults),
    children: values.children === "" ? NaN : Number(values.children),
    vegetarianMeals: operator.mealIncluded
      ? values.vegetarianMeals === ""
        ? NaN
        : Number(values.vegetarianMeals)
      : null,
    currency: "BDT",
    timezone: "Asia/Dhaka",
    askTotalPrice: true,
    confirmedAt: new Date().toISOString(),
  };
  const liveErrors = validateCard(previewCard, operator);
  const liveBody = liveErrors.length
    ? ""
    : renderBangla(
        previewCard,
        "XXXXXX." + (previous ? previous.revision + 1 : 1),
      );
  const liveSize = smsSize(liveBody);
  async function queue() {
    setError("");
    try {
      if (!manual && routingUncertain)
        throw new Error(
          "The model is uncertain. Use a form instead and confirm every field.",
        );
      if (flags.length)
        throw new Error(
          "Unresolved unsupported requirements require direct contact. Correct the original input if misclassified.",
        );
      if (!complete || (operator.mealIncluded && !mealOk))
        throw new Error("Explicitly confirm all fields and the meal terms.");
      const now = new Date();
      const card: ConfirmedCard = {
        operatorId: operator.id,
        localDate: values.localDate,
        localTime: values.localTime,
        adults: values.adults === "" ? NaN : Number(values.adults),
        children: values.children === "" ? NaN : Number(values.children),
        vegetarianMeals: operator.mealIncluded
          ? values.vegetarianMeals === ""
            ? NaN
            : Number(values.vegetarianMeals)
          : null,
        currency: "BDT",
        timezone: "Asia/Dhaka",
        askTotalPrice: true,
        confirmedAt: now.toISOString(),
      };
      const errors = validateCard(card, operator, now);
      if (errors.length) throw new Error(errors.join(" "));
      const records = await db.list();
      const revision = previous ? previous.revision + 1 : 1;
      const wireId = previous
        ? previous.wireId.split(".")[0] + "." + revision
        : db.wireId(records.map((r) => r.wireId));
      const body = renderBangla(card, wireId);
      validateTemplate(body);
      const phone = await db.preference(`phone:${operator.id}`);
      const expiresAt = new Date(
        Math.min(
          now.getTime() + 86400000,
          new Date(`${card.localDate}T${card.localTime}:00+06:00`).getTime(),
        ),
      ).toISOString();
      const r: RelayRequest = {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        wireId,
        revision,
        mode: "real",
        entryMode: manual ? "form" : "ai",
        modelVersion: manual ? undefined : scores?.modelVersion,
        originalText: text,
        card,
        templateVersion: TEMPLATE_VERSION,
        operatorSnapshot: {
          ...operator,
          phoneE164: typeof phone === "string" && phone ? phone : null,
        },
        renderedRequest: body,
        state: "READY_TO_SEND",
        events: [{ type: "queued", at: now.toISOString() }],
        createdAt: now.toISOString(),
        expiresAt,
        deleteAfter: new Date(
          Date.parse(expiresAt) + 7 * 86400000,
        ).toISOString(),
      };
      if (previous) await db.saveRevision(r, previous.id);
      else await db.save(r);
      await finishStudy("reviewed_card", card);
      navigate(`/request/${r.id}`);
    } catch (e) {
      setError("Could not queue: " + errorText(e));
    }
  }
  return (
    <>
      <p className="eyebrow">
        {manual ? "MANUAL BASELINE" : "ON-DEVICE SMALL AI"}
      </p>
      <h1>Describe your visit</h1>
      {!manual && (
        <Warning>
          Experimental AI: synthetic intent evaluation missed the release
          target. Review every field; the manual form is recommended for pilots.
        </Warning>
      )}
      {previous && (
        <Warning>
          Editing {previous.wireId}. Queueing creates revision{" "}
          {previous.revision + 1} and supersedes the previous one atomically.
          Send the new revision; confirm any prior offer directly with the
          operator.
        </Warning>
      )}
      <p>
        {operator.displayName} · {operator.serviceName}
      </p>
      <button
        disabled={busy}
        className="secondary"
        onClick={() => {
          setManual(!manual);
          setReview(false);
          setComplete(false);
          setScores(null);
        }}
      >
        {manual ? "Use English free text" : "Use a form instead"}
      </button>
      <label>
        {manual
          ? "Original enquiry / additional requirements (optional)"
          : "English enquiry (maximum 500 characters)"}
        <textarea
          disabled={busy}
          maxLength={500}
          rows={5}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setParsed(null);
            setReview(false);
            setScores(null);
            setComplete(false);
            setRoutingUncertain(false);
          }}
          placeholder={
            manual
              ? "Extra requirements are checked and shown; do not include private medical details."
              : example
          }
        />
      </label>
      <small>
        {text.length}/500 characters. Analysis runs only when you press the
        button.
      </small>
      {!manual && (
        <button disabled={!text.trim() || busy} onClick={() => void analyze()}>
          {busy ? "Analyzing on this device…" : "Analyze enquiry"}
        </button>
      )}
      {!manual && routingUncertain && (
        <Warning>
          <b>AI needs manual review</b>
          <p>
            The local model cannot route this enquiry reliably. Select “Use a
            form instead” and confirm every field. Your original enquiry is
            retained; unsupported requirements still require direct contact.
          </p>
        </Warning>
      )}
      {flags.length > 0 && (
        <Warning>
          <b>Direct contact required</b>
          {flags.map((f, i) => (
            <p key={i}>
              “{f.text}”: {f.reason}
            </p>
          ))}
          {currentStudy() && (
            <button
              className="secondary"
              onClick={async () => {
                await finishStudy("manual_contact");
                navigate("/evaluation");
              }}
            >
              Record direct-contact outcome for study
            </button>
          )}
          <p>
            Your full original requirements remain above. No checkbox can bypass
            these restrictions.
          </p>
          {operator.phoneE164 && (
            <a href={`tel:${operator.phoneE164}`}>Call operator</a>
          )}
        </Warning>
      )}
      {(manual || review) && (
        <section>
          <h2>Review and confirm every field</h2>
          {parsed?.clarifications.length ? (
            <Warning>
              {parsed.clarifications.map((c) => (
                <p key={c}>{c}</p>
              ))}
              <p>
                Use the fields below to resolve ambiguous or missing information
                explicitly.
              </p>
            </Warning>
          ) : null}
          {parsed?.spans.length ? (
            <details>
              <summary>Source evidence (rule-derived)</summary>
              {parsed.spans.map((s, i) => (
                <p key={i}>
                  {s.field}: “{s.text}” [{s.start}–{s.end}]
                </p>
              ))}
            </details>
          ) : null}
          <div className="fields">
            <label>
              Date
              <input
                aria-label="Date"
                type="date"
                value={values.localDate}
                onChange={(e) => edit("localDate", e.target.value)}
              />
            </label>
            <label>
              Time · Asia/Dhaka
              <input
                aria-label="Time"
                type="time"
                value={values.localTime}
                onChange={(e) => edit("localTime", e.target.value)}
              />
            </label>
            <label>
              Adults
              <input
                type="number"
                min="1"
                max={operator.maxGuests}
                value={values.adults}
                onChange={(e) => edit("adults", e.target.value)}
              />
            </label>
            <label>
              Children (choose 0 explicitly)
              <input
                type="number"
                min="0"
                max={operator.maxGuests}
                value={values.children}
                onChange={(e) => edit("children", e.target.value)}
              />
            </label>
            {operator.mealIncluded && (
              <label>
                Vegetarian meals (choose 0 explicitly)
                <input
                  type="number"
                  min="0"
                  max={operator.maxGuests}
                  value={values.vegetarianMeals}
                  onChange={(e) => edit("vegetarianMeals", e.target.value)}
                />
              </label>
            )}
          </div>
          <p>
            {values.localDate && /^\d{4}-\d{2}-\d{2}$/.test(values.localDate)
              ? new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "full",
                  timeZone: "Asia/Dhaka",
                }).format(new Date(values.localDate + "T12:00:00+06:00"))
              : "Choose an exact date"}{" "}
            · {values.localTime || "Choose time"} · Asia/Dhaka
          </p>
          <p>{operator.standardMeal}</p>
          <p>
            The message always asks for the full total in BDT, including
            required charges.
          </p>
          {operator.mealIncluded && (
            <label className="check">
              <input
                type="checkbox"
                checked={mealOk}
                onChange={(e) => setMealOk(e.target.checked)}
              />
              Every guest receives a meal; the standard meal is acceptable for
              all remaining guests.
            </label>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={complete}
              onChange={(e) => setComplete(e.target.checked)}
            />
            I verified the exact date, time, adults, children, meals and
            selected service. This card includes all my requirements; no
            unsupported detail remains.
          </label>
          {liveErrors.length > 0 && (
            <p role="status">Still needed: {liveErrors.join(" ")}</p>
          )}
          {liveBody && (
            <details open>
              <summary>Live SMS preview · temporary ID</summary>
              <pre lang="bn">{liveBody}</pre>
              <p>
                {liveSize.units} UTF-16 units · estimated {liveSize.segments}{" "}
                segment(s){liveSize.warning ? " · above 60-unit target" : ""}
              </p>
            </details>
          )}
          <Warning>
            Bangla template is an unreviewed draft. Queue only for development
            or a consented test; native review and physical SMS testing are
            pending.
          </Warning>
          <button
            disabled={
              !complete ||
              flags.length > 0 ||
              (!manual && routingUncertain) ||
              (operator.mealIncluded && !mealOk) ||
              liveErrors.length > 0 ||
              liveSize.blocked
            }
            onClick={() => void queue()}
          >
            Preview and queue locally
          </button>
        </section>
      )}
      <ErrorMessage error={error} />
    </>
  );
}
function useRequest() {
  const { requestId } = useParams();
  const [record, setRecord] = useState<RelayRequest | null>(null),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setRecord(null);
    void db
      .list()
      .then((rows) => {
        if (!cancelled) setRecord(rows.find((r) => r.id === requestId) ?? null);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);
  async function update(r: RelayRequest) {
    await db.save(r);
    setRecord(r);
  }
  return { record, error, setError, loaded, update };
}
function Missing() {
  return (
    <>
      <h1>Local record unavailable</h1>
      <p>
        Request IDs refer to this device and browser origin. Use the original
        device. Expired or abandoned records are removed seven days after
        expiry; receipts after 30 days.
      </p>
      <Link to="/outbox">View outbox</Link>
    </>
  );
}
function RequestPage() {
  const { record: r, error, setError, loaded, update } = useRequest();
  const navigate = useNavigate();
  if (!loaded) return <p>Loading local record…</p>;
  if (!r)
    return (
      <>
        <Missing />
        <ErrorMessage error={error} />
      </>
    );
  const accepting = [
    "ACCEPTANCE_READY",
    "ACCEPTANCE_COMPOSER_OPENED",
    "ACCEPTANCE_SENT_REPORTED",
  ].includes(r.state);
  const body =
    accepting && r.offer ? acceptance(r.wireId, r.offer) : r.renderedRequest;
  const size = smsSize(body);
  const sendable = [
    "READY_TO_SEND",
    "COMPOSER_OPENED",
    "REQUEST_SENT_REPORTED",
    "ACCEPTANCE_READY",
    "ACCEPTANCE_COMPOSER_OPENED",
    "ACCEPTANCE_SENT_REPORTED",
  ].includes(r.state);
  async function run(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <>
      <p className="eyebrow">
        {r.wireId} · {r.entryMode.toUpperCase()} ENTRY
      </p>
      <h1>{labels[r.state]}</h1>
      <p>
        {r.operatorSnapshot.displayName} · {r.operatorSnapshot.serviceName}
      </p>
      <p>
        Recipient:{" "}
        {r.operatorSnapshot.phoneE164 || "No consented test number configured"}
      </p>
      <section>
        <h2>{accepting ? "Acceptance SMS" : "Exact enquiry SMS"}</h2>
        <pre lang="bn">{body}</pre>
        <p>
          {size.units}{" "}
          {size.encoding === "Unicode" ? "UTF-16 units" : "GSM-7 septets"} ·
          estimated {size.segments} SMS segment(s)
          {size.warning ? " · Above 60-unit conservative target" : ""}
        </p>
        <p>
          {accepting && r.offer
            ? `Accept ${r.offer.localDate} ${r.offer.localTime} Asia/Dhaka; full total ${r.offer.totalBdt} BDT. All party/meal terms remain bound to this request.`
            : renderEnglish(r.card)}
        </p>
        <Warning>
          Draft Bangla template · carrier charges apply. Opening your SMS app
          does not prove sending or delivery.
        </Warning>
        {sendable && (
          <div className="actions">
            <button
              disabled={!r.operatorSnapshot.phoneE164}
              onClick={() =>
                void run(async () => {
                  const uri = smsUri(r.operatorSnapshot.phoneE164!, body);
                  await update(action(r, "composer"));
                  window.location.href = uri;
                })
              }
            >
              Open SMS app
            </button>
            <button
              className="secondary"
              onClick={() =>
                void run(async () => {
                  await navigator.clipboard.writeText(body);
                  setError("Message copied. Send from your SMS app.");
                })
              }
            >
              Copy message
            </button>
            <button
              className="secondary"
              disabled={!r.operatorSnapshot.phoneE164}
              onClick={() =>
                void run(async () => {
                  await navigator.clipboard.writeText(
                    r.operatorSnapshot.phoneE164!,
                  );
                  setError("Number copied.");
                })
              }
            >
              Copy number
            </button>
            <button
              onClick={() => void run(async () => update(action(r, "sent")))}
            >
              I sent this {accepting ? "acceptance" : "enquiry"}
            </button>
          </div>
        )}
        <p>
          Expires:{" "}
          {new Date(r.expiresAt).toLocaleString("en-GB", {
            timeZone: "Asia/Dhaka",
          })}{" "}
          Asia/Dhaka. Local expiry does not release an operator’s reservation.
        </p>
      </section>
      {r.offer && (
        <section>
          <h2>Frozen operator offer</h2>
          <p>
            {r.offer.localDate} at {r.offer.localTime} Asia/Dhaka · full total{" "}
            {r.offer.totalBdt} BDT
          </p>
          {r.state === "OFFER_RECEIVED" && (
            <button
              onClick={() => void run(async () => update(action(r, "accept")))}
            >
              Accept offer and prepare acceptance SMS
            </button>
          )}
        </section>
      )}
      {!["EXPIRED", "SUPERSEDED", "ARCHIVED", "CONFLICT", "DECLINED"].includes(
        r.state,
      ) && (
        <Link className="button secondary" to={`/reply/${r.id}`}>
          Enter operator reply
        </Link>
      )}
      {r.state === "AGREEMENT_RECORDED" && (
        <Warning>
          This record relies on SMS messages you entered. It does not verify
          inventory, payment or service delivery. Changes and cancellation
          require direct contact.
        </Warning>
      )}
      <details>
        <summary>Local event history · snapshot versions</summary>
        <p>
          Template {r.templateVersion} · model{" "}
          {r.modelVersion || "manual/no model"} · profile{" "}
          {r.operatorSnapshot.checkedAt}
        </p>
        {r.events.map((e, i) => (
          <p key={i}>
            {e.at}: {e.type}
            {"phase" in e ? ` (${e.phase})` : ""}
          </p>
        ))}
      </details>
      <div className="actions">
        <button
          className="secondary"
          onClick={() =>
            download("localrelay-receipt.json", {
              wireId: r.wireId,
              card: r.card,
              offer: r.offer,
              state: r.state,
              templateVersion: r.templateVersion,
            })
          }
        >
          Export minimal receipt
        </button>
        {!["AGREEMENT_RECORDED", "SUPERSEDED", "ARCHIVED"].includes(
          r.state,
        ) && (
          <button
            className="secondary"
            onClick={() =>
              void run(async () => {
                navigate(`/request/new?mode=form&revise=${r.id}`);
              })
            }
          >
            Edit as a new revision
          </button>
        )}
        <button
          className="secondary danger"
          onClick={() => {
            if (
              window.confirm(
                "Delete local record? This does not cancel the service.",
              )
            )
              void run(async () => {
                await db.remove(r.id);
                navigate("/outbox");
              });
          }}
        >
          Delete this request
        </button>
      </div>
      <ErrorMessage error={error} />
    </>
  );
}
function Outbox() {
  const [rows, setRows] = useState<RelayRequest[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    void db
      .list()
      .then(setRows)
      .catch((e) => setError(errorText(e)));
  }, []);
  return (
    <>
      <h1>Local outbox</h1>
      <p>
        Queued only after a successful device write. Deleting data does not
        cancel a service. Records do not sync to another device.
      </p>
      <Link className="button" to="/request/new?mode=form">
        New enquiry
      </Link>
      {rows.length === 0 && <p>No local requests yet.</p>}
      {rows.map((r) => (
        <section key={r.id}>
          <Link to={`/request/${r.id}`}>
            <h2>{r.operatorSnapshot.displayName}</h2>
          </Link>
          <p>
            {r.wireId} · {labels[r.state]}
          </p>
          <p>
            {r.card.localDate} {r.card.localTime} Asia/Dhaka
          </p>
        </section>
      ))}
      <ErrorMessage error={error} />
    </>
  );
}
function ReplyPage() {
  const { record: r, error, setError, loaded, update } = useRequest();
  const [raw, setRaw] = useState(""),
    [sender, setSender] = useState(false),
    [missing, setMissing] = useState(false),
    [preview, setPreview] = useState<ReturnType<typeof parseReply> | null>(
      null,
    );
  const navigate = useNavigate();
  if (!loaded) return <p>Loading…</p>;
  if (!r) return <Missing />;
  return (
    <>
      <h1>Enter operator reply</h1>
      <p>
        Check the sender in your SMS app against{" "}
        {r.operatorSnapshot.phoneE164 || "the consented operator number"}.
        Pasted text is not authenticated by LocalRelay.
      </p>
      <label>
        Exact reply
        <textarea
          value={raw}
          rows={4}
          onChange={(e) => {
            setRaw(e.target.value);
            setPreview(null);
          }}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={sender}
          onChange={(e) => setSender(e.target.checked)}
        />
        I checked the SMS sender against this operator’s number.
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={missing}
          onChange={(e) => setMissing(e.target.checked)}
        />
        If I omitted “I sent this”, this matching reply explicitly resolves the
        missing local report.
      </label>
      <button
        disabled={!sender || !raw.trim()}
        onClick={() => {
          try {
            setPreview(parseReply(raw, r));
            setError("");
          } catch (e) {
            setError(errorText(e));
          }
        }}
      >
        Validate and review reply
      </button>
      {preview && (
        <section>
          <h2>Reply review</h2>
          <p>
            {preview.command === 2
              ? "Operator declined."
              : `${preview.command === 5 ? "Acknowledgement" : "Offer"}: ${preview.offer.localDate} at ${preview.offer.localTime} Asia/Dhaka; full total ${preview.offer.totalBdt} BDT.`}
          </p>
          <p>
            An offer covers the original guests and meals. Conflicting later
            offers require direct contact.
          </p>
          <button
            onClick={async () => {
              try {
                await update(applyReply(r, preview, missing));
                navigate(`/request/${r.id}`);
              } catch (e) {
                setError(errorText(e));
              }
            }}
          >
            Record reviewed reply
          </button>
        </section>
      )}
      <ErrorMessage error={error} />
    </>
  );
}
export function download(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function Diagnostics() {
  return (
    <>
      <OfflineStatus />
      <ModelDiagnostics />
    </>
  );
}
function OfflineStatus() {
  const [status, setStatus] = useState("Preparing offline files…"),
    [ready, setReady] = useState(false),
    [update, setUpdate] = useState(updateAvailable);
  async function check() {
    setStatus("Preparing offline files…");
    try {
      const r = await checkOffline();
      setStatus(
        `Ready for offline use · ${r.assets} verified assets · ${Math.round(r.bytes / 1024)} KiB · ${r.modelVersion}`,
      );
      setReady(true);
    } catch (e) {
      setReady(false);
      setStatus(errorText(e));
    }
  }
  useEffect(() => {
    void check();
    const timer = setTimeout(() => void check(), 2500);
    const handler = () => setUpdate(true);
    window.addEventListener("localrelay-update", handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("localrelay-update", handler);
    };
  }, []);
  return (
    <div className="status" role="status">
      <b>
        {ready ? "Ready for offline use" : "Offline readiness not confirmed"}
      </b>
      <p>{status}</p>
      <button className="secondary" onClick={() => void check()}>
        Recheck offline files
      </button>
      {update && (
        <Warning>
          An application update is available. Finish or abandon any unsaved
          draft before returning home to update. Existing request snapshots are
          preserved.<Link to="/">Return home</Link>
          {location.pathname === "/" && (
            <button onClick={() => void activateUpdate()}>
              Activate update and reload
            </button>
          )}
        </Warning>
      )}
    </div>
  );
}
