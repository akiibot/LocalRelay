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
