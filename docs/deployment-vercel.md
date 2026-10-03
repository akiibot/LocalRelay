# Vercel readiness and deployment

Normal standalone Vite application; use the Vite preset, Node 22.x, root LocalRelay (repository root), `npm ci`, `npm run build`, output `dist`. No functions, environment secrets or Python runtime. See [official Vercel Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/).

vercel.json explicitly rewrites only the specified application routes, including `/request/new` under `/request/:requestId`. No catch-all rewrite masks missing model assets. Operators JSON lives under `/data/operators/`. Hashed `/assets/*` use immutable cache; model files, SW, manifest and readiness manifest revalidate. Vercel’s normal static HTML cache defaults revalidate; check response headers on the actual origin. Do not publish changed weights at a reused version path. CSP is same-origin only, including workers, styles and asset connections.

Local production test server applies configured global CSP and equivalent explicit route rules; this validates the emitted bundle locally, not Vercel’s deployed responses. Local tests verify missing-model 404 and binary MIME. Deployment/schema/origin verification is still external pending.

When account access/publishing authorization is available:

1. Review the implementation on `codex/localrelay` in akiibot/LocalRelay; merge the draft PR when appropriate and import it in Vercel. Main initially contains a handoff pointer; use the implementation branch before merging. No Vercel deployment has been performed.
2. Create an HTTPS preview using the settings above. Verify every route and `/manifest.webmanifest`, `/sw.js`, model metadata/bin/spec, worker JS and `/offline-assets.json`. Missing `/models/v1/missing.bin` must be 404, never shell HTML.
3. Inspect MIME, CSP, cache headers, install prompt/icons. Check asset-manifest hashes match downloaded bytes; browser console has no CSP errors.
4. On Android Chrome, wait for Ready for offline use, install, close the app/browser, disable Wi-Fi/mobile data, reopen, analyze/queue/reload/parse replies. SMS service is separate from internet; restore cellular SMS service before a real exchange.
5. Test native SMS handoff and cancelled composer. Record physical sender/recipient texts and return acceptance/ack.
6. Publish only with the intended account/origin and repeat preparation/offline tests. Preview and production have separate storage/SW scopes.

No deployed URL or Vercel account action is claimed. Unreviewed Bangla and failed AI quality gates remain explicit even if a preview is deployed.
