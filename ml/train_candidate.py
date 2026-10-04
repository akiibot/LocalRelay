"""Train an isolated candidate from a reviewed, explicitly partitioned corpus.

This does not mutate the deployed v1 model or promote a candidate to release.
Feature extraction and split validation run first through corpus:prepare.
"""
import argparse
import hashlib
import json
import platform
import unicodedata
from pathlib import Path

import numpy as np
import scipy
from scipy.sparse import csr_matrix
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score

INTENTS = ['booking_request', 'availability_query', 'price_query', 'change_cancel',
           'directions_transport', 'other_tourism', 'unsupported']
REQS = ['vegetarian', 'transport', 'accessibility', 'allergy_or_medical',
        'payment_condition', 'other_extra_detail']


def train(directory):
    root = Path(directory).resolve()
    if Path('ml/generated').resolve() not in root.parents:
        raise ValueError('Only ignored candidate subdirectories of ml/generated are permitted.')
    out = root / 'model'
    if out.exists():
        raise ValueError('Candidate model already exists; prepare a new version directory.')
    feature_bytes = (root / 'features.json').read_bytes()
    records = json.loads(feature_bytes)
    splits = json.loads((root / 'splits.json').read_text())
    if hashlib.sha256(feature_bytes).hexdigest() != splits.get('featuresSha256'):
        raise ValueError('Prepared features changed after freezing; prepare a new candidate.')
    lookup = {r['id']: i for i, r in enumerate(records)}
    if len(lookup) != len(records):
        raise ValueError('Duplicate dataset IDs.')
    assigned, owners = set(), {}
    parts = {}
    for name in ('train', 'dev', 'test'):
        parts[name] = []
        for rid in splits[name]:
            if rid not in lookup or rid in assigned:
                raise ValueError('Unknown/repeated split ID.')
            assigned.add(rid)
            i = lookup[rid]
            r = records[i]
            if r['source'] not in ('synthetic', 'human_authored', 'consented_real'):
                raise ValueError('Unknown source provenance.')
            if r['source'] != 'synthetic' and r['reviewStatus'] != 'reviewed':
                raise ValueError('Review real/human annotations before fitting.')
            identities = [('authorGroup', r['authorGroup']), ('paraphraseFamily', r['paraphraseFamily']),
                          ('text', ' '.join(unicodedata.normalize('NFKC', r['text']).lower().split()))]
            for identity in identities:
                if identity in owners and owners[identity] != name:
                    raise ValueError('Author/family split leakage.')
                owners[identity] = name
            parts[name].append(i)
    if len(assigned) != len(records):
        raise ValueError('Every record needs an explicit partition.')
    for name, indices in parts.items():
        if {records[i]['intent'] for i in indices} != set(INTENTS):
            raise ValueError(f'All seven intents need coverage in {name}; do not invent missing labels.')
    indptr, indices, values = [0], [], []
    for r in records:
        indices.extend(r['indices'])
        values.extend(r['values'])
        indptr.append(len(indices))
    x = csr_matrix((values, indices, indptr), shape=(len(records), 8192), dtype=np.float64)
    y = np.array([INTENTS.index(r['intent']) for r in records])
    req = np.array([[int(k in r['requirements']) for k in REQS] for r in records])
    tr, dv, te = [parts[k] for k in ('train', 'dev', 'test')]
    for k, label in enumerate(REQS):
        for name, selected in parts.items():
            if set(req[selected, k]) != {0, 1}:
                raise ValueError(f'{label} requires positive and negative labels in {name}.')
    best = None
    for c in (.1, 1, 10, 100):
        m = LogisticRegression(C=c, max_iter=1500, solver='lbfgs', random_state=17).fit(x[tr], y[tr])
        score = f1_score(y[dv], m.predict(x[dv]), average='macro')
        if best is None or score > best[0]:
            best = (score, c, m)
    _, chosen_c, intent = best
    heads, thresholds, chosen = [], [], []
    for k in range(6):
        best = None
        for c in (.1, 1, 10, 100):
            m = LogisticRegression(C=c, max_iter=1500, random_state=17, class_weight='balanced').fit(x[tr], req[tr, k])
            scores = m.predict_proba(x[dv])[:, 1]
            for threshold in (.25, .35, .45, .5, .6, .7):
                score = f1_score(req[dv, k], scores >= threshold, zero_division=0)
                if best is None or score > best[0]:
                    best = (score, c, threshold, m)
        _, c, threshold, m = best
        heads.append(m)
        thresholds.append(threshold)
        chosen.append(c)
    probabilities = intent.predict_proba(x[dv])
    ordered = np.sort(probabilities, axis=1)
    options = []
    for minimum in (.25, .35, .45, .55, .65, .75, .85):
        for margin in (.05, .1, .15, .25):
            accepted = (ordered[:, -1] >= minimum) & (ordered[:, -1] - ordered[:, -2] >= margin)
            if accepted.sum() and (probabilities.argmax(axis=1)[accepted] == y[dv][accepted]).mean() >= .95:
                options.append((int(accepted.sum()), -minimum, -margin, minimum, margin))
    _, _, _, intent_min, margin_min = max(options) if options else (0, 0, 0, .9, .3)
    w = np.concatenate([intent.coef_, np.concatenate([m.coef_ for m in heads])]).astype('<f4')
    b = np.concatenate([intent.intercept_, np.concatenate([m.intercept_ for m in heads])]).astype('<f4')
    blob = w.tobytes() + b.tobytes()
    digest = hashlib.sha256(blob).hexdigest()
    metadata = dict(version='candidate-v1-' + digest[:12], featureVersion='fnv1a-8192-v1',
                    features=8192, rows=13, byteLength=len(blob), weightsOffset=0, biasesOffset=8192*13*4,
                    sha256=digest, intentLabels=INTENTS, requirementLabels=REQS, thresholds=thresholds,
                    intentMin=intent_min, marginMin=margin_min,
                    provenance='Isolated candidate; source/review labels supplied by collectors, not verified by software',
                    datasetSha256=splits['datasetSha256'], regularization=dict(intent=chosen_c, requirements=chosen),
                    trainingVersions=dict(python=platform.python_version(), numpy=np.__version__,
                                          scipy=scipy.__version__, sklearn=sklearn.__version__))
    # Report sources separately. Runtime-compatible JS evaluation adds baseline/parser metrics.
    strata = {}
    for source in ('synthetic', 'human_authored', 'consented_real'):
        selected = [i for i in te if records[i]['source'] == source]
        strata[source] = dict(n=len(selected), authorGroups=len({records[i]['authorGroup'] for i in selected}))
        if selected:
            predicted = intent.predict(x[selected])
            strata[source].update(intentMacroF1=float(f1_score(y[selected], predicted, labels=range(7), average='macro', zero_division=0)),
                                  intent=classification_report(y[selected], predicted, labels=range(7), target_names=INTENTS, output_dict=True, zero_division=0),
                                  confusionMatrix=confusion_matrix(y[selected], predicted, labels=range(7)).tolist())
        else:
            strata[source].update(intentMacroF1=None, intent=None, confusionMatrix=None)
    fixtures = []
    for i in te[:30]:
        logits = np.asarray(x[i] @ w.T).ravel() + b
        p = np.exp(logits[:7] - max(logits[:7]))
        p /= p.sum()
        fixtures.append(dict(id=records[i]['id'], scores=np.concatenate([p, 1/(1+np.exp(-logits[7:]))]).tolist()))
    out.mkdir()
    (out / 'weights.bin').write_bytes(blob)
    (out / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    (out / 'parity.json').write_text(json.dumps(fixtures, indent=2) + '\n')
    (out / 'training-report.json').write_text(json.dumps(dict(
        datasetSha256=splits['datasetSha256'], counts={k: len(v) for k, v in parts.items()},
        sourceStrata=strata, thresholdsChosenOn='dev only', releaseApproved=False,
        note='Candidate only; no promotion. Test labels must not be used for subsequent tuning.'), indent=2) + '\n')
    print(json.dumps(dict(output=str(out), version=metadata['version'], bytes=len(blob), sourceStrata=strata), indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', help='New prepared candidate directory under ml/generated')
    train(parser.parse_args().directory)
