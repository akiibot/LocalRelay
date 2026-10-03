import { addDays, dhakaDay, validDate } from "../domain/validation";
import { safetyFlags } from "../safety/gate";
export type FieldKey =
  "localDate" | "localTime" | "adults" | "children" | "vegetarianMeals";
export type Span = {
  start: number;
  end: number;
  text: string;
  field: FieldKey;
};
export type Parsed = {
  fields: Partial<Record<FieldKey, string | number>>;
  spans: Span[];
  clarifications: string[];
  flags: ReturnType<typeof safetyFlags>;
};
const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const words = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];
const num = "(?:\\d+|" + words.join("|") + ")";
export function parseFields(text: string, now = new Date()): Parsed {
  const conflicted = new Set<FieldKey>();
  const fields: Parsed["fields"] = {},
    spans: Span[] = [],
    clarifications: string[] = [];
  function offer(field: FieldKey, value: string | number, m: RegExpMatchArray) {
    if (conflicted.has(field)) return;
    if (fields[field] !== undefined && fields[field] !== value) {
      delete fields[field];
      conflicted.add(field);
      clarifications.push(`Conflicting ${field}; choose explicitly.`);
    } else fields[field] = value;
    spans.push({
      start: m.index!,
      end: m.index! + m[0].length,
      text: m[0],
      field,
    });
  }
  const dates = [...text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)];
  for (const m of dates)
    if (validDate(m[1])) offer("localDate", m[1], m);
    else clarifications.push("Impossible date; choose a valid date.");
  for (const m of text.matchAll(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi,
  )) {
    const day = `${m[3]}-${String(months.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (validDate(day)) offer("localDate", day, m);
    else clarifications.push("Impossible date; choose a valid date.");
  }
  for (const m of text.matchAll(/\b(today|tomorrow)\b/gi))
    offer(
      "localDate",
      addDays(dhakaDay(now), m[1].toLowerCase() === "tomorrow" ? 1 : 0),
      m,
    );
  for (const m of text.matchAll(
    /\b(?:(next|this)\s+)?(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/gi,
  )) {
    if (m[1])
      clarifications.push(
        "“Next/this weekday” is ambiguous; choose the exact date.",
      );
    else {
      const names = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const day = dhakaDay(now);
      let delta =
        (names.indexOf(m[2].toLowerCase()) -
          new Date(day + "T00:00:00Z").getUTCDay() +
          7) %
        7;
      if (delta === 0) delta = 7;
      offer("localDate", addDays(day, delta), m);
    }
  }
  if (/\b\d{1,2}\/\d{1,2}\b/.test(text))
    clarifications.push(
      "Numeric slash dates are ambiguous; use the date picker.",
    );
  if (
    /\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?!\s+\d{4})\b/i.test(
      text,
    )
  )
    clarifications.push("Supply an explicit year.");
  for (const m of text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi)) {
    const h = Number(m[1]),
      min = Number(m[2] ?? 0);
    if (h < 1 || h > 12 || min > 59) clarifications.push("Invalid time.");
    else
      offer(
        "localTime",
        `${String((h % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0)).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
        m,
      );
  }
  for (const m of text.matchAll(
    /\b([01]\d|2[0-3]):([0-5]\d)\b(?!\s*(?:am|pm))/gi,
  ))
    offer("localTime", m[0], m);
  if (
    /\b(?:afternoon|morning|evening|at \d{1,2}(?![\d:]|\s*(?:am|pm)))\b/i.test(
      text,
    ) &&
    fields.localTime === undefined
  )
    clarifications.push(
      "Choose a specific time with AM/PM or 24-hour notation.",
    );
  const parseNum = (n: string) =>
    /^\d+$/.test(n) ? Number(n) : words.indexOf(n.toLowerCase());
  for (const [field, label] of [
    ["adults", "adults?"],
    ["children", "(?:children|child|kids?)"],
    ["vegetarianMeals", "vegetarian(?: meals?)?"],
  ] as const) {
    const regex = new RegExp(`\\b(${num})\\s+(${label})\\b`, "gi");
    for (const m of text.matchAll(regex)) {
      if (
        /\b(?:not|no)\s*$/i.test(
          text.slice(Math.max(0, m.index! - 10), m.index),
        )
      ) {
        clarifications.push(`Negated ${field}; choose explicitly.`);
        continue;
      }
      const prefix = text.slice(Math.max(0, m.index! - 12), m.index);
      if (/[-.,]$|\bminus\s*$/i.test(prefix)) {
        delete fields[field];
        conflicted.add(field);
        clarifications.push(
          `Negative, fractional or punctuated ${field} must be entered explicitly as a nonnegative integer.`,
        );
        continue;
      }
      offer(field, parseNum(m[1]), m);
    }
  }
  const noChildren = /\b(no children|no kids|zero children)\b/i.exec(text);
  if (noChildren) offer("children", 0, noChildren);
  const ambiguous =
    /\b(?:around|about|maybe|perhaps)\b|\b(?:\d+|one|two|three|four|five|ten)\s*(?:or|to|-)\s*(?:\d+|one|two|three|four|five|ten)\b|\bnot\s+(?:\d+|one|two|three|four)\b/i.test(
      text,
    );
  if (ambiguous) {
    clarifications.push(
      "Approximate, alternative or corrected counts/times require explicit choices.",
    );
    for (const key of [
      "adults",
      "children",
      "vegetarianMeals",
      "localTime",
    ] as FieldKey[])
      delete fields[key];
  }
  if (
    /\b(?:us|people|persons?|guests?)\b/i.test(text) &&
    fields.adults === undefined
  )
    clarifications.push("Confirm adults and children separately.");
  if (
    /\bvegetarian\b/i.test(text) &&
    fields.vegetarianMeals === undefined &&
    !/\bnot vegetarian\b/i.test(text)
  )
    clarifications.push("How many vegetarian meals?");
  for (const key of [
    "localDate",
    "localTime",
    "adults",
    "children",
  ] as FieldKey[])
    if (fields[key] === undefined) clarifications.push(`Confirm ${key}.`);
  return {
    fields,
    spans,
    clarifications: [...new Set(clarifications)],
    flags: safetyFlags(text),
  };
}
