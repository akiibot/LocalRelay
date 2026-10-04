import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  readCorpus,
  splitSchema,
  validateSplit,
  keywordBaseline,
  classificationMetrics,
  binaryMetrics,
  evaluateParser,
} from "../src/evaluation/corpus";
import { intents, requirements } from "../src/ai/features";
import { verifyModel, predict } from "../src/ai/model";
import { operatorSchema } from "../src/domain/schema";
import profiles from "../public/data/operators/demo.json";
const [dataset, manifest, output, modelDirectory = "public/models/v1"] =
  process.argv.slice(2);
if (!dataset || !manifest || !output)
  throw new Error(
    "Usage: npm run corpus:evaluate -- corpus.jsonl frozen-splits.json report.json [model-directory]",
  );
const input = await readFile(dataset);
const records = readCorpus(input.toString("utf8"));
const split = splitSchema.parse(JSON.parse(await readFile(manifest, "utf8")));
const datasetSha256 = createHash("sha256").update(input).digest("hex");
if (split.datasetSha256 !== datasetSha256)
  throw new Error(
    "A matching frozen dataset hash is required; prepare the corpus first.",
  );
validateSplit(records, split);
const bytes = await readFile(join(modelDirectory, "weights.bin"));
const model = await verifyModel(
  JSON.parse(await readFile(join(modelDirectory, "metadata.json"), "utf8")),
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
const selected = new Set(split.test);
const rows = records
  .filter((r) => selected.has(r.id))
  .map((r) => {
    const score = predict(model, r.text),
      baseline = keywordBaseline(r.text);
    const p = profiles.find((p) => p.id === r.evaluationContext?.operatorId);
    return {
      id: r.id,
      source: r.source,
      authorGroup: r.authorGroup,
      reviewStatus: r.reviewStatus,
      truthIntent: r.intent,
      predictedIntent: score.topIntent,
      baselineIntent: baseline.intent,
      truthRequirements: r.requirements,
      predictedRequirements: requirements.filter(
        (k) => score.requirements[k] >= score.thresholds[k],
      ),
      baselineRequirements: baseline.requirements,
      parser: evaluateParser(r, score, p ? operatorSchema.parse(p) : undefined),
    };
  });
function summarize(selectedRows: typeof rows) {
  const annotated = selectedRows.flatMap((r) =>
    r.parser.annotated ? [r.parser] : [],
  );
  const sum = (
    key:
      | "candidates"
      | "correctCandidates"
      | "knownFields"
      | "extractedKnownFields",
  ) => annotated.reduce((n, r) => n + r[key], 0);
  const ratio = (n: number, d: number) => (d ? n / d : null);
  const unsupported = annotated.filter((r) => r.unsupportedExpected);
  const ambiguous = annotated.filter((r) => r.clarificationExpected);
  return {
    n: selectedRows.length,
    authors: new Set(selectedRows.map((r) => r.authorGroup)).size,
    learnedIntent: classificationMetrics(
      selectedRows.map((r) => r.truthIntent),
      selectedRows.map((r) => r.predictedIntent),
      intents,
    ),
    keywordIntent: classificationMetrics(
      selectedRows.map((r) => r.truthIntent),
      selectedRows.map((r) => r.baselineIntent),
      intents,
    ),
    requirements: Object.fromEntries(
      requirements.map((k) => [
        k,
        {
          learned: binaryMetrics(
            selectedRows.map((r) => r.truthRequirements.includes(k)),
            selectedRows.map((r) => r.predictedRequirements.includes(k)),
          ),
          keyword: binaryMetrics(
            selectedRows.map((r) => r.truthRequirements.includes(k)),
            selectedRows.map((r) => r.baselineRequirements.includes(k)),
          ),
        },
      ]),
    ),
    parser: {
      annotatedRecords: annotated.length,
      unscoredRecords: selectedRows.length - annotated.length,
      candidates: sum("candidates"),
      correctCandidates: sum("correctCandidates"),
      candidatePrecision: ratio(sum("correctCandidates"), sum("candidates")),
      knownFields: sum("knownFields"),
      extractedKnownFields: sum("extractedKnownFields"),
      coverage: ratio(sum("extractedKnownFields"), sum("knownFields")),
      invalidSpanRecords: annotated.filter((r) => !r.sourceSpansValid).length,
      ambiguousRecords: ambiguous.length,
      ambiguousWithoutClarification: ambiguous.filter(
        (r) => !r.clarificationDetected,
      ).length,
      unsupportedRecords: unsupported.length,
      unsupportedFalseAcceptance: unsupported.filter(
        (r) => r.unsupportedFalseAcceptance,
      ).length,
      unsupportedFalseAcceptanceRate: ratio(
        unsupported.filter((r) => r.unsupportedFalseAcceptance).length,
        unsupported.length,
      ),
      preReviewAllowed: annotated.filter((r) => r.reviewAllowed).length,
      postReviewCriticalErrors: null,
    },
  };
}
const report = {
  recordedAt: new Date().toISOString(),
  datasetSha256,
  modelVersion: model.metadata.version,
  modelSha256: model.metadata.sha256,
  partition: "test",
  splitIsolationPassed: true,
  note: "Offline evaluation only; no text is uploaded and report omits original text. Source/review labels are collector attestations. Synthetic and human/real denominators remain separate. Candidate exposure does not establish post-review correctness, native comprehension or carrier delivery. No automatic release approval.",
  sourceStrata: Object.fromEntries(
    ["synthetic", "human_authored", "consented_real"].map((s) => [
      s,
      summarize(rows.filter((r) => r.source === s)),
    ]),
  ),
  cases: rows,
};
await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify(
    {
      output,
      modelVersion: report.modelVersion,
      strata: Object.fromEntries(
        Object.entries(report.sourceStrata).map(([k, v]) => [
          k,
          {
            n: v.n,
            learnedMacroF1: v.learnedIntent.macroF1,
            keywordMacroF1: v.keywordIntent.macroF1,
            parser: v.parser,
          },
        ]),
      ),
    },
    null,
    2,
  ),
);
