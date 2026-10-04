import { readFile, writeFile, mkdir } from "node:fs/promises";
import { z } from "zod";
import { features, intents, requirements } from "../src/ai/features";
const schema = z.object({
  id: z.string(),
  authorGroup: z.string(),
  paraphraseFamily: z.string(),
  source: z.enum(["consented_real", "human_authored", "synthetic"]),
  text: z.string().min(1).max(500),
  intent: z.enum(intents),
  requirements: z.array(z.enum(requirements)),
  expectedFields: z.record(z.string(), z.unknown()),
  expectedClarifications: z.array(z.string()),
  expectedUnsupportedDetails: z.array(z.string()),
  reviewStatus: z.enum(["unreviewed", "reviewed"]),
});
const records = (await readFile("ml/data/seed.jsonl", "utf8"))
  .trim()
  .split("\n")
  .map((l) => schema.parse(JSON.parse(l)));
if (new Set(records.map((r) => r.id)).size !== records.length)
  throw new Error("Duplicate dataset IDs");
const vectors = records.map((record) => {
  const x = features(record.text);
  const indices: number[] = [],
    values: number[] = [];
  for (let i = 0; i < x.length; i++)
    if (x[i]) {
      indices.push(i);
      values.push(x[i]);
    }
  return { ...record, indices, values };
});
await mkdir("ml/generated", { recursive: true });
await writeFile("ml/generated/features.json", JSON.stringify(vectors));
console.log(
  `Validated and extracted ${vectors.length} records with the runtime TypeScript extractor.`,
);
