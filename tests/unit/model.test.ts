// Node environment is required for filesystem fixtures and Web Crypto.
// @vitest-environment node
import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  features,
  hash,
  DIM,
  intents,
  requirements,
} from "../../src/ai/features";
import { verifyModel, predict } from "../../src/ai/model";
async function assets() {
  const m = JSON.parse(
    await readFile("public/models/v1/metadata.json", "utf8"),
  );
  const b = await readFile("public/models/v1/weights.bin");
  return {
    m,
    buffer: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  };
}
it("has stable hashing, normalization, empty-vector and L2 features", () => {
  expect(hash("hello")).toBe(1335831723);
  expect(features("").every((v) => v === 0)).toBe(true);
  const x = features("Two ADULTS!!");
  expect(x.length).toBe(DIM);
  expect(x).toEqual(features("two adults"));
  expect(Array.from(x).reduce((n, v) => n + v * v, 0)).toBeCloseTo(1, 6);
});
it("fails closed on malformed, truncated, corrupt, nonfinite and reordered models", async () => {
  const { m, buffer } = await assets();
  await expect(
    verifyModel({ ...m, featureVersion: "unknown" }, buffer),
  ).rejects.toThrow();
  await expect(
    verifyModel({ ...m, intentLabels: [...intents].reverse() }, buffer),
  ).rejects.toThrow("order");
  await expect(verifyModel(m, buffer.slice(0, 10))).rejects.toThrow("length");
  const broken = buffer.slice(0);
  new Uint8Array(broken)[0] ^= 1;
  await expect(verifyModel(m, broken)).rejects.toThrow("integrity");
  const nonfinite = buffer.slice(0);
  new DataView(nonfinite).setFloat32(0, NaN, true);
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", nonfinite)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  await expect(
    verifyModel({ ...m, sha256: digest }, nonfinite),
  ).rejects.toThrow("Non-finite");
});
it("matches frozen Python coefficients/probabilities on all parity fixtures", async () => {
  const { m, buffer } = await assets();
  const model = await verifyModel(m, buffer);
  const fixtures = JSON.parse(
    await readFile("tests/fixtures/parity.json", "utf8"),
  ) as { text: string; scores: number[] }[];
  for (const f of fixtures) {
    const s = predict(model, f.text),
      values = [
        ...intents.map((k) => s.intent[k]),
        ...requirements.map((k) => s.requirements[k]),
      ];
    values.forEach((v, i) =>
      expect(Math.abs(v - f.scores[i])).toBeLessThan(1e-4),
    );
  }
  expect(() => predict(model, "")).toThrow();
});
