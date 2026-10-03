import { readFile } from "node:fs/promises";
import { resultSchema, summaries } from "../src/evaluation/study";
const input = process.argv[2];
if (!input)
  throw new Error(
    "Usage: node --import tsx scripts/summarize-study.ts export.json",
  );
const exported = JSON.parse(await readFile(input, "utf8"));
const rows = (exported.results as unknown[]).map((r) => resultSchema.parse(r));
console.log(
  JSON.stringify(
    {
      taskCount: rows.length,
      participantCount: new Set(rows.map((r) => r.participant)).size,
      participantLevel: summaries(rows),
    },
    null,
    2,
  ),
);
