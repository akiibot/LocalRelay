import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { parseFields, type FieldKey } from "../src/parsing/fields";
import { verifyModel, predict } from "../src/ai/model";
import { operatorSchema } from "../src/domain/schema";
import { validateCard } from "../src/domain/validation";
import { renderBangla } from "../src/templates/render";
import { smsSize, validateTemplate } from "../src/sms/encoding";
import profiles from "../public/data/operators/demo.json";

// Developer-authored diagnostic cases. These are not blind human data or training data.
const now = new Date("2026-10-04T10:00:00Z");
type Fields = Record<FieldKey, string | number | null>;
type Case = {
  id: string;
  kind: "supported" | "clarify" | "unsupported" | "invalid";
  text: string;
  fields: Fields;
  flagged: boolean;
  valid: boolean;
  profile?: string;
};
const base: Fields = {
  localDate: "2026-10-11",
  localTime: "15:00",
  adults: 2,
  children: 1,
  vegetarianMeals: 1,
};
const text =
  "Two adults and one child on 2026-10-11 at 3 pm. One vegetarian meal.";
const missingCounts: Partial<Fields> = {
  adults: null,
  children: null,
  vegetarianMeals: null,
  localTime: null,
};
const cases: Case[] = [];
function add(
  id: string,
  kind: Case["kind"],
  input: string,
  fields: Partial<Fields> = {},
  profile?: string,
) {
  cases.push({
    id,
    kind,
    text: input,
    fields: { ...base, ...fields },
    flagged: kind === "unsupported",
    valid: kind === "supported" || kind === "unsupported",
    profile,
  });
}
add(
  "price-night",
  "supported",
  "Please tell me the total fee. Two adults and one child on 2026-10-11 at 2:56 am. One vegetarian meal.",
  { localTime: "02:56" },
);
add(
  "book-word-date",
  "supported",
  "Can we book for four adults and two children on 12 October 2026 at 11 am? Two vegetarian meals.",
  {
    localDate: "2026-10-12",
    localTime: "11:00",
    adults: 4,
    children: 2,
    vegetarianMeals: 2,
  },
);
add(
  "availability-midnight",
  "supported",
  "Are there places for one adult and zero children on 13 October 2026 at 12 am? Zero vegetarian meals.",
  {
    localDate: "2026-10-13",
    localTime: "00:00",
    adults: 1,
    children: 0,
    vegetarianMeals: 0,
  },
);
add(
  "uppercase-noon",
  "supported",
  "WHAT IS THE PRICE? TWO ADULTS AND ONE CHILD ON 2026-10-14 AT 12 PM. ONE VEGETARIAN MEAL.",
  { localDate: "2026-10-14", localTime: "12:00" },
);
add(
  "explicit-no-children",
  "supported",
  "What is the cost for two adults and no children on 2026-10-11 at 3 pm? Zero vegetarian meals.",
  { children: 0, vegetarianMeals: 0 },
);
add(
  "maximum-party",
  "supported",
  "Price for 12 adults and 0 children on 2026-10-11 at 15:00. 12 vegetarian meals.",
  { adults: 12, children: 0, vegetarianMeals: 12 },
);
add(
  "dhaka-tomorrow",
  "supported",
  "Two adults and one child tomorrow at 3 pm. One vegetarian meal. Total price?",
  { localDate: "2026-10-05" },
);
add(
  "unqualified-weekday",
  "supported",
  "Are you available Friday at 9 am for three adults and one child? Two vegetarian meals.",
  {
    localDate: "2026-10-09",
    localTime: "09:00",
    adults: 3,
    vegetarianMeals: 2,
  },
);
add(
  "no-meal-profile",
  "supported",
  "Can we book for two adults and no children on 2026-10-11 at 3 pm?",
  { children: 0, vegetarianMeals: null },
  "demo-weaving",
);
add(
  "24-hour-evening",
  "supported",
  "Quote a total for three adults and three children on 2026-10-15 at 18:45. Zero vegetarian meals.",
  {
    localDate: "2026-10-15",
    localTime: "18:45",
    adults: 3,
    children: 3,
    vegetarianMeals: 0,
  },
);
add(
  "late-evening",
  "supported",
  "Price for one adult and two children on 2026-10-20 at 23:59. One vegetarian meal.",
  { localDate: "2026-10-20", localTime: "23:59", adults: 1, children: 2 },
);
add(
  "line-breaks",
  "supported",
  "Can we book?\n2 adults\n1 child\n2026-10-11 at 15:00\n1 vegetarian meal.",
);
add(
  "count-range",
  "clarify",
  text.replace("Two adults", "2-3 adults"),
  missingCounts,
);
add(
  "conflicting-times",
  "clarify",
  text.replace("at 3 pm", "at 3 pm or 4 pm"),
  { localTime: null },
);
add(
  "conflicting-adults",
  "clarify",
  text.replace("Two adults", "2 adults and 3 adults"),
  { adults: null },
);
add("slash-date", "clarify", text.replace("2026-10-11", "11/10/2026"), {
  localDate: null,
});
add("next-weekday", "clarify", text.replace("2026-10-11", "next Friday"), {
  localDate: null,
});
add(
  "approximate-count",
  "clarify",
  text.replace("Two adults", "About two adults"),
  missingCounts,
);
add("negative-adults", "clarify", text.replace("Two adults", "-2 adults"), {
  adults: null,
});
add("fractional-adults", "clarify", text.replace("Two adults", "2.5 adults"), {
  adults: null,
});
for (const [id, note] of Object.entries({
  allergy: "One guest has a peanut allergy.",
  accessibility: "We need wheelchair access.",
  vegan: "One guest needs vegan food.",
  transport: "Arrange a taxi pickup.",
  payment: "Can we pay by card and get a refund?",
  conditional: "We will come if it rains.",
  package: "No meal for the child.",
  extra: "We want a birthday guide.",
}))
  add(id, "unsupported", `${text} ${note}`);
