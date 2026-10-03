import { z } from "zod";
import { database } from "../storage/db";
import { addDays, dhakaDay } from "../domain/validation";
import type { ConfirmedCard } from "../domain/schema";
export const studySchema = z.object({
  id: z.string(),
  participant: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
  condition: z.enum(["ai", "form"]),
  scenarioVersion: z.literal("study-1"),
  scenarioId: z.string(),
  order: z.number().int().min(1).max(4),
  startedAt: z.string(),
  brief: z.string(),
  expected: z
    .object({
      localDate: z.string(),
      localTime: z.string(),
      adults: z.number(),
      children: z.number(),
      vegetarianMeals: z.number().nullable(),
    })
    .nullable(),
  corrections: z.number(),
  taps: z.number(),
  modelVersion: z.string(),
  templateVersion: z.literal("bn-draft-1"),
});
export type Study = z.infer<typeof studySchema>;
export const resultSchema = studySchema.extend({
  finishedAt: z.string(),
  durationMs: z.number().nonnegative(),
  outcome: z.enum(["reviewed_card", "manual_contact", "abandoned"]),
  finalFields: z
    .object({
      localDate: z.string(),
      localTime: z.string(),
      adults: z.number(),
      children: z.number(),
      vegetarianMeals: z.number().nullable(),
    })
    .nullable(),
  criticalCorrect: z.boolean(),
  criticalErrors: z.array(z.string()),
  helpRequired: z.boolean().nullable(),
  workload: z.number().int().min(1).max(7).nullable(),
  note: z.string().max(200),
});
let active: Study | null = null;
export function currentStudy() {
  return active;
}
if (typeof window !== "undefined")
  window.addEventListener("localrelay-data-cleared", () => {
    active = null;
  });
export async function resumeStudy() {
  const db = await database();
  const r = await db.get("preferences", "study-active");
  active = r ? studySchema.parse(r) : null;
  return active;
}
export function assignment(
  participantNumber: number,
  order: number,
): "ai" | "form" {
  const seq =
    participantNumber % 2 === 0
      ? ["ai", "form", "form", "ai"]
      : ["form", "ai", "ai", "form"];
  return seq[order - 1] as "ai" | "form";
}
export function scenario(number: number, now = new Date()) {
  const day = addDays(dhakaDay(now), 7 + number);
  const data = [
    { time: "15:00", a: 2, c: 0, v: 0 },
    { time: "11:00", a: 1, c: 1, v: 1 },
    { time: "16:30", a: 4, c: 2, v: 3 },
    { time: "10:00", a: 2, c: 1, v: 0 },
  ][number - 1];
  if (number === 4)
    return {
      id: "unsupported-D",
      brief: `Arrange the meal-included craft visit for two adults and one child on ${day} at 10:00. One guest has a severe peanut allergy and needs a guarantee.`,
      expected: null,
    };
  return {
    id: ["simple-A", "simple-B", "complex-C"][number - 1],
    brief: `Arrange the meal-included craft visit for ${data.a} adults and ${data.c} children on ${day} at ${data.time}. ${data.v} guests need vegetarian meals. All others accept the standard meal. Ask the full total price in BDT.`,
    expected: {
      localDate: day,
      localTime: data.time,
      adults: data.a,
      children: data.c,
      vegetarianMeals: data.v,
    },
  };
}
export async function beginStudy(
  participant: string,
  participantNumber: number,
  order: number,
  modelVersion: string,
) {
  if (active)
    throw new Error("Finish or abandon the current timed task first.");
  const s = scenario(order);
  active = studySchema.parse({
    id: crypto.randomUUID(),
    participant,
    condition: assignment(participantNumber, order),
    scenarioVersion: "study-1",
    scenarioId: s.id,
    order,
    startedAt: new Date().toISOString(),
    brief: s.brief,
    expected: s.expected,
    corrections: 0,
    taps: 0,
    modelVersion,
    templateVersion: "bn-draft-1",
  });
  const db = await database();
  await db.put("preferences", active, "study-active");
  return active;
}
export function countStudy(kind: "taps" | "corrections") {
  if (active) active[kind]++;
}
export async function finishStudy(
  outcome: "reviewed_card" | "manual_contact" | "abandoned",
  card?: ConfirmedCard,
) {
  if (!active) return;
  const final = card
    ? {
        localDate: card.localDate,
        localTime: card.localTime,
        adults: card.adults,
        children: card.children,
        vegetarianMeals: card.vegetarianMeals,
      }
    : null;
  const criticalErrors: string[] = [];
  if (active.expected) {
    for (const k of Object.keys(active.expected) as (keyof NonNullable<
      Study["expected"]
    >)[])
      if (!final || final[k] !== active.expected[k]) criticalErrors.push(k);
  } else if (outcome !== "manual_contact")
    criticalErrors.push("unsupported_requirement");
  const result = resultSchema.parse({
    ...active,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - Date.parse(active.startedAt),
    outcome,
    finalFields: final,
    criticalCorrect: criticalErrors.length === 0 && outcome !== "abandoned",
    criticalErrors,
    helpRequired: null,
    workload: null,
    note: "",
  });
  const db = await database();
  const tx = db.transaction(["evaluation", "preferences"], "readwrite");
  await tx.objectStore("evaluation").put(result, result.id);
  await tx.objectStore("preferences").delete("study-active");
  await tx.done;
  active = null;
  window.dispatchEvent(new Event("study-finished"));
  return result;
}
export async function studyResults() {
  const db = await database();
  return (await db.getAll("evaluation")).map((r) => resultSchema.parse(r));
}
export async function rateStudy(
  id: string,
  helpRequired: boolean | null,
  workload: number | null,
  note: string,
) {
  const db = await database();
  const r = resultSchema.parse(await db.get("evaluation", id));
  await db.put(
    "evaluation",
    resultSchema.parse({ ...r, helpRequired, workload, note }),
    id,
  );
}
export function summaries(rows: z.infer<typeof resultSchema>[]) {
  const participants = [...new Set(rows.map((r) => r.participant))];
  const median = (nums: number[]) => {
    nums.sort((a, b) => a - b);
    return nums.length
      ? (nums[Math.floor((nums.length - 1) / 2)] +
          nums[Math.ceil((nums.length - 1) / 2)]) /
          2
      : null;
  };
  return participants.map((p) => ({
    participant: p,
    conditions: ["ai", "form"].map((condition) => {
      const r = rows.filter(
        (r) => r.participant === p && r.condition === condition,
      );
      return {
        condition,
        n: r.length,
        completed: r.filter((v) => v.outcome !== "abandoned").length,
        correct: r.filter((v) => v.criticalCorrect).length,
        criticalErrors: r.filter((v) => v.criticalErrors.length > 0).length,
        medianDurationMs: median(r.map((v) => v.durationMs)),
      };
    }),
  }));
}
