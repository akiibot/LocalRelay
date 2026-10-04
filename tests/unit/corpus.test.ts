// @vitest-environment node
import { it, expect } from "vitest";
import {
  readCorpus,
  validateSplit,
  classificationMetrics,
  binaryMetrics,
  keywordBaseline,
  evaluateParser,
  type CorpusRecord,
} from "../../src/evaluation/corpus";
import { intents } from "../../src/ai/features";
import { readFile } from "node:fs/promises";
import { verifyModel, predict } from "../../src/ai/model";
import profiles from "../../public/data/operators/demo.json";
import { operatorSchema } from "../../src/domain/schema";
function record(id: string): CorpusRecord {
  return {
    id,
    authorGroup: `author-${id}`,
    paraphraseFamily: `family-${id}`,
    source: "synthetic",
    text: `Price enquiry ${id}`,
    intent: "price_query",
    requirements: [],
    expectedFields: {},
    expectedClarifications: [],
    expectedUnsupportedDetails: [],
    reviewStatus: "unreviewed",
  };
}
const split = { train: ["a"], dev: ["b"], test: ["c"] };
it("rejects malformed, duplicate and empty corpus records without echoing text", () => {
  expect(() => readCorpus("")).toThrow("empty");
  expect(() =>
    readCorpus(JSON.stringify({ ...record("a"), text: "x".repeat(501) })),
  ).toThrow("Invalid corpus");
  expect(() =>
    readCorpus(
      [record("a"), record("a")].map((r) => JSON.stringify(r)).join("\n"),
    ),
  ).toThrow("Duplicate");
});
it("isolates author, paraphrase and normalized duplicate text across explicit partitions", () => {
  const rows = [record("a"), record("b"), record("c")];
  expect(() => validateSplit(rows, split)).not.toThrow();
  for (const key of ["authorGroup", "paraphraseFamily", "text"] as const) {
    const leaking = rows.map((r) => ({ ...r }));
    leaking[2][key] = rows[0][key];
    if (key === "text") leaking[2].text = ` ${rows[0].text.toUpperCase()}  `;
    expect(() => validateSplit(leaking, split)).toThrow("leakage");
  }
  expect(() => validateSplit(rows, { ...split, test: ["c", "a"] })).toThrow(
    "Repeated",
  );
  expect(() => validateSplit(rows, { ...split, test: ["unknown"] })).toThrow(
    "Unknown",
  );
  expect(() => validateSplit([...rows, record("d")], split)).toThrow(
    "Every corpus",
  );
});
it("keeps a mixed-intent author component together and requires reviewed human annotations", () => {
  const rows = [
    record("a"),
    {
      ...record("d"),
      authorGroup: "author-a",
      intent: "booking_request" as const,
    },
    record("b"),
    record("c"),
  ];
  expect(() =>
    validateSplit(rows, { ...split, train: ["a", "d"] }),
  ).not.toThrow();
  const human = [
    record("a"),
    record("b"),
    { ...record("c"), source: "human_authored" as const },
  ];
  expect(() => validateSplit(human, split)).toThrow("require review");
  human[2].reviewStatus = "reviewed";
  expect(() => validateSplit(human, split)).not.toThrow();
});
it("reports null empty denominators, false positives and missing class coverage", () => {
  const empty = classificationMetrics([], [], intents);
  expect(empty.macroF1).toBeNull();
  expect(empty.allClassesRepresented).toBe(false);
  const m = classificationMetrics(
    ["price_query", "price_query"],
    ["price_query", "unsupported"],
    intents,
  );
  expect(m.perClass.find((r) => r.label === "price_query")).toMatchObject({
    support: 2,
    correct: 1,
    recall: 0.5,
  });
  expect(m.allClassesRepresented).toBe(false);
  expect(binaryMetrics([false], [true])).toMatchObject({
    positives: 0,
    falsePositive: 1,
    precision: 0,
    recall: null,
  });
  expect(binaryMetrics([], []).f1).toBeNull();
});
it("runs the keyword intent and requirement ablation including vegetarian negation", () => {
  expect(
    keywordBaseline("Price for one vegetarian guest with peanut allergy"),
  ).toMatchObject({
    intent: "price_query",
    requirements: ["vegetarian", "allergy_or_medical"],
  });
  expect(
    keywordBaseline("Not vegetarian; standard meals are fine.").requirements,
  ).not.toContain("vegetarian");
  expect(keywordBaseline("Cancel and refund our deposit")).toMatchObject({
    intent: "change_cancel",
    requirements: ["payment_condition"],
  });
});
it("does not score empty seed labels as perfect parser coverage; counts unwanted candidates against precision", async () => {
  const bytes = await readFile("public/models/v1/weights.bin");
  const model = await verifyModel(
    JSON.parse(await readFile("public/models/v1/metadata.json", "utf8")),
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  const r = {
    ...record("a"),
    text: "Two adults and one child on 2026-10-11 at 3 pm. One vegetarian meal.",
    evaluationContext: {
      clock: "2026-10-04T10:00:00Z",
      operatorId: "demo-craft",
    },
  };
  const scores = predict(model, r.text),
    p = operatorSchema.parse(profiles[0]);
  expect(evaluateParser(r, scores, p).annotated).toBe(false);
  const result = evaluateParser(
    {
      ...r,
      expectedFields: {
        localDate: "2026-10-11",
        localTime: "15:00",
        adults: null,
        children: 1,
        vegetarianMeals: 1,
      },
    },
    scores,
    p,
  );
  expect(result).toMatchObject({
    annotated: true,
    candidates: 5,
    correctCandidates: 4,
    knownFields: 4,
    extractedKnownFields: 4,
    sourceSpansValid: true,
  });
});
