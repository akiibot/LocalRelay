# Remaining work after software verification

The application and repeatable developer checks are implemented. The demo can be presented now using the isolated SMS simulator and the filled synthetic-review examples at `/evaluation?review=bangla&demo=1`; the gates below concern actual field validation rather than completion of the demonstration. The working pilot remains **manual-first with experimental AI and unreviewed Bangla**. The user-reported Galaxy A55 ↔ Redmi Note 11 Grameenphone exchange is retained; no additional phone tests are required to repeat desktop software QA.

| Remaining gate | Prepared software/material | Required external input |
|---|---|---|
| Reliable AI routing | Frozen baseline, isolated candidate trainer, hash/group checks, source-stratified parser/model and keyword ablation, parity | New independently collected/reviewed enquiries and unseen-author evaluation; current model fails |
| Natural, comprehensible Bangla | Offline independent-review page with six frozen items and pseudonymous JSON export, proposed organized draft, operator guide and blank comprehension log | Two independent native reviewers, then ≥8 participants ×6 messages on a real target phone |
| Basic-phone/carrier proof | SMS adapters, guarded replies, simulator, encoding checks, physical log | ≥20 varied actual exchanges with basic phones, exact sent/received text, rendering/segment/delay/cancel/copy/signal-loss observations |
| Visitor benefit | Consented local study UI, four tasks, 2 AI/2 form assignment, timing/scoring/deidentified export | ≥16 visitor-like participants ×4 tasks; retain failures and independently grade critical fields |
| Operator problem fit | Interview topics and narrow one-service profile | ≥5 consented operator interviews |
| Low-end Android usability | Offline/eviction/update tests, diagnostics timing/export, keyboard/layout checks | Named low-end handset, ≥50 actual timing observations, install/reopen and manual assistive-use audit |
| Demonstration | Deployment, honest demo script, saved pilot notes | Real workflow recording with consented phones/people; a browser video cannot substitute |

Detailed targets and blank logs are in `external-verification.md` and `evaluation-protocol.md`. The independent-data commands are in `corpus-workflow.md`. User reports, browser checks, synthetic data and actual participant observations remain separate.

No GitHub merge or promotion to an approved production service is inferred from successful software checks. Review the draft PR and use the existing test deployment; unresolved evidence gates remain visibly open.
