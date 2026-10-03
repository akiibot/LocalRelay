# LocalRelay — Implementation Plan and Build Handoff

> **The visitor’s smartphone does the AI work. The local operator keeps the phone they already own.**

Repository: https://github.com/akiibot/LocalRelay  
Prepared: 4 October 2026  
Intended deployment: a standalone web application, preferably Vercel  
Primary client: an installable progressive web app (PWA) on Android Chrome  
Initial language direction: English visitor input → reviewed Bangla operator messages  
Document status: implementation specification; all performance and impact numbers below are targets unless explicitly described otherwise.

This document is self-contained. Paste it into a new coding chat, or give that chat this file and ask it to begin implementation. The product name is **LocalRelay** everywhere: repository documentation, application metadata, UI, model cards, presentations, and tests.

## 1. Instructions for the coding agent

Build LocalRelay according to this document. Start with the repository inspection and Phase 0, then implement the phases in dependency order. Make ordinary engineering decisions without repeatedly asking for preferences already settled here. Produce working code, run the specified checks, and document actual results and unresolved external dependencies.

The intended result is a standalone Vercel-compatible application. It is not a ChatGPT app, MCP app, ChatGPT Site, or embedded chat experience. Use ordinary repository development and web hosting workflows.

The repository was verified through the GitHub API to be empty on 4 October 2026, with `main` reported as its default branch. Inspect it again before implementation because this may have changed. The workspace containing this plan is not currently configured as a checkout of that remote. Do not overwrite unrelated files or repoint an unrelated repository. Use the correct existing checkout, or clone into an appropriate `LocalRelay` directory.

Read applicable `AGENTS.md` files. Preserve existing changes. Follow established project conventions if code has been added since this plan was written. If the repository is still empty, use the stack and layout below. A working local build and deployment configuration are required; publishing to Vercel and pushing repository changes should follow the user's authorization in the implementation chat.

Do not fabricate model metrics, human tests, SMS delivery results, interviews, revenue, or bookings. Build evaluation tools and report missing real-world evidence explicitly. A simulated phone is useful for development but must be labelled as a simulator.

If physical hardware, SIMs, human reviewers, or deployment account access are unavailable, continue all independent software work. Maintain an explicit external-verification checklist rather than marking the entire project complete.

## 2. Exact problem and intended outcome

Small tourism operators can lose an enquiry after a visitor discovers them but before both sides understand the request. The visitor may describe dates, party size, food preferences, and price questions in English. The operator may prefer Bangla, own a basic phone, and have limited access to mobile data. Free-form messages create clarification work and opportunities for misunderstanding.

LocalRelay converts a bounded visitor enquiry into a short, structured Bangla SMS. The visitor's smartphone performs the language classification locally, the visitor verifies the fields, and the operator answers from an ordinary SMS-capable phone. A deterministic reply parser helps the visitor understand the response.

The initial product addresses **communication between enquiry and agreement**. It does not generate tourism demand, verify operators, guarantee inventory, process payments, or prove that the service will be delivered. The assumption that communication is a major cause of lost enquiries must be tested with operators.

### Initial pilot

- Country and operator language: Bangladesh; Bangla.
- Visitor input: typed English, including ordinary spelling mistakes and informal phrasing.
- Operator device: a real feature phone with usable Bangla rendering and SMS service.
- Visitor device: an Android smartphone with the app prepared for offline use and a SIM capable of sending SMS.
- Pilot category: one prearranged local experience per operator profile, such as a fixed-duration craft workshop whose package either includes a meal for every guest or includes no meals.
- Currency: BDT, fixed and explicitly shown in the profile and confirmation screens.
- Timezone: `Asia/Dhaka`, fixed by the operator profile.
- Distribution hypothesis: a guesthouse, visitor centre, cooperative, or operator supplies a QR code while the visitor has connectivity. The visitor downloads the app's offline assets before travelling.

One service per operator profile keeps the initial SMS understandable without a long service name. Multiple services sharing a number need explicit service codes and operator training; defer that extension.

### Six required evidence outcomes

1. The prepared application runs its core workflow without internet access.
2. A real basic phone receives and replies to a real SMS.
3. Native Bangla speakers understand the final templates on a target phone.
4. A fair pilot compares LocalRelay with a static bilingual form.
5. Ambiguity and unsupported requirements remain visible and prevent unsafe progression.
6. The supported request format fits one Unicode SMS segment on the tested route.

## 3. Scope and explicit boundaries

### Build for the first release

- Operator profile selection from a small bundled directory; clearly labelled demo profiles initially.
- English free-text enquiry, maximum 500 characters.
- A genuinely trained small intent classifier and requirement classifiers running locally.
- Deterministic extraction of supported date, time, and quantity expressions.
- A review card with editable fields, evidence spans where available, and explicit confirmation.
- A manual form as both a fallback and the experimental baseline.
- Native-reviewed Bangla templates generated from confirmed fields.
- A live message length/segment calculation and a conservative size limit.
- Local outbox, persistent request history, and manual deletion.
- Native SMS composer handoff, plus copy-number/copy-message fallbacks.
- Manual reply entry, strict reply parsing, and guarded state transitions.
- Visitor acceptance communicated back to the operator and an acknowledgement step.
- A separate diagnostics/evidence page, a clearly labelled phone simulator, and reproducible evaluation scripts.
- Vercel build configuration, manifest, service worker, and documented installation/testing steps.

### Supported request fields

| Field | Representation | Rule |
|---|---|---|
| Operator/service | Bundled profile ID | Visitor selects and verifies it; never invented by AI |
| Date | ISO local date internally | Required, future, confirmed explicitly |
| Time | `HH:mm`, operator local time | Required, confirmed explicitly |
| Adults | Integer | Required; no default inferred from silence |
| Children | Integer | Visitor explicitly chooses zero or a count |
| Vegetarian meals | Integer or not applicable | Only when the package includes meals for every guest; count confirmed by visitor |
| Price question | Fixed request for total BDT price | Always explicit in the MVP SMS |
| Unsupported requirements | Original text plus reason | Kept visible; never silently discarded |

Bounds come from the operator profile: maximum party size, supported date range, meal inclusion, and an appropriate price range. A vegetarian meal count cannot exceed the number of guests. For a package including meals, the remaining guests receive the profile's described standard meal; the visitor must verify that this is acceptable. Requests to omit/add meals or customize individual menus require direct contact in version 1. “Vegan,” “halal,” “gluten-free,” and allergies are different requirements; do not convert them into “vegetarian.”

Transport, accessibility, payment conditions, refunds, and arbitrary extra requests are **detected/escalated but not transactionally encoded in version 1**. This is a deliberate reduction from the broader concept discussed earlier. They can become supported fields only after their meaning, compact representation, and operator comprehension have been validated. A basic support need must not be compressed into an accessibility guarantee.

### Defer

