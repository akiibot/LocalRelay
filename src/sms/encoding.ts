const gsm = new Set(
  Array.from(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
  ),
);
const extension = new Set(Array.from("^{}\\[~]|€\f"));
export function smsSize(input: string) {
  const body = input.normalize("NFC");
  let septets = 0;
  let unicode = false;
  for (const ch of body) {
    if (gsm.has(ch)) septets++;
    else if (extension.has(ch)) septets += 2;
    else unicode = true;
  }
  const units = unicode ? body.length : septets;
  return {
    body,
    encoding: unicode ? "Unicode" : "GSM-7",
    units,
    segments:
      units === 0
        ? 0
        : unicode
          ? units <= 70
            ? 1
            : Math.ceil(units / 67)
          : units <= 160
            ? 1
            : Math.ceil(units / 153),
    warning: unicode && units > 60,
    blocked: unicode ? units > 70 : units > 160,
  };
}
export function validateTemplate(body: string) {
  if (
    /[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(
      body,
    ) ||
    Array.from(body).some((c) => c.codePointAt(0)! > 0xffff)
  )
    throw new Error(
      "Unexpected invisible or non-BMP character in SMS template.",
    );
  if (smsSize(body).blocked)
    throw new Error("This message exceeds one SMS segment.");
}
export function smsUri(phone: string, body: string) {
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw new Error("Set a valid consented E.164 test number first.");
  validateTemplate(body);
  return `sms:${phone}?body=${encodeURIComponent(body.normalize("NFC"))}`;
}
