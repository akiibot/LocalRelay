import { useState } from "react";
import { Link } from "react-router-dom";
import operatorGuide from "../../docs/operator-guide-bn.md?raw";
import { makeDemoReview, reviewItems } from "./bangla-review-data";

const items = reviewItems(operatorGuide);
const examples = makeDemoReview(items, "").examples;
export default function BanglaReviewDemo() {
  const [selected, setSelected] = useState(0),
    [error, setError] = useState("");
  async function download() {
    try {
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(items)),
      );
      const sha256 = [...new Uint8Array(hash)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(makeDemoReview(items, sha256), null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "localrelay-SYNTHETIC-review-demo.json";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
    } catch {
      setError("Demo export failed. Try again while this page is open.");
    }
  }
  return (
    <>
      <h1>Filled review demo</h1>
      <div className="warning" role="status">
        <b>Sample data · no human reviews</b>
        <p>
          These two examples were generated for the demonstration. They are not
          reviews by real people and do not approve the Bangla template or
          complete field tests.
        </p>
      </div>
      <p>
        All six items have example answers so you can demonstrate the review
        workflow without recruiting participants. The examples stay separate
        from real reviewer answers and saved requests.
      </p>
      <label>
        Sample reviewer
        <select
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          {examples.map((example, index) => (
            <option key={example.label} value={index}>
              {example.label} · synthetic example
            </option>
          ))}
        </select>
      </label>
      {items.map((item, index) => {
        const response = examples[selected].responses[index];
        return (
          <section key={item.id}>
            <h2>
              Example {index + 1} of 6: {item.title}
            </h2>
            <span className="badge">
              Synthetic · {examples[selected].label}
            </span>
            <pre lang="bn">{item.text}</pre>
            <dl>
              <dt>Example interpretation</dt>
              <dd>{response.interpretation}</dd>
              <dt>Example meaning assessment</dt>
              <dd>
                {response.assessment === "meaning_clear"
                  ? "Meaning is clear"
                  : "Uncertain"}
              </dd>
              <dt>Example wording assessment</dt>
              <dd>
                {response.naturalness === "natural"
                  ? "Natural"
                  : "Awkward / could be clearer"}
              </dd>
              <dt>Example comments</dt>
              <dd>{response.comments}</dd>
              <dt>Example suggested change</dt>
              <dd>{response.suggestedWording}</dd>
            </dl>
          </section>
        );
      })}
      <button onClick={() => void download()}>
        Download synthetic demo JSON
      </button>
      <p>
        Actual reviewers should use the blank form without first studying these
        sample answers.
      </p>
      <Link to="/evaluation?review=bangla">Open blank reviewer form</Link>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
