# LocalRelay UI/UX implementation and QA — 4 October 2026

Implemented locally from the [Mobbin-informed plan](ui-ux-implementation-plan.md), starting at `164b762`. The running production server on port 4173 was preserved and serves the final rebuilt `dist`. The hosted Vercel site has not been redeployed; no video has been made.

## Delivered

- Home starts with a concise explanation and immediate experience/request actions. At 390 × 844, the primary action ends around Y=391 CSS px, compared with the earlier start position around Y=1203.
- Home, Experiences and Requests form the main navigation. Mobile bottom navigation uses labeled local SVG icons; at widths ≤380px it moves into the header to accommodate narrow/large-text layouts. Tools, native review, and clearly labeled synthetic review examples remain reachable from Home.
- Demo experience cards emphasize service, guest limits and meal inclusion without invented prices, photos, ratings or availability. Profiles distinguish package terms, consented test-number setup and technical details.
- Request creation has Details → Review steps, required fields before optional notes, native date/time controls, field errors and focus handling. Explicit zero counts remain required. English AI entry stays experimental and optional; study-assigned/no-query AI routes remain supported.
- Review shows English terms, original requirements, recipient and exact Bangla preview before explicit confirmations and a local save. Editing clears confirmations and retains values. No write occurs merely by entering review; pending saves reject duplicate clicks.
- Saved records show state-specific next actions and a four-step SMS exchange. Copy/composer content is the exact renderer string. Sending reports are explicit, distinct from opening the composer, and never carrier-delivery claims.
- Missing-number records offer manual-copy guidance and recipient editing through a new immutable revision. The old record retains its recipient/body and is superseded atomically; its latest revision is linked when present.
- Reply entry separates sender checking, text review and recording. Changing sender confirmation invalidates the preview. Missing-send recovery appears only in eligible states, requires explicit opt-in and re-review, and continues to use the existing state guards. Alternative terms are highlighted; acknowledgement preview wording does not assert a match before the guarded commit.
- Requests are grouped into in-progress and completed/closed lists with readable statuses and resumable links. Loading, error and empty states are distinct. Management actions are separated from the SMS path; local deletion still does not cancel a service.
- Readiness remains based on real cache/hash/model checks, with compact status and expandable technical details. Copy success uses polite status feedback. Explicit Home update activation, reduced motion, Skip to content and visible control focus remain available.

## Implementation mapping

| File | Responsibility |
|---|---|
| `src/app/components/AppShell.tsx` | Navigation, contextual route focus, shared shell and tool links |
| `src/app/request/VisitFields.tsx` | Grouped native fields, hints and accessible inline errors |
| `src/app/request/RequestParts.tsx` | Reviewed terms, exact SMS panel, offer summary, progress and status badges |
| `src/app/request/presentation.ts` | Exhaustive presentation map for all 13 existing states and date formatting |
| `src/app/App.tsx` | Existing route ownership and persistence orchestration, new details/review stages and reply interaction |
| `src/styles/main.css` | Shared visual tokens and responsive component styles |
| `tests/component/review.test.tsx` | Review/edit, explicit counts, unsupported flags, AI fallback, write failure, duplicate-save and direct-contact behavior |
| `tests/e2e/production.spec.ts` | Existing production protocol/offline checks adapted to deliberate new wording and review stage |
| `tests/e2e/ui-journey.spec.ts` | New journey, layout, exact copy, recipient revision, sender invalidation, recovery, alternative/conflicting replies, no-meal and study checks |
| `scripts/check-deployed-origin.mjs` | Hosted-verification selectors and journey updated for a future deployment; not run against the unchanged hosted version |

The actual extraction is smaller than the proposed per-screen file breakdown: route orchestration stays in `App.tsx`, while repeated rendering and fields are shared. This keeps the database/protocol boundaries intact. No database migration, new route, dependency or runtime network service was introduced. Domain state/validation, storage, SMS encoding/parser, live templates, model weights and worker are unchanged.

## Actual checks

Types and lint passed without warnings. All **48 unit/component tests across six files passed**. Build and artifact budgets passed: **1,031,156 decoded bytes**, below the 5 MiB offline budget; the unchanged model package is 427,800 bytes, below 1 MiB. These are artifact sizes, not a physical handset download measurement.

The full production run returned **17 passes and one failed assertion** across 18 tests. The failed new no-meal assertion expected expanded details to be visible after the saved summary had become collapsible. The visible compact summary still included “No meals included.” The corrected check now verifies that summary, expands the details and verifies the exact meal statement there. Its targeted rerun passed, alongside the newly added direct-contact study check: **two passes, zero failures**. Therefore **19 distinct production checks have passing observations across the full run and final targeted rerun**; this is not presented as one 19-test clean run.

Coverage includes 20 scripted offline agreement workflows, actual worker execution, unsupported requirements, manual fallback, quota/write handling, immutable revisions, query-route offline review exports, missing assets/cache loss, controlled service-worker update, saved-record reload/new-tab reopening, keyboard operation and 200% text layout. All entered messages/reviewer/study answers were synthetic; these checks sent no physical SMS and collected no real reviewers or participants.

Inspected actual rendered mobile and desktop screens. Layout checks covered 320, 360, 390, 412, 768 and 1440px widths, with large-text checks using system-ui, Verdana and monospace. A final 390 × 844 focus check placed the Save button bottom at Y=664 and navigation top at Y=773: the focused action was unobscured. No page errors occurred in that final observation. These are desktop Chromium observations, not actual Android keyboard or manual screen-reader results.

