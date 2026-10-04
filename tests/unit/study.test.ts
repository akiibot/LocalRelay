import { it, expect } from "vitest";
import {
  assignment,
  beginStudy,
  finishStudy,
  studyResults,
  scenario,
  summaries,
} from "../../src/evaluation/study";
import { clearAll } from "../../src/storage/db";
it("counterbalances 2 tasks per condition and grades unsupported outcomes without raw input", async () => {
  expect([1, 2, 3, 4].map((n) => assignment(1, n))).toEqual([
    "form",
    "ai",
    "ai",
    "form",
  ]);
  expect([1, 2, 3, 4].map((n) => assignment(2, n))).toEqual([
    "ai",
    "form",
    "form",
    "ai",
  ]);
  await clearAll();
  await beginStudy("PTEST", 1, 4, "seed-v1");
  await finishStudy("manual_contact");
  const rows = await studyResults();
  expect(rows[0].criticalCorrect).toBe(true);
  expect(JSON.stringify(rows)).not.toContain("originalText");
  expect(summaries(rows)[0].participant).toBe("PTEST");
  expect(scenario(4).expected).toBeNull();
});
