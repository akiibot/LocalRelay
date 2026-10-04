import { z } from "zod";
import { intents, requirements, type Scores } from "../ai/features";
import { parseFields } from "../parsing/fields";
import { validateCard } from "../domain/validation";
import type { OperatorProfile } from "../domain/schema";

export const expectedFieldsSchema = z
  .object({
    localDate: z.string().nullable(),
    localTime: z.string().nullable(),
    adults: z.number().nullable(),
    children: z.number().nullable(),
    vegetarianMeals: z.number().nullable(),
  })
  .strict();
export const corpusRecordSchema = z.object({
  id: z.string().min(1),
  authorGroup: z.string().min(1),
  paraphraseFamily: z.string().min(1),
  source: z.enum(["consented_real", "human_authored", "synthetic"]),
  text: z
    .string()
    .min(1)
    .max(500)
    .refine((text) => !!text.trim(), "Empty enquiry"),
  intent: z.enum(intents),
  requirements: z
    .array(z.enum(requirements))
    .refine(
      (a) => new Set(a).size === a.length,
      "Duplicate requirement labels",
    ),
  expectedFields: z.record(z.string(), z.unknown()),
  expectedClarifications: z.array(z.string()),
  expectedUnsupportedDetails: z.array(z.string()),
  reviewStatus: z.enum(["unreviewed", "reviewed"]),
  evaluationContext: z
    .object({
      clock: z.iso.datetime(),
      operatorId: z.string().min(1),
    })
    .optional(),
});
export type CorpusRecord = z.infer<typeof corpusRecordSchema>;
export const splitSchema = z.object({
  datasetSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  featuresSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  train: z.array(z.string()).min(1),
  dev: z.array(z.string()).min(1),
  test: z.array(z.string()).min(1),
});
export type CorpusSplit = z.infer<typeof splitSchema>;
export function readCorpus(input: string): CorpusRecord[] {
  const rows = input
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l, i) => {
      try {
        return corpusRecordSchema.parse(JSON.parse(l));
      } catch {
        throw new Error(`Invalid corpus record on nonblank line ${i + 1}.`);
      }
    });
  if (!rows.length) throw new Error("The corpus is empty.");
  if (new Set(rows.map((r) => r.id)).size !== rows.length)
    throw new Error("Duplicate corpus IDs.");
  return rows;
}

// Explicit, prespecified partitions support mixed-intent author components.
// Sharing either author, paraphrase family or normalized exact text cannot cross partitions.
export function validateSplit(records: CorpusRecord[], split: CorpusSplit) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const assigned = new Set<string>();
  const owners = new Map<string, string>();
  for (const partition of ["train", "dev", "test"] as const) {
    for (const id of split[partition]) {
      const r = byId.get(id);
      if (!r) throw new Error(`Unknown split record: ${id}`);
      if (assigned.has(id)) throw new Error(`Repeated split record: ${id}`);
      assigned.add(id);
      if (r.source !== "synthetic" && r.reviewStatus !== "reviewed")
        throw new Error(
          `Human/real annotations require review before evaluation: ${id}`,
        );
      const keys = [
        `author:${r.authorGroup}`,
        `family:${r.paraphraseFamily}`,
        `text:${r.text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()}`,
      ];
      for (const key of keys) {
        const owner = owners.get(key);
        if (owner && owner !== partition)
          throw new Error(
            `Split leakage between ${owner} and ${partition} at ${id}.`,
          );
        owners.set(key, partition);
      }
    }
  }
  if (assigned.size !== records.length)
    throw new Error(
      "Every corpus record must belong to exactly one partition.",
    );
}

export function keywordBaseline(text: string) {
  const t = text.toLowerCase();
  const rules: [(typeof intents)[number], string[]][] = [
    ["change_cancel", ["cancel", "reschedul", "change", "amend", "undo"]],
    [
      "directions_transport",
      [
        "taxi",
        "bus",
        "train",
        "transport",
        "pickup",
        "pick us up",
        "directions",
        "route map",
      ],
    ],
    [
      "price_query",
      ["price", "cost", "fee", "quote", "charge", "taka", "rate"],
    ],
    [
      "availability_query",
      ["available", "space", "room", "slots", "seats", "full", "open"],
    ],
    [
      "booking_request",
      ["book", "reserv", "register", "sign up", "schedule", "attend", "join"],
    ],
    [
      "other_tourism",
      [
        "museum",
        "village",
        "tourist",
        "weather",
        "hotel",
        "souvenir",
        "crafts",
      ],
    ],
  ];
  const intent =
    rules.find(([, keys]) => keys.some((k) => t.includes(k)))?.[0] ??
    "unsupported";
  const requirementRules = {
    vegetarian: /\bvegetarian\b/i,
    transport:
      /\b(taxi|bus|train|transport|pickup|pick up|pick us up|directions|route map|boat|shuttle|collect us)\b/i,
    accessibility:
      /\b(wheelchair|step[- ]free|accessib\w*|mobility|disabled)\b/i,
    allergy_or_medical:
      /\b(allerg\w*|peanut|medical|medication|diabet\w*|asthma)\b/i,
    payment_condition:
      /\b(pay\w*|refund|deposit|credit card|cash only|discount)\b/i,
    other_extra_detail:
      /\b(vegan|halal|gluten[- ]free|no meals?|birthday|dog|pet|bring|guide|overnight)\b/i,
  };
  return {
    intent,
    requirements: requirements.filter(
      (k) =>
        requirementRules[k].test(t) &&
        !(k === "vegetarian" && /\b(?:not|no) vegetarian\b/i.test(t)),
    ),
  };
}