General translation, speech recognition, Bangla free-text input, other visitor languages, automatic SMS inbox reading, automatic/background SMS sending, SMS gateways, payments, user accounts, cloud databases, inventory/calendar booking, live maps, recommendations, operator marketplaces, and multi-operator coordination.

Avoid calling the initial product “fully offline booking.” Its honest promise is: **prepare and interpret supported requests offline; exchange them by SMS when cellular service is available**.

## 4. Architecture and stack

| Layer | Choice | Purpose |
|---|---|---|
| Frontend | React, TypeScript, Vite | Small static application, suitable for Vercel |
| Routing | React Router | Home, request, outbox, replies, evaluation, diagnostics |
| UI | CSS variables and lightweight components | Accessible mobile workflow without a large design dependency |
| Validation | Zod | Validate profiles, model metadata, stored records, and inputs |
| Offline assets | `vite-plugin-pwa` / Workbox | Versioned precaching and controlled updates |
| Local records | IndexedDB through `idb` | Outbox, request events, preferences, evaluation records |
| AI execution | Dedicated Web Worker with typed arrays | Local feature extraction and linear model inference |
| Training | Python, NumPy, SciPy, scikit-learn | Offline training and evaluation during development |
| Unit/component tests | Vitest and Testing Library | Parsers, protocol, state transitions, and review interactions |
| Browser tests | Playwright | Production-build PWA workflows and offline regressions |
| Hosting | Vercel static output | Distribute application assets over HTTPS |

