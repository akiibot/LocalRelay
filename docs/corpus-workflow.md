# Independent data and candidate-model workflow

The deployed seed model fails the quality target. This workflow supplies the missing software for new, independently collected data; it does not supply people, attest to consent, or turn synthetic enquiries into human evidence. Keep `/models/v1` frozen. No automatic promotion or threshold reduction is performed.

## 1. Collect and review records

Arrange 400–600 independently written/deidentified enquiries from 8–12 authors. Reserve 60–100 messages from unseen authors before development. Obtain permission for real enquiry examples, remove identifying material, and use pseudonymous IDs. Keep private raw text and consent records outside Git. The tools have no upload step; candidate files under `ml/generated/` are ignored.

Use one JSON object per line. Required fields match the original specification. `source` is `synthetic`, `human_authored` or `consented_real`; machine-generated fixtures belong to `synthetic`. Review human/real intent, requirement and parser annotations before running the tools. Source and review labels are collector attestations, not independently checked by software.

Illustrative **synthetic** record, not a human example:

```json
{"id":"EXAMPLE-1","authorGroup":"synthetic-example-author","paraphraseFamily":"synthetic-example-family","source":"synthetic","text":"Price for two adults and one child on 2026-10-11 at 3 pm. One vegetarian meal.","intent":"price_query","requirements":["vegetarian"],"expectedFields":{"localDate":"2026-10-11","localTime":"15:00","adults":2,"children":1,"vegetarianMeals":1},"expectedClarifications":[],"expectedUnsupportedDetails":[],"reviewStatus":"unreviewed","evaluationContext":{"clock":"2026-10-04T10:00:00Z","operatorId":"demo-craft"}}
```

For parser scoring, provide all five `expectedFields` keys. Use `null` where no unambiguous candidate should be offered; it is not an inferred count of zero. `evaluationContext` freezes the clock and selects a bundled profile, making relative dates and past-time validation reproducible. Records lacking complete parser truth/context are **unscored**, with null precision/coverage, rather than counted correct. Candidate precision evaluates the final field proposals, not every raw regex match. Ground-truth clarification/unsupported clauses determine the relevant denominators; post-review critical errors require actual visitor observations and stay null here.

Ensure adequate positive/negative examples for all six requirement heads and every intent class in each partition. Include ambiguous and unsupported enquiries, near misses, negation, conflicts, misspellings, no-meal requests and ordinary supported requests. Do not change blind labels after seeing predictions.

## 2. Freeze partitions

Create `splits.json` with `train`, `dev`, `test` arrays of record IDs. Every record appears exactly once. All records sharing an author or paraphrase family belong to one partition, including authors who write several intents. Normalized identical text cannot cross partitions either. The preparation tool rejects violations and freezes hashes of both the dataset bytes and generated features.

This small shape example is not a sufficient training corpus:

```json
{"train":["TRAIN-1"],"dev":["DEV-1"],"test":["TEST-1"]}
```

The trainer refuses missing intent classes or requirement positive/negative coverage in a partition; collect more data instead of inventing labels. Keep the frozen test partition out of model/feature/threshold selection. Once inspected, its results are an evaluation snapshot, not a fresh blind target for repeated tuning.

## 3. Prepare, train and evaluate locally

From the repository root, after installing the README's Node/Python dependencies:

```sh
npm run corpus:prepare -- /absolute/path/enquiries.jsonl /absolute/path/splits.json ml/generated/candidate-1
.venv/bin/python ml/train_candidate.py ml/generated/candidate-1
npm run corpus:parity -- /absolute/path/enquiries.jsonl ml/generated/candidate-1/model
npm run corpus:evaluate -- /absolute/path/enquiries.jsonl ml/generated/candidate-1/splits.json ml/generated/candidate-1/evaluation.json ml/generated/candidate-1/model
```

Each candidate directory must be new. Prepared/model/evaluation files refuse accidental replacement. The trainer verifies frozen feature bytes and author/family separation again, chooses regularization and thresholds on development data only, and writes compatible float32 coefficients plus ID-based Python parity fixtures. Parity checks both dataset identity and actual JavaScript probabilities.

Evaluation runs the same deployed feature extractor, field parser, validators and model implementation. It reports learned versus fixed keyword intent **and requirement** baselines, per-class sample counts/confusion matrices, precision/coverage, ambiguity misses, unsupported pre-review exposure and source-stratified denominators. Intent macro-F1 uses the fixed seven classes; missing class coverage is shown and cannot approve a release. Empty human/real strata remain null. Report cases omit original enquiry text; nevertheless review all IDs/fields before sharing any output.

To evaluate the current frozen model on a new frozen corpus, omit the final model-directory argument. No retraining or deployment occurs:

```sh
npm run corpus:evaluate -- /absolute/path/enquiries.jsonl ml/generated/candidate-1/splits.json ml/generated/candidate-1/frozen-seed-evaluation.json
```

## 4. Review the candidate before publication

Independent evaluation must meet the specified targets and show supported coverage as well as refusals. Compare against the keyword baseline, inspect critical errors and source sample sizes, and retain failures. Synthetic improvements do not establish real-author performance. Human comprehension, physical SMS, low-end Android performance and visitor comparison still require their own observations.

If a candidate is accepted after review, publish it at a **new** model version path, update worker loading/precache/model cards, then run the full software and deployed-origin checks. This toolchain intentionally does not copy coefficients into `public/` or alter the live app. Keep historical model versions and test results.

## Repeatable tooling check

```sh
npm run check:corpus
```

Uses the existing synthetic seed and original frozen partitions only. It prepares/trains an ignored candidate, reproduces the frozen coefficients, checks 30 Python/JS fixtures, verifies source/unknown denominators, and tests refusal of leaking/changed datasets and overwrites. Results: `docs/corpus-tools-checks.json`. Set `LOCALRELAY_PYTHON` only when the Python executable differs from `.venv/bin/python`; CI uses `python`. This checks tooling, not AI quality.
