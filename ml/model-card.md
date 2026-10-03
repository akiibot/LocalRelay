# LocalRelay model card — seed-v1

Purpose: optional English intent/requirement routing for a bounded single-service Bangla enquiry. Classical logistic regression, not a language model or translator. Visitor review is mandatory; rules extract dates/counts, fixed templates render Bangla and strict grammar parses replies.

336 synthetic records, 84 generator families; train 224/56 families, development 56/14, test 56/14. No overlapping authorGroup/paraphraseFamily components. No real visitor, native Bangla, operator or independently authored blind test data. Unreviewed seed annotations. MIT project data licence; no private numbers.

Features: shared TypeScript NFKC/lowercase normalization, word unigrams/bigrams and padded character 3–5-grams, UTF-8 FNV-1a hashing to 8192 bins, L2 normalization. 7 softmax intent rows + 6 sigmoid requirement rows; little-endian float32 row-major coefficients then biases. Binary 426,036 bytes. Metadata specifies hash, version, class order, offsets, dimensions and development thresholds. Finite/size/class-order/hash/feature checks precede inference.

Actual held-out synthetic intent macro-F1 **0.3208228906**, keyword baseline **0.7289170214** on the same 56 test records. Per-class precision/recall/F1/sample counts and confusion matrix are in evaluation.json. Several intent classes have zero test recall. Requirement heads also use repeated synthetic clauses, so high scores on them are not independent evidence. No calibration claim. The .85 intent target is missed; release routing-quality gate remains open. Manual baseline recommended. Do not claim learned-model superiority.

Python versus JavaScript exported-coefficient parity: 30 fixtures, max difference recorded in parity.json (approximately 2.3e-15, tolerance 1e-4). This verifies numerical implementation, not language understanding. Warm inference/round-trip timing tool exists in diagnostics; an actual 50-run desktop Chromium benchmark is in docs/browser-benchmark.json. This is not a low-end Android measurement; handset p95 and cold startup remain pending.

Safety: unsupported lexical rules, learned requirement flags, low-score/margin abstention, explicit date/count choices, completeness review. Unknown unsupported text can escape detection. Non-English Latin-script inputs cannot be identified comprehensively. No accessibility/allergy guarantees, payment logic, general translation or authentication.

Future data: 400–600 independently written/deidentified enquiries from 8–12 authors, 60–100 blind unseen-author messages, native/operator review, explicit challenge labels, parser candidate precision/coverage and unsupported false acceptance evaluation. Do not use the current corpus as proof of field safety.

Guided phone attempt: a normal price enquiry with counts and 02:56 time produced a routing abstention. Reproduced future-date sentence probability .45665 < .55; corrected paraphrase .52546 < .55. See ../docs/ai-routing-regression.json. Parser and manual-fallback fixes do not change coefficients, thresholds or the recorded held-out macro-F1. Manual fallback preserves original requirements and all lexical/learned safety flags; AI uncertainty still blocks AI queueing.
