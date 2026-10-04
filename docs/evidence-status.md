# LocalRelay evidence status — 4 October 2026

**Working software candidate; field evidence and AI quality release gates remain open.** No physical SMS, native review, human participant, operator interview or deployed Vercel observation has been fabricated. Software tests use synthetic fixtures and browser-entered protocol messages.

| Gate | Actual status / evidence |
|---|---|
| Repository inspection / Phase 0 | Empty requested remote inspected and cloned separately; no applicable AGENTS.md. Existing parent workspace plan/tmp preserved. |
| Manual deterministic flow / Phase 1 | Implemented: explicit fields, shared validators, original requirements, live exact preview, local queue, immutable snapshot, revisions and reply state guards. |
| Local trained model / Phase 2 | Real 7-class + 6-head logistic regressions execute in browser worker. 336 synthetic examples, 224/56/56 split; 84 grouped generator families; no real authors. |
| ML quality gate | **FAILED:** held-out synthetic intent macro-F1 0.3208 vs target .85; keyword baseline .7289. AI optional/experimental, manual pilot default. Independent data/retraining required. |
| Numerical model parity | Passed 30 fixtures; max absolute difference 2.33e-15 ≤1e-4. Retraining reproduced binary SHA-256 exactly. |
| Clean installation, types, lint, build / Phase 6 | `npm ci --offline`, typecheck, lint and build passed. Node 22.19.0/npm 10.9.3; Python 3.14.0 training only. |
| Unit/component verification | **42 passed, 0 failed**, 5 files. Validators, ambiguity, negative/fractional counts, unsupported cases, SMS boundaries, strict replies, state/expiry/conflict/ack, malformed models, storage immutability/quota/stale writes, worker fallback and study scoring. |
| Production PWA / Phase 3 | **12 Playwright tests passed, 0 failed** against production dist and local Vercel-style routes/CSP. 20 offline agreements (10 AI/10 form), actual trained worker, queue/reload/new tab, reply/accept/ack. No visitor input network payload observed in the scripted paths. This is desktop browser evidence only. |
| Cache loss / updates | Missing cached model fails closed; evicted caches revoke readiness. Real waiting-SW update waits for Home, reloads once on explicit activation and preserves snapshot; additionally passed 3 repeated runs. |
| SMS protocol / Phase 4 | Deterministic composer URI/copy and reply/state software implemented/tested. User-reported four-message Grameenphone smartphone pilot recorded separately; formal native-composer/carrier logs and basic-phone rendering remain pending. No composer-open event is labelled delivered. |
| Bangla templates | bn-draft-1, **UNREVIEWED**, zero native reviewers. Example NFC body =53 UTF-16 units; estimator warns >60, blocks Unicode >70 and GSM-7 >160. Physical one-segment route evidence pending. |
| Human comparison / Phase 5 | Consent-based local study tools, assignments, timer, shared downstream path, blinded card export and participant summaries implemented. **Zero real participants.** Blank native/physical/review logs provided. |
| Size budgets | Model package 427,800 bytes (binary 426,036) <1MiB; complete dist 977,443 bytes <5MiB. Per-file gzip sum estimate 342,026 bytes; actual hosted response bodies total 371,663 encoded bytes for 16 static files fetched once, versus 977,443 decoded bytes. HTTP/TLS overhead, duplicate/cache requests and handset install traffic are excluded. See deployment-checks.json and artifact-budgets.json. |
| Performance | Actual desktop Chromium 50-run benchmark in browser-benchmark.json, with first-call time and successful/failed warm denominators. **Low-end Android timing pending.** Desktop p95 is not a handset claim. |
| Accessibility | 360px viewport and 200% text layout checked in production; focus/labels/keyboard/native controls/reduced-motion styles implemented. Real Android screen-reader/manual assistive-use audit pending. |
| Hosting | Vercel static build, explicit route rewrites, CSP/cache/MIME configuration and CI prepared. Local tests verify missing-model 404/binary MIME/CSP. **HTTPS origin verified:** https://localrelay-test.vercel.app. Vercel build passed; 10 route responses/CSP, 13 asset hashes/sizes/MIME/cache headers, missing-model 404 and service worker checked. Fresh desktop Chromium passed readiness, offline reload/local AI/queued synthetic agreement/new tab. See deployment-checks.json. The user reported Android offline reopening; formal target-device verification remains pending. |

Machine summaries: deployment-checks.json, software-checks.json, browser-tests.json, browser-benchmark.json, artifact-budgets.json, ../ml/evaluation.json and ../ml/parity.json. Local detailed traces/reports/screenshots live in ignored test-results/.

Guided phone pilot: the user reported offline reopening, helper receipt of the enquiry, all four SMS messages sent, Agreement recorded and receipt persistence for `#CYUN39.1`. Phones: Samsung Galaxy A55 and Redmi Note 11; carrier route Grameenphone → Grameenphone, explicitly confirmed by the user. The helper understood the Bangla but found its presentation insufficiently organized/professional. See [field-observations.md](field-observations.md) for exact reported observations, the omitted-send-report recovery and missing evidence. This smartphone-to-smartphone pilot does not establish basic-phone compatibility, formal native review or a completed SMS/human study; those checklist gates remain open.

