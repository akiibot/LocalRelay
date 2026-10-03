export const FEATURE_VERSION = "fnv1a-8192-v1";
export const DIM = 8192;
export const intents = [
  "booking_request",
  "availability_query",
  "price_query",
  "change_cancel",
  "directions_transport",
  "other_tourism",
  "unsupported",
] as const;
export const requirements = [
  "vegetarian",
  "transport",
  "accessibility",
  "allergy_or_medical",
  "payment_condition",
  "other_extra_detail",
] as const;
export type Scores = {
  intent: Record<(typeof intents)[number], number>;
  requirements: Record<(typeof requirements)[number], number>;
  topIntent: (typeof intents)[number];
  margin: number;
  ms: number;
  modelVersion: string;
  intentMin: number;
  marginMin: number;
  thresholds: Record<(typeof requirements)[number], number>;
};
export function normalize(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function hash(value: string) {
  let h = 2166136261;
  for (const b of new TextEncoder().encode(value)) {
    h ^= b;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
export function features(text: string) {
  const norm = normalize(text);
  const vector = new Float32Array(DIM);
  if (!norm) return vector;
  const add = (f: string) => vector[hash(f) % DIM]++;
  const tokens = norm.split(" ");
  for (let i = 0; i < tokens.length; i++) {
    add("w:" + tokens[i]);
    if (i) add("b:" + tokens[i - 1] + " " + tokens[i]);
  }
  const padded = "^" + norm + "$";
  for (const n of [3, 4, 5])
    for (let i = 0; i <= padded.length - n; i++)
      add(`c${n}:` + padded.slice(i, i + n));
  let sum = 0;
  for (const v of vector) sum += v * v;
  const length = Math.sqrt(sum);
  if (length) for (let i = 0; i < DIM; i++) vector[i] /= length;
  return vector;
}