add("past-date", "invalid", text.replace("2026-10-11", "2011-10-11"), {
  localDate: "2011-10-11",
});
add("too-many-guests", "invalid", text.replace("Two adults", "13 adults"), {
  adults: 13,
});
add(
  "too-many-meals",
  "invalid",
  text.replace("One vegetarian meal", "4 vegetarian meals"),
  { vegetarianMeals: 4 },
);
add("zero-adults", "invalid", text.replace("Two adults", "0 adults"), {
  adults: 0,
});

const bytes = await readFile("public/models/v1/weights.bin");
const metadata = JSON.parse(
  await readFile("public/models/v1/metadata.json", "utf8"),
);
const model = await verifyModel(
  metadata,
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
let predictedFields = 0,
  correctCandidates = 0,
  knownFields = 0,
  extractedKnownFields = 0;
const rows = cases.map((c) => {
  const p = operatorSchema.parse(
    profiles.find((p) => p.id === (c.profile ?? "demo-craft")),
  );
  const parsed = parseFields(c.text, now);
  const expected = Object.fromEntries(
    Object.entries(c.fields).filter(([, value]) => value !== null),
  );
  const parserExact =
    JSON.stringify(Object.entries(parsed.fields).sort()) ===
    JSON.stringify(Object.entries(expected).sort());
  for (const [key, value] of Object.entries(parsed.fields)) {
    predictedFields++;
    if (c.fields[key as FieldKey] === value) correctCandidates++;
  }
  for (const [key, value] of Object.entries(expected)) {
    knownFields++;
    if (parsed.fields[key as FieldKey] === value) extractedKnownFields++;
  }
  const spansValid = parsed.spans.every(
    (s) => c.text.slice(s.start, s.end) === s.text,
  );
  const card = {
    operatorId: p.id,
    ...parsed.fields,
    vegetarianMeals: p.mealIncluded ? parsed.fields.vegetarianMeals : null,
    currency: "BDT",
    timezone: "Asia/Dhaka",
    askTotalPrice: true,
    confirmedAt: now.toISOString(),
  };
  const errors = validateCard(card, p, now);
  const score = predict(model, c.text);
  const routingAccepted =
    ["booking_request", "availability_query", "price_query"].includes(
      score.topIntent,
    ) &&
    score.intent[score.topIntent] >= score.intentMin &&
    score.margin >= score.marginMin;
  const learnedBlocks = Object.entries(score.requirements)
    .filter(
      ([key, value]) =>
        key !== "vegetarian" &&
        value >= score.thresholds[key as keyof typeof score.thresholds],
    )
    .map(([key]) => key);
  const candidateReviewAllowed =
    !errors.length &&
    !parsed.flags.length &&
    routingAccepted &&
    !learnedBlocks.length;
  const contractPass =
    parserExact &&
    spansValid &&
    !!parsed.flags.length === c.flagged &&
    !errors.length === c.valid &&
    (c.kind !== "clarify" || parsed.clarifications.length > 0);
  return {
    id: c.id,
    kind: c.kind,
    text: c.text,
    expectedFields: expected,
    actualFields: parsed.fields,
    clarifications: parsed.clarifications,
    flags: parsed.flags,
    validationErrors: errors,
    parserExact,
    spansValid,
    contractPass,
    model: {
      topIntent: score.topIntent,
      probability: score.intent[score.topIntent],
      threshold: score.intentMin,
      margin: score.margin,
      routingAccepted,
      learnedBlocks,
      candidateReviewAllowed,
    },
    sms:
      c.kind === "supported"
        ? (() => {
            const body = renderBangla(
              { ...card, ...expected } as Parameters<typeof renderBangla>[0],
              "TEST01.1",
            );
            validateTemplate(body);
            return smsSize(body);
          })()
        : null,
  };
});
const failed = rows.filter((r) => !r.contractPass);
const supported = rows.filter((r) => r.kind === "supported");
const report = {
  recordedAt: new Date().toISOString(),
  version: "developer-challenges-1",
  provenance:
    "32 developer-authored synthetic QA cases; not blind, human, native reviewer, operator or physical SMS evidence; not used for training/tuning",
  fixedParserClock: now.toISOString(),
  modelVersion: model.metadata.version,
  modelChanged: false,
  softwareContracts: {
    passed: rows.length - failed.length,
    failed: failed.map((r) => r.id),
    total: rows.length,
  },
  syntheticParserCandidates: {
    correct: correctCandidates,
    predicted: predictedFields,
    precision: predictedFields ? correctCandidates / predictedFields : null,
    extractedKnownFields,
    knownFields,
    coverage: knownFields ? extractedKnownFields / knownFields : null,
  },
  syntheticSupportedModelReview: {
    allowed: supported.filter((r) => r.model.candidateReviewAllowed).length,
    total: supported.length,
    limitation:
      "Uncalibrated synthetic QA; compulsory visitor review remains. Not an AI routing-quality release result.",
  },
  blockedNonSupported: {
    blocked: rows.filter(
      (r) => r.kind !== "supported" && !r.model.candidateReviewAllowed,
    ).length,
    total: rows.filter((r) => r.kind !== "supported").length,
  },
  cases: rows,
};
await writeFile(
  "docs/challenge-evaluation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      softwareContracts: report.softwareContracts,
      parser: report.syntheticParserCandidates,
      supportedModelReview: report.syntheticSupportedModelReview,
      blockedNonSupported: report.blockedNonSupported,
    },
    null,
    2,
  ),
);
assert.equal(
  failed.length,
  0,
  `Software contracts failed: ${failed.map((r) => r.id).join(", ")}`,
);
assert.equal(
  report.blockedNonSupported.blocked,
  report.blockedNonSupported.total,
  "A non-supported case escaped the candidate gate",
);
