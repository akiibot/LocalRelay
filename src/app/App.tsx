import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Link,
  Routes,
  Route,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  cardSchema,
  operatorSchema,
  labels,
  TEMPLATE_VERSION,
  type RelayRequest,
  type ConfirmedCard,
} from "../domain/schema";
import operatorsJson from "../../public/data/operators/demo.json";
import {
  addDays,
  dhakaDay,
  validateCard,
  validDate,
  validTime,
  validateSchedule,
} from "../domain/validation";
import { analyzeLocal } from "../ai/client";
import type { Scores } from "../ai/features";
import Simulator from "./Simulator";
import InteractiveDemo from "./demo/InteractiveDemo";
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
import { renderBangla, acceptance } from "../templates/render";
import { smsSize, smsUri, validateTemplate } from "../sms/encoding";
import { parseReply } from "../sms/reply";
import { action, applyReply, sameOffer } from "../domain/state";
import * as db from "../storage/db";
import AppShell from "./components/AppShell";
import VisitFields from "./request/VisitFields";
import {
  RequestSummary,
  SmsPanel,
  RequestProgress,
  OfferSummary,
  StatusBadge,
} from "./request/RequestParts";
import { dateLabel, exceptional, presentation } from "./request/presentation";
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
    const tap = () => {
      if (window.location.pathname !== "/demo") countStudy("taps");
    };
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
      <AppShell>
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
            path="/demo"
            element={<InteractiveDemo operator={operators[0]} />}
          />
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
      </AppShell>
    </>
  );
}
function Home() {
  const [error, setError] = useState("");
  return (
    <>
      <div className="home-hero">
        <p className="eyebrow">LOCAL EXPERIENCES · CELLULAR SMS</p>
        <h1 tabIndex={-1}>
          Plan a local visit.
          <br />
          Agree by SMS.
        </h1>
        <p className="lead">
          Prepare a Bangla request on your phone. Exchange SMS when cellular
          service is available.
        </p>
        <div className="actions">
          <Link className="button" to="/operators">
            Choose an experience <span aria-hidden="true">→</span>
          </Link>
          <Link className="button secondary" to="/outbox">
            View saved requests
          </Link>
        </div>
        <p className="muted">
          Demo experiences · manual form recommended · no account needed
        </p>
      </div>
      <p className="home-demo-link">
        <Link to="/demo">Try the interactive two-phone demo</Link>
        <span> No typing · simulated SMS</span>
      </p>
      <OfflineStatus />
      <details className="home-help">
        <summary>How LocalRelay works</summary>
        <div className="steps">
          <section>
            <span className="step-number">01</span>
            <h2>Visit details</h2>
            <p>Choose an experience, then enter your date, guests and meals.</p>
          </section>
          <section>
            <span className="step-number">02</span>
            <h2>Review your request</h2>
            <p>Check the English meaning and exact Bangla SMS before saving.</p>
          </section>
          <section>
            <span className="step-number">03</span>
            <h2>Exchange SMS</h2>
            <p>
              Send the enquiry, record the offer, then exchange acceptance and
              acknowledgement. Normally four SMS messages.
            </p>
          </section>
        </div>
      </details>
      <section>
        <h2>Before you travel</h2>
        <p>
          Prepare offline files with internet before travelling. SMS needs a
          working SIM and cellular service; carrier charges apply. Normally four
          messages complete an agreement.
        </p>
        <details>
          <summary>Installation, privacy & offline storage</summary>
          <p>
            On Android Chrome, use the browser menu → “Install app” or “Add to
            Home screen”. Browser storage can be cleared or evicted; recheck
            readiness before travelling.
          </p>
          <p>
            SMS is not end-to-end encrypted. Local records stay on this device
            and origin and are accessible to anyone using it.
          </p>
        </details>
        <details>
          <summary>Storage and data on this device</summary>
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
        </details>
      </section>
      <details className="home-help">
        <summary>When to retest</summary>
        <p>
          Recheck affected steps after app or message changes, when using a
          different phone or carrier, or if offline files are lost. A successful
          test does not expire just because time has passed.
        </p>
        <Link to="/diagnostics">When to retest</Link>
      </details>
      <details className="tool-links home-help">
        <summary>Tools & evidence</summary>
        <p className="muted">
          Optional tools for testing and reviewing this demo.
        </p>
        <div className="tool-link-grid">
          <Link to="/diagnostics">Diagnostics & offline help</Link>
          <Link to="/evaluation">Evaluation tools</Link>
          <Link to="/simulate">Phone simulator</Link>
          <Link to="/evaluation?review=bangla">Independent Bangla review</Link>
          <Link to="/evaluation?review=bangla&demo=1">
            Filled review demo · synthetic examples
          </Link>
        </div>
      </details>
    </>
  );
}
function Operators() {
  return (
    <>
      <p className="eyebrow">FIND YOUR LOCAL VISIT</p>
      <h1 tabIndex={-1}>Choose an experience</h1>
      <p className="lead">
        Prepare a request for one of these demonstration experiences.
      </p>
      <p className="muted">
        No live availability or operator verification. The manual form is
        recommended; AI entry is experimental and missed its synthetic release
        target.
      </p>
      <div className="experience-grid">
        {operators.map((p) => (
          <section className="experience-card" key={p.id}>
            <div className="experience-icon" aria-hidden="true">
              {p.mealIncluded ? "◈" : "▥"}
            </div>
            <span className="badge">Demo profile</span>
            <h2>{p.serviceName}</h2>
            <p>{p.displayName}</p>
            <div className="service-facts">
              <span>Up to {p.maxGuests} guests</span>
              <span>
                {p.mealIncluded ? "Meals included" : "No meals included"}
              </span>
              <span>Quote in BDT</span>
            </div>
            <Link className="button" to={`/operators/${p.id}`}>
              View experience <span aria-hidden="true">→</span>
            </Link>
          </section>
        ))}
      </div>
    </>
  );
}
function Profile() {
  const { operatorId } = useParams();
  return <ProfileDetails key={operatorId} />;
}
function ProfileDetails() {
  const { operatorId } = useParams();
  const p = operators.find((p) => p.id === operatorId);
  const [phone, setPhone] = useState(""),
    [status, setStatus] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const createLock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void db
      .preference(`phone:${operatorId}`)
      .then((v) => {
        if (!cancelled) setPhone(typeof v === "string" ? v : "");
      })
      .catch((e) => {
        if (!cancelled) setStatus(errorText(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [operatorId]);
  if (!p) return <h1>Operator not found</h1>;
  return (
    <>
      <Link className="back-link" to="/operators">
        ← All experiences
      </Link>
      <span className="badge">Demo profile · template unreviewed</span>
      <h1 tabIndex={-1}>{p.serviceName}</h1>
      <p className="lead">{p.displayName}</p>
      <div className="service-facts">
        <span>Up to {p.maxGuests} guests</span>
        <span>Within {p.maxAdvanceDays} days</span>
        <span>Bangla SMS · BDT</span>
      </div>
      <section className="profile-setup">
        <h2>What’s included</h2>
        <p>{p.standardMeal}</p>
        <p className="muted">
          This is a demo profile, with no live availability or operator
          verification.
        </p>
        <label>
          Test recipient number (E.164)
          <input
            type="tel"
            disabled={loading || creating}
            value={phone}
            placeholder="+880…"
            autoComplete="tel"
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <p className="field-hint">
          A number is optional while preparing. Without it, copy the message and
          choose the consented recipient in your SMS app.
        </p>
        <p>
          Use only a number whose owner agreed to this pilot. It remains on this
          device. These draft templates need two independent native Bangla
          reviews before field use.
        </p>
        <button
          disabled={loading || creating}
          onClick={async () => {
            if (createLock.current) return;
            createLock.current = true;
            setCreating(true);
            setStatus("");
            try {
              if (phone && !/^\+[1-9]\d{7,14}$/.test(phone))
                throw new Error("Use +countrycode followed by 8–15 digits.");
              await db.preference(`phone:${p.id}`, phone);
              await db.preference("operator", p.id);
              navigate("/request/new?mode=form");
            } catch (e) {
              setStatus(errorText(e));
            } finally {
              createLock.current = false;
              setCreating(false);
            }
          }}
        >
          {loading
            ? "Loading recipient…"
            : creating
              ? "Preparing request…"
              : "Create a request"}
        </button>
        <ErrorMessage error={status} />
        <details className="technical">
          <summary>Demo profile details</summary>
          <dl>
            <dt>Currency / timezone</dt>
            <dd>BDT / Asia/Dhaka</dd>
            <dt>Demo profile date</dt>
            <dd>{p.checkedAt}; no live availability</dd>
            <dt>Supported quote limit</dt>
            <dd>
              Up to {p.maxQuoteBdt.toLocaleString("en-BD")} BDT. This is a
              protocol limit, not an advertised price.
            </dd>
          </dl>
        </details>
      </section>
      <Warning>
        Verify the operator number in your SMS app and confirm the package
        directly before a field pilot. This app does not verify inventory,
        delivery or payment.
      </Warning>
      <p>
        <Link to="/diagnostics">See when to retest</Link>
      </p>
    </>
  );
}
function NewRequest() {
  const [search] = useSearchParams();
  return <RequestDraft key={search.toString()} />;
}
function RequestDraft() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [operator, setOperator] = useState(operators[0]);
  const [previous, setPrevious] = useState<RelayRequest | null>(null);
  const [stage, setStage] = useState<"details" | "review">("details");
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState("");
  const [recipient, setRecipient] = useState("");
  const saveLock = useRef(false);
  useEffect(() => {
    if (stage === "review") {
      document.getElementById("review-heading")?.focus();
      document
        .getElementById("review-heading")
        ?.scrollIntoView({ block: "start" });
    }
  }, [stage]);
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
    let cancelled = false;
    async function initialize() {
      const id = search.get("revise");
      if (id) {
        const rows = await db.list();
        const old = rows.find((r) => r.id === id);
        if (
          !old ||
          ["AGREEMENT_RECORDED", "SUPERSEDED", "ARCHIVED"].includes(old.state)
        )
          throw new Error(
            "This record cannot be revised; contact the operator.",
          );
        if (cancelled) return;
        setPrevious(old);
        setOperator(old.operatorSnapshot);
        setRecipient(old.operatorSnapshot.phoneE164 ?? "");
        setManual(true);
        setText(old.originalText ?? "");
        setValues({
          localDate: old.card.localDate,
          localTime: old.card.localTime,
          adults: String(old.card.adults),
          children: String(old.card.children),
          vegetarianMeals: String(old.card.vegetarianMeals ?? ""),
        });
      } else {
        const selected = await db.preference("operator");
        const p = operators.find((p) => p.id === selected) ?? operators[0];
        const phone = await db.preference(`phone:${p.id}`);
        if (cancelled) return;
        setOperator({
          ...p,
          phoneE164: typeof phone === "string" && phone ? phone : null,
        });
        setRecipient(typeof phone === "string" ? phone : "");
      }
    }
    void initialize()
      .catch((e) => {
        if (!cancelled) setInitializationError(errorText(e));
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);
  function edit(key: string, value: string) {
    countStudy("corrections");
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
    setComplete(false);
    setMealOk(false);
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
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      if (stage !== "review")
        throw new Error("Review the request before saving.");
      if (recipient && !/^\+[1-9]\d{7,14}$/.test(recipient))
        throw new Error("Use +countrycode followed by 8–15 digits.");
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
      const phone = recipient;
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
      // The request is durable now; optional study bookkeeping must not invite a duplicate save.
      try {
        await finishStudy("reviewed_card", card);
      } catch (e) {
        console.error("Study outcome could not be recorded", e);
      }
      navigate(`/request/${r.id}`);
    } catch (e) {
      setError("Could not save request: " + errorText(e));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  const fieldProblems: Record<string, string> = {};
  const checked = cardSchema.safeParse(previewCard);
  if (!checked.success)
    for (const issue of checked.error.issues) {
      const key = String(issue.path[0]);
      fieldProblems[key] =
        key === "localDate"
          ? "Choose an exact valid date."
          : key === "localTime"
            ? "Choose an exact time."
            : "Enter a valid whole number (including 0 where applicable).";
    }
  if (validDate(values.localDate) && validTime(values.localTime)) {
    const scheduleErrors = validateSchedule(
      values.localDate,
      values.localTime,
      operator,
      new Date(),
    );
    if (scheduleErrors.length)
      fieldProblems.localDate = scheduleErrors.join(" ");
  }
  if (previewCard.adults + previewCard.children > operator.maxGuests)
    fieldProblems.children = `The total party must be at most ${operator.maxGuests} guests.`;
  if (
    operator.mealIncluded &&
    Number(values.vegetarianMeals) > previewCard.adults + previewCard.children
  )
    fieldProblems.vegetarianMeals =
      "Vegetarian meals cannot exceed the number of guests.";
  const enquiryInput = (
    <div className="enquiry-input">
      <label htmlFor="enquiry">
        {manual
          ? "Original enquiry / additional requirements (optional)"
          : "English enquiry (maximum 500 characters)"}
      </label>
      <textarea
        id="enquiry"
        disabled={busy}
        maxLength={500}
        rows={manual ? 3 : 5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError("");
          setParsed(null);
          setReview(false);
          setScores(null);
          setComplete(false);
          setMealOk(false);
          setRoutingUncertain(false);
        }}
        placeholder={
          manual
            ? "Extra requirements are checked locally. Avoid private medical details."
            : example
        }
        aria-describedby="enquiry-hint"
      />
      <small id="enquiry-hint" className="field-hint">
        {text.length}/500 characters.{" "}
        {manual
          ? "Requirements are checked on this device as you type."
          : "Analysis runs on this device when you press Analyze enquiry."}
      </small>
    </div>
  );
  const restriction = flags.length > 0 && (
    <Warning>
      <b>Direct contact required</b>
      {flags.map((f, i) => (
        <p key={i}>
          “{f.text}”: {f.reason}
        </p>
      ))}
      <p>
        Your full original requirements are retained. No checkbox can bypass
        these restrictions.
      </p>
      {operator.phoneE164 && (
        <a href={`tel:${operator.phoneE164}`}>Call operator</a>
      )}
      {currentStudy() && (
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            try {
              await finishStudy("manual_contact");
              navigate("/evaluation");
            } catch (e) {
              setError("Could not record study outcome: " + errorText(e));
            }
          }}
        >
          Record direct-contact outcome for study
        </button>
      )}
    </Warning>
  );
  return (
    <>
      <Link className="back-link" to={`/operators/${operator.id}`}>
        ← Experience details
      </Link>
      <p className="eyebrow">
        {previous ? `REVISION ${previous.revision + 1}` : "NEW REQUEST"} ·{" "}
        {manual ? "MANUAL FORM" : "EXPERIMENTAL AI"}
      </p>
      <h1 tabIndex={-1}>
        {stage === "review" ? "Review your request" : "Describe your visit"}
      </h1>
      <p className="lead compact-lead">{operator.serviceName}</p>
      <p className="muted">{operator.displayName} · Demo profile</p>
      <ol className="form-progress" aria-label="Request preparation">
        <li
          className={stage === "details" ? "current" : "done"}
          aria-current={stage === "details" ? "step" : undefined}
        >
          1. Visit details
        </li>
        <li
          className={stage === "review" ? "current" : ""}
          aria-current={stage === "review" ? "step" : undefined}
        >
          2. Review & save
        </li>
      </ol>
      {previous && (
        <Warning>
          Editing {previous.wireId}. Saving creates revision{" "}
          {previous.revision + 1} and supersedes the old record. Send the new
          revision; confirm prior offers directly with the operator.
        </Warning>
      )}
      {initializing ? (
        <p role="status">Loading experience…</p>
      ) : initializationError ? (
        <section>
          <ErrorMessage error={initializationError} />
          <Link to="/operators">Choose an experience to start again</Link>
        </section>
      ) : stage === "details" ? (
        <>
          {!manual && (
            <section>
              <h2>English entry · Experimental</h2>
              <Warning>
                Experimental AI missed its synthetic release target. The manual
                form is recommended. Every field still needs explicit review.
              </Warning>
              {enquiryInput}
              <button
                disabled={!text.trim() || busy}
                onClick={() => void analyze()}
              >
                {busy ? "Analyzing on this device…" : "Analyze enquiry"}
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setManual(true);
                  setComplete(false);
                  setMealOk(false);
                  setScores(null);
                }}
              >
                Use a form instead
              </button>
            </section>
          )}
          {!manual && !review && restriction}
          {!manual && routingUncertain && (
            <Warning>
              <b>AI needs manual review</b>
              <p>
                The local model cannot route this enquiry reliably. Select “Use
                a form instead” and confirm every field. Your original enquiry
                and unsupported requirements are retained.
              </p>
            </Warning>
          )}
          {(manual || review) && (
            <form
              className="request-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setAttempted(true);
                setError("");
                if (recipient && !/^\+[1-9]\d{7,14}$/.test(recipient)) {
                  setError(
                    "Use +countrycode followed by 8–15 digits for the recipient.",
                  );
                  document.getElementById("revision-recipient")?.focus();
                  return;
                }
                if (liveErrors.length) {
                  setError(
                    "Check the highlighted visit details before reviewing.",
                  );
                  setTimeout(
                    () =>
                      document
                        .querySelector<HTMLElement>(
                          '.request-form [aria-invalid="true"]',
                        )
                        ?.focus(),
                    0,
                  );
                  return;
                }
                setComplete(false);
                setMealOk(false);
                setStage("review");
              }}
            >
              <section>
                <h2>Visit details</h2>
                {parsed?.clarifications.length ? (
                  <Warning>
                    {parsed.clarifications.map((c) => (
                      <p key={c}>{c}</p>
                    ))}
                    <p>
                      Resolve ambiguous or missing information in the fields
                      below.
                    </p>
                  </Warning>
                ) : null}
                <VisitFields
                  values={values}
                  operator={operator}
                  errors={attempted ? fieldProblems : {}}
                  edit={edit}
                />
                {manual && enquiryInput}
                {restriction}
                {previous && (
                  <div>
                    <label htmlFor="revision-recipient">
                      Recipient for this revision
                    </label>
                    <input
                      id="revision-recipient"
                      aria-describedby="recipient-hint"
                      aria-invalid={
                        attempted &&
                        !!recipient &&
                        !/^\+[1-9]\d{7,14}$/.test(recipient)
                      }
                      type="tel"
                      value={recipient}
                      placeholder="+880…"
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                    <small id="recipient-hint" className="field-hint">
                      Use an owner-consented number. The previous record stays
                      unchanged; this number belongs to the new revision.
                    </small>
                  </div>
                )}
                <p className="muted">
                  The message asks for the full total in BDT, including required
                  charges.
                </p>
                <button type="submit">
                  Review request <span aria-hidden="true">→</span>
                </button>
                <p className="field-hint">
                  Not saved yet. Review and confirm before saving on this
                  device.
                </p>
              </section>
            </form>
          )}
          {manual && (
            <details className="ai-entry">
              <summary>Try English entry · Experimental</summary>
              <p>
                AI is optional and missed its synthetic release target. Your
                fields and original enquiry are retained when switching modes;
                you must review them again.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setManual(false);
                  setReview(false);
                  setComplete(false);
                  setMealOk(false);
                  setScores(null);
                }}
              >
                Use English free text
              </button>
            </details>
          )}
        </>
      ) : (
        <>
          <div className="review-layout">
            <section>
              <h2 id="review-heading" tabIndex={-1}>
                Check your visit details
              </h2>
              <RequestSummary card={previewCard} operator={operator} />
              {text && (
                <div className="original-requirements">
                  <h3>Original enquiry / requirements</h3>
                  <p>{text}</p>
                </div>
              )}
              <p>
                <strong>Recipient:</strong>{" "}
                {recipient ||
                  "No number configured — copy the saved message and choose the consented recipient in your SMS app."}
              </p>
              <button
                className="secondary"
                disabled={saving}
                onClick={() => {
                  setStage("details");
                  setComplete(false);
                  setMealOk(false);
                  setTimeout(
                    () =>
                      document
                        .querySelector<HTMLElement>(".request-form input")
                        ?.focus(),
                    0,
                  );
                }}
              >
                Edit details
              </button>
            </section>
            <section>
              <h2>Review the message</h2>
              <SmsPanel body={liveBody} temporary />
              <p className="field-hint">
                The exact saved message will include your assigned request ID.
              </p>
            </section>
          </div>
          {restriction}
          {!manual && routingUncertain && (
            <Warning>
              <b>AI needs manual review</b>
              <p>
                Return to Edit details and select “Use a form instead”. Confirm
                every field before saving.
              </p>
            </Warning>
          )}
          <section className="confirmation-card">
            <h2>Confirm before saving</h2>
            {operator.mealIncluded && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={mealOk}
                  onChange={(e) => setMealOk(e.target.checked)}
                  disabled={saving}
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
                disabled={saving}
              />
              I verified the exact date, time, adults, children, meals and
              selected service. This card includes all my requirements; no
              unsupported detail remains.
            </label>
            <Warning>
              Bangla template is an unreviewed draft. Save only for development
              or a consented test. Independent native review and broader
              physical SMS validation remain pending.
            </Warning>
            <button
              disabled={
                saving ||
                !complete ||
                flags.length > 0 ||
                (!manual && routingUncertain) ||
                (operator.mealIncluded && !mealOk) ||
                liveErrors.length > 0 ||
                liveSize.blocked
              }
              onClick={() => void queue()}
            >
              {saving
                ? "Saving on this device…"
                : "Save request on this device"}
            </button>
            <p className="field-hint">
              This saves the reviewed request. You’ll open your SMS app next.
            </p>
          </section>
        </>
      )}
      {parsed?.spans.length ? (
        <details className="technical">
          <summary>Source evidence (rule-derived)</summary>
          {parsed.spans.map((span, i) => (
            <p key={i}>
              {span.field}: “{span.text}” [{span.start}–{span.end}]
            </p>
          ))}
        </details>
      ) : null}
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
      <Link to="/outbox">View saved requests</Link>
    </>
  );
}
function RequestPage() {
  const { record: r, error, setError, loaded, update } = useRequest();
  const navigate = useNavigate();
  const requestState = r?.state;
  useEffect(() => {
    if (!requestState) return;
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>("main h1")?.focus();
  }, [requestState]);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [newer, setNewer] = useState<RelayRequest | null>(null);
  useEffect(() => {
    let cancelled = false;
    setNewer(null);
    if (r?.state === "SUPERSEDED")
      void db
        .list()
        .then((rows) => {
          if (!cancelled)
            setNewer(
              rows
                .filter(
                  (row) =>
                    row.wireId.split(".")[0] === r.wireId.split(".")[0] &&
                    row.revision > r.revision,
                )
                .sort((a, b) => b.revision - a.revision)[0] ?? null,
            );
        })
        .catch((e) => {
          if (!cancelled) setError(errorText(e));
        });
    return () => {
      cancelled = true;
    };
  }, [r?.state, r?.wireId, r?.revision, setError]);
  if (!loaded) return <p role="status">Loading local record…</p>;
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
  const sendable = [
    "READY_TO_SEND",
    "COMPOSER_OPENED",
    "REQUEST_SENT_REPORTED",
    "ACCEPTANCE_READY",
    "ACCEPTANCE_COMPOSER_OPENED",
    "ACCEPTANCE_SENT_REPORTED",
  ].includes(r.state);
  const replyAllowed = !exceptional.includes(r.state);
  const next = presentation[r.state];
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const receipt = () =>
    download("localrelay-receipt.json", {
      wireId: r.wireId,
      card: r.card,
      offer: r.offer,
      state: r.state,
      templateVersion: r.templateVersion,
    });
  const replyLink = (
    <Link className="button" to={`/reply/${r.id}`}>
      {r.state === "ACCEPTANCE_SENT_REPORTED"
        ? "Record acknowledgement"
        : "Record operator reply"}
    </Link>
  );
  return (
    <>
      <Link className="back-link" to="/outbox">
        ← Your requests
      </Link>
      <p className="eyebrow">
        {r.wireId} ·{" "}
        {r.entryMode === "form" ? "MANUAL FORM" : "EXPERIMENTAL AI"}
      </p>
      <h1 tabIndex={-1}>{labels[r.state]}</h1>
      <p className="compact-lead">{r.operatorSnapshot.serviceName}</p>
      <p className="muted">{r.operatorSnapshot.displayName}</p>
      <section className={`next-action ${next.tone}`} aria-label="Next action">
        <p>{next.next}</p>
        {["REQUEST_SENT_REPORTED", "ACCEPTANCE_SENT_REPORTED"].includes(
          r.state,
        ) ? (
          replyLink
        ) : r.state === "OFFER_RECEIVED" ? (
          <a className="button" href="#offer">
            Review offer
          </a>
        ) : r.state === "AGREEMENT_RECORDED" ? (
          <button onClick={receipt}>Export receipt</button>
        ) : r.state === "SUPERSEDED" ? (
          <Link
            className="button"
            to={newer ? `/request/${newer.id}` : "/outbox"}
          >
            {newer ? "Open latest revision" : "Find latest in requests"}
          </Link>
        ) : exceptional.includes(r.state) ? (
          r.operatorSnapshot.phoneE164 && (
            <a className="button" href={`tel:${r.operatorSnapshot.phoneE164}`}>
              Call operator
            </a>
          )
        ) : (
          <a
            className="button secondary"
            href={r.state.includes("COMPOSER") ? "#after-sending" : "#message"}
          >
            {r.state.includes("COMPOSER")
              ? "Record sending below"
              : `Review ${accepting ? "acceptance" : "enquiry"} SMS`}
          </a>
        )}
      </section>
      <RequestProgress record={r} />
      {r.offer && (
        <section id="offer" className="offer-card">
          <p className="eyebrow">REVIEWED OPERATOR TERMS</p>
          <h2>Frozen operator offer</h2>
          <OfferSummary
            offer={r.offer}
            card={r.card}
            acknowledgement={r.state === "AGREEMENT_RECORDED"}
          />
          {r.state === "OFFER_RECEIVED" && (
            <button
              disabled={busy}
              onClick={() => void run(async () => update(action(r, "accept")))}
            >
              Accept offer and prepare acceptance SMS
            </button>
          )}
        </section>
      )}
      <div className="review-layout">
        <section id="message">
          <SmsPanel
            body={body}
            title={accepting ? "Bangla acceptance SMS" : "Exact Bangla SMS"}
          />
          {sendable && (
            <>
              <p className="muted">
                Opening your SMS app does not prove sending or delivery.
              </p>
              <div className="actions">
                <button
                  disabled={busy || !r.operatorSnapshot.phoneE164}
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
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await navigator.clipboard.writeText(body);
                      setFeedback("Message copied. Send from your SMS app.");
                    })
                  }
                >
                  Copy message
                </button>
                <button
                  className="secondary"
                  disabled={busy || !r.operatorSnapshot.phoneE164}
                  onClick={() =>
                    void run(async () => {
                      await navigator.clipboard.writeText(
                        r.operatorSnapshot.phoneE164!,
                      );
                      setFeedback("Number copied.");
                    })
                  }
                >
                  Copy number
                </button>
              </div>
            </>
          )}
        </section>
        <section>
          <h2>{accepting ? "Acceptance meaning" : "Your visit details"}</h2>
          {accepting && r.offer ? (
            <p>
              Accept {dateLabel(r.offer.localDate)} at {r.offer.localTime}{" "}
              Asia/Dhaka, for the full total of{" "}
              {r.offer.totalBdt.toLocaleString("en-BD")} BDT. The original guest
              and meal terms remain bound to this request.
            </p>
          ) : (
            <>
              <p>
                <strong>{dateLabel(r.card.localDate)}</strong> at{" "}
                {r.card.localTime} · Asia/Dhaka
              </p>
              <p>
                {r.card.adults} adults · {r.card.children} children ·{" "}
                {r.operatorSnapshot.mealIncluded
                  ? `${r.card.vegetarianMeals} vegetarian meals`
                  : "No meals included"}
              </p>
            </>
          )}
          <details>
            <summary>Full reviewed details & requirements</summary>
            <RequestSummary card={r.card} operator={r.operatorSnapshot} />
            {r.originalText && (
              <>
                <h3>Original enquiry / requirements</h3>
                <p>{r.originalText}</p>
              </>
            )}
          </details>
          <p>
            <strong>Recipient:</strong>{" "}
            {r.operatorSnapshot.phoneE164 ||
              "No consented test number configured"}
          </p>
          {!r.operatorSnapshot.phoneE164 && sendable && (
            <div className="warning">
              <strong>Choose the recipient in your SMS app</strong>
              <p>
                Copy the message and select the owner-consented operator number
                manually. To save a number in this record, add it in a new
                revision; the old snapshot stays unchanged.
              </p>
              <Link to={`/request/new?mode=form&revise=${r.id}`}>
                Add number in a new revision
              </Link>
            </div>
          )}
        </section>
      </div>
      {sendable && (
        <section id="after-sending" className="after-sending">
          <h2>After sending in your SMS app</h2>
          <p>
            Return here after you send the{" "}
            {accepting ? "acceptance" : "enquiry"}. This records your report,
            not a carrier delivery receipt.
          </p>
          <button
            className={r.state.includes("COMPOSER") ? "" : "secondary"}
            disabled={busy}
            onClick={() => void run(async () => update(action(r, "sent")))}
          >
            I sent this {accepting ? "acceptance" : "enquiry"}
          </button>
          {[
            "READY_TO_SEND",
            "COMPOSER_OPENED",
            "ACCEPTANCE_READY",
            "ACCEPTANCE_COMPOSER_OPENED",
          ].includes(r.state) && (
            <p>
              <Link to={`/reply/${r.id}`}>
                Already have a matching reply? Record it and resolve a missed
                send report.
              </Link>
            </p>
          )}
        </section>
      )}
      {replyAllowed &&
        !["REQUEST_SENT_REPORTED", "ACCEPTANCE_SENT_REPORTED"].includes(
          r.state,
        ) && (
          <p>
            <Link className="button secondary" to={`/reply/${r.id}`}>
              {r.state === "AGREEMENT_RECORDED"
                ? "Record another operator reply"
                : "Record operator reply"}
            </Link>
          </p>
        )}
      {r.state === "AGREEMENT_RECORDED" && (
        <Warning>
          Changes and cancellation require direct contact with the operator.
          This app does not verify inventory, payment or service delivery.
        </Warning>
      )}
      <p className="muted">
        Local expiry:{" "}
        {new Date(r.expiresAt).toLocaleString("en-GB", {
          timeZone: "Asia/Dhaka",
        })}{" "}
        Asia/Dhaka. Local expiry does not release an operator’s reservation.
      </p>
      <details className="record-management">
        <summary>Receipt, revisions & local data</summary>
        <div className="actions">
          <button className="secondary" onClick={receipt}>
            Export minimal receipt
          </button>
          {!["AGREEMENT_RECORDED", "SUPERSEDED", "ARCHIVED"].includes(
            r.state,
          ) && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => navigate(`/request/new?mode=form&revise=${r.id}`)}
            >
              Edit as a new revision
            </button>
          )}
          <button
            className="secondary danger"
            disabled={busy}
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
        <p>Deleting this local record does not cancel a service.</p>
        <details>
          <summary>Local event history · snapshot versions</summary>
          <p>
            Template {r.templateVersion} · model{" "}
            {r.modelVersion || "manual/no model"} · demo profile date{" "}
            {r.operatorSnapshot.checkedAt}
          </p>
          {r.events.map((e, i) => (
            <p key={i}>
              {e.at}: {e.type}
              {"phase" in e ? ` (${e.phase})` : ""}
            </p>
          ))}
        </details>
      </details>
      <p className="feedback" role="status">
        {feedback}
      </p>
      <ErrorMessage error={error} />
    </>
  );
}
function Outbox() {
  const [rows, setRows] = useState<RelayRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void db
      .list()
      .then((v) => {
        if (!cancelled) setRows(v);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const active = rows.filter(
    (r) => !exceptional.includes(r.state) && r.state !== "AGREEMENT_RECORDED",
  );
  const closed = rows.filter(
    (r) => exceptional.includes(r.state) || r.state === "AGREEMENT_RECORDED",
  );
  const cards = (list: RelayRequest[]) => (
    <div className="request-list">
      {list.map((r) => (
        <section className="request-card" key={r.id}>
          <StatusBadge record={r} />
          <h3>
            <Link to={`/request/${r.id}`}>
              {r.operatorSnapshot.serviceName}
            </Link>
          </h3>
          <p>
            {dateLabel(r.card.localDate)} · {r.card.localTime} Asia/Dhaka
          </p>
          <p className="muted">
            {r.operatorSnapshot.displayName} · {r.wireId}
          </p>
          <Link className="button secondary" to={`/request/${r.id}`}>
            {presentation[r.state].action} <span aria-hidden="true">→</span>
          </Link>
        </section>
      ))}
    </div>
  );
  return (
    <>
      <p className="eyebrow">SAVED ON THIS DEVICE</p>
      <h1 tabIndex={-1}>Your requests</h1>
      <p className="lead">Pick up where you left off.</p>
      <p className="muted">
        Records do not sync to another device. Deleting a record does not cancel
        a service.
      </p>
      <Link className="button" to="/request/new?mode=form">
        New request <span aria-hidden="true">＋</span>
      </Link>
      {loading ? (
        <p role="status">Loading saved requests…</p>
      ) : error ? (
        <ErrorMessage error={error} />
      ) : rows.length === 0 ? (
        <section className="empty-state">
          <span className="experience-icon" aria-hidden="true">
            ▤
          </span>
          <h2>No requests yet</h2>
          <p>
            Choose an experience and review your details. Your saved requests
            will appear here.
          </p>
          <Link to="/operators">Explore the demo experiences →</Link>
        </section>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <h2 className="list-heading">
                In progress <span>{active.length}</span>
              </h2>
              {cards(active)}
            </>
          )}
          {closed.length > 0 && (
            <>
              <h2 className="list-heading">
                Completed & closed <span>{closed.length}</span>
              </h2>
              {cards(closed)}
            </>
          )}
        </>
      )}
    </>
  );
}
function ReplyPage() {
  const { record: r, error, setError, loaded, update } = useRequest();
  const [raw, setRaw] = useState("");
  const [sender, setSender] = useState(false);
  const [missing, setMissing] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof parseReply> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    setRaw("");
    setSender(false);
    setMissing(false);
    setPreview(null);
  }, [r?.id]);
  if (!loaded) return <p role="status">Loading local record…</p>;
  if (!r)
    return (
      <>
        <Missing />
        <ErrorMessage error={error} />
      </>
    );
  const acknowledging = [
    "ACCEPTANCE_READY",
    "ACCEPTANCE_COMPOSER_OPENED",
    "ACCEPTANCE_SENT_REPORTED",
  ].includes(r.state);
  const canRecover = [
    "READY_TO_SEND",
    "COMPOSER_OPENED",
    "ACCEPTANCE_READY",
    "ACCEPTANCE_COMPOSER_OPENED",
  ].includes(r.state);
  const stopped = exceptional.includes(r.state);
  return (
    <>
      <Link className="back-link" to={`/request/${r.id}`}>
        ← Back to request
      </Link>
      <p className="eyebrow">
        {r.wireId} · {r.operatorSnapshot.displayName}
      </p>
      <h1 tabIndex={-1}>
        {acknowledging ? "Record acknowledgement" : "Record operator reply"}
      </h1>
      {stopped ? (
        <Warning>
          {presentation[r.state].next} This request cannot progress.{" "}
          <Link to={`/request/${r.id}`}>Review the saved record</Link>.
        </Warning>
      ) : (
        <>
          <section className="reply-entry">
            <h2>Check the SMS, then enter it here</h2>
            <p>
              In your SMS app, check the sender against{" "}
              <strong>
                {r.operatorSnapshot.phoneE164 ||
                  "the owner-consented operator number"}
              </strong>
              . Paste or type the whole reply, including{" "}
              <strong>#{r.wireId}</strong>. LocalRelay does not authenticate
              pasted messages.
            </p>
            <label htmlFor="reply">Exact SMS reply</label>
            <textarea
              id="reply"
              value={raw}
              rows={4}
              disabled={busy}
              aria-describedby="reply-hint"
              placeholder="Paste the full operator SMS, including its request ID"
              onChange={(e) => {
                setRaw(e.target.value);
                setPreview(null);
              }}
            />
            <small id="reply-hint" className="field-hint">
              {acknowledging
                ? "Enter the operator’s acknowledgement of the accepted date, time and total."
                : "Enter the operator’s offer or decline exactly as received."}
            </small>
            <label className="check">
              <input
                type="checkbox"
                checked={sender}
                disabled={busy}
                onChange={(e) => {
                  setSender(e.target.checked);
                  setPreview(null);
                }}
              />
              I checked the SMS sender against this operator’s number.
            </label>
            {canRecover && (
              <details className="recovery">
                <summary>Forgot to record that you sent it?</summary>
                <p>
                  A matching reply can resolve a missed local send report. It
                  does not verify carrier delivery.
                </p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={missing}
                    disabled={busy}
                    onChange={(e) => {
                      setMissing(e.target.checked);
                      setPreview(null);
                    }}
                  />
                  If I omitted “I sent this”, this matching reply explicitly
                  resolves the missing local report.
                </label>
              </details>
            )}
            <button
              disabled={!sender || !raw.trim() || busy}
              onClick={() => {
                try {
                  setPreview(parseReply(raw, r));
                  setError("");
                  setTimeout(() => {
                    document.getElementById("reply-review")?.focus();
                    document
                      .getElementById("reply-review")
                      ?.scrollIntoView({ block: "start" });
                  }, 0);
                } catch (e) {
                  setPreview(null);
                  setError(errorText(e));
                }
              }}
            >
              Review reply
            </button>
          </section>
          {preview && (
            <section className="reply-review">
              <h2 id="reply-review" tabIndex={-1}>
                Reply review
              </h2>
              {preview.command === 2 ? (
                <p>
                  <strong>Operator declined.</strong> This will record the
                  decline.
                </p>
              ) : (
                <>
                  <p className="eyebrow">
                    {preview.command === 5
                      ? "ACKNOWLEDGEMENT TERMS"
                      : "OPERATOR OFFER"}
                  </p>
                  <OfferSummary
                    offer={preview.offer}
                    card={r.card}
                    acknowledgement={
                      preview.command === 5 &&
                      acknowledging &&
                      !!r.offer &&
                      sameOffer(r.offer, preview.offer)
                    }
                  />
                </>
              )}
              <p className="muted">
                An offer covers the original guests and meals. Conflicting later
                offers require direct contact. This review does not authenticate
                the sender.
              </p>
              <button
                disabled={!sender || busy}
                onClick={async () => {
                  if (lock.current || !sender) return;
                  lock.current = true;
                  setBusy(true);
                  try {
                    await update(applyReply(r, preview, canRecover && missing));
                    navigate(`/request/${r.id}`);
                  } catch (e) {
                    setError(errorText(e));
                  } finally {
                    lock.current = false;
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Recording reply…" : "Record reviewed reply"}
              </button>
            </section>
          )}
        </>
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
  const [checking, setChecking] = useState(true);
  const checkingLock = useRef(false);
  const [status, setStatus] = useState("Preparing offline files…"),
    [ready, setReady] = useState(false),
    [update, setUpdate] = useState(updateAvailable);
  async function check() {
    if (checkingLock.current) return;
    checkingLock.current = true;
    setChecking(true);
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
    } finally {
      checkingLock.current = false;
      setChecking(false);
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
    <div className={`status offline-status ${ready ? "prepared" : ""}`}>
      <div className="offline-heading">
        <span className="offline-dot" aria-hidden="true" />
        <div role="status">
          <b>
            {checking
              ? "Checking offline files…"
              : ready
                ? "Ready for offline use"
                : "Offline readiness not confirmed"}
          </b>
          <p>
            {checking
              ? "Verifying the files on this device."
              : ready
                ? "Prepare requests without internet. Cellular service is still needed for SMS."
                : status}
          </p>
        </div>
      </div>
      <button
        className="secondary"
        disabled={checking}
        onClick={() => void check()}
      >
        {checking ? "Checking…" : "Recheck offline files"}
      </button>
      <details className="technical">
        <summary>Offline file details</summary>
        <p>{status}</p>
      </details>
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