const ratio = (n: number, d: number) => (d ? n / d : null);
export function classificationMetrics(
  truth: string[],
  predicted: string[],
  labels: readonly string[],
) {
  if (truth.length !== predicted.length)
    throw new Error("Mismatched classification denominator.");
  const matrix = labels.map((a) =>
    labels.map(
      (b) => truth.filter((t, i) => t === a && predicted[i] === b).length,
    ),
  );
  const perClass = labels.map((label, i) => {
    const tp = matrix[i][i],
      support = matrix[i].reduce((a, b) => a + b, 0);
    const offered = matrix.reduce((n, r) => n + r[i], 0);
    return {
      label,
      support,
      predicted: offered,
      correct: tp,
      precision: ratio(tp, offered),
      recall: ratio(tp, support),
      f1: support + offered ? (2 * tp) / (support + offered) : null,
    };
  });
  const represented = perClass.filter((r) => r.support > 0);
  return {
    n: truth.length,
    labels,
    confusionMatrix: matrix,
    perClass,
    // Missing truth classes remain visible; never treat a one-class set as a seven-class release pass.
    macroF1:
      truth.length && labels.length
        ? perClass.reduce((n, r) => n + (r.f1 ?? 0), 0) / labels.length
        : null,
    allClassesRepresented: represented.length === labels.length,
  };
}

export function binaryMetrics(truth: boolean[], predicted: boolean[]) {
  if (truth.length !== predicted.length)
    throw new Error("Mismatched requirement denominator.");
  const tp = truth.filter((t, i) => t && predicted[i]).length;
  const fp = truth.filter((t, i) => !t && predicted[i]).length;
  const fn = truth.filter((t, i) => t && !predicted[i]).length;
  return {
    n: truth.length,
    positives: truth.filter(Boolean).length,
    negatives: truth.filter((t) => !t).length,
    truePositive: tp,
    falsePositive: fp,
    falseNegative: fn,
    precision: ratio(tp, tp + fp),
    recall: ratio(tp, tp + fn),
    f1: 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null,
  };
}

export function evaluateParser(
  record: CorpusRecord,
  scores: Scores,
  profile?: OperatorProfile,
) {
  const truth = expectedFieldsSchema.safeParse(record.expectedFields);
  if (!record.evaluationContext || !truth.success)
    return {
      annotated: false as const,
      reason:
        "Full five-field truth and an explicit clock/profile are required; not scored as success.",
    };
  if (!profile)
    throw new Error(`Unknown evaluation operator for ${record.id}.`);
  const now = new Date(record.evaluationContext.clock);
  const parsed = parseFields(record.text, now);
  let candidates = 0,
    correctCandidates = 0,
    knownFields = 0,
    extractedKnownFields = 0;
  for (const [key, value] of Object.entries(truth.data)) {
    const actual = parsed.fields[key as keyof typeof parsed.fields];
    if (actual !== undefined) {
      candidates++;
      if (actual === value) correctCandidates++;
    }
    if (value !== null) {
      knownFields++;
      if (actual === value) extractedKnownFields++;
    }
  }
  const errors = validateCard(
    {
      ...parsed.fields,
      operatorId: profile.id,
      vegetarianMeals: profile.mealIncluded
        ? parsed.fields.vegetarianMeals
        : null,
      currency: "BDT",
      timezone: "Asia/Dhaka",
      askTotalPrice: true,
      confirmedAt: now.toISOString(),
    },
    profile,
    now,
  );
  const learnedBlocks = requirements.filter(
    (k) => k !== "vegetarian" && scores.requirements[k] >= scores.thresholds[k],
  );
  const routingAllowed =
    ["booking_request", "availability_query", "price_query"].includes(
      scores.topIntent,
    ) &&
    scores.intent[scores.topIntent] >= scores.intentMin &&
    scores.margin >= scores.marginMin;
  const reviewAllowed =
    routingAllowed &&
    !learnedBlocks.length &&
    !parsed.flags.length &&
    !errors.length;
  return {
    annotated: true as const,
    candidates,
    correctCandidates,
    knownFields,
    extractedKnownFields,
    actualFields: parsed.fields,
    sourceSpansValid: parsed.spans.every(
      (s) => record.text.slice(s.start, s.end) === s.text,
    ),
    clarificationExpected: record.expectedClarifications.length > 0,
    clarificationDetected: parsed.clarifications.length > 0,
    unsupportedExpected: record.expectedUnsupportedDetails.length > 0,
    unsupportedDetected: parsed.flags.length > 0 || learnedBlocks.length > 0,
    reviewAllowed,
    validationErrors: errors,
    // Full visitor confirmation is still required. This measures pre-review exposure only.
    unsupportedFalseAcceptance:
      record.expectedUnsupportedDetails.length > 0 && reviewAllowed,
  };
}
