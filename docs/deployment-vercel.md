# Vercel readiness and deployment

Normal standalone Vite application; use the Vite preset, Node 22.x, root LocalRelay (repository root), `npm ci`, `npm run build`, output `dist`. No functions, environment secrets or Python runtime. See [official Vercel Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/).

vercel.json explicitly rewrites only the specified application routes, including `/request/new` under `/request/:requestId`. No catch-all rewrite masks missing model assets. Operators JSON lives under `/data/operators/`. Hashed `/assets/*` use immutable cache; model files, SW, manifest and readiness manifest revalidate. Vercel’s normal static HTML cache defaults revalidate; check response headers on the actual origin. Do not publish changed weights at a reused version path. CSP is same-origin only, including workers, styles and asset connections.

Local production test server applies configured global CSP and equivalent explicit route rules; this validates the emitted bundle locally, not Vercel’s deployed responses. Local tests verify missing-model 404 and binary MIME. The deployed test origin has also been verified in fresh desktop Chromium; see deployment-checks.json. Physical Android testing remains pending.

When account access/publishing authorization is available:

1. Review the implementation on `codex/localrelay` in akiibot/LocalRelay; merge the draft PR when appropriate and import it in Vercel. Main initially contains a handoff pointer; use the implementation branch before merging. The implementation has been deployed from the local implementation checkout to the separate test project.
2. Create an HTTPS preview using the settings above. Verify every route and `/manifest.webmanifest`, `/sw.js`, model metadata/bin/spec, worker JS and `/offline-assets.json`. Missing `/models/v1/missing.bin` must be 404, never shell HTML.
3. Inspect MIME, CSP, cache headers, install prompt/icons. Check asset-manifest hashes match downloaded bytes; browser console has no CSP errors.
4. On Android Chrome, wait for Ready for offline use, install, close the app/browser, disable Wi-Fi/mobile data, reopen, analyze/queue/reload/parse replies. SMS service is separate from internet; restore cellular SMS service before a real exchange.
5. Test native SMS handoff and cancelled composer. Record physical sender/recipient texts and return acceptance/ack.
6. Publish only with the intended account/origin and repeat preparation/offline tests. Preview and production have separate storage/SW scopes.

## Verified test deployment — 4 October 2026 (Asia/Dhaka)

- URL: https://localrelay-test.vercel.app
- Project: akiiibots-projects/localrelay-test; CLI used the existing signed-in account.
- Deployment: dpl_PuLzbGD3gs5Fp217jgoLf5LP6S28, remote npm ci/build passed on the project's Node 24.x default. Local original verification used Node 22.19.0.
- Although preview was requested, Vercel assigned the first deployment to this separate test project's production target and alias. No other existing project was changed.
- 10 route responses, CSP, 13 exact asset sizes/hashes/MIME/cache headers, SW and missing-model 404 verified. Fresh desktop Chromium passed online readiness, offline reload, local AI, one queued synthetic offer/acceptance/acknowledgement and new-tab outbox reopening. No CSP/page errors or external/payload requests observed in that path.
- Re-run with `node scripts/check-deployed-origin.mjs https://localrelay-test.vercel.app` after installing Playwright Chromium. Output: docs/deployment-checks.json. This creates synthetic data only in an isolated browser context and sends no SMS.
- .vercel/ and generated .env.local stay ignored; .vercelignore excludes local training outputs and test artifacts from uploads.
- Vercel automatically connected GitHub. Its production branch is currently main, which still has only the handoff README until PR #1 is merged. Deploy app changes from codex/localrelay with the CLI until then; do not redeploy main before merging the implementation.

Physical Android install/reopen, native SMS and human evidence remain pending. Unreviewed Bangla and failed AI quality gates remain explicit even if a preview is deployed.

## Parser/manual-fallback update — 4 October 2026

