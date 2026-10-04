import { cardSchema, type ConfirmedCard, type OperatorProfile } from "./schema";
export function dhakaDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function addDays(day: string, n: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function validDate(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(day + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day;
}
export function validTime(time: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}
export function startMs(day: string, time: string) {
  return new Date(`${day}T${time}:00+06:00`).getTime();
}
export function validateSchedule(
  day: string,
  time: string,
  p: OperatorProfile,
  now: Date,
) {
  const errors: string[] = [];
  if (!validDate(day) || Number(day.slice(0, 4)) > 2099)
    errors.push("Choose a valid date in 2000–2099.");
  if (!validTime(time)) errors.push("Choose an exact 24-hour time.");
  if (!errors.length) {
    if (startMs(day, time) <= now.getTime())
      errors.push("The visit must be in the future.");
    if (day > addDays(dhakaDay(now), p.maxAdvanceDays))
      errors.push(`Choose a date within ${p.maxAdvanceDays} days.`);
  }
  return errors;
}
export function validateCard(
  value: unknown,
  p: OperatorProfile,
  now = new Date(),
): string[] {
  const result = cardSchema.safeParse(value);
  if (!result.success)
    return ["Complete every required field with valid whole numbers."];
  const c: ConfirmedCard = result.data;
  const errors = validateSchedule(c.localDate, c.localTime, p, now);
  if (c.operatorId !== p.id) errors.push("Operator does not match.");
  if (c.adults + c.children > p.maxGuests)
    errors.push(`At most ${p.maxGuests} guests are supported.`);
  if (
    p.mealIncluded
      ? c.vegetarianMeals === null || c.vegetarianMeals > c.adults + c.children
      : c.vegetarianMeals !== null
  )
    errors.push(
      "Confirm meal inclusion and a vegetarian count no greater than the party size.",
    );
  return errors;
}
