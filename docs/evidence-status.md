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
| Unit/component verification | **32 passed, 0 failed**, 4 files. Validators, ambiguity, negative/fractional counts, unsupported cases, SMS boundaries, strict replies, state/expiry/conflict/ack, malformed models, storage immutability/quota/stale writes, worker fallback and study scoring. |
| Production PWA / Phase 3 | **10 Playwright tests passed, 0 failed** against production dist and local Vercel-style routes/CSP. 20 offline agreements (10 AI/10 form), actual trained worker, queue/reload/new tab, reply/accept/ack. No visitor input network payload observed in the scripted paths. This is desktop browser evidence only. |
| Cache loss / updates | Missing cached model fails closed; evicted caches revoke readiness. Real waiting-SW update waits for Home, reloads once on explicit activation and preserves snapshot; additionally passed 3 repeated runs. |
| SMS protocol / Phase 4 | Deterministic composer URI/copy and reply/state software implemented/tested. Physical Android native composer behaviour, carrier delivery and basic-phone rendering **pending**. No composer-open event is labelled delivered. |
| Bangla templates | bn-draft-1, **UNREVIEWED**, zero native reviewers. Example NFC body =53 UTF-16 units; estimator warns >60, blocks Unicode >70 and GSM-7 >160. Physical one-segment route evidence pending. |
| Human comparison / Phase 5 | Consent-based local study tools, assignments, timer, shared downstream path, blinded card export and participant summaries implemented. **Zero real participants.** Blank native/physical/review logs provided. |
| Size budgets | Model package 427,800 bytes (binary 426,036) <1MiB; complete dist 974,611 bytes <5MiB. Per-file gzip sum estimate 341,162 bytes; actual hosted compressed transfer pending. See artifact-budgets.json. |
| Performance | Actual desktop Chromium 50-run benchmark in browser-benchmark.json, with first-call time and successful/failed warm denominators. **Low-end Android timing pending.** Desktop p95 is not a handset claim. |
| Accessibility | 360px viewport and 200% text layout checked in production; focus/labels/keyboard/native controls/reduced-motion styles implemented. Real Android screen-reader/manual assistive-use audit pending. |
| Hosting | Vercel static build, explicit route rewrites, CSP/cache/MIME configuration and CI prepared. Local tests verify missing-model 404/binary MIME/CSP. **HTTPS origin verified:** https://localrelay-test.vercel.app. Vercel build passed; 10 route responses/CSP, 13 asset hashes/sizes/MIME/cache headers, missing-model 404 and service worker checked. Fresh desktop Chromium passed readiness, offline reload/local AI/queued synthetic agreement/new tab. See deployment-checks.json. Physical Android remains pending. |

Machine summaries: deployment-checks.json, software-checks.json, browser-tests.json, browser-benchmark.json, artifact-budgets.json, ../ml/evaluation.json and ../ml/parity.json. Local detailed traces/reports/screenshots live in ignored test-results/.

Guided phone pilot: the user reported offline reopening, helper receipt of the enquiry and Agreement recorded for `#CYUN39.1`. See [field-observations.md](field-observations.md) for exact reported observations, the omitted-send-report recovery and missing evidence. These reports are not independently inspected hardware results or a completed formal SMS/human trial; the physical checklist gates remain open.

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
