import { useState } from "react";
import { analyzeLocal } from "../ai/client";
import { loadModel } from "../ai/model";
import type { Scores } from "../ai/features";
import type { Model } from "../ai/model";
import report from "../../ml/evaluation.json";
export default function Diagnostics() {
  const [meta, setMeta] = useState<Model["metadata"] | null>(null),
    [timing, setTiming] = useState<unknown>(null),
    [sample, setSample] = useState(""),
    [scores, setScores] = useState<Scores | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <h1>Model diagnostics & evidence</h1>
      <p>
        This is classical learned logistic regression, not a generative language
        model or Bangla understanding model. Inputs are processed in a worker on
        your device. Scores are uncalibrated and do not prove correctness.
      </p>
      <div className="warning">
        <b>AI release target missed</b>
        <p>
          Synthetic held-out intent macro-F1: {report.intentMacroF1.toFixed(3)}{" "}
          (target .85). Keyword baseline:{" "}
          {report.keywordIntentMacroF1.toFixed(3)}. {report.counts.test}{" "}
          held-out synthetic examples from {report.groups.test} families; no
          independent human author evaluation. Use the manual form as the pilot
          default until independent data improves routing.
        </p>
      </div>
      <section>
        <h2>Verify local package</h2>
        <button
          onClick={async () => {
            try {
              setMeta((await loadModel()).metadata);
              setError("");
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Check model hash and compatibility
        </button>
        {meta && <pre>{JSON.stringify(meta, null, 2)}</pre>}
        <label>
          Diagnostic English input (stays local)
          <textarea
            maxLength={500}
            value={sample}
            onChange={(e) => setSample(e.target.value)}
          />
        </label>
        <button
          disabled={!sample}
          onClick={async () => {
            try {
              setScores(await analyzeLocal(sample));
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Inspect local scores
        </button>
        {scores && <pre>{JSON.stringify(scores, null, 2)}</pre>}
      </section>
      <section>
        <h2>Timing on this device</h2>
        <p>
          50 warm calls; first load reported separately. Worker round-trip times
          include RPC overhead. Record the actual handset/browser for field
          evidence. This desktop result is not a low-end Android measurement.
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const input =
                "Please tell me the total fee. Two adults and one child tomorrow at 3 pm. One vegetarian meal.";
              const cold = performance.now();
              await analyzeLocal(input);
              const coldMs = performance.now() - cold;
              const times: number[] = [];
              const inference: number[] = [];
              let failures = 0;
              for (let i = 0; i < 50; i++) {
                const s = performance.now();
                try {
                  const result = await analyzeLocal(input);
                  inference.push(result.ms);
                  times.push(performance.now() - s);
                } catch {
                  failures++;
                  times.push(performance.now() - s);
                }
              }
              times.sort((a, b) => a - b);
              inference.sort((a, b) => a - b);
              setTiming({
                userAgent: navigator.userAgent,
                firstCallMs: coldMs,
                warmSuccessful: 50 - failures,
                warmAttempts: 50,
                warmFailures: failures,
                roundTripP95Ms:
                  times[Math.ceil(times.length * 0.95) - 1] ?? null,
                inferenceP95Ms:
                  inference[Math.ceil(inference.length * 0.95) - 1] ?? null,
                note: "First call is only cold if this app session had no previous inference. Round-trip p95 includes failed attempts; inference p95 is available only for successful calls.",
              });
            } catch (e) {
              setError(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Measure 50 runs
        </button>
        {timing !== null && <pre>{JSON.stringify(timing, null, 2)}</pre>}
      </section>
      <section>
        <h2>External evidence remains pending</h2>
        <p>
          Physical Android offline restart, low-end phone performance, two
          native Bangla reviews, native comprehension, real feature-phone SMS
          exchange, visitor comparison, operator interviews and deployed-origin
          checks.
        </p>
        <p>
          Template bn-draft-1: unreviewed, zero reviewers. Local stored SMS
          entries are not authenticated carrier receipts.
        </p>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