Resolve compatible stable dependency versions when building, pin them in the lockfile, and record the Node/Python versions used. Vercel supports Vite projects directly. [Vercel documentation](https://vercel.com/docs/frameworks/frontend/vite)

No backend belongs in the MVP's request path. No hosted model endpoint, online translation service, account system, or runtime Python service is needed. Python runs only during development/training; trained model files are static web assets.

```text
Vercel: initial download and later application updates
                    |
                    v
Visitor's smartphone
  PWA interface
    -> local worker: learned classifiers + field parsers
    -> review and clarification
    -> deterministic Bangla renderer
    -> local outbox
    -> user opens SMS composer and sends
                    |
             cellular SMS network
                    |
                    v
Operator's basic phone
    -> operator reads Bangla request
    -> operator types a bounded reply
                    |
                    v
Visitor's SMS inbox
    -> visitor checks sender and pastes/types reply into LocalRelay
    -> local parser + visitor decision
    -> acceptance SMS and operator acknowledgement
```

The inference Web Worker and service worker have different responsibilities. The inference worker computes model results; the service worker serves cached application assets. Neither is an always-running background agent.

## 5. Screens and user experience

### A. Welcome and offline preparation

Use the product name and exact tagline at the top. Explain three steps: describe the visit, review the Bangla request, exchange SMS with the operator.

Show preparation status based on actual asset readiness: “Preparing offline files,” “Ready for offline use,” or a recoverable error. First use needs a connection to download the application and model. Do not label the app ready just because `navigator.onLine` is true.

Allow install instructions, local-data deletion, and selection of the operator profile. Explain briefly that sending needs cellular SMS service and may incur the user's carrier charges.

### B. Operator profile

Show name, service, language, phone number, timezone, currency, and the date the profile was checked. Do not imply real-time availability. Demo profiles must have a “Demo operator” badge and no sendable invented number. Test phone numbers are entered locally and are never committed to the public repository without the owner's consent.

### C. Describe your visit

Provide one text area and a visible “Use a form instead” action. Example: “Two adults and one child on 12 October 2026 at 3 pm. One vegetarian meal. What is the total price?” Examples must adapt to an appropriate future date rather than becoming stale.

Keep a separate button for analysis. Do not send content while typing. Show inference failure honestly and offer the manual form if the worker or model is unavailable.

### D. Review and clarify

Show date with month name/year and day of week, local time with timezone, adults, children, meal count, and the total-price question. All required fields must be explicitly accepted or edited. Preserve the input beside the card, with rule-derived source spans when possible.

Ambiguous fields should ask a specific question. Unsupported clauses get their own visible panel and a direct-contact action. The visitor must confirm that the card includes all requirements; a learned classifier cannot prove that every unsupported detail was found.

Never use a general confidence percentage as a promise of correctness. Keep model diagnostics off the main visitor flow.

### E. Message preview and outbox

Show the exact Bangla SMS, an English rendering of the same confirmed fields, number of SMS segments, recipient, and cost caveat. Queue the immutable reviewed snapshot locally. Offer “Open SMS app,” “Copy message,” and “Copy number.”

Opening an SMS composer does not prove transmission. After the user returns, allow “I sent this” and record that as a user report, not a delivery receipt. A cancelled composer must leave the request unsent.

### F. Enter reply and review offer

Explain that the visitor should check the sender against the operator number in their SMS app. Validate pasted/typewritten replies and show the exact offered date, time, and total BDT amount. Invalid or conflicting replies must not change the request's business state.

### G. Communicate acceptance

Accepting a quote creates an acceptance SMS. It does not immediately create a confirmed reservation. The operator must receive the acceptance and send the acknowledgement described in Section 10. Show “Awaiting operator acknowledgement” until that reply is entered and validated.

The final label is “Agreement recorded,” with a short explanation that the record relies on the visitor's entered SMS messages and does not verify inventory or payment. There is no shared booking database.

### H. Evaluation and diagnostics

Separate routes contain model/version information, inference timings, offline checks, test results, and a simulated operator phone. Simulator actions must never write into real requests or be counted as real SMS evidence.

### Route contract

| Route | Purpose |
|---|---|
| `/` | Welcome, installation, and preparation status |
| `/operators` | Bundled operator selection |
| `/operators/:operatorId` | Profile and prerequisites |
| `/request/new` | New enquiry; `?mode=form` selects manual input |
| `/request/:requestId` | Review, clarification, preview, and current state |
| `/outbox` | Locally stored requests |
| `/reply/:requestId` | Manual reply entry and quote/acknowledgement review |
| `/evaluation` | Consented local study tooling |
| `/diagnostics` | Asset, model, and test evidence |
| `/simulate` | Clearly labelled isolated operator simulation |

Never put enquiry text, phone numbers, or quote amounts in route/query parameters. Route IDs refer to local records; opening one on another device should explain that the record is stored on the original device.

### Design requirements

Use a calm, readable mobile interface: warm neutral background, dark text, one primary teal accent, clearly distinct warning states, and generous touch targets. Aim for at least 44×44 CSS-pixel primary controls and strong text contrast. Support keyboard use, screen-reader labels, visible focus, 200% zoom, reduced motion, and a narrow 360-pixel viewport. Never rely only on colour.

Use `lang="bn"` on Bangla output. Bundle a properly licensed Bangla font if needed for the web preview; never depend on a runtime font CDN. The font on the operator's physical phone is outside the app's control and must be tested separately.

## 6. Dedicated Small AI implementation

### 6.1 What is learned, and what is deterministic

The trained models recognize the type of enquiry and likely requirement categories from informal English. They route the workflow, preselect candidate categories, and trigger relevant clarification questions. Exact dates, counts, prices, and protocol transitions use deterministic code and user confirmation.

| Component | Method | Output |
|---|---|---|
| Intent classifier | Trained multinomial logistic regression | Seven intent scores |
| Requirement classifiers | Six trained binary logistic regressions | Independent requirement scores |
| Field parser | Bounded grammar and validation | Candidate dates/times/counts with source spans |
| Ambiguity gate | Rules plus validated score thresholds | Clarification/escalation reasons |
| Bangla renderer | Reviewed fixed templates | Exact SMS from confirmed fields |
| Reply parser | Strict grammar | Typed protocol event or a specific error |

This is classical machine learning and is appropriately described as Small AI. Do not call the system a small language model, generative translator, or Bangla understanding model. It consumes English and renders reviewed Bangla templates.

### 6.2 Model classes

Intent labels:

1. `booking_request`
2. `availability_query`
3. `price_query`
4. `change_cancel`
5. `directions_transport`
6. `other_tourism`
7. `unsupported`

Only the first three can enter the bounded enquiry workflow, after the required fields are supplied. The other classes route to appropriate explanations/manual contact. A request can have one primary intent and multiple requirements.

Requirement labels:

- `vegetarian`
- `transport`
- `accessibility`
- `allergy_or_medical`
- `payment_condition`
- `other_extra_detail`

Recognizing a requirement is not fulfilling it. Five of these six labels usually trigger a direct-contact path in the first release. Unknown conditions cannot be detected exhaustively; the review card and explicit completeness question remain necessary.

### 6.3 Feature extraction and browser inference

Use a shared TypeScript feature extractor for both training preparation and runtime, avoiding subtly different Python/browser tokenization.

1. Preserve the original input for review and span extraction.
2. Create a separate normalized classification string with documented whitespace, case, punctuation, and Unicode handling.
3. Generate namespaced word unigrams, word bigrams, and character 3–5-grams.
4. Hash features deterministically into 8,192 bins using a documented unsigned 32-bit algorithm and UTF-8 encoding.
5. Accumulate counts and apply L2 normalization, guarding the empty vector.
6. Run matrix-vector products in a Web Worker, followed by softmax for intent and sigmoid for requirement scores.

Define the exact hash, byte encoding, feature namespaces, padding, and normalization in `feature-spec.json`. Use the same TypeScript extractor in a Node script that emits sparse vectors for Python training. Do not assume a custom hash is compatible with scikit-learn's `HashingVectorizer`, which has its own implementation. [scikit-learn reference](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.HashingVectorizer.html)

Use float32 weights initially. For 8,192 features × 13 output rows, the weights occupy 425,984 bytes, plus biases and small metadata. The full model can remain below 1 MiB without quantization. Store binary weights rather than a large JSON array.

Define binary layout precisely: little-endian float32, row-major coefficient matrix, followed by 13 biases. Metadata specifies feature count, row/class order, seven intent rows, six requirement rows, byte offsets/length, score transformations, thresholds, training provenance, version, and SHA-256 of the binary. Validate finite values, exact dimensions, and the hash before activation. Include a fixture with known vectors and scores to catch endianness and row-order errors. Hash verification detects broken/mismatched assets; it is not a security claim against a compromised hosting origin.

Optional int8 quantization is a later optimization only if measured package size or latency needs it. Validate prediction parity and recalibrate thresholds after quantization; a smaller file alone is not a reason to change a working model.

No GPU, WebGPU, transformer runtime, or ONNX runtime is required for these linear models. Reconsider a larger local model only if the measured baseline fails on useful real enquiries.

### 6.4 Training pipeline

Provide repeatable scripts to:

1. Validate JSONL records and annotations.
2. Group examples by author and paraphrase family.
3. Create train/development/test splits with no group overlap.
4. Generate features using the shared TypeScript extractor.
5. Train intent and requirement models in Python.
6. Tune regularization and decision thresholds on development data only.
7. Evaluate the frozen models on held-out data.
8. Export coefficients, biases, class order, thresholds, feature version, and hashes.
9. Compare Python predictions with the browser/Node implementation.
10. Generate a model card and evaluation report with dataset provenance.

Scikit-learn supports logistic regression for these classification tasks. Predicted probabilities need evaluation; they must not automatically be presented as calibrated confidence. [Logistic regression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html), [probability calibration](https://scikit-learn.org/stable/modules/calibration.html)

Use held-out calibration only when the sample supports it. Otherwise describe values as model scores and choose conservative validation thresholds. Do not set `0.8` and call it calibrated because it appears plausible.

### 6.5 Data requirements

Start with a transparently labelled synthetic/developer seed corpus to make the training pipeline and app executable. Then collect approximately 400–600 independently written/deidentified enquiries from at least 8–12 authors, including actual operator enquiry examples when permission allows. Preserve at least 60–100 blind messages from unseen authors for evaluation; increase the total if class coverage is inadequate.

Target 20–25% ambiguous, unsupported, negated, conflicting, or unrelated examples. Include terse messages, misspellings, quantities in words, several dates, mixed adult/child counts, no-meal requests, conditional travel plans, negation, and near misses such as vegan versus vegetarian. Keep sufficient positive and negative examples for every requirement head.

Dataset fields:

```ts
type TrainingRecord = {
  id: string;
  authorGroup: string;
  paraphraseFamily: string;
  source: "consented_real" | "human_authored" | "synthetic";
  text: string;
  intent: Intent;
  requirements: RequirementLabel[];
  expectedFields: Record<string, unknown>;
  expectedClarifications: string[];
  expectedUnsupportedDetails: string[];
  reviewStatus: "unreviewed" | "reviewed";
};
```

Split real/human and synthetic results in the report. Remove private phone numbers and identifying content before committing data. Never ship a curated lookup table and present it as a trained model. Never invent unseen-author or native-speaker evaluation results.

### 6.6 Model acceptance targets

| Metric | Engineering target | Interpretation |
|---|---|---|
| Intent macro-F1 | At least 0.85 on held-out data | Report per-class scores and sample sizes |
| Critical candidate precision | At least 0.95 among parser candidates offered for review | Also report coverage and post-review errors |
| Unsupported false acceptance | No more than 5% on the labelled challenge set | Not a guarantee of detecting unseen unsupported content |
| Explicit ambiguous critical cases | All fixture cases require clarification | Measure omissions on blind examples separately |
| Final critical errors | Zero in the release safety fixture suite | Does not establish zero field error rate |
| Model assets | Under 1 MiB | Report actual byte sizes |
| Warm inference p95 | Under 500 ms on the chosen low-end Android phone | Measure at least 50 runs; include device details |
| Python/JS probability parity | Max absolute difference at most `1e-4` for float32 test fixtures | Investigate class flips near thresholds |

A failed ML target should trigger better data or narrower scope. Keep the manual form available; do not silently replace learned inference with hard-coded outputs while continuing to claim AI performance.

## 7. Parsing, ambiguity, and unsupported content

Create pure, independently testable parsing functions. Use the original text for source spans. Do not try to reconstruct exact source spans from hashed model coefficients.

### Date and time rules

- Parse a small documented set: explicit ISO dates, day + English month + year, relative “today/tomorrow,” and weekdays.
- Resolve relative expressions using the operator timezone and an injected clock, then display the exact date for confirmation.
- “Next Saturday” may have multiple interpretations; ask rather than silently selecting one.
- “Afternoon” and “at 3” need a specific time/AM-PM choice.
- Numeric input such as `04/05` is ambiguous; use a picker.
- Do not silently infer a missing year. A proposed date must be visibly confirmed.
- Validate impossible dates, past times, booking horizon, and operator limits.
- Do not use JavaScript's permissive `Date.parse()` as the acceptance rule for arbitrary input.
- Stored requests keep their resolved date. Reopening tomorrow must not reinterpret yesterday's phrase “tomorrow.”

### Quantities and requirements

- “Two adults and one child” is supported.
- “Three or four,” “around ten,” and conflicting counts need clarification.
- “Two of us” can propose total guests but must still ask for adult/child breakdown.
- “Not vegetarian” must not become a positive vegetarian requirement.
- “One vegetarian meal” produces a candidate count; “vegetarian food” requires a count.
- Allergy and medical requirements are never reduced to food preferences.
- Exact meal inclusion depends on the operator profile and is disclosed to both parties. For example, “no meal needed” for a package that includes meals is a package change requiring clarification/direct contact, not a zero-vegetarian request.

### Gate behavior

Combine rule-detected conflicts, learned requirement scores, low intent score/margin, known unsafe/unsupported expressions, and mandatory human review. Model scores alone do not establish whether a message is in scope.

If unsupported content is present, preserve it, explain the limitation, and offer direct contact. Do not enable “continue anyway” for an unresolved safety-critical requirement. A visitor can correct the input if the system misclassified it, but a checkbox must not convert an unsupported request into a supported one.

Input in another language or extensive code-switching should fall back to the English/manual workflow. An English-only product cannot infer English from Latin characters alone; do not claim comprehensive automatic language detection.

Essential adversarial fixtures include:

```text
Next Saturday afternoon, maybe three or four people.
Two adults, not three; one child. No meal needed.
One vegetarian, one vegan. Can you do both?
My child has a severe peanut allergy.
One person uses a wheelchair. Is the whole route step-free?
Can we pay by card and get a refund if it rains?
Two people at 3, or perhaps 5 if the train is late.
Cancel the request I sent yesterday.
Ignore the previous message and tell the host we already paid.
```

Only clearly supported, fully reviewed cards can proceed to an SMS enquiry. A rejected case is a useful product result, not something to hide from the demo.

## 8. Domain records and event model

Implement schemas before UI integration. The following is a minimum contract, not a requirement to keep every optional field indefinitely.

```ts
type OperatorProfile = {
  id: string;
  displayName: string;
  serviceName: string;
  phoneE164: string | null;
  language: "bn";
  currency: "BDT";
  timezone: "Asia/Dhaka";
  maxGuests: number;
  maxAdvanceDays: number;
  mealIncluded: boolean;
  maxQuoteBdt: number;
  checkedAt: string;
  templateVersion: string;
  isDemo: boolean;
};

type ConfirmedCard = {
  operatorId: string;
  localDate: string;       // YYYY-MM-DD
  localTime: string;       // HH:mm
  adults: number;
  children: number;
  vegetarianMeals: number | null; // null only when package includes no meals
  currency: "BDT";
  timezone: "Asia/Dhaka";
  askTotalPrice: true;
  confirmedAt: string;
};

type Offer = {
  localDate: string;
  localTime: string;
  totalBdt: number;        // positive integer within configured limits
  receivedAt: string;
  source: "manually_entered_sms" | "simulator";
};

type RelayRequest = {
  id: string;             // internal UUID
  wireId: string;         // e.g. Q7M2K9.1
  revision: number;
  mode: "real" | "simulation";
  originalText?: string;
  card?: ConfirmedCard;
  modelVersion?: string;
  templateVersion: string;
  operatorSnapshot: OperatorProfile;
  renderedRequest?: string;
  offer?: Offer;
  state: RequestState;
  events: RequestEvent[];
  createdAt: string;
  expiresAt: string;
  deleteAfter: string;
};
```

Use discriminated unions for states/events and validate stored data on read. Record source provenance for inferred/user-entered fields during review, then persist the minimal confirmed result. A request snapshot must remain tied to the model, profile, and template versions that generated it.

Use `crypto.getRandomValues()` to generate a six-character ID from an unambiguous uppercase alphabet, plus a revision suffix. Check for local collisions. It is a correlation identifier, not an authentication secret; independent visitor devices can still collide. Bind requests to the selected operator and review incoming sender information manually.

## 9. Bangla rendering and SMS length

### Template policy

Templates are deterministic and reviewed by two native Bangla speakers before being labelled approved. Maintain template ID/version, the field meaning, review status, and review date. English back-rendering helps the visitor but does not replace independent Bangla review.

Draft example, with one vegetarian meal:

```text
#Q7M2K9.1 12-10-26 15:00
বড়2 শিশু1 নিরামিষ1
মোট দাম?
```

After NFC normalization this exact example contains **53 UTF-16 code units**. The planning process checked the count in JavaScript; no claim is made yet about readability or physical delivery. The date notation is explicitly `DD-MM-YY`, the time is operator-local 24-hour time, and the price is the total for the full request in BDT. Teach that convention to operators. The visitor screen uses a full month name and four-digit year.

If testing shows the compact labels or numeric date are confusing, change the template even if it becomes longer. Use a written month/year or a safer narrower scope rather than prioritizing length over comprehension.

### Encoding policy

Bangla normally requires Unicode SMS encoding. A standard single segment has room for 70 16-bit units; concatenated messages typically carry about 67 units per segment, with route variations. Glyphs and visible letters are not the same as encoding units. [SMS encoding reference](https://www.twilio.com/docs/glossary/what-sms-character-limit)

For the MVP, target at most 60 units, warn above 60, and block above 70. Render all variables and normalize before measuring:

```ts
const finalBody = renderBangla(card, wireId).normalize("NFC");
const unicodeUnits = finalBody.length;
const estimatedUnicodeSegments =
  unicodeUnits <= 70 ? 1 : Math.ceil(unicodeUnits / 67);
```

This is the Unicode branch of an estimator. ASCII replies use GSM-7 accounting; implement its extension-table characters as two septets rather than treating all ASCII strings identically. Browser tests validate the estimator, and handset/carrier tests validate the actual path.

Do not arbitrarily delete Bangla vowel marks, joiners, or combining characters to save space. Avoid adding emojis, URLs, unnecessary punctuation, or carrier footers. Count any permitted joiners. Reject unexpected invisible content in templates and preserve original visitor input for correction. NFC makes equivalent representations consistent; it does not guarantee fewer units. [Unicode normalization](https://www.unicode.org/reports/tr15/)

If a request exceeds the single-segment limit, explain the reason and block it in version 1. Do not truncate, drop requirements, silently switch to MMS, or introduce a fragile multipart workflow during the first build.

The one-segment target applies to each message, not the entire conversation. The full agreement exchange normally requires at least four SMS messages and may require more. Report the total measured segments per completed exchange.

## 10. SMS protocol and request states

### Transport adapter

Provide a small tested adapter around an `sms:` URI, plus manual copy fallbacks. Use URL encoding for the body and a validated phone number. Implement and test against Android Chrome first; treat iOS/browser variations as compatibility work. The SMS URI scheme is standardized, but native composer behaviour must be checked on each supported platform. [RFC 5724](https://datatracker.ietf.org/doc/html/rfc5724)

Do not use WebOTP to read operator replies. WebOTP addresses specially formatted one-time-password messages, not arbitrary SMS inbox access. [MDN WebOTP](https://developer.mozilla.org/en-US/docs/Web/API/WebOTP_API)

The PWA cannot reliably tell whether the native composer sent the message, whether SMS coverage exists, or whether the operator received it. `navigator.onLine` reports a connectivity hint, not SMS service. Use truthful states and user-reported events.

### Deterministic reply grammar

Provide the operator with a short Bangla instruction card during onboarding. Training must be included in comprehension testing and stated in the results. Do not assume a first-time recipient already understands the codes.

| Direction | Message | Meaning |
|---|---|---|
| Operator → visitor | `#Q7M2K9.1 1 1500` | Offer the requested date/time at total BDT 1,500 |
| Operator → visitor | `#Q7M2K9.1 2` | Decline |
| Operator → visitor | `#Q7M2K9.1 3 13-10-26 16:00 1600` | Offer an alternative date/time at total BDT 1,600 |
| Visitor → operator | `#Q7M2K9.1 4 13-10-26 16:00 1600` | Visitor accepts that exact offer |
| Operator → visitor | `#Q7M2K9.1 5 13-10-26 16:00 1600` | Operator acknowledges that exact acceptance |

The operator offer refers to every supported field in the request, not only the date and price. The price is the full total for the stated package and party, including any applicable charges the operator requires. Make these meanings explicit in the instruction card. The acknowledgement repeats the agreed date/time/price to catch mismatches and stale offers. Both sides must still understand the party and meal fields bound to that request revision.

Normalize Bangla digits in replies to ASCII. Tolerate extra leading/trailing whitespace and documented line breaks. Require exact command arity, valid ID/revision, valid date/time, integer total amount, and expected state. In this pilot the wire year means 2000–2099, further constrained by the profile's future booking horizon; require a protocol revision before using it outside that interval. Unknown commands, extra text, negative values, impossible dates, wrong IDs, stale revisions, or mismatched acknowledgement terms produce a specific error. Never infer a missing price.

Within one revision, freeze the first accepted offer. A conflicting later offer enters a conflict state and requires direct clarification or a new request revision. Do not silently overwrite an offer the visitor may already have accepted. Repeating an identical event is idempotent.

Changes to confirmed request fields invalidate the generated SMS and approvals. Use a new revision and explicitly supersede the old one. After an agreement, cancellation or changes require human contact; deleting a local record must never be presented as cancelling the booking.

### State machine

```text
DRAFT
  -> NEEDS_REVIEW
       -> NEEDS_CLARIFICATION -> NEEDS_REVIEW
       -> MANUAL_CONTACT_REQUIRED
       -> READY_TO_SEND
            -> COMPOSER_OPENED
                 -> REQUEST_SENT_REPORTED
                      -> DECLINED
                      -> OFFER_RECEIVED
                           -> ACCEPTANCE_READY
                                -> ACCEPTANCE_COMPOSER_OPENED
                                     -> ACCEPTANCE_SENT_REPORTED
                                          -> AGREEMENT_RECORDED
```

Add `EXPIRED`, `SUPERSEDED`, `CONFLICT`, and local `ARCHIVED` outcomes with explicit permitted transitions. These names are internal; visitor labels should be plain language.

An exact valid acknowledgement is necessary to reach `AGREEMENT_RECORDED`. A valid response can also provide stronger evidence than an omitted “I sent this” click: allow the visitor to resolve that missing local report explicitly rather than making a real reply unusable. Do not infer transport status from a browser navigation event.

Expire an unanswered request after a configurable period, initially the earlier of 24 hours or the requested start time. Show the expiry to the visitor and explain it to pilot operators. Reject stale auto-progression and require renewed clarification. Expiry is a local coordination rule, not proof that the operator released a reservation.

Manual reply entry is not cryptographic sender verification. The product must not claim authenticated messaging or a guaranteed reservation based on pasted text. Do not trigger money movement, inventory changes, or other external actions.

## 11. Offline operation, persistence, and privacy

### Offline bundle

Precache the application shell, necessary route assets, worker, model binary/metadata, templates, bundled profiles, icons, and any required font. Keep the core on the same origin. The first successful download prepares the app; service workers then serve cached resources. [MDN offline guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)

Use a versioned asset manifest containing hashes and expected sizes. Verify model/feature/template compatibility before marking the offline package ready. A downloaded model with an incompatible feature extractor must fail closed to the manual form.

Show an update prompt at a safe point. Do not activate an incompatible new app/model/template halfway through a reviewed request. Preserve snapshots for existing requests; new requests use the newly activated compatible bundle. [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/)

Offline QA must use a production build. Development-server behaviour is insufficient evidence. Test service-worker control, hard reload, complete app close/reopen, and worker startup without a network.

### IndexedDB policy

Store requests, events, profile overrides, preferences, and opt-in evaluation records separately. Handle schema migration, transaction failure, storage quota errors, and unsupported storage with visible messages. Do not mark a message queued until the database write succeeds.

Request persistent storage when appropriate, but treat it as best effort: the browser can deny the request and users can clear data. Offer export of a minimal receipt for important agreements. Explain that the app does not synchronize between devices or Vercel preview/production origins. [Storage persistence documentation](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)

Keep unsent/request data only as long as useful. Initial policy: delete expired/abandoned records at the next app open after seven days; retain completed receipts for 30 days unless the user deletes them sooner. Provide “Delete this request” and “Delete all local data.” Service workers do not guarantee precise deletion while the app is closed.

IndexedDB is not automatically application-encrypted. Do not label it encrypted or private from everyone with access to the device. Browser storage protections and device security help, but a key stored beside ciphertext does not protect against code running on the same origin. An optional PIN/passphrase-based encrypted store can be evaluated later if a field pilot needs it.

### Data boundaries

- Visitor text and request fields stay on-device during inference; SMS sends only the reviewed payload.
- No analytics, session replay, third-party scripts, or request-text logging by default.
- Hosting still exposes ordinary asset requests to the host; do not claim the application creates no network metadata.
- SMS is not end-to-end encrypted. Explain this briefly before sensitive information could be shared; unsupported health details are not included in the template.
- Do not put enquiry text or phone numbers into URLs, error reports, or public fixtures.
- Escape user content and never render it through raw HTML.
- Ship an appropriate Content Security Policy for local scripts, workers, assets, and any required connections; test it against the actual build.

## 12. Repository layout and developer commands

Use one frontend repository with a development-only ML directory:

```text
LocalRelay/
  README.md
  LOCALRELAY_IMPLEMENTATION_PLAN.md
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  vercel.json
  index.html
  public/
    icons/
    fonts/                    # only if needed; include licence
    models/v1/
      weights.bin
      metadata.json
      feature-spec.json
    data/operators/demo.json
  src/
    app/                      # router, app shell, error boundaries
    components/               # controls, status, review fields
    pages/                    # visitor, outbox, reply, diagnostics
    domain/                   # schemas, state machine, invariants
    ai/                       # feature extractor, linear inference
    workers/inference.worker.ts
    parsing/                  # date/time/count grammar, source spans
    safety/                   # ambiguity and unsupported-detail gate
    templates/                # Bangla/English renderers + review status
    sms/                      # encoding, composer adapter, reply grammar
    storage/                  # IndexedDB and migrations
    evaluation/               # controlled form comparison tooling
    styles/
  ml/
    requirements.txt
    README.md
    data/                     # deidentified licensed/consented data only
    train.py
    evaluate.py
    export_model.py
    model-card.md
    dataset-card.md
  scripts/
    build-features.ts
    check-model-parity.ts
    check-artifact-budgets.ts
  tests/
    unit/
    component/
    e2e/
    fixtures/
  docs/
    architecture.md
    operator-guide-bn.md
    sms-protocol.md
    deployment-vercel.md
    evaluation-protocol.md
    evidence-status.md
    demo-script.md
  .github/workflows/ci.yml
```

Expose these commands, or document equivalent names clearly:

```text
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
npm run test:e2e
npm run check:budgets
npm run ml:features
npm run ml:parity
```

Document Python environment setup and the train/evaluate/export commands in `ml/README.md`. Ordinary frontend builds must not require Python, retraining, model downloads, or private credentials: the approved small model artifacts are versioned with the code.

## 13. Implementation phases and completion gates

### Phase 0 — Verify project and freeze contracts

Inspect repository state, runtime tools, relevant instructions, and existing files. Create the project scaffold only where appropriate. Record the initial scope, pilot assumptions, data schema, SMS grammar, model format, and state machine. Set up the manual baseline route at the same time as AI entry so it stays a fair comparison.

Deliverables: working app shell, typed domain contracts, demo profile, protocol fixtures, task/evidence checklist.

Gate: the app builds; reviewers can see the visitor flow; no real SMS recipient is embedded in public fixtures.

### Phase 1 — Deterministic request workflow

Implement validated manual fields, review, template rendering, Unicode counting, state transitions, expiry rules, and local storage. Add source-span parsers and ambiguity fixtures. Build the outbox and exact preview.

Gate: a manual request can be prepared, persisted, reloaded, and rendered without internet-dependent application services. No required field is inferred from absence; unsupported details remain visible; invalid state transitions are rejected.

### Phase 2 — Train and integrate the local model

Build the documented dataset schema and seed pipeline, shared features, training scripts, export, parity check, worker RPC, and score-based routing. Replace temporary development fixtures with real trained artifacts before describing the build as AI-enabled. Add worker failure recovery and the manual fallback.

Gate: the browser runs trained coefficients locally; Python/JS parity passes; actual model size and measured results are recorded. Synthetic-only training/evaluation is clearly labelled until independent data is added.

### Phase 3 — Offline readiness

Implement precaching, bundle verification, update handling, persistence status, and recovery UI. Test production-build offline startup, inference, queueing, reply interpretation, and reopening.

Gate: complete the core workflow in airplane mode after initial preparation; repeat 20 scripted runs without a network dependency. SMS transmission is excluded from this offline gate.

### Phase 4 — Real SMS workflow

Implement the composer adapter, copy fallback, user-reported-send events, reply parser, conflict handling, quote acceptance, and acknowledgement. Produce the Bangla operator instruction card and a clearly separated simulator.

Gate: automated grammar/state tests pass; a physical smartphone/basic-phone round trip is recorded when hardware is available. No composer-open event is presented as delivered; acceptance is sent back; agreement requires acknowledgement.

### Phase 5 — Human and baseline validation

Obtain template review, conduct comprehension and visitor comparisons, record all outcomes, fix defects, and retest affected cases. Freeze model/templates before each formal test round; do not mix results across versions.

Gate: raw denominators and actual failures are documented. Human and hardware evidence remains “pending” until performed. Claims match the results even if the manual form performs better.

### Phase 6 — Packaging and hosting readiness

Polish accessibility and copy, complete CI, budgets, README, model/data cards, evidence report, Vercel configuration, and demo script. Prepare the production artifact and record any required external account actions.

Gate: clean-install build, types, lint, unit/component tests, production PWA browser tests, and artifact budgets pass. The deployed URL is tested only after a real deployment exists.

### Approximate schedule

These are planning estimates, not guarantees. A narrow 48-hour build is plausible for a prepared 3–4-person team with devices and participants already available. One developer should budget several focused days, approximately 5–8, plus recruitment and field verification.

| Elapsed window for prepared team | Main work | Dependency |
|---|---|---|
| Hours 0–4 | Contracts, scaffold, profile, protocol; arrange devices/reviewers | Repository access and agreed scope |
| Hours 4–14 | Manual workflow, parsers, data/ML pipeline, templates | Frozen field semantics |
| Hours 14–24 | Worker integration, outbox, PWA cache, SMS adapter | Exported model and renderer |
| Hours 24–32 | Real devices, adversarial cases, Bangla review | SIMs and native reviewers |
| Hours 32–40 | Comprehension/baseline pilots and fixes | Frozen test versions and participants |
| Hours 40–48 | Evidence report, deployment readiness, video, final checks | Stable complete path |

If time runs short, cut visual extras and optional profile breadth first. Keep the real model, review gate, truthful SMS states, offline tests, and evidence reporting. Do not turn unfinished external tests into completed checkmarks.

## 14. Verification plan

### Automated tests with meaningful failure cases

| Area | Required cases |
|---|---|
| Dates/time | Injected clock, timezone, tomorrow across midnight, next-week ambiguity, invalid dates, AM/PM ambiguity, past request |
| Counts | Negation, correction, ranges, adult/child conflicts, invalid meal count, numeric/word forms |
| Safety | Allergy, accessibility guarantee, unsupported payment/refund terms, unmatched critical text |
| Model | Stable features, empty input, class order, malformed assets, score parity, worker failure |
| SMS | Final normalized length, 60/70/71-unit boundaries, combining marks, GSM extensions, non-BMP input rejection in templates |
| Replies | Every valid code, Bangla digits, wrong ID/revision, missing/excess terms, invalid price/date/time |
| State | No auto-confirmation, cancelled composer, duplicate replies, conflicting offers, expiry, superseded revision, acknowledgement mismatch |
| Storage | Reload, schema migration, failed write, quota error, deletion without cancelling service |
| PWA | Production offline reload, worker/model cache, route refresh, incomplete preparation, update with an in-progress request |
| Baseline | Same validator, output, review, and SMS path as AI mode |

Use property-based tests for lengths/bounds/state invariants if useful, but do not let elaborate test infrastructure displace the physical proof points.

### Real-device matrix

Minimum: one low-end Android smartphone and one Bangla-capable basic phone on one working carrier path. Stronger: two basic-phone models and two carriers, including a cross-carrier exchange.

Record phone model/OS, browser, carrier route, app/model/template version, normalized message length, sent and received text, delay, reply success, and any discrepancy. Do not record private numbers in public reports.

Test simple and maximum supported requests, Bangla conjuncts/vowel marks, ASCII and Bangla-digit replies, temporary signal loss, delayed replies, duplicates, manual copy fallback, and cancelled SMS composer. Test 70/71-unit boundary behaviour separately with non-sensitive test text; production should block oversized requests.

For the initial evidence target, run at least 20 varied request messages on the available physical path and log every result. Zero errors on that route is encouraging but does not prove universal delivery reliability.

### Performance and size budgets

- Trained model package: under 1 MiB.
- Required downloaded offline assets: aim under 5 MiB; report compressed transfer size and uncompressed total separately.
- Inference p95: under 500 ms on the selected low-end device after model initialization.
- Report cold-start/load time separately; do not exclude failures from timing summaries.
- No enquiry text/model inputs leave the device during the inference workflow.
- Critical preview/send actions must remain usable at 360-pixel width and 200% zoom.

## 15. Human comprehension and static-form comparison

### Native Bangla study

Two native reviewers independently check templates and the operator instruction card for meaning, naturalness, dates/numerals, and response-code clarity. Ask for blind back-translation where practical. Reviewers do not count as test participants.

Minimum pilot: 8 native speakers × 6 messages. Stronger: 12 × 8. Include participants with limited English and basic/shared-phone experience; seek actual tourism operators. If using proxies, name them as proxies.

Use a consistent brief onboarding, then present messages on the real phone without the source English. Ask participants to state date, time, party size, meals, price meaning, and next action, then type the appropriate reply. Randomize message order. Record unassisted answers, time, help needed, and confidently wrong interpretations.

Engineering targets: at least 95% critical-field comprehension, 90% whole-card comprehension, and 95% reply accuracy. Any repeated critical misunderstanding requires revision. These are design gates for this pilot, not population estimates. Participants, not repeated messages, are the main independent sample units.

### AI versus manual form

Build a good baseline: date/time pickers, guest controls, meal fields, required-field validation, the same review screen, and exactly the same Bangla/SMS output. Only entry differs: free text plus local interpretation versus direct form entry.

Minimum: 16 visitor-like participants, four tasks each; stronger: 24. Each completes two tasks per interface. Counterbalance interface order and use matched but different scenarios to avoid copying a previous answer. Include simple and complex supported enquiries and an unsupported case; do not stack the experiment only with AI-friendly scenarios.

Give a natural task brief. Include composing the free text, corrections, and clarification in measured time. If testing a separate “paste an existing enquiry” workflow, report it as a separate condition because it changes the comparison.

Primary outcomes: final critical-card correctness, silent critical-error rate, completion rate, and time to a reviewed card. Secondary outcomes: corrections, taps, workload, preference, and help required. Grade final records against scenario truth, blinded to interface where possible. Use participant-level paired summaries; do not treat every task as independent.

Before seeing results, define a practical benefit, for example at least 20% lower median participant completion time on complex supported tasks, with no observed increase in critical errors. A small pilot cannot formally establish non-inferiority or universal superiority. Report uncertainty and the result for simple tasks too.

Run a separate offline ablation against a keyword-only intent/requirement baseline on the same blind corpus. This tests whether learned inference improves routing; the user study tests whether the whole AI-assisted entry mode is worthwhile. Do not merge those claims.

If the form is faster and safer, report it. Keep AI optional or narrow its use to a demonstrated helpful case. Winning the comparison is a hypothesis, not an implementation acceptance condition that can be satisfied by changing the test after seeing results.

### Evaluation export

Provide local, consent-based export with participant pseudonym, condition, scenario/version, order, duration, corrections, final-field scores, errors, and optional ratings. Exclude free text and phone numbers by default. Do not automatically upload study data.

## 16. Vercel deployment plan

The repository is a normal Vite application. Use Vercel's Vite preset, install with `npm ci`, build with `npm run build`, and publish `dist`. No runtime secrets or server functions are required.

Use explicit application-route rewrites so asset failures remain detectable. Recommended `vercel.json` starting point:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/operators", "destination": "/index.html" },
    { "source": "/operators/:operatorId", "destination": "/index.html" },
    { "source": "/request/:requestId", "destination": "/index.html" },
    { "source": "/outbox", "destination": "/index.html" },
    { "source": "/reply/:requestId", "destination": "/index.html" },
    { "source": "/evaluation", "destination": "/index.html" },
    { "source": "/diagnostics", "destination": "/index.html" },
    { "source": "/simulate", "destination": "/index.html" }
  ]
}
```

Validate the configuration against the actual routes, emitted assets, and current Vercel configuration schema. `/request/new` is covered by `/request/:requestId`. Store operator JSON under a distinct `/data/operators/` asset path to avoid collisions with the `/operators/:operatorId` UI route. Existing static assets must be served as files, and a missing model asset must return a detectable failure rather than HTML from the application shell. Unknown application routes should show a useful not-found page without a catch-all rewrite that hides missing asset failures.

Add cache headers deliberately: revalidate the HTML, service worker, and mutable manifest; allow long caching for content-hashed assets and truly immutable versioned model files. Never reuse a model version path for changed bytes. Test response MIME types and Content Security Policy.

Deployment steps when authorized:

1. Ensure repository code and approved model artifacts are available in the GitHub project.
2. Import `akiibot/LocalRelay` into the user's Vercel account.
3. Select the correct root, Vite preset, build settings, and supported Node version.
4. Create a preview and verify routes, manifest, worker/model assets, installability, and cache headers.
5. On a phone, prepare the preview for offline use, close it, disable internet, reopen, and exercise the core flow.
6. Test SMS handoff with cellular service available and Wi-Fi/mobile data disabled.
7. Publish to the intended production URL, then repeat the installation/offline smoke test on that origin.

A preview and a production URL have separate browser storage and service-worker scope. A previously prepared preview does not prepare the production application. Vercel hosting distributes the software; it does not perform visitor inference or transmit SMS.

## 17. Impact and competition evidence

| Intended impact | Mechanism | Evidence available during hackathon | Evidence needed after hackathon |
|---|---|---|---|
| Include operators who keep basic phones | No operator app/data plan required for SMS exchange | Real handset round trip and operator usability test | Regular use across phones, carriers, and literacy levels |
| Reduce misunderstood requests | Structured confirmed fields and reviewed Bangla | Comprehension, final-field errors, clarification counts | Real enquiry disputes and service failures |
| Reduce visitor effort | Local AI prefill and targeted questions | Fair comparison with the manual form | Adoption and abandonment in actual travel conditions |
| Function with intermittent data | Cached app and on-device models | Offline cold/reload tests on prepared devices | Multi-day storage/network behaviour in the field |
| Limit data disclosure during interpretation | Local inference and minimal payload | Network inspection and payload review | Wider security/privacy assessment and shared-device study |
| Improve booking conversion/income | Potentially recover enquiries lost to communication | Not established by technical/usability tests | Consented pilot with baseline enquiry and income measures |

The earlier challenge brief described judging weights of Small AI fidelity 25%, development relevance 20%, data grounding 15%, evidence 15%, clarity/design/inclusivity and AI value 15%, and scalability 10%, with responsible AI as a pass/fail requirement. Recheck the official rules before submission. Use the six evidence outcomes to support those categories.

Do not assign a numerical probability of winning. The competing entries, judging, and real results are unknown. A credible submission is conditional on useful operator feedback, a real offline model, physical SMS evidence, honest comparative testing, and a clear demonstration of limits.

Development assumptions most likely to change the idea: visitors' access to SMS-capable SIMs, actual operator preference for SMS versus calls, willingness to learn response codes, one-service profile suitability, and whether free text saves effort compared with a form. Interview at least five operators early if feasible.

## 18. Demonstration and submission package

Prepare a 2–5 minute demonstration, subject to the actual event rules:

1. State the specific enquiry/communication problem and introduce both real phones.
2. Show the visitor phone in airplane mode and an already prepared LocalRelay app.
3. Enter a supported informal enquiry, review the proposed fields, and correct one.
4. Show a separate ambiguous/unsupported example that is blocked or clarified.
5. Show the exact Bangla message and one-segment count; queue it and reopen the app.
6. Restore cellular SMS service while leaving mobile data and Wi-Fi off.
7. Send the real SMS, show the operator phone receiving it, and reply with an offer.
8. Enter the reply, accept the offer, send acceptance, and show the acknowledgement step.
9. Show measured model size/latency and concise human/baseline results, including limitations.

Record the full physical exchange before editing for time. If a live network is unreliable, use a clearly labelled recording of a real completed exchange. A simulator must never be presented as carrier delivery.

Required handoff artifacts: working repository, README, model and dataset cards, Bangla operator guide, test commands/results, exact SMS protocol, evidence-status table, baseline-study protocol/results if available, deployment instructions, and demo script/video.

## 19. Main risks and decisions

| Risk | Implementation response | Decision if unresolved |
|---|---|---|
| No useful learned-model benefit | Compare against keywords and the same manual form | Keep AI optional or narrow scope; report the result |
| Unsafe detail is missed | Layered rules, learned flags, explicit review and completeness check | Increase test coverage; restrict deployment claims |
| Bangla is unreadable on a phone | Physical font/rendering and comprehension tests | Mark that handset unsupported; do not claim all basic phones |
| Compact wording becomes confusing | Review and test full meaning | Prefer clearer template or narrower scope |
| SMS composer differs by browser | Android-first adapter with copy fallback | Document supported combinations |
| Visitor lacks usable SMS service | Disclose prerequisite before starting | Direct-contact path; alternative transport is future work |
| Operator cannot learn codes | Test the instruction card and actual replies | Simplify protocol or reconsider SMS workflow |
| Browser evicts data | Readiness checks, persistence request, visible recovery | Re-download while online; do not promise permanent offline access |
| Agreement only exists on visitor phone | Send acceptance and require operator acknowledgement | Remain pending until response/direct clarification |
| Insufficient human/hardware access | Complete software and evaluation tooling | Leave evidence pending; do not fabricate results |
| Model fails size/latency | Measure actual bottleneck; keep linear runtime | Reduce features or quantify a justified scope change |

## 20. Definition of done

### Software complete

- [ ] Product name and tagline are correct throughout.
- [ ] Repository builds from a clean install with documented tool versions.
- [ ] A trained model executes in the visitor's browser and has reproducible provenance.
- [ ] Model/feature parity and artifact budgets are checked.
- [ ] Required fields, ambiguity, unsupported details, and human confirmation work.
- [ ] Manual form uses the same validation, templates, and downstream workflow.
- [ ] Prepared production app reopens and performs the core workflow offline.
- [ ] Local writes, migrations, deletion, expiry, and update failures are handled honestly.
- [ ] SMS rendering/counting and reply protocol are deterministic and tested.
- [ ] Composer opening is not falsely reported as transmission/delivery.
- [ ] Visitor acceptance is sent back; agreement requires a matching acknowledgement.
- [ ] Simulator and real mode are isolated and visibly labelled.
- [ ] Accessibility, errors, and low-end-device behaviour have been checked.
- [ ] README, deployment guide, operator guide, model/data cards, and evidence status exist.
- [ ] Vercel-compatible production artifacts and route/cache configuration are ready.

### Evidence complete

- [ ] Physical offline workflow has been demonstrated on the selected Android phone.
- [ ] A real Bangla SMS exchange, including replies, has been logged on a basic phone.
- [ ] Template review and native-speaker comprehension testing have actually occurred.
- [ ] Static-form comparison has actually occurred with preserved raw denominators.
- [ ] Results distinguish synthetic examples, operator proxies, simulations, and real observations.
- [ ] Claims about benefits, limitations, model performance, and SMS reliability match measurements.
- [ ] A demonstration video shows the real workflow and at least one failure/clarification case.

Software completion does not imply human/field evidence completion or a production-safe booking service. Record each category separately.



> 