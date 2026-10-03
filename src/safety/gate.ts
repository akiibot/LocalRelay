export type Flag = { text: string; reason: string; critical: boolean };
const rules: [RegExp, string][] = [
  [
    /\b(allerg(?:y|ies|ic)|peanut|medical|diabet\w*|medication|asthma)\b/i,
    "Health or allergy needs require direct confirmation.",
  ],
  [
    /\b(wheelchair|step[- ]free|accessib\w*|disabled|mobility)\b/i,
    "Accessibility cannot be guaranteed by this format.",
  ],
  [
    /\b(vegan|halal|gluten[- ]free|kosher|no meals?|without (?:food|meals?)|omit .*meals?|add .*meals?|no food|menu|custom meal)\b/i,
    "Dietary or package changes require direct contact; vegetarian is a separate field.",
  ],
  [
    /\b(refund|deposit|paid|payment|pay by|credit card|cash only|discount|cancel|reschedul\w*|change .*booking)\b/i,
    "Payment, cancellation or changed terms require direct contact.",
  ],
  [
    /\b(transport|pickup|pick up|airport|taxi|train|directions|bus|boat|rain|if |maybe|perhaps|unless|late|birthday|bring|guide|hotel|overnight|pet|dog)\b/i,
    "Transport, conditions or extra requests are not encoded in this pilot.",
  ],
];
export function safetyFlags(text: string): Flag[] {
  const flags: Flag[] = [];
  for (const [regex, reason] of rules) {
    const match = regex.exec(text);
    if (match) flags.push({ text: match[0], reason, critical: true });
  }
  if (/[^\x00-\x7f]/.test(text.replace(/[’“”–—]/g, "")))
    flags.push({
      text,
      reason:
        "Use English or the manual form; other-language details cannot be interpreted here.",
      critical: true,
    });
  if (/\b(ignore|override|already confirmed)\b/i.test(text))
    flags.push({
      text,
      reason:
        "Instructions cannot bypass review or establish payment/agreement.",
      critical: true,
    });
  return flags;
}
