# External verification checklist

- [ ] Recruit ≥5 actual operators; test whether communication causes lost enquiries, SMS versus calls, response-code learning, single-service profile and visitor SIM assumptions. Record consented notes without identifiers.
- [ ] Two independent native Bangla reviewers: every template and operator card, exact semantics, date/numeral conventions, standard meals and full price, blind back-translation where possible. No approval claim until both completed.
- [ ] Native comprehension: ≥8 participants ×6 messages on target basic phone, no English source, standardized onboarding/random order, unassisted answers/replies/help/timing/confident errors. Record raw denominators.
- [ ] Visitor baseline: ≥16 participants ×4 tasks, two per mode, counterbalanced order, matched scenarios, complete timing including typing, blinded correctness, failures included.
- [ ] Independent ML corpus: 400–600 consented/deidentified or independently authored messages, 8–12 authors, 60–100 blind unseen-author records; group isolation; source-stratified results; improve failed intent target using new data.
- [ ] Target low-end Android: HTTPS install, preparation, airplane-mode full close/reopen, 20 complete scripted flows, cached worker/model startup, storage denial/eviction/update recovery.
- [ ] ≥50 cold/warm performance observations on named low-end Android; keep failures and separate worker load/RPC/inference; warm p95 target <500ms.
- [ ] Real smartphone + Bangla basic phone + consented SIMs, one carrier path minimum, two models/carriers/cross-carrier stronger. ≥20 varied request messages; full offer/acceptance/acknowledgement, raw sent/received text and delays.
- [ ] Actual Bangla conjunct/vowel mark rendering; maximum supported requests and single-segment route behaviour; separate 70/71-unit boundary fixtures; carrier charges and total exchange segment count.
- [ ] Cancel native composer, delayed/duplicate replies, temporary signal loss, copy fallback, sender check and mismatched acknowledgement on physical phones.
- [x] Vercel test-project deployment: https://localrelay-test.vercel.app, repository root/Vite/Node 24.x, successful remote npm ci/build. Actual route responses, missing-model 404, CSP/MIME/cache headers and offline startup/local AI/agreement checked in fresh desktop Chromium. Physical Android reopening remains pending separately; evidence in deployment-checks.json.
- [ ] Physical demonstration recording, including a clarification/failure case; no simulator passed off as real carrier exchange.

Blank logs are provided alongside this file. Software/browser/model-fixture results cannot check off physical or human evidence items. The hosting item records deployed desktop-browser verification only.
