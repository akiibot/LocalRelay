import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BanglaReview from "./BanglaReview";
import BanglaReviewDemo from "./BanglaReviewDemo";
import {
  beginStudy,
  finishStudy,
  resumeStudy,
  currentStudy,
  studyResults,
  summaries,
  scenario,
  rateStudy,
  type Study,
} from "./study";
import * as db from "../storage/db";
import { loadModel } from "../ai/model";
function exportData(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Evaluation() {
  const [params] = useSearchParams();
  if (params.get("review") === "bangla" && params.get("demo") === "1")
    return <BanglaReviewDemo />;
  return params.get("review") === "bangla" ? (
    <BanglaReview />
  ) : (
    <VisitorEvaluation />
  );
}
function VisitorEvaluation() {
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false),
    [participant, setParticipant] = useState(""),
    [number, setNumber] = useState("1"),
    [order, setOrder] = useState("1"),
    [active, setActive] = useState<Study | null>(currentStudy()),
    [rows, setRows] = useState<Awaited<ReturnType<typeof studyResults>>>([]),
    [error, setError] = useState("");
  async function refresh() {
    try {
      setActive(await resumeStudy());
      setRows(await studyResults());
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <>
      <h1>Consented local evaluation</h1>
      <p>
        No human results exist until participants actually complete tasks. The
        model and Bangla templates are experimental. Recruit consented adults,
        use pseudonyms, and freeze app/model/template versions for each study
        round.
      </p>
      <section>
        <h2>AI versus the same manual form</h2>
        <p>
          Four timed tasks, two per interface. Participant parity
          counterbalances interface order. Task order is fixed; report this
          limitation. Include typing, clarification and corrections. Start when
          the task brief is revealed; finish on reviewed-card queue or direct
          contact. Reload time remains included.
        </p>
        <label>
          Pseudonym
          <input
            value={participant}
            maxLength={32}
            onChange={(e) => setParticipant(e.target.value)}
          />
        </label>
        <label>
          Participant sequence number
          <input
            type="number"
            min="1"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <label>
          Task order
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          The participant consented to local pseudonymous timing, corrections,
          final-field scoring and optional ratings. No raw enquiry or phone
          numbers are exported.
        </label>
        <button
          disabled={!consent || !!active}
          onClick={async () => {
            try {
              if (!Number.isInteger(Number(number)) || Number(number) < 1)
                throw new Error("Use a positive participant sequence number.");
              const model = await loadModel();
              const study = await beginStudy(
                participant,
                Number(number),
                Number(order),
                model.metadata.version,
              );
              setActive(study);
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Reveal brief and start timer
        </button>
        {active && (
          <div className="warning">
            <b>
              {active.scenarioId} · {active.condition} · timer running
            </b>
            <p>{active.brief}</p>
            <button
              onClick={async () => {
                await db.preference("operator", "demo-craft");
                navigate(
                  `/request/new${active.condition === "form" ? "?mode=form" : ""}`,
                );
              }}
            >
              Open assigned interface
            </button>
            <button
              className="secondary"
              onClick={async () => {
                await finishStudy("abandoned");
                await refresh();
              }}
            >
              Record abandonment
            </button>
          </div>
        )}
      </section>
      <section>
        <h2>Local results: {rows.length} task records</h2>
        <p>
          Help and workload are entered after the task. No inferential
          population claims; summarize paired participant results and actual
          errors.
        </p>
        {rows.map((r) => (
          <details key={r.id}>
            <summary>
              {r.participant} · {r.condition} · {r.scenarioId} ·{" "}
              {r.criticalCorrect ? "correct" : "error / incomplete"} ·{" "}
              {Math.round(r.durationMs / 1000)}s
            </summary>
            <p>
              Critical errors: {r.criticalErrors.join(", ") || "none"};{" "}
              {r.corrections} field edit events; {r.taps} click events. Counts
              are within this open app session; a reload resets unpersisted
              interaction counters.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={r.helpRequired ?? false}
                onChange={async (e) => {
                  await rateStudy(r.id, e.target.checked, r.workload, r.note);
                  await refresh();
                }}
              />
              Help was required (
              {r.helpRequired === null
                ? "not collected"
                : r.helpRequired
                  ? "yes"
                  : "no"}
              )
            </label>
            <label>
              Workload (1 low, 7 high)
              <select
                value={r.workload ?? ""}
                onChange={async (e) => {
                  await rateStudy(
                    r.id,
                    r.helpRequired,
                    e.target.value ? Number(e.target.value) : null,
                    r.note,
                  );
                  await refresh();
                }}
              >
                <option value="">Not collected</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </details>
        ))}
        <button
          onClick={() =>
            exportData(
              {
                schemaVersion: 1,
                consentScope: "local pseudonymous study",
                results: rows,
                participantSummaries: summaries(rows),
              },
              "localrelay-study.json",
            )
          }
        >
          Export deidentified study JSON
        </button>
        <button
          className="secondary"
          onClick={() =>
            exportData(
              rows.map((r) => ({
                gradingId: r.id,
                scenario: r.scenarioId,
                expected: r.expected,
                finalFields: r.finalFields,
                outcome: r.outcome,
              })),
              "localrelay-blind-grading.json",
            )
          }
        >
          Export cards for blind grading
        </button>
        <pre>{JSON.stringify(summaries(rows), null, 2)}</pre>
      </section>
      <section>
        <h2>Native comprehension and hardware logs</h2>
        <p>
          <Link to="/evaluation?review=bangla">
            Start independent Bangla review
          </Link>
        </p>
        <p>
          Use the repository’s protocol and blank CSV files. Two independent
          reviewers first, then at least 8 native speakers × 6 messages, on the
          target phone. Log unassisted answers, time, help, confidently wrong
          interpretations and typed replies. Reviewers are separate from
          participants.
        </p>
        <p>
          Physical SMS target: 20 varied messages including maximum lengths,
          duplicates, delays, cancelled composer and copy fallback. Do not enter
          simulated results as carrier evidence.
        </p>
        <button
          className="secondary"
          onClick={() =>
            exportData(
              {
                status: "pending",
                study: "native-comprehension",
                fields: [
                  "participantPseudonym",
                  "deviceModel",
                  "carrierRoute",
                  "templateVersion",
                  "messageId",
                  "criticalFieldsCorrect",
                  "wholeCardCorrect",
                  "replyCorrect",
                  "seconds",
                  "helpRequired",
                  "confidentlyWrong",
                ],
                exampleTasks: [1, 2, 3, 4].map((n) => scenario(n)),
              },
              "localrelay-field-study-schema.json",
            )
          }
        >
          Export blank study schema
        </button>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