Machine summary: [ui-ux-checks.json](ui-ux-checks.json). Detailed full-run failure and final targeted results, plus implementation screenshots, are preserved under ignored `ml/generated/ui-ux-review/`. The original planning screenshots were temporary browser-inspection artifacts and were removed by subsequent Playwright output cleanup.

## Remaining limits

The failed AI quality gate, independent native Bangla review, broader physical/carrier studies and real Android/assistive checks remain open. This UI pass does not change live SMS wording or improve model accuracy. Real `/evaluation?review=bangla` and synthetic `/evaluation?review=bangla&demo=1` retain their distinct labels/exports. Unsaved creation drafts remain in component memory; navigating away or reloading does not promise recovery. Native controls were retained; custom calendars, persistent draft autosave and a sticky action bar were intentionally outside the first-release plan.

For a future phone check, verify the new navigation while the software keyboard is open, enlarged text, native composer return/cancel, recipient revision, and complete offer/acceptance/acknowledgement exchange. Record actual observations separately. Deployment is a separate step; do not reinterpret these local results as hosted-origin or physical evidence.


## Follow-up issue audit (2026-10-04)

Fixed request initialization failing open: missing or ineligible revisions and unreadable preferences now show an error and a recovery link, without rendering a usable request form. New-request query changes remount the draft so fields, confirmations, revision identity and entry mode cannot leak between journeys. Async initialization is cancelled when its draft leaves the screen.

Profile recipient loading is cancelled on navigation and its input is disabled until loading completes. Profile creation has a synchronous duplicate-submission lock and pending feedback. Study outcome failures are caught; failure of optional study bookkeeping after a durable request save no longer displays a false save failure or offers a duplicate save. The request review now includes the operator's exact standard meal description.

Four additional regression checks cover missing revisions, preference-load failures, study failure after a successful save, and request URL changes. Final verification counts are recorded in `ui-ux-checks.json`. These fixes do not resolve the existing ML accuracy gate or replace physical-phone and independent Bangla review evidence.

Follow-up final checks: 52 unit/component tests in six files and all 19 production browser tests passed, including 20 scripted offline agreements. Typecheck, lint, formatting, build and size budgets passed. Final local bundle: 1,031,953 bytes; per-file gzip estimate 355,832 bytes. Browser report retained at `ml/generated/ui-ux-review/follow-up-results.json` (ignored).


## Compact refinements after old-versus-new comparison

Secondary homepage guidance now uses native expandable sections: walkthrough, installation/privacy, retest guidance and evidence tools. Offline preparation, cellular service and carrier charges remain visible. The saved record's progress panel is collapsed by default with its current step visible; expanding reveals all four steps and the local-report disclaimer. Exact SMS now precedes already-reviewed visit details, and the duplicate SMS heading is removed.

At 390×844, the homepage decreased from 3,127px to 1,944px (37.8%). Collapsed progress is 95px tall. The message section begins at 629px and the exact body at 729px, so the body begins above the 773px bottom navigation; the entire body still requires scrolling. Native guidance sections expand correctly. Saved progress reflow passed all 24 combinations of six widths, normal/200% text and collapsed/expanded state, with no page errors. Seven affected journey/keyboard/reflow browser checks passed, followed by two targeted passes after the final heading adjustment. All 52 unit/component checks, typecheck, lint, build and artifact budgets passed. Model, protocol and deployed site unchanged.


## Interactive two-phone demonstration

`/demo` is a click-only visitor smartphone and operator feature-phone walkthrough linked from Home and the shared footer. Preset scenarios cover a 1,500 BDT standard offer at 15:00, an alternative 1,600 BDT offer at 16:00, and decline. The demo begins before interpretation, explicitly reviews the sample card, then exchanges enquiry, offer, acceptance and matching acknowledgement. Animated message bubbles show exact protocol text with English explanations. The operator has no app or internet dependency in the represented workflow. Device frames stack on mobile; active controls receive keyboard focus and message motion respects reduced-motion preferences.

The actual local worker classifies the preset English sample. Rule extraction and model gates are checked before labelling it AI-assisted; uncertain, flagged, unavailable or mismatched extraction results require an explicit preset-manual-form choice. Scores are available as actual worker observations, with the existing accuracy limitation retained. AI results from before a restart or route exit cannot advance a new session. The real renderer, parser and state guards process all simulated messages; offers and acknowledgements have simulator provenance. State stays in memory, no native composer is opened, and demo clicks do not increment an active study's tap count. The existing editable `/simulate` sandbox remains available. The production server, Vercel rewrite and service-worker navigation allowlist include `/demo`.

Demo browser coverage checks full standard/alternative terms, decline stopping, inbox reset, exact message counts, no real saved requests, the actual model worker offline, six widths, 200% text, keyboard focus and reduced motion. Unit/component checks cover AI fallback, interpretation gates, simulator provenance, acknowledgement mismatches, worker failure, duplicate analysis and stale results after restart. Final totals and environment limitations are recorded in `interactive-demo-checks.json`.

Interactive-demo final verification: 59 unit/component tests in eight files and all 23 production browser tests passed in one integrated run. Typecheck, lint, formatting, build and artifact budgets passed. No new physical SMS or human evaluation evidence was generated. The local server remains available at `http://127.0.0.1:4173/demo`; hosted site unchanged.

Hosted verification: the redesigned app and `/demo` are now live at `https://localrelay-test.vercel.app`. All 22 applicable browser checks passed; the local-file update test was skipped remotely and passed locally. The HTTPS integrity/offline checker also passed. The prior local-only status in this history is superseded by this deployment; details and retained first-run harness failures are in deployment-vercel.md.
