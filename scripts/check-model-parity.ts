import { readFile, writeFile } from "node:fs/promises";
import { verifyModel, predict } from "../src/ai/model";
import { intents, requirements } from "../src/ai/features";
const metadata = JSON.parse(
  await readFile("public/models/v1/metadata.json", "utf8"),
);
const b = await readFile("public/models/v1/weights.bin");
const model = await verifyModel(
  metadata,
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
);
const fixtures = JSON.parse(
  await readFile("tests/fixtures/parity.json", "utf8"),
) as { text: string; scores: number[] }[];
let max = 0;
for (const fixture of fixtures) {
  const s = predict(model, fixture.text);
  const values = [
    ...intents.map((k) => s.intent[k]),
    ...requirements.map((k) => s.requirements[k]),
  ];
  values.forEach(
    (v, i) => (max = Math.max(max, Math.abs(v - fixture.scores[i]))),
  );
}
if (max > 1e-4) throw new Error(`Parity failed: ${max}`);
const report = {
  fixtureCount: fixtures.length,
  maxAbsoluteDifference: max,
  tolerance: 1e-4,
  passed: true,
};
await writeFile("ml/parity.json", JSON.stringify(report, null, 2));
console.log(report);
