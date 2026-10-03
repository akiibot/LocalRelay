import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
async function walk(dir: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(dir)).map(async (name) => {
        const p = join(dir, name);
        return (await stat(p)).isDirectory() ? walk(p) : [p];
      }),
    )
  ).flat();
}
let modelBytes = 0,
  totalBytes = 0,
  gzipBytes = 0;
for (const f of await walk("dist")) {
  const b = await readFile(f);
  totalBytes += b.length;
  gzipBytes += gzipSync(b).length;
  if (f.includes("/models/")) modelBytes += b.length;
}
const report = {
  modelBytes,
  uncompressedBytes: totalBytes,
  gzipEstimateBytes: gzipBytes,
  modelBudget: 1048576,
  offlineBudget: 5242880,
  note: "gzip estimate sums per-file gzip sizes; actual network transfer depends on host encoding.",
};
await writeFile("docs/artifact-budgets.json", JSON.stringify(report, null, 2));
if (modelBytes >= report.modelBudget || totalBytes >= report.offlineBudget)
  throw new Error("Artifact budget exceeded");
console.log(report);