Earlier verification found and fixed: a readiness manifest/precache icon mismatch, DOMException error-message handling, late/waiting update detection and duplicate reloads, test navigation synchronization, negative/fractional count candidates and stale-tab storage writes. Final results above refer to the corrected implementation.

## Software checklist

- [x] Standalone Vite/React/TypeScript PWA with required routes and demo-only bundled profiles.
- [x] Actual trained local worker, shared features, finite/hash/class-order compatibility checks and reproducible coefficients.
- [x] Manual baseline uses the same validation/review/rendering/SMS path.
- [x] Explicit counts/date/time/meal/completeness checks; unsupported requirements remain visible and block progression.
- [x] Exact normalized Bangla preview/length; local outbox, expiry, deletion, frozen offers/revisions, acceptance/acknowledgement guards.
- [x] Production browser offline startup/reload/new-tab workflow and truthful readiness/update failure handling.
- [x] Isolated simulator; local consented study tools; docs, cards, guides, commands, CI and Vercel build artifact.
- [ ] Independent ML quality targets; blind parser precision/coverage and unsupported false-acceptance rates (not established by curated fixtures).
- [ ] Actual low-end Android install/reopen/performance and manual assistive-use audit.
- [x] Public deployed-origin verification in desktop Chromium; physical Android verification remains separate.

## External evidence checklist

- [ ] Two independent native template/operator-guide reviewers.
- [ ] ≥8 native participants ×6 message comprehension tests (reviewers excluded).
- [ ] ≥16 visitor-like participants ×4 counterbalanced tasks, preserved raw denominators and failures.
- [ ] ≥5 actual operator interviews.
- [ ] ≥20 varied real smartphone/basic-phone SMS messages with offer/acceptance/acknowledgement, sent/received text and carrier/device/version logs.
- [ ] Physical Bangla rendering, one-segment route/boundary, cancellation/copy/signal-loss/delay tests.
- [ ] ≥50 actual low-end Android inference timings, load/failures retained.
- [ ] Independent consented/human-author corpus and frozen blind unseen-author test set.
- [ ] Real workflow demonstration video and deployment/account checks.

Use external-verification.md and evaluation-protocol.md to execute these. Do not promote this software checklist to evidence completion or a production-safe booking claim.

## Deployed unsupported-requirement check

The exact synthetic note “One guest has a peanut allergy.” was tested against the HTTPS origin in a fresh desktop Chromium context with network disabled after preparation. A valid card with both confirmations first allowed queueing without the note. Adding the allergy note displayed Direct contact required and the health/allergy confirmation reason, and disabled queueing even after both confirmations were checked again. The note and block persisted through actual AI analysis and switching back to the manual form; the outbox record count did not increase. See deployment-checks.json and the repeatable check-deployed-origin.mjs script. This covers this software case, not general medical/dietary safety, carrier delivery or a phone-side observation.

## Phone AI regression — 4 October 2026

The user reported a low-confidence “Direct contact required” warning on the offline phone AI test. Quoted input used 2011-10-11 rather than the instructed future 2026-10-11; past dates remain rejected by validation. Actual exported-model reproduction also abstained on the exact instructed future-date sentence (price_query probability .45665 against .55). This is a model-quality failure on a normal supported enquiry, not a successful AI routing test. Correcting the quoted sentence's year alone still abstains (.52546). Model weights/thresholds and the failed .85 release gate are unchanged.

Two implementation defects were fixed: ISO date separators had triggered the range ambiguity check and cleared counts/time; low-confidence routing had been stored as an unsupported requirement, blocking the promised manual fallback. The parser now excludes ISO date tokens from the range check while actual alternative/negative counts remain guarded. AI uncertainty blocks AI queueing and asks for explicit manual review; switching to the form preserves original text/fields, resets completeness confirmation, and retains all lexical and learned unsupported requirement flags. The production worker regression passes offline. The user also confirmed correct date/time/count fields after switching to the form on the updated phone test; later local queueing was reported to work after manual-mode/count/confirmation instructions. The final card was not independently inspected; details and the intermediate screenshot discrepancy are recorded in field-observations.md. Actual reproduction scores and before/after parser fields: ai-routing-regression.json.

## Additional self-run QA — 4 October 2026

