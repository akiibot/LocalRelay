# Reproducible Small AI pipeline

Development-only Python. Tested: Python 3.14.0, NumPy 2.5.3, SciPy 1.18.1, scikit-learn 1.9.1. Full installed versions are frozen in requirements.txt. Frontend production builds use committed artifacts and do not run Python.

From repository root:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r ml/requirements.txt
# Optional: regenerate the labelled synthetic seed (not human evidence).
.venv/bin/python ml/seed.py
npm run ml:features
.venv/bin/python ml/train.py
.venv/bin/python ml/evaluate.py
.venv/bin/python ml/export_model.py
npm run ml:parity
npm run build
npm run check:budgets
```

train.py validates author/family connected-component split separation and produces splits.json, evaluation.json, metadata.json, weights.bin and Python score fixtures. `evaluate.py` reads the frozen report; it does not quietly tune the model. `export_model.py` verifies the exported binary; training performs the actual export. C and score thresholds use development data only. Intent routing score/margin select development precision ≥.95 with maximum accepted count; these are uncalibrated scores. Binary thresholds optimize development F1, with conservative rules and mandatory visitor confirmation layered on top.

**Do not reuse model version paths for changed deployed bytes.** Current `/models/v1/` is the frozen first seed snapshot, now deployed on the test origin. On retraining for a published application, create a new directory, update load paths/precache, metadata version, parity fixtures and cards. Mutable cache headers currently revalidate model files; content hashes and Workbox revisioning still detect changes. Do not relabel seed-v1 as approved based only on software checks.

The frozen seed schema is validated by build-features.ts. Synthetic authorGroup values describe generator families, not real authors. The original `train.py` remains a seed-only reproduction command. For new consented/human data, use [../docs/corpus-workflow.md](../docs/corpus-workflow.md): shared schema/features, explicit group-isolated frozen partitions, `train_candidate.py`, candidate parity and source-stratified learned/keyword evaluation are now implemented. Deidentify and obtain permission before collecting/exporting; review human/real annotations and keep 60–100 blind messages from unseen authors. Candidate training cannot overwrite deployed v1 artifacts and does not establish source authenticity or release approval.

The current fixed test split is small and has already been inspected. Improving this seed must use new independent evaluation data; do not tune until the same test score looks good. The first model failed its intent target and is frozen as a transparent development baseline.
