import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const execute = promisify(execFile);
const python = process.env.LOCALRELAY_PYTHON || ".venv/bin/python";
await mkdir("ml/generated", { recursive: true });
const root = await mkdtemp(resolve("ml/generated/corpus-pipeline-"));
const candidate = join(root, "seed");
const checks = [];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const frozenBefore = sha(await readFile("public/models/v1/weights.bin"));
async function run(program, args) {
  return execute(program, args, { maxBuffer: 4 * 1024 * 1024 });
}
const ts = (file, ...args) =>
  run(process.execPath, ["--import", "tsx", file, ...args]);
async function refused(name, action, expected) {
  try {
    await action();
    assert.fail(`${name} should have failed.`);
  } catch (e) {
    assert.match(`${e.message} ${e.stderr || ""}`, expected);
    checks.push({ name, passed: true });
  }
}
await ts(
  "scripts/prepare-corpus.ts",
  "ml/data/seed.jsonl",
  "ml/splits.json",
  candidate,
);
checks.push({ name: "group-isolated seed preparation", passed: true });
await run(python, ["ml/train_candidate.py", candidate]);
checks.push({ name: "isolated candidate training", passed: true });
await ts(
  "scripts/check-candidate-parity.ts",
  "ml/data/seed.jsonl",
  join(candidate, "model"),
);
checks.push({
  name: "actual Python/JavaScript candidate parity",
  passed: true,
});
await ts(
  "scripts/evaluate-corpus.ts",
  "ml/data/seed.jsonl",
  join(candidate, "splits.json"),
  join(candidate, "evaluation.json"),
  join(candidate, "model"),
);
const evaluation = JSON.parse(
  await readFile(join(candidate, "evaluation.json"), "utf8"),
);
const frozen = JSON.parse(await readFile("ml/evaluation.json", "utf8"));
assert.equal(evaluation.sourceStrata.synthetic.n, 56);
assert.equal(
  evaluation.sourceStrata.synthetic.learnedIntent.macroF1,
  frozen.intentMacroF1,
);
assert.equal(
  evaluation.sourceStrata.synthetic.keywordIntent.macroF1,
  frozen.keywordIntentMacroF1,
);
assert.equal(evaluation.sourceStrata.human_authored.n, 0);
assert.equal(
  evaluation.sourceStrata.consented_real.learnedIntent.macroF1,
  null,
);
assert.equal(evaluation.sourceStrata.synthetic.parser.candidatePrecision, null);
checks.push({
  name: "source strata and unannotated denominators retained",
  passed: true,
});
await refused(
  "prepared candidate cannot be overwritten",
  () =>
    ts(
      "scripts/prepare-corpus.ts",
      "ml/data/seed.jsonl",
      "ml/splits.json",
      candidate,
    ),
  /EEXIST/,
);
await refused(
  "trained candidate cannot be overwritten",
  () => run(python, ["ml/train_candidate.py", candidate]),
  /already exists/,
);
await refused(
  "frozen evaluation cannot be overwritten",
  () =>
    ts(
      "scripts/evaluate-corpus.ts",
      "ml/data/seed.jsonl",
      join(candidate, "splits.json"),
      join(candidate, "evaluation.json"),
    ),
  /EEXIST/,
);
await refused(
  "public artifact destination refused",
  () =>
    ts(
      "scripts/prepare-corpus.ts",
      "ml/data/seed.jsonl",
      "ml/splits.json",
      "public/models/v1",
    ),
  /deployed artifacts cannot be overwritten/,
);
const rows = (await readFile("ml/data/seed.jsonl", "utf8"))
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const split = JSON.parse(await readFile("ml/splits.json", "utf8"));
rows.find((r) => r.id === split.test[0]).authorGroup = rows.find(
  (r) => r.id === split.train[0],
).authorGroup;
const leaking = join(root, "leaking.jsonl");
await writeFile(leaking, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
await refused(
  "author leakage refused",
  () =>
    ts(
      "scripts/prepare-corpus.ts",
      leaking,
      "ml/splits.json",
      join(root, "leaking-candidate"),
    ),
  /Split leakage/,
);
await refused(
  "changed evaluation dataset refused",
  () =>
    ts(
      "scripts/evaluate-corpus.ts",
      leaking,
      join(candidate, "splits.json"),
      join(root, "bad-evaluation.json"),
    ),
  /matching frozen dataset hash/,
);
await refused(
  "changed parity dataset refused",
  () =>
    ts("scripts/check-candidate-parity.ts", leaking, join(candidate, "model")),
  /Corpus changed/,
);
const tampered = join(root, "tampered");
await ts(
  "scripts/prepare-corpus.ts",
  "ml/data/seed.jsonl",
  "ml/splits.json",
  tampered,
);
await writeFile(
  join(tampered, "features.json"),
  (await readFile(join(tampered, "features.json"), "utf8")) + " ",
);
await refused(
  "modified feature bytes refused before fitting",
  () => run(python, ["ml/train_candidate.py", tampered]),
  /Prepared features changed/,
);
assert.equal(sha(await readFile("public/models/v1/weights.bin")), frozenBefore);
const parity = JSON.parse(
  await readFile(join(candidate, "model/parity-result.json"), "utf8"),
);
const report = {
  recordedAt: new Date().toISOString(),
  passed: true,
  checks,
  provenance:
    "Existing 336-record synthetic seed only; no new human or real data and no published model change.",
  frozenModelSha256: frozenBefore,
  candidateModelSha256: evaluation.modelSha256,
  candidateReproducedFrozenWeights: evaluation.modelSha256 === frozenBefore,
  parity,
  sourceCounts: { synthetic: 56, human_authored: 0, consented_real: 0 },
  learnedMacroF1: evaluation.sourceStrata.synthetic.learnedIntent.macroF1,
  keywordMacroF1: evaluation.sourceStrata.synthetic.keywordIntent.macroF1,
  note: "CLI/tooling verification, not a passed AI quality release gate. Generated feature/candidate files stay ignored locally.",
};
await writeFile(
  "docs/corpus-tools-checks.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
