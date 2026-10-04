import type { ConfirmedCard, Offer } from "../domain/schema";
export const templateStatus = {
  version: "bn-draft-1",
  status: "unreviewed",
  reviewers: 0,
  reviewDate: null,
};
export function wireDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y.slice(2)}`;
}
export function renderBangla(c: ConfirmedCard, id: string) {
  return `#${id} ${wireDate(c.localDate)} ${c.localTime}\nবড়${c.adults} শিশু${c.children}${c.vegetarianMeals === null ? "" : ` নিরামিষ${c.vegetarianMeals}`}\nমোট দাম?`.normalize(
    "NFC",
  );
}
export function renderEnglish(c: ConfirmedCard) {
  return `${c.localDate} at ${c.localTime} Asia/Dhaka; ${c.adults} adult(s), ${c.children} child(ren). ${c.vegetarianMeals === null ? "No meals included." : `${c.vegetarianMeals} vegetarian meals; all remaining guests receive the standard meal.`} What is the total price in BDT, including required charges?`;
}
export function acceptance(id: string, o: Offer) {
  return `#${id} 4 ${wireDate(o.localDate)} ${o.localTime} ${o.totalBdt}`;
}
