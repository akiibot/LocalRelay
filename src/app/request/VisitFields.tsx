import type { OperatorProfile } from "../../domain/schema";
import { addDays, dhakaDay } from "../../domain/validation";
export default function VisitFields({
  values,
  operator,
  errors,
  edit,
}: {
  values: Record<string, string>;
  operator: OperatorProfile;
  errors: Record<string, string>;
  edit: (key: string, value: string) => void;
}) {
  const input = (
    key: string,
    label: string,
    type: string,
    min?: string | number,
    max?: string | number,
    hint?: string,
  ) => (
    <div className="field">
      <label htmlFor={key}>{label}</label>
      <input
        id={key}
        aria-label={
          key === "localTime"
            ? "Time"
            : key === "localDate"
              ? "Date"
              : undefined
        }
        type={type}
        step={type === "number" ? 1 : undefined}
        inputMode={type === "number" ? "numeric" : undefined}
        min={min}
        max={max}
        value={values[key]}
        onChange={(e) => edit(key, e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={`${key}-hint${errors[key] ? ` ${key}-error` : ""}`}
      />
      <small id={`${key}-hint`} className="field-hint">
        {hint}
      </small>
      {errors[key] && (
        <small id={`${key}-error`} className="field-error">
          {errors[key]}
        </small>
      )}
    </div>
  );
  return (
    <>
      <fieldset>
        <legend>When are you visiting?</legend>
        <div className="fields">
          {input(
            "localDate",
            "Date",
            "date",
            dhakaDay(new Date()),
            addDays(dhakaDay(new Date()), operator.maxAdvanceDays),
            `Choose a future date within ${operator.maxAdvanceDays} days.`,
          )}
          {input(
            "localTime",
            "Time · Asia/Dhaka",
            "time",
            undefined,
            undefined,
            "Local time in Bangladesh (Asia/Dhaka).",
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Who is coming?</legend>
        <p className="field-hint">
          Up to {operator.maxGuests} guests. Enter 0 explicitly when there are
          none.
        </p>
        <div className="fields">
          {input(
            "adults",
            "Adults",
            "number",
            1,
            operator.maxGuests,
            "At least one adult.",
          )}
          {input(
            "children",
            "Children (choose 0 explicitly)",
            "number",
            0,
            operator.maxGuests,
            "Include every child in your party.",
          )}
        </div>
      </fieldset>
      {operator.mealIncluded && (
        <fieldset>
          <legend>Meals for your group</legend>
          <p>{operator.standardMeal}</p>
          {input(
            "vegetarianMeals",
            "Vegetarian meals (choose 0 explicitly)",
            "number",
            0,
            operator.maxGuests,
            "Vegetarian meals replace the standard meal; they are not extra meals.",
          )}
        </fieldset>
      )}
      {!operator.mealIncluded && (
        <p className="muted">
          No meals are included. Adding meals requires direct contact.
        </p>
      )}
    </>
  );
}
