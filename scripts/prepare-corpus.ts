import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";
import { features } from "../src/ai/features";
import {
  readCorpus,
  splitSchema,
  validateSplit,
} from "../src/evaluation/corpus";
const [dataset, manifest, output] = process.argv.slice(2);
if (!dataset || !manifest || !output)
  throw new Error(
    "Usage: npm run corpus:prepare -- corpus.jsonl splits.json ml/generated/candidate-1",
  );
const dest = resolve(output);
if (
  relative(resolve("ml/generated"), dest).startsWith("..") ||
  dest === resolve("ml/generated")
)
  throw new Error(
    "Candidate output must be a new subdirectory of ml/generated; deployed artifacts cannot be overwritten.",
  );
const input = await readFile(dataset);
const records = readCorpus(input.toString("utf8"));
const split = splitSchema.parse(JSON.parse(await readFile(manifest, "utf8")));
const datasetSha256 = createHash("sha256").update(input).digest("hex");
if (split.datasetSha256 && split.datasetSha256 !== datasetSha256)
  throw new Error("Dataset changed since the split was frozen.");
validateSplit(records, split);
const vectors = records.map((r) => {
  const vector = features(r.text),
    indices: number[] = [],
    values: number[] = [];
  vector.forEach((v, i) => {
    if (v) {
      indices.push(i);
      values.push(v);
    }
  });
  return { ...r, indices, values };
});
await mkdir(resolve("ml/generated"), { recursive: true });
await mkdir(dest); // Refuse accidental replacement of an earlier candidate.
const serialized = JSON.stringify(vectors);
const featuresSha256 = createHash("sha256").update(serialized).digest("hex");
await writeFile(resolve(dest, "features.json"), serialized);
await writeFile(
  resolve(dest, "splits.json"),
  JSON.stringify({ ...split, datasetSha256, featuresSha256 }, null, 2) + "\n",
);
await writeFile(
  resolve(dest, "provenance.json"),
  JSON.stringify(
    {
      datasetSha256,
      counts: Object.fromEntries(
        ["synthetic", "human_authored", "consented_real"].map((s) => [
          s,
          records.filter((r) => r.source === s).length,
        ]),
      ),
      note: "Source labels and review attestations are supplied by the collector, not independently verified by this tool. Raw text stays in ignored local candidate files.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    { records: records.length, datasetSha256, output: dest },
    null,
    2,
  ),
);
