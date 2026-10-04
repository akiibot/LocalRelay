import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readCorpus } from "../src/evaluation/corpus";
import { verifyModel, predict } from "../src/ai/model";
import { intents, requirements } from "../src/ai/features";
const [dataset, directory] = process.argv.slice(2);
if (!dataset || !directory)
  throw new Error(
    "Usage: npm run corpus:parity -- corpus.jsonl ml/generated/candidate-1/model",
  );
const input = await readFile(dataset);
const records = new Map(
  readCorpus(input.toString("utf8")).map((r) => [r.id, r]),
);
const bytes = await readFile(join(directory, "weights.bin"));
const model = await verifyModel(
  JSON.parse(await readFile(join(directory, "metadata.json"), "utf8")),
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
const metadata = JSON.parse(
  await readFile(join(directory, "metadata.json"), "utf8"),
);
assert.equal(
  createHash("sha256").update(input).digest("hex"),
  metadata.datasetSha256,
  "Corpus changed after training.",
);
const fixtures = JSON.parse(
  await readFile(join(directory, "parity.json"), "utf8"),
) as { id: string; scores: number[] }[];
assert.ok(fixtures.length, "No parity fixtures.");
let maxAbsoluteDifference = 0;
for (const fixture of fixtures) {
  const record = records.get(fixture.id);
  assert.ok(record, "Fixture ID absent from corpus.");
  const score = predict(model, record.text);
  const actual = [
    ...intents.map((k) => score.intent[k]),
    ...requirements.map((k) => score.requirements[k]),
  ];
  assert.equal(fixture.scores.length, actual.length);
  actual.forEach((v, i) => {
    assert.ok(Number.isFinite(fixture.scores[i]));
    maxAbsoluteDifference = Math.max(
      maxAbsoluteDifference,
      Math.abs(v - fixture.scores[i]),
    );
  });
}
const report = {
  modelVersion: model.metadata.version,
  fixtureCount: fixtures.length,
  maxAbsoluteDifference,
  tolerance: 1e-4,
  passed: maxAbsoluteDifference <= 1e-4,
};
await writeFile(
  join(directory, "parity-result.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
assert.ok(report.passed, "Exported Python/JS probability parity failed.");