- 32 newly authored synthetic diagnostic enquiries: 12 supported, 8 requiring clarification, 8 unsupported requirements and 4 invalid cards. All 32 parser/span/flag/validation contracts passed. Of the 145 explicit known field candidates in this constructed set, 145 were extracted correctly; this is a software fixture result, not independent parser precision/coverage or human comprehension evidence. All 20 non-supported cases were blocked by the candidate gate.
- **AI limitation preserved:** 0/12 supported variants passed the complete learned-routing/requirements/validation review gate. The frozen seed model and its confidence/requirement thresholds are unchanged; its release quality gate is still failed. Actual per-case probabilities/reasons are in challenge-evaluation.json. These cases are developer-authored, not blind, and were not used for training/tuning.
- Actual deployed-origin offline Chromium checks passed missing-send-report refusal and explicit recovery, decline, stale revision rejection, alternative offer, repeated identical offer, premature acknowledgement refusal, mismatched acknowledgement rejection, matching alternative acceptance/acknowledgement/reload and conflict stopping further replies. Protocol messages and sender/send confirmations are scripted; no carrier traffic is generated. Results: deployment-checks.json.
- Repeat locally with `npm run check:challenges` and `node scripts/check-deployed-origin.mjs https://localrelay-test.vercel.app`. The challenge contract checks are included in CI; current remote CI status is not inferred from local success.

The user additionally stated that phone SMS works. This supplements the reported Galaxy A55 → Redmi Note 11 Grameenphone pilot, without inventing a basic-phone route, additional trials, delays, native reviewers or participant denominators. Field targets remain open.

## Remaining developer work and final rerun

Completed the missing independent-data tooling: reviewed source schema, explicit author/family/normalized-text split isolation, frozen dataset/feature hashes, isolated candidate training with development-only selection, candidate Python/JS parity, and source-stratified learned/keyword intent and requirement ablation plus parser/ambiguity/unsupported exposure metrics. See corpus-workflow.md and corpus-tools-checks.json. All 12 pipeline/guard checks passed on the existing synthetic seed; candidate coefficients exactly reproduced frozen v1. There are still zero real/human rows, no approved candidate and no improved AI quality claim. Empty parser truth in the seed remains unscored, with null precision/coverage.

The exact bn-draft-1 renderer and acceptance messages passed all 4,584 supported count combinations for both bundled profiles at revisions 1/9/10/99/100/999. Maximum enquiry size was 57 Unicode units; very long revisions fail closed. See sms-matrix.json. This is an encoding estimate, not physical one-segment or Bangla-comprehension proof.

Fixed keyboard Skip to content focus using a focusable main target. Production Chromium also verified keyboard queue activation. Final clean install, typecheck, lint, 42 unit/component tests, 12 production browser tests (20 offline agreements and 50 desktop timing calls), model parity, 32 diagnostic cases, build and budgets passed. Detailed current results are in software-checks.json and browser-tests.json. Native/manual assistive-use and actual low-end-device audits remain pending.

All outstanding evidence gates and their required people/devices/data are mapped in remaining-work.md. The two unfinished software-checklist entries still depend on independent ML evidence and real Android/assistive observations; no checklist percentage is increased merely for adding tooling.

Latest hosted rerun: keyboard skip focus, all existing offline/guarded protocol checks, 13 decoded asset hashes and 16 encoded static response bodies passed on dpl_GXuayATb9u488HnzkdJCPFY6TZnG. No CSP/page errors or external/payload requests were observed in the tested browser path.

Linux CI exposed horizontal overflow at 360px/200% text that macOS system fonts had not reproduced. The brand now wraps and native-control/grid minimum widths are bounded without hiding page overflow. The regression explicitly exercises system-ui, Verdana and monospace and populated date/time inputs. All 12 local production browser tests passed again, and the same large-text bounds plus the full existing offline suite passed on the redeployed HTTPS origin (dpl_YN8Kj13WvgcsAFKUwm1but3kD654). The prior failing Linux run is retained as failure evidence; remote CI is rerun for the correction rather than inferred from the local pass.

## Retesting guide — 4 October 2026

Added offline guidance under Diagnostics → When to retest, linked from Home and operator profiles. It explains affected checks after app/SMS wording changes, different phones/carriers and lost browser storage, plus the existing offline-file recheck before travel. It writes no completion evidence, sends no SMS and schedules no reminders. Native review and physical/human studies remain open. Removed deployed-origin verification from the UI’s pending-only list, while keeping formal handset studies pending.

Large-text testing found the existing Diagnostics heading could overflow at 360px/200% with Verdana; main text now wraps long words without hiding overflow. Fresh desktop Chromium passed both links, offline Diagnostics reload and system-ui/Verdana/monospace layout bounds. Typecheck, lint, 42 unit/component tests and build/budgets passed. The first production suite had 11 passes and one 60-second overall timeout during the 20-agreement loop on a heavily loaded host; the isolated rerun passed all 20 agreements using a 180-second overall limit. Source/CI time limits remain unchanged. Both run summaries are retained in retest-guide-checks.json and browser-tests.json.

Deployed as dpl_2pYNhLzH9mb2tA1PjrTWbEPFtSdT. The fresh HTTPS rerun passed the guide links/offline reload/large text plus existing asset, CSP, offline worker, manual fallback, allergy and protocol checks. Results are in deployment-checks.json; these are desktop software observations, not new carrier or participant evidence.
