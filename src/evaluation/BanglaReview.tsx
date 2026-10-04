import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import operatorGuide from "../../docs/operator-guide-bn.md?raw";
import {
  makeReviewExport,
  reviewItems,
  reviewResponseSchema,
  type ReviewResponse,
} from "./bangla-review-data";

const items = reviewItems(operatorGuide);
export default function BanglaReview() {
  const [reviewer, setReviewer] = useState(""),
    [device, setDevice] = useState(""),
    [consent, setConsent] = useState(false),
    [native, setNative] = useState(false),
    [independent, setIndependent] = useState(false),
    [started, setStarted] = useState(false),
    [responses, setResponses] = useState<ReviewResponse[]>([]),
    [interpretation, setInterpretation] = useState(""),
    [lockedAt, setLockedAt] = useState(""),
    [assessment, setAssessment] = useState(""),
    [naturalness, setNaturalness] = useState(""),
    [comments, setComments] = useState(""),
    [suggested, setSuggested] = useState(""),
    [error, setError] = useState(""),
    [exported, setExported] = useState(false);
  const item = items[responses.length];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (started) heading.current?.focus();
  }, [started, responses.length]);
  function record() {
    try {
      const response = reviewResponseSchema.parse({
        itemId: item.id,
        interpretation,
        interpretationLockedAt: lockedAt,
        assessment,
        naturalness,
        comments,
        suggestedWording: suggested,
      });
      setResponses([...responses, response]);
      setInterpretation("");
      setLockedAt("");
      setAssessment("");
      setNaturalness("");
      setComments("");
      setSuggested("");
      setError("");
    } catch {
      setError(
        "Complete the meaning, wording and comments fields before continuing.",
      );
    }
  }
  async function download() {
    try {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(items)),
      );
      const sha256 = [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const data = makeReviewExport(
        reviewer,
        device,
        items,
        responses,
        sha256,
        {
          consentToExport: consent,
          nativeBanglaSpeaker: native,
          reviewedIndependently: independent,
        },
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "localrelay-bangla-review.json";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExported(true);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Export failed. Keep this page open and try again.",
      );
    }
  }
  return (
    <>
      <h1>Independent Bangla review</h1>
      <p lang="bn">
        বাংলা বার্তা ও নির্দেশিকা নিজে পড়ে মতামত দিন। অন্য পর্যালোচকের উত্তর
        দেখবেন না।
      </p>
      <p>
        Two different native Bangla speakers must review independently. Use this
        page separately on each reviewer’s device. These are draft samples, not
        messages to send. Reviewers cannot count as comprehension-study
        participants.
      </p>
      <div className="warning">
        <b>Unreviewed: no approval recorded</b>
        <p>
          The proposed wording is for review only. This form does not approve
          templates or verify SMS delivery. Answers stay in this open page until
          you download the export; leaving or reloading this page loses them. Do
          not enter names, phone numbers or other personal details.
        </p>
      </div>
      {!started ? (
        <section>
          <h2>Before starting</h2>
          <p lang="bn">
            R1 বা R2-এর মতো ছদ্মনাম ব্যবহার করুন। নিচের ঘরগুলোতে নিশ্চিত করুন:
            বাংলা আপনার মাতৃভাষা, আপনি স্বাধীনভাবে পর্যালোচনা করবেন এবং
            প্রকল্পের জন্য আপনার মতামত ফাইলে সংরক্ষণ করতে সম্মত।
          </p>
          <label>
            Reviewer pseudonym
            <input
              value={reviewer}
              maxLength={32}
              onChange={(e) => setReviewer(e.target.value)}
              placeholder="R1 or R2"
            />
          </label>
          <label>
            Device and browser (optional)
            <input
              value={device}
              maxLength={120}
              onChange={(e) => setDevice(e.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={native}
              onChange={(e) => setNative(e.target.checked)}
            />
            I am a native Bangla speaker.
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={independent}
              onChange={(e) => setIndependent(e.target.checked)}
            />
            I will review independently without seeing another reviewer’s
            answers.
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I agree to export my pseudonym and written review for the LocalRelay
            project.
          </label>
          <button
            disabled={!reviewer.trim() || !native || !independent || !consent}
            onClick={() => setStarted(true)}
          >
            Start independent review
          </button>
        </section>
      ) : item ? (
        <section>
          <h2 ref={heading} tabIndex={-1}>
            Item {responses.length + 1} of {items.length}: {item.title}
          </h2>
          <pre lang="bn">{item.text}</pre>
          <p lang="bn">
            নিজের ভাষায় অর্থ লিখুন। তারিখ, সময়, অতিথি, খাবার, মোট দাম ও
            অনুরোধের পরিচয় কী বুঝেছেন তা বলুন। নির্দেশিকার ক্ষেত্রে উত্তর
            দেওয়ার নিয়ম ও কোডগুলোর অর্থ বলুন। অর্থ দেখার আগে আপনার প্রথম
            উত্তরটি স্থির করা হবে। মতামত বাংলায় লিখতে পারেন।
          </p>
          {item.units !== null && (
            <p>
              {item.units} UTF-16 units. Estimated SMS size only; phone
              rendering and carrier segmentation require separate testing.
            </p>
          )}
          <label>
            Explain the meaning in your own words (Bangla or English)
            <textarea
              value={interpretation}
              maxLength={3000}
              readOnly={!!lockedAt}
              onChange={(e) => setInterpretation(e.target.value)}
            />
          </label>
          {!lockedAt ? (
            <>
              <p>
                For messages, describe date, time, guests, meals, price question
                and request ID. For the guide, describe the reply codes and
                important rules. This first interpretation is locked before the
                intended meaning is shown.
              </p>
              <button
                disabled={!interpretation.trim()}
                onClick={() => setLockedAt(new Date().toISOString())}
              >
                Lock interpretation and reveal intended meaning
              </button>
            </>
          ) : (
            <>
              <h3>Intended meaning</h3>
              <p>{item.intendedMeaning}</p>
              <label>
                Does the Bangla convey the intended meaning?
                <select
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                >
                  <option value="">Choose an answer</option>
                  <option value="meaning_clear">
                    Meaning is clear / অর্থ পরিষ্কার
                  </option>
                  <option value="changes_needed">
                    Changes are needed / পরিবর্তন দরকার
                  </option>
                  <option value="uncertain">I am uncertain / নিশ্চিত নই</option>
                </select>
              </label>
              <label>
                Is the wording natural and professional?
                <select
                  value={naturalness}
                  onChange={(e) => setNaturalness(e.target.value)}
                >
                  <option value="">Choose an answer</option>
                  <option value="natural">Natural / স্বাভাবিক</option>
                  <option value="awkward">
                    Awkward / unprofessional / অস্বাভাবিক বা অপেশাদার
                  </option>
                  <option value="uncertain">I am uncertain / নিশ্চিত নই</option>
                </select>
              </label>
              <label>
                Comments: explain any ambiguity or say why it is clear
                <textarea
                  value={comments}
                  maxLength={3000}
                  onChange={(e) => setComments(e.target.value)}
                />
              </label>
              <label>
                Suggested Bangla wording (optional)
                <textarea
                  lang="bn"
                  value={suggested}
                  maxLength={3000}
                  onChange={(e) => setSuggested(e.target.value)}
                />
              </label>
              <button onClick={record}>Record item and continue</button>
            </>
          )}
        </section>
      ) : (
        <section>
          <h2 ref={heading} tabIndex={-1}>
            All six items recorded in this page
          </h2>
          <p>
            Download the review before closing. Give the JSON file to the
            project owner. Both reviewers’ files must be assessed before wording
            is approved; this export does not update approval or test
            checklists.
          </p>
          <button onClick={() => void download()}>
            Download reviewer JSON
          </button>
          {exported && (
            <p role="status">
              Download requested. Check your browser’s Downloads before closing
              this page.
            </p>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!started && <Link to="/evaluation">Back to evaluation</Link>}
    </>
  );
}