Deployed dpl_4ueW97wMKmJjSNuLkq6jAszGheJq to the same https://localrelay-test.vercel.app alias after 36 unit/component and 11 production-browser tests passed. ISO dates no longer erase count/time candidates; low-confidence AI queueing stays blocked while explicit manual fallback retains original text and all unsupported requirement flags. Model coefficients/thresholds and saved agreement snapshots are unchanged. The deployed-origin checker now includes this actual-worker offline fallback regression.

For existing installed clients: reconnect, return Home, wait for the update notice, choose **Activate update and reload**, then wait for Ready for offline use before disconnecting again. Copy any unsaved enquiry text first; previously saved requests remain in IndexedDB. Actual phone retest is pending.

## Keyboard accessibility and tooling update — 4 October 2026

Deployed dpl_GXuayATb9u488HnzkdJCPFY6TZnG to the same test alias. The runtime change makes Skip to content focus the main region; source worker/model/template bytes remain frozen. The actual Vercel install/build passed and emitted the same production asset hashes as the local verified build. Added candidate-model/data tooling runs during development/CI only; no Python service or inference backend is introduced. Results of the fresh HTTPS/offline check are in deployment-checks.json.

## Linux large-text layout correction — 4 October 2026

Deployed dpl_YN8Kj13WvgcsAFKUwm1but3kD654 after the repeated 12-test production suite passed. Linux CI had exposed brand/native-control horizontal overflow at 200% text. Wrapping and zero-minimum grid/input widths fix it; no overflow-hiding rule was added. Fresh deployed-origin checks also passed with system-ui, Verdana and monospace at 360px/34px root text, alongside all offline protocol/asset checks. The worker, model, template and persisted request semantics remain unchanged.


## Visitor UI and interactive two-phone demo — 4 October 2026

The tested UI redesign, compact homepage/saved-record layout, revision/save fixes and click-only `/demo` were pushed on `codex/localrelay` as 1a09a6219aecf2354131128c7ca1ffe178dc64bf and deployed with the existing signed-in Vercel account to the same test project. Production deployment: `dpl_D4ZFY9Q3hPqMKiWEWbT5SPaNuMiV`, URL `https://localrelay-test-116ffjp6z-akiiibots-projects.vercel.app`, alias `https://localrelay-test.vercel.app`. Remote npm ci/build succeeded and emitted the tested application/worker asset filenames. `/demo` has an explicit Vercel rewrite and offline navigation support.

Both push and PR Linux runs passed software and corpus-tool jobs: https://github.com/akiibot/LocalRelay/actions/runs/37183880237 and https://github.com/akiibot/LocalRelay/actions/runs/37183882408. Software coverage includes 59 unit/component checks and 23 browser checks, plus parity, 32 challenge contracts and 4,584 encoding cases. The deployed-origin checker passed 11 route responses, 13 verified asset sizes/hashes/MIME types, CSP and cache headers, missing-model 404, offline reload, actual local inference, synthetic agreement and guarded protocol branches. Its 16 static response bodies total 392,410 encoded bytes / 1,055,654 decoded bytes once; exclusions remain as described above.

The first full-suite run against HTTPS exposed two test-environment assumptions: a hard-coded localhost origin incorrectly classified cached same-origin requests, and the update test attempted to modify local dist/sw.js while browsing immutable remote assets. These were test failures; the 20 exchanges had completed. The network assertion now uses the actual origin. The update test is explicitly local-only and passed locally; the hosted rerun and results are recorded in the UI/demo check reports. No product runtime changes were needed after deployment. The draft PR remains open; main was not merged. Model quality and physical/human evidence limitations remain unchanged.

Final hosted suite: **22 passed, 0 failed, 1 explicitly local-only update test skipped**. The corrected local 20-agreement and SW-update tests both passed. All 13 local/hosted manifest entries match exactly. Initial hosted harness failures are retained in ignored `ml/generated/interactive-demo/hosted-first-run/results.json`; final JSON is `hosted-full-suite-results.json`.
