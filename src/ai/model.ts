import { z } from "zod";
import {
  DIM,
  FEATURE_VERSION,
  intents,
  requirements,
  features,
  type Scores,
} from "./features";
const metadataSchema = z.object({
  version: z.string(),
  featureVersion: z.literal(FEATURE_VERSION),
  features: z.literal(DIM),
  rows: z.literal(13),
  byteLength: z.literal((DIM * 13 + 13) * 4),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  intentLabels: z.array(z.string()),
  requirementLabels: z.array(z.string()),
  thresholds: z.array(z.number().min(0).max(1)).length(6),
  intentMin: z.number().min(0).max(1),
  marginMin: z.number().min(0).max(1),
  provenance: z.string(),
  weightsOffset: z.literal(0),
  biasesOffset: z.literal(DIM * 13 * 4),
});
export type Model = {
  metadata: z.infer<typeof metadataSchema>;
  weights: Float32Array;
};
export async function verifyModel(
  metadata: unknown,
  buffer: ArrayBuffer,
): Promise<Model> {
  const m = metadataSchema.parse(metadata);
  if (
    JSON.stringify(m.intentLabels) !== JSON.stringify(intents) ||
    JSON.stringify(m.requirementLabels) !== JSON.stringify(requirements)
  )
    throw new Error("Model class order mismatch.");
  if (buffer.byteLength !== m.byteLength)
    throw new Error("Model length mismatch.");
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== m.sha256) throw new Error("Model integrity check failed.");
  const view = new DataView(buffer),
    weights = new Float32Array(m.byteLength / 4);
  for (let i = 0; i < weights.length; i++) {
    weights[i] = view.getFloat32(i * 4, true);
    if (!Number.isFinite(weights[i]))
      throw new Error("Non-finite model coefficient.");
  }
  return { metadata: m, weights };
}
export async function loadModel() {
  const [meta, bin, spec] = await Promise.all([
    fetch("/models/v1/metadata.json"),
    fetch("/models/v1/weights.bin"),
    fetch("/models/v1/feature-spec.json"),
  ]).catch(() => {
    throw new Error(
      "Model assets are unavailable. Reconnect to prepare files, or use the manual form.",
    );
  });
  if (!meta.ok || !bin.ok || !spec.ok)
    throw new Error("Model assets are unavailable. Use the manual form.");
  if ((await spec.json()).version !== FEATURE_VERSION)
    throw new Error("Feature specification mismatch.");
  return verifyModel(await meta.json(), await bin.arrayBuffer());
}
export function predict(model: Model, text: string): Scores {
  if (!text.trim() || text.length > 500)
    throw new Error("Enter 1–500 characters.");
  const start = performance.now();
  const x = features(text),
    logits: number[] = [];
  for (let row = 0; row < 13; row++) {
    let s = model.weights[DIM * 13 + row];
    for (let i = 0; i < DIM; i++) s += x[i] * model.weights[row * DIM + i];
    logits.push(s);
  }
  const max = Math.max(...logits.slice(0, 7));
  const exps = logits.slice(0, 7).map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const ps = exps.map((v) => v / sum);
  const order = ps.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  return {
    intent: Object.fromEntries(
      intents.map((k, i) => [k, ps[i]]),
    ) as Scores["intent"],
    requirements: Object.fromEntries(
      requirements.map((k, i) => [k, 1 / (1 + Math.exp(-logits[7 + i]))]),
    ) as Scores["requirements"],
    topIntent: intents[order[0].i],
    margin: order[0].v - order[1].v,
    ms: performance.now() - start,
    modelVersion: model.metadata.version,
    intentMin: model.metadata.intentMin,
    marginMin: model.metadata.marginMin,
    thresholds: Object.fromEntries(
      requirements.map((k, i) => [k, model.metadata.thresholds[i]]),
    ) as Scores["thresholds"],
  };
}
