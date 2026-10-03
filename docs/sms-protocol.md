# LocalRelay SMS protocol — pilot 1

**Draft/unreviewed Bangla templates; physical SMS path pending.** One request revision binds operator/service, party and meal terms. Date is DD-MM-YY (2000–2099), time 24-hour Asia/Dhaka; price always full positive integer BDT including required charges. Profiles restrict future horizon, guests and maximum price.

```text
#Q7M2K9.1 12-10-26 15:00
বড়2 শিশু1 নিরামিষ1
মোট দাম?
```

This exact NFC sample is 53 UTF-16 units. বড় = adults, শিশু = children, নিরামিষ = vegetarian meal count; remaining guests accept the profile’s standard meal. No-meal profiles omit the vegetarian label. The complete package meaning must be reviewed by native speakers and taught to operators.

| Direction | Exact syntax | Meaning |
|---|---|---|
| Operator → visitor | #Q7M2K9.1 1 1500 | Offer original date/time and all request terms for total 1500 BDT |
| Operator → visitor | #Q7M2K9.1 2 | Decline |
| Operator → visitor | #Q7M2K9.1 3 13-10-26 16:00 1600 | Alternative date/time, same party/meals, total 1600 BDT |
| Visitor → operator | #Q7M2K9.1 4 13-10-26 16:00 1600 | Accept exact frozen offer |
| Operator → visitor | #Q7M2K9.1 5 13-10-26 16:00 1600 | Acknowledge exact acceptance |

Parser normalizes Bangla digits, trims/splits whitespace including line breaks, enforces command arity and exact #ID.revision. No extra prose/negative/fractional prices, impossible/past dates, excess profile amounts, wrong IDs/revisions or mismatched acknowledgement. Code 4 is outbound only. A conflicting second offer or decline after an offer enters CONFLICT; it never overwrites frozen terms. Duplicate identical offers/acks are idempotent. Expired/superseded/archived records cannot auto-progress. Sender must be checked manually; correlation IDs are not secrets/authentication.

States: READY_TO_SEND → COMPOSER_OPENED (optional) → REQUEST_SENT_REPORTED → OFFER_RECEIVED → ACCEPTANCE_READY → ACCEPTANCE_COMPOSER_OPENED (optional) → ACCEPTANCE_SENT_REPORTED → AGREEMENT_RECORDED. A matching manually verified reply may explicitly resolve an omitted send report, using a separate checkbox. Opening/cancelling a composer never reports sending. Invalid replies leave business state unchanged. DECLINED/CONFLICT/EXPIRED/SUPERSEDED/ARCHIVED stop normal progression. Changes after agreement require human contact.

Expiry: earlier of 24h after queue or requested start. Initial abandoned/expired retention: 7 days after expiry; completed receipts: 30 days from acknowledgement. Local deletion does not cancel anything. Independent devices may collide on wire IDs; bind to operator and check sender. A new revision shares the prefix and increments suffix. Old replies are unusable on the new revision.

Unicode SMS estimate: NFC normalized UTF-16 units, ≤70 one segment, >70 ceil(units/67); warn >60 and block >70. GSM-7 uses base alphabet and extension characters counted as two septets (≤160/153). Unexpected invisible controls/non-BMP content are rejected in templates. No truncation or silent MMS. Actual carrier Unicode limits and multipart behaviour need physical validation. Four messages minimum for a completed exchange, not one segment for the whole conversation.

Android-first `sms:+number?body=percentEncodedBody` is used, with copy fallbacks. Native behaviour and charges remain platform/carrier dependent. No automatic/background sending or inbox access.
