# LocalRelay

**The visitor’s smartphone does the AI work. The local operator keeps the phone they already own.**

Standalone React/TypeScript/Vite PWA, prepared for Vercel. English visitor input → explicitly reviewed bounded fields → draft Bangla SMS → strict offer/acceptance/acknowledgement protocol. The trained classical Small AI runs in a Web Worker on the visitor’s smartphone. No inference server, SMS gateway, hosted translator, account or booking database.

**Status: executable development/pilot candidate, not field-validated.** Bangla templates are unreviewed. Synthetic intent macro-F1 is **0.321**, below the 0.85 target; keyword baseline is **0.729** on the same grouped test split. AI is optional/experimental; use the manual form as the pilot default. No hardware/human results exist. HTTPS test deployment: [localrelay-test.vercel.app](https://localrelay-test.vercel.app), verified in desktop Chromium; see [deployment checks](docs/deployment-checks.json). See [evidence checklist](docs/evidence-status.md) and [model card](ml/model-card.md).

## Run

Tested with Node **22.19.0**, npm **10.9.3**, Python **3.14.0** (Python is only needed for development training). Dependency versions are locked in package-lock.json; committed trained artifacts make frontend builds independent of Python/network model downloads.

```sh
git clone --branch codex/localrelay https://github.com/akiibot/LocalRelay.git
cd LocalRelay
npm ci
npm run dev
```

The dev server is for development. To review the actual offline PWA and Vercel-style route/CSP behaviour:

```sh
npm run build
node scripts/serve-production.mjs
# http://127.0.0.1:4173
```

`npm run preview` is also available, but the included production test server is stricter about missing assets and uses the checked-in Vercel CSP. Service workers require HTTPS or localhost. A phone accessing a plain HTTP LAN address cannot prepare the PWA; use a Vercel HTTPS preview or an HTTPS development tunnel you control.

## Review the working flow

1. Open `/`, wait for **Ready for offline use** (checks service-worker control, actual cached asset sizes/hashes and model compatibility).
2. `/operators` → demo profile. Every committed phone is null. Optionally enter an owner-consented test number locally; no real message is sent by the application itself.
3. Choose `/request/new?mode=form` for the recommended baseline. Enter a future Dhaka date/time, adults, children and vegetarian count explicitly. Verify standard meals and completeness. Unsupported requirements block queueing.
4. Review the live Bangla preview, then queue the immutable snapshot. Reopen `/outbox` or reload its record.
5. Open the native SMS composer or copy text/number. A cancelled composer leaves only “opened”; **I sent this** records a user report, never a carrier delivery receipt.
6. In `/reply/:id`, check the sender in your SMS app, enter and review the strict offer. Accepting prepares an acceptance SMS. Send that back and record sending. Only a matching operator acknowledgement records agreement.
7. Use `/simulate` for an isolated in-memory protocol demonstration. It does not write into the real outbox or transmit SMS.
8. `/diagnostics` verifies the trained package, runs local timings and exposes score diagnostics. `/evaluation` provides consented local timing, counterbalanced assignment, scoring and deidentified export.

Enquiry text, phone numbers and quotes never appear in route parameters. A route ID is local to one browser origin/device. Receipts can be exported; deletion never cancels a service. Unsent/expired data is deleted on an app read seven days after expiry; completed receipts after 30 days. Shared-device users can access IndexedDB; SMS is not end-to-end encrypted.

## Verify

```sh
npm run typecheck
npm run lint
npm run test
npm run ml:parity
npm run check:challenges
npm run check:sms
npm run build
npm run check:budgets
npx playwright install chromium
npm run test:e2e
```

Production Playwright tests include **20 scripted offline agreement workflows**, actual worker inference, hard reload/new-tab reopening, fail-closed cache loss, request revisions, study export, 360px/200% text layout, MIME/404/CSP checks. These are browser software tests with manually entered protocol messages, **not 20 physical SMS tests**. See actual final counts/results in [evidence-status.md](docs/evidence-status.md). An additional 32-case synthetic challenge check verifies parser/validation contracts and records model abstentions in [challenge-evaluation.json](docs/challenge-evaluation.json); it is not blind human evidence. Run `node scripts/check-deployed-origin.mjs https://localrelay-test.vercel.app` for isolated HTTPS/offline checks including allergy blocking, send-report recovery, declines, stale IDs, alternative/duplicate/conflicting offers and acknowledgement guards. These checks send no SMS. `test-results/` holds local JSON reports, screenshots and failure traces (ignored). Browser tests run against `dist`, so rebuild after changing application code.

## Training and evaluation

Retesting guidance is available under **Diagnostics → When to retest**, with links on Home and operator profiles. Repeat affected checks after app/message changes, new phones/carriers, or lost offline files; elapsed time alone does not require another SMS test. The guide works offline and does not record or approve physical/human evidence.

New independent-data tooling: [corpus-workflow.md](docs/corpus-workflow.md) explains reviewed source labels, frozen author/family partitions, isolated candidate training, Python/JS parity and source-stratified learned/keyword evaluation. Run `npm run check:corpus` with the development Python environment for its repeatable positive/refusal checks. Candidate files stay under ignored `ml/generated/`; the deployed seed is preserved. [remaining-work.md](docs/remaining-work.md) maps unfinished evidence gates to the people/devices/data they require.

See [ml/README.md](ml/README.md). Shared TypeScript features, group-isolated train/dev/test splits, development-only C/threshold tuning, genuine multinomial and six binary logistic regressions, little-endian float32 export, hash validation and Python/JS parity. The current corpus has 336 developer-authored synthetic examples; human collection and blind-author validation remain pending. Do not interpret synthetic scores as visitor performance.

## Handoff

- [Phase sequence and gates](docs/phase-gates.md)
- [Architecture and boundaries](docs/architecture.md)
- [Exact SMS protocol](docs/sms-protocol.md)
- [Draft Bangla operator guide](docs/operator-guide-bn.md)
- [Vercel deployment instructions](docs/deployment-vercel.md)
- [Fair comparison/comprehension protocols](docs/evaluation-protocol.md)
- [Model / data cards](ml/model-card.md) · [dataset](ml/dataset-card.md)
- [External verification checklist](docs/external-verification.md)
- [Demo script](docs/demo-script.md)

The supplied implementation plan is preserved as LOCALRELAY_IMPLEMENTATION_PLAN.md. The implementation branch is `codex/localrelay` for review. The separate Vercel test project is deployed at https://localrelay-test.vercel.app; the user-reported Android/Grameenphone pilot is recorded separately, while formal basic-phone/carrier and human studies remain pending. Existing parent workspace files were preserved.
