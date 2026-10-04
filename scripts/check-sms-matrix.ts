import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import profiles from "../public/data/operators/demo.json";
import { operatorSchema, type ConfirmedCard } from "../src/domain/schema";
import { renderBangla, acceptance } from "../src/templates/render";
import { smsSize, validateTemplate } from "../src/sms/encoding";
const revisions = [1, 9, 10, 99, 100, 999];
const rows = profiles.map((raw) => {
  const p = operatorSchema.parse(raw);
  let count = 0,
    maxUnits = 0,
    warnings = 0;
  for (let adults = 1; adults <= p.maxGuests; adults++)
    for (let children = 0; children <= p.maxGuests - adults; children++)
      for (
        let vegetarian = 0;
        vegetarian <= (p.mealIncluded ? adults + children : 0);
        vegetarian++
      )
        for (const revision of revisions) {
          const c: ConfirmedCard = {
            operatorId: p.id,
            localDate: "2099-12-31",
            localTime: "23:59",
            adults,
            children,
            vegetarianMeals: p.mealIncluded ? vegetarian : null,
            currency: "BDT",
            timezone: "Asia/Dhaka",
            askTotalPrice: true,
            confirmedAt: "2026-10-04T10:00:00Z",
          };
          const body = renderBangla(c, `Q7M2K9.${revision}`);
          validateTemplate(body);
          const size = smsSize(body);
          assert.equal(size.segments, 1);
          assert.equal(size.blocked, false);
          assert.equal(size.body, body);
          count++;
          maxUnits = Math.max(maxUnits, size.units);
          warnings += Number(size.warning);
          validateTemplate(
            acceptance(`Q7M2K9.${revision}`, {
              localDate: c.localDate,
              localTime: c.localTime,
              totalBdt: p.maxQuoteBdt,
              receivedAt: c.confirmedAt,
              source: "manually_entered_sms",
            }),
          );
        }
  return { profile: p.id, cases: count, maxUnits, warnings };
});
assert.throws(() =>
  validateTemplate(
    renderBangla(
      {
        operatorId: "demo-craft",
        localDate: "2099-12-31",
        localTime: "23:59",
        adults: 12,
        children: 0,
        vegetarianMeals: 12,
        currency: "BDT",
        timezone: "Asia/Dhaka",
        askTotalPrice: true,
        confirmedAt: "2026-10-04T10:00:00Z",
      },
      `Q7M2K9.${"9".repeat(30)}`,
    ),
  ),
);
const report = {
  recordedAt: new Date().toISOString(),
  templateVersion: "bn-draft-1",
  revisions,
  profiles: rows,
  totalCases: rows.reduce((n, r) => n + r.cases, 0),
  passed: true,
  note: "Exhaustive supported count combinations for bundled demo profiles at sampled revision digit lengths. Software encoding estimate only; no physical segmentation, rendering or carrier evidence.",
};
await writeFile("docs/sms-matrix.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
