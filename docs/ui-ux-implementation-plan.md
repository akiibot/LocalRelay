# LocalRelay UI/UX implementation plan

Research date: 4 October 2026. Code baseline: `164b762`, branch `codex/localrelay`.

Status: implemented locally after the user requested the complete UI/UX pass. See [implementation and QA](ui-ux-qa.md) for the final component mapping, checks, and limits. Scope is the existing visitor journey before the demo video; the hosted site has not been redeployed.

## 1. Recommended direction

Build a compact, mobile-first travel-request interface around one question: **What should I do next?** Keep the existing teal identity, use lighter neutral surfaces and stronger typography, and organize the experience around choosing a service, reviewing a request, and completing the SMS exchange.

The primary path is the manual form. Experimental AI is an optional way to prefill that same form. The product prepares requests and records user-entered SMS exchanges; it must never suggest that it has verified availability, sent or delivered an SMS, taken payment, or independently confirmed a booking.

Priorities, in order:

1. Bring the first useful action into the initial mobile viewport.
2. Put required visit details before optional notes and technical explanations.
3. Separate reviewing a request, saving it locally, opening SMS, and reporting that it was sent.
4. Give each saved request one prominent next action with a concise explanation.
5. Make returning to saved requests and understanding the reply sequence easy.
6. Preserve offline readiness, accessibility, protocol guards, and honest evidence labels.

## 2. Research and evidence

### Method and limits

Used six Mobbin searches covering experience booking, saved reservations, message review, offline content, progress tracking, and desktop review layouts. Examined the returned images: selected previews from two Airbnb flow collections and 12 standalone screens. Only the displayed flow previews were inspected, not every screen in the two collections. These references demonstrate design patterns; they do not prove that those patterns improve LocalRelay task completion.

Also inspected `App.tsx`, `main.css`, schema/state/validation/storage/offline modules, evaluation instrumentation, PWA configuration, and existing tests. Captured and visually inspected four current mobile screens at 390 × 844 and one desktop form at 1440 × 1000 using the running local production build. The browser context was isolated and its request was synthetic. No SMS was transmitted, and no existing user browser records were touched. The running production server was preserved.

Temporary baseline screenshots inspected during planning were captured under ignored `test-results/ui-research/`: `home-mobile.png`, `form-mobile.png`, `request-mobile.png`, `reply-mobile.png`, and `form-desktop.png`. They were inspection artifacts, not human evaluation evidence; browser test cleanup can remove them. Implementation screenshots are retained under ignored `ml/generated/ui-ux-review/`. No full regression suite was rerun during the planning-only stage; subsequent implementation checks are documented separately.

### Reference-to-decision map

| Mobbin reference | Observed pattern | LocalRelay adaptation | Boundary |
|---|---|---|---|
| [Airbnb — Reserving a service](https://mobbin.com/flows/8cbcaf23-5bb1-4f0c-8efa-05806e484b0d) | Service choices grouped under a clear title; prominent bottom action; a later review screen groups details above its action. | Compact experience cards, clear selection action, distinct review stage. | Do not copy prices, reviews, availability, payments, or confirmation claims. |
| [Airbnb — Booking an experience](https://mobbin.com/flows/5f4115be-c840-4c41-92a3-146ee1be61ab) | Guest categories are separated; review content is divided into labeled groups. | Separate adults, children, and meals with explicit values; review date/time/party as readable rows. | Do not copy default counts: LocalRelay requires an explicit zero. Keep native date/time fields, not a custom availability calendar. |
| [Freenow — Trips](https://mobbin.com/screens/4616bc96-2577-43ea-9bf9-60a05424c04f) | In-progress work sits above history; a visible new-booking action and labeled bottom navigation. | Saved requests emphasize current work, status, date, and next action; use a small set of stable navigation destinations. | Requests are stored on this device, with no account synchronization. |
| [Uber Eats — reservation details](https://mobbin.com/screens/61d2b40d-dbed-4707-8bc1-c296072674c2) | Status, date, guest count, and related actions are immediately scannable. | A compact request summary under a precise status, with secondary actions grouped separately. | “Confirmed” becomes the existing evidence-appropriate wording, including “Agreement recorded.” |
| [TheFork — manage booking](https://mobbin.com/screens/093934b6-b9f4-4297-9722-304a5deb1bd9) | Booking facts grouped in one compact card; contact/change actions distinct from the facts. | Reuse the summary card across request review and the saved record. | Deleting a local record must never be presented as canceling a service. |
| [Docusign — message review](https://mobbin.com/screens/30fb76e5-d375-4504-97ce-120fd202764f) | A dedicated review context separates message content, identity, recipients, and the final action. | Show recipient, English meaning, and exact Bangla body before saving/opening SMS. | LocalRelay's final action is “Open SMS app,” not a claim that the message has been sent. |
| [Partiful — compose](https://mobbin.com/screens/397b9b10-3601-440f-8950-fe498ad540e5) | Message and recipients have separate labeled regions. | Put the recipient next to the SMS panel and make a missing number actionable. | Do not adopt its visible “Sent!” state as evidence of carrier delivery. |
| [IKEA — order details](https://mobbin.com/screens/21cf4ffd-015b-46a1-b497-bef90964b3d2) | Vertical progression distinguishes completed, current, and future steps; current-step explanation is prominent. | A short SMS exchange timeline distinguishes local reports from operator replies entered by the user. | Derive progress from stored states/events; never invent delivery or response-time data. |
| [Walmart — order progress](https://mobbin.com/screens/fb408c2c-aef9-41c0-948f-e164b24dbd92) | Progress appears near the top; less common edits sit below. | Put current status/next action before receipt management. | Do not introduce a promised completion time or “delivered” indicator. |
| [SHEIN — processing detail](https://mobbin.com/screens/4d40c618-7c93-471b-a14a-39f07b69ada6) | Progress and order metadata are distinguishable, with secondary operations lower down. | Keep request identity accessible without making internal metadata the page headline. | The dense toolbar and commercial promotions are a poor fit for this small app. |
| [Apple TV — downloads](https://mobbin.com/screens/31df7925-8588-440b-8294-3f32775944fa) | Downloading and available items have distinct text states in a compact list. | Separate preparation in progress, verified readiness, and readiness failure. | A green network icon alone is insufficient; readiness continues to use actual asset verification. |
| [Disney+ — downloads](https://mobbin.com/screens/5b4ce31e-3a23-4307-a07f-3c4890dffad0) | Offline content is easy to find; file-size detail is secondary. | Show readiness plainly; put asset count, byte count, and model version in expandable details. | Preserve actionable failure messages. |
| [Navan — desktop booking summary](https://mobbin.com/screens/0bb18fbd-902d-46b1-be01-e2317616b43d) | A side summary makes key booking facts visible beside a longer form. | Use a desktop two-column layout for review, with the summary beside the SMS panel. | Do not copy its payment or inventory countdown. |
| [GetYourGuide — booking details](https://mobbin.com/screens/29650e01-8649-451e-9848-f5e51db96c1f) | Main booking information and contact/help have separate columns; FAQs are expandable. | Keep help and technical detail accessible without competing with the main task. | No invented map, address, provider verification, or support service. |

### Current problems, grounded in inspection

| Priority | Current observation | Proposed response |
|---|---|---|
| P0 | At 390 × 844, the homepage start link begins around document Y=1203 CSS px, below the initial viewport. | Short hero followed immediately by start and saved-request actions. |
| P0 | Manual entry starts with an AI-mode switch and a five-row optional note before date and guest fields. | Required fields first; optional notes remain visible below them; AI becomes secondary. |
| P0 | The manual form says analysis runs on button press, although this mode has no Analyze button and requirement checks update as notes change. | Mode-specific help that accurately describes local checks. |
| P0 | “Preview and queue locally” combines review and persistence, although a preview already appears above it. | “Review request,” then “Save request on this device.” |
| P0 | SMS actions compete visually; “I sent this” looks like another immediate primary action. | Separate the composer action from the explicit user report after sending. |
| P1 | A missing recipient disables the composer but the saved page offers no clear path to repair that immutable snapshot. | Explain copying to SMS or creating a new revision with the consented number. |
| P1 | Reply entry always shows the omitted-send-report recovery checkbox. | Show recovery only in states where `applyReply` allows it. |
| P1 | The outbox is an undifferentiated list with no explicit next action. | Scannable status cards with resumable actions and clear empty/loading/error states. |
| P1 | Technical vocabulary and dense notices consume prime screen space. | Plain-language headings; concise essential notices remain visible; technical details expand on demand. |
| P1 | Copy-success messages are currently rendered by the error/alert component. | Separate polite success feedback from errors. |

## 3. Information architecture and visual system

### Navigation

Use three task destinations: **Home**, **Experiences**, **Requests**. Keep existing paths `/`, `/operators`, and `/outbox`; rename visible labels without changing saved-record URLs. A compact mobile bottom navigation gives frequent destinations a stable location. At desktop width, use header navigation. Use visible text with small inline SVG icons; mark the current destination with `aria-current` and more than color alone.

Keep Diagnostics, Evaluation, the two Bangla review links, and Simulator in a clearly labeled Tools/help area reachable from Home and the footer. Avoid introducing a new route solely for this regrouping. Maintain the exact query routes for real review and synthetic demonstration.

In creation/reply screens, supply an explicit contextual Back link/button. The in-form “Edit details” control preserves values within the mounted creation route. Navigating away or reloading an unsaved form remains distinct from returning to a saved request; do not promise draft recovery that does not exist.

### Provisional visual tokens

| Item | Proposal |
|---|---|
| Primary action | Existing deep teal family, starting at `#126B61`; white text; verify contrast in rendered states. |
| Canvas/surfaces | Warm neutral `#F7F5EE` or a slightly lighter variant; white cards; subtle borders. |
| Main/secondary text | Dark green-charcoal; muted text still meets normal-text contrast requirements. |
| Status colors | Neutral for local saved/waiting, amber for attention, red for blocking errors, green for verified offline readiness or agreement recorded. Every status includes text. |
| Typography | System font stack; approximately 17px body, 1.5–1.6 line-height, 28–34px mobile page title, 20–22px section title. Keep Bangla readable with system fallback and generous line-height. |
| Spacing | 4/8/12/16/24/32px scale; mobile gutters 16px; fewer nested bordered cards. |
| Controls | At least 48px high with clear focus; labels above inputs; one filled primary button per decision group. |
| Shape | 12–16px card corners and 8–10px controls; restrained or no shadow. |
| Width | About 1040–1120px desktop shell; form reading width about 640–720px; optional 300–340px summary column. |

No new photo library, external font service, animation framework, map, or component-library dependency is needed. Experience cards can use small local service icons. There is no source evidence for operator photos, ratings, popularity, verified status, prices, or live slots.

Use normal document flow for form actions in the first implementation. A fixed bottom action stacked on fixed navigation creates keyboard/large-text risk; add a sticky action only if device checks demonstrate a clear benefit. Reserve space for mobile navigation and safe-area insets, and let navigation wrap or become static at large text sizes rather than obscure content.

## 4. Screen-by-screen specification

### Home — `/`

Top-to-bottom order:

1. Brand and concise headline: **“Plan a local visit. Agree by SMS.”**
2. Supporting line: “Prepare a Bangla request on your phone. Exchange SMS when cellular service is available.”
3. Primary **Choose an experience**; secondary **View saved requests**.
4. Compact truthful readiness indicator with **Check offline files** and optional technical details.
5. Three short explanatory steps: Details → Review → SMS exchange. Explain that agreement normally takes four SMS messages.
6. Before-you-travel guidance and Tools/help; storage persistence and destructive data controls live in a clearly labeled device-data section lower down.

Acceptance: at 390 × 844 with default text, the primary action is visible without scrolling. This target does not require compressing or clipping 200% text. Offline errors must still be visible and actionable. Activating an available app update remains an explicit Home action.

### Experiences and profile — `/operators`, `/operators/:operatorId`

Use **Choose an experience** as the list heading. Each card shows service, operator name, meal inclusion, guest limit, a visible **Demo profile** badge, and **View experience**. On desktop the two existing profiles can sit side by side. On mobile stack them.

The profile leads with the experience and supported terms. Follow with an explicit phone setup region: **Test recipient number**, example country-code format, and the existing owner-consent explanation. The primary action becomes **Create a request**. A missing number does not block local preparation; explain that opening a preaddressed SMS requires a number and copying remains possible.

Keep no-live-availability and unreviewed-template facts readable. Do not display a profile date as if it means independent verification. Show meals and constraints before the request button; technical profile details may be expanded.

### Create request — `/request/new?mode=form`

Use two internal stages within the existing route, with state owned by `NewRequest`:

**1. Visit details**

- Show the selected service and an explicit route back to its profile.
- Group Date and Time, then Guests, then Meals when applicable.
- Label time “Local time in Bangladesh (Asia/Dhaka).” Show a human-readable date/time summary.
- Keep counts initially blank and require users to enter zero explicitly. Numeric inputs use integer steps and appropriate mobile input mode. Preserve negative/fractional/limit rejection.
- Keep native date/time controls, with min/max hints derived from existing schedule rules; the shared validators remain authoritative.
- Put **Additional requirements (optional)** below required fields. Keep it directly visible, including retained AI/revision text; reducing prominence must not conceal unsupported requirements.
- Place AI in a secondary **Try English entry · Experimental** region. Its warning must be visible before use; original input, flags, and uncertainty semantics remain intact. Existing no-query and study-assigned AI entry behavior must remain compatible.
- **Review request** validates, shows errors near their fields, and focuses the first invalid field. This action does not write an IndexedDB request.
- Do not shout all missing-field errors on first load. Show them after touch/submit, while providing clear hints throughout.

**2. Review request**

- Show an English summary as labeled rows: experience, date, Bangladesh time, adults, children, meals, and request for full total in BDT.
- Show original additional requirements when present, even if already checked by the safety gate.
- Show exact Bangla draft below the summary, marked **Preview — request ID assigned when saved**. Preserve the existing temporary-ID rendering and length checks.
- Show estimated segment count prominently enough to inform sending; put UTF-16/GSM details in secondary text/details. State that segment count is an estimate.
- Keep meal acceptance and completeness confirmations unchecked until explicitly chosen. Editing details or notes invalidates the relevant confirmation; returning to review reruns all gates.
- Display the draft-template/consented-test notice near the save action. Retain native-review and broader physical-validation limitations without claiming that no phone exchange has ever happened.
- Primary **Save request on this device**; secondary **Edit details**. Explain: “This saves the reviewed request. You’ll open your SMS app next.”
- Use a pending state and click guard during persistence. Show success only after `db.save` or `saveRevision` succeeds; storage failure leaves values available for correction/retry.

Internal review/edit transitions retain inputs without introducing a second request record, new URL parameters containing private data, or a database migration. Unsaved draft autosave is a separate future feature. Study completion stays at the existing successful reviewed-card write, not at entry into the review stage.

### Saved request and SMS — `/request/:requestId`

Order the screen around **status → next action → details**:

1. Contextual Back to requests link, request ID, operator, and current state.
2. A short sentence explaining the next action, with its primary button.
3. Four-step exchange timeline: enquiry send reported → offer recorded → acceptance send reported → acknowledgement recorded. Include “Saved on this device” before the exchange. Uncompleted steps are not styled as successful.
4. Compact terms/recipient summary and the relevant exact message. The exact body is visible before opening the composer; use the acceptance body only in the appropriate states.
5. Secondary copy controls and resending options as appropriate.
6. Event history, export, revise, and delete in a labeled management section.

The message panel separates **English meaning** and **Exact Bangla SMS**. CSS may wrap the body; copying and composer content must use the unchanged renderer string. No inserted headings, emoji, punctuation, or whitespace may alter the SMS protocol.

Put **I sent this enquiry/acceptance** in a separate “After sending in your SMS app” section. Keep it available to people who manually copied a message without opening the composer. Never automatically report sending on app return, focus, elapsed time, or a composer-open event.

For a missing recipient: keep **Copy message** usable and explain how to choose the consented recipient manually in SMS. Offer a clearly explained **Add number in a new revision** path through the existing revision mechanism; implement number editing within that revision draft and validate before saving. Do not mutate the frozen recipient in the old record or silently reuse an unrelated preference. A new revision gets a new wire revision and the old one is superseded atomically. If this repair path cannot fit the first slice, retain copy-to-SMS as the explicit fallback and defer recipient revision editing as P1.

### State-to-action contract

This is a presentation mapping over the existing protocol, not a replacement state machine.

| Existing state | Prominent action / explanation | Important secondary behavior |
|---|---|---|
| `READY_TO_SEND` | **Open SMS app**; request is saved locally. | Copy and manual send report; number-missing fallback. |
| `COMPOSER_OPENED` | **I sent this enquiry** under “After sending”; composer opening alone does not establish sending. | Reopen/copy; recover from canceled composer. |
| `REQUEST_SENT_REPORTED` | **Record operator reply**; “You reported sending. Waiting for a reply.” | Resending controls remain available but secondary. |
| `OFFER_RECEIVED` | **Review offer** showing date/time/full total, then existing accept-and-prepare action. | Explicitly highlight any date/time difference from the request. |
| `ACCEPTANCE_READY` | **Open SMS app** for acceptance. | Copy and explicit acceptance send report. |
| `ACCEPTANCE_COMPOSER_OPENED` | **I sent this acceptance** under “After sending.” | Reopen/copy without inferring delivery. |
| `ACCEPTANCE_SENT_REPORTED` | **Record acknowledgement**; waiting for the matching operator message. | No final-agreement success state yet. |
| `AGREEMENT_RECORDED` | **View/export receipt**; explain it relies on entered messages. | Direct contact for changes; retain a lower-priority reply path so later conflicting messages can still be handled. |
| `DECLINED` | Operator declined; explain direct contact or a new/revised request. | Preserve existing revision eligibility and prohibit normal progression. |
| `CONFLICT` | **Contact operator** when a number exists; explain inconsistent replies. | No accept/send/progress shortcut; preserve guarded revision behavior. |
| `EXPIRED` | Explain local expiry and direct confirmation before renewing. | Expiry does not cancel or release a reservation. |
| `SUPERSEDED` | Explain that a newer revision replaced this record. | Link to the matching newer record if present; otherwise give a clear requests-list fallback. |
| `ARCHIVED` | Read-only local record explanation. | Export/delete as permitted; no send/accept action. |

For terminal and exceptional states, do not draw a misleading complete green timeline. The state mapping should be exhaustive at compile time using `RelayRequest['state']`. Derive secondary actions from the same protocol eligibility rules; maintain guards inside `action` and `applyReply` regardless of UI visibility.

### Record reply — `/reply/:requestId`

Use **Record operator reply** or **Record acknowledgement**, based on state. Keep an explicit Back to request link and compact request/recipient context.

1. Explain that the user must open their SMS app, check the sender, and paste or type the whole reply including the request ID.
2. Show an empty **Exact SMS reply** field with non-value help; never prefill a valid synthetic offer into the real reply form.
3. Keep the sender confirmation explicit and unchecked. Reset the reviewed preview on changes to text or sender verification; require verification again before committing if it is unchecked.
4. Show **Forgot to record that you sent it?** only for the enquiry/acceptance ready or composer-open states where recovery is actually supported. The explanation and explicit opt-in must not imply an unrelated reply can bypass the guard.
5. **Review reply** parses and validates. Show a structured offer/decline/acknowledgement summary before **Record reviewed reply**.
6. For an alternative offer, show requested versus offered date/time and the full total in BDT. For acknowledgement, show the matched frozen terms. Do not imply the parsed message is authenticated.
7. Use readable actionable errors for missing ID, wrong revision, invalid amount, or mismatched terms, while preserving authoritative parser/state errors and refusals.
8. Add a pending state against duplicate commits. Return to the saved request and focus its updated status after successful persistence.

### Requests — `/outbox`

Rename **Local outbox** to **Your requests**, followed by “Saved on this device.” Show an obvious **New request** action that uses the selected/default experience consistently with the current implementation.

Each card shows experience/operator, visit date/time, request ID in secondary text, accurate status, and a named next-action link. A summary action must navigate to the saved record before changing state; it must never report sending or accept an offer directly from a list card.

Group active requests above completed/closed records if the list has both. Within each group keep stable newest-first ordering. Avoid search/filter UI until the actual record volume justifies it. Include separate loading, empty, error, and populated states so a slow read does not briefly claim there are no records. Keep retention, export, and deletion semantics unchanged.

## 5. Engineering plan and reviewable slices

Do not replace `App.tsx` wholesale. Extract only the components needed by each slice, preserving the existing route/state/data contracts.

| Slice | Work and likely files | Completion check |
|---|---|---|
| 1 — Foundation and start | Add scoped tokens/styles in `src/styles/main.css`; extract `src/app/components/AppShell.tsx`, a small status notice, and shared button/card styles. Revise Home, Operators, Profile, and navigation wiring in `App.tsx`. | Home action visible; all existing routes reachable; 360px/200% text; no changes to saved data or SMS. |
| 2 — Request details/review | Extract `src/app/request/RequestForm.tsx` and `RequestReview.tsx`, retaining draft state/queue logic in its parent. Add structured UI validation using existing Zod issues and schedule validation; keep `validateCard` as the final gate. | Form → review → edit retains inputs; explicit zeros/confirmations; unsupported notes and AI uncertainty still block correctly; failed/double save handled. |
| 3 — SMS and replies | Add `src/app/request/presentation.ts`, `RequestProgress.tsx`, `SmsPanel.tsx`, `OfferSummary.tsx`; revise RequestPage and ReplyPage with focused components as needed. | Every protocol state has truthful copy/actions; exact body unchanged; full enquiry/offer/acceptance/acknowledgement path and exceptional states pass. |
| 4 — Requests and supporting tools | Revise Outbox/OfflineStatus and lower-priority tool links; extract shared read-only terms/status components. Make success feedback a polite status. | Existing records reopen; loading/error/empty states distinct; readiness failure revokes the ready label; review-demo separation preserved. |
| 5 — Integration and handoff | Update existing component/browser expectations for intentional labels and added review step; add focused behavior tests; capture mobile/desktop before/after. Record results in a new UI QA note. | Typecheck/lint/unit/build/budgets and one full final production regression pass; manual device checks recorded separately. |

Dependencies: 2 and 3 use shared components from 1; 4 uses the state/action presentation from 3; 5 validates the integrated result. Each slice can be reviewed separately on the existing draft PR. Do not merge or deploy merely because the implementation is complete; deployment remains a separate requested action.

### Implementation details to protect

- Keep IndexedDB database version 1 and `RelayRequest` snapshots compatible. No field rename or destructive migration is required for this plan.
- Keep `renderBangla`, `acceptance`, reply grammar, model coefficients/thresholds, expiry, and immutable snapshot rules unchanged. UI presentation functions must not become alternative validation authorities.
- Replace broad new styling with named component classes; a global `section` or `nav` change can inadvertently affect Evaluation, Diagnostics, and Simulator. Inspect those routes after shell changes.
- Keep existing offline query routing and CSP. Avoid route additions so `vite.config.ts`, `vercel.json`, and the production server allowlist need no route expansion.
- Offline status should have one shared owner if shown in multiple places. Reuse `checkOffline`; do not independently hash assets on every card render. Distinguish checking, ready, and failed states; a failed recheck revokes readiness.
- Preserve explicit service-worker update activation on Home and the warning about unsaved drafts.
- Add route/step focus handling deliberately: heading focus on forward navigation, first-invalid focus on submit, review heading on stage change, and no unexpected focus resets while typing. Preserve Skip to content.
- Keep active study assignment, corrections/taps instrumentation, and completion/export behavior. UI changes alter time/tap interpretation: record the UI build/commit with future study runs and do not combine unlike UI versions without documenting them. Do not rewrite earlier exports or claim new participant evidence.
- UI labels and test locators should change together. Avoid attaching old invisible labels solely to satisfy old tests; assert meaningful accessible names and behavior.

## 6. Accessibility, responsive behavior, and acceptance tests

### Responsive/accessibility requirements

- Inspect widths 360, 390/412, 768, and 1440px, including 200% text with the existing system-ui/Verdana/monospace checks. Also check narrow 320px reflow for the new navigation/actions.
- Avoid fixed heights on cards, warnings, and navigation labels. Use `minmax(0, 1fr)`, `min-width: 0`, and wrapping for IDs, numbers, Bengali text, and long error strings; do not mask overflow with `overflow-x: hidden`.
- At mobile sizes use a single reading column. On desktop, use two columns only where terms and SMS can be compared usefully. DOM order must remain sensible when stacked.
- Associate field hints/errors with `aria-describedby`; set `aria-invalid` after meaningful validation; use `fieldset`/`legend` for related groups. Include `select` in visible focus styling.
- Use polite live feedback for copying/saving/readiness; reserve alerts for errors needing attention. A decorative icon is hidden from assistive technology when adjacent text explains it.
- Test the keyboard opening on the actual Android phones; action buttons, numeric entry, bottom navigation, and focused inputs must remain reachable. Respect safe areas and reduced motion. Never rely on hover.

### Behavior acceptance matrix

| Area | Required checks |
|---|---|
| Navigation | New labels reach existing URLs; active navigation follows experience/request/reply subroutes; Back to request preserves the saved record; browser history does not silently save an unsaved draft. |
| Entry | Blank is distinct from zero; invalid dates/time/counts fail; no-meal profile hides meals without inventing a value; all limits still enforced. |
| Review | Exact preview and English summary agree; edits invalidate confirmation; Back/edit retains values; no write before final save; duplicate clicks produce one saved revision/request. |
| AI fallback | Worker failure and uncertain routing allow explicit manual review while retaining original text/fields and unsupported flags; no certainty or accuracy claim added. |
| SMS | Missing number explains fallback; copy equals exact renderer; composer cancellation remains unverified; send reports stay manual; acceptance uses frozen offer terms. |
| Reply | Wrong IDs/revisions, invalid values, duplicates, conflicts, early/mismatched acknowledgement and omitted-send recovery retain existing guards; sender confirmation remains required at commit. |
| Storage | Reopen pre-redesign records, refresh/new tab offline, quota failure, stale-tab writes, immutable revision creation, expiry and retention. |
| Offline/update | Ready only after real checks; cache/model loss fails honestly; update requires Home activation; stored request survives. |
| Evaluation | Real form remains blank; `demo=1` stays visibly synthetic in screen/export and writes no human-review or outbox evidence; study routing still works. |
| Accessibility | Keyboard-only create/review/record, visible focus and Skip link, screen-reader names/statuses, 200% text, no clipped controls. |

### Verification schedule

During each slice, run `npm run typecheck`, relevant component tests, and only affected production browser tests after building. Before handing off the integrated implementation, run `npm run lint`, `npm run test`, `npm run build`, `npm run check:budgets`, then the full existing production browser suite once with the new journey expectations. Use the ignored `ml/generated/field-fix-playwright.config.ts` when the server on 4173 is already running; do not stop it or launch a conflicting server. Rebuild first because it serves `dist` dynamically.

Add meaningful regression coverage for review/edit invalidation, pending/double-save handling, state-to-action correctness, conditional missing-send recovery, and sender verification at commit. Reuse existing full protocol/offline/large-text coverage; do not add tests that merely reproduce CSS class names or snapshots of every sentence.

Capture before/after screenshots at the same viewport and synthetic state. A future brief human/device check should ask users to find saved requests, explain whether an SMS has actually been sent, correct a count before saving, and distinguish an offer from an agreement. Record actual observations, assistance, and failures. These are proposed checks; no improved usability or completed human validation is claimed now.

## 7. Scope boundaries and completion criteria

The first release covers Home, Experiences/profile, create/review, saved SMS/reply, requests, and shared navigation/status styling. Evaluation/Diagnostics/Simulator get only compatible shell styling and link organization. Preserve their content and truthful labels.

Defer accounts, real-time chat, automatic inbox reading, SMS gateways, payments, maps, search/filter infrastructure, richer operator catalogs, new AI models, persistent unsaved drafts, extensive animation, and a complete localization system. Do not edit live Bangla SMS wording as part of this UI pass; that requires its own versioned review and message testing. Do not start the video during this work.

The implementation is complete when the core manual path is easy to start, required details precede optional features, review precedes persistence, the exact SMS and recipient are clear, each request state has an accurate next action, saved records still reopen offline, accessibility checks pass, and automated results are recorded without being promoted to human/carrier evidence.

Recommended first slice: **navigation + Home + experience cards**, followed immediately by **details/review**. These offer the clearest visible improvement while keeping protocol changes out of the presentation work.
