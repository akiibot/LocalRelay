# Prespecified evaluation — study-1

No participants have been recruited or tested. Software QA uses synthetic actors and does not contribute any human denominator.

## Visitor comparison

Minimum 16 consented visitor-like adults, four tasks each; stronger 24. Each participant gets two AI and two form tasks. Sequence parity assigns form/AI/AI/form or AI/form/form/AI. Tasks: two distinct simple visits, one complex supported party/meal case, one severe-allergy unsupported case. Matched tasks differ in dates/counts. Scenario order is currently fixed: report this limitation and consider a locked balanced scenario rotation for a later study version. Never change scenarios after seeing results.

The included UI reveals a natural task brief and starts the timer before opening the assigned interface. Time includes typing, analysis, edits, clarification and queue review; stops on successful reviewed-card queue, recorded direct contact or abandonment. Don't treat pasted prewritten text as typing-time evidence; label a paste condition separately. Manual form shares all validation/review/template/SMS behaviour. A field edit counter and click counter measure actual app events, not participant cognitive effort; unpersisted counters can be lost on reload. Duration retains reload time.

Automatically score exact critical fields against scenario truth; the unsupported case requires manual_contact. Every task including failures/abandonments stays in the denominator. Export blinded cards separately for independent grading; no condition labels, pseudonym, phone numbers or original input in grading export. The full deidentified export contains participant, condition, scenario/version/order, duration, edits, clicks, final fields, errors and optional workload/help. Optional observations are “not collected” until a researcher enters them. Export only with participant consent; no automatic upload. Store external signed consent separately from pseudonymous records.

Primary outcomes: final critical-card correctness, silent critical error (compare participant belief to blinded grading externally), completion rate and full task time. Secondary: corrections/taps, workload, help and preference (interview/log separately). Analyze paired participant summaries via `node --import tsx scripts/summarize-study.ts export.json`; do not treat task repetitions as independent subjects. Practical benefit prespecified: ≥20% lower median participant time on complex supported tasks, with no observed increase in critical errors. Report simple tasks and unsupported outcomes separately. Small pilots do not establish population non-inferiority or universal superiority. If form wins, say so.

## Native Bangla comprehension

First two native reviewers independently check every template/operator guide, preferably blind back-translation. Preserve reviews/version/date and revise repeated critical misunderstandings before participants. Reviewers cannot count as participants.

Minimum 8 native speakers × 6 messages (48 presentations), stronger 12 × 8. Include actual tourism operators, limited-English and basic/shared-phone experience. Name proxies. Present draft/approved messages on the real target phone without English; standardized brief onboarding teaches codes, date/time convention and full-total price. Randomize messages, include max guests/meals, zero children/vegetarian, no-meal package and alternatives/acknowledgements. Ask unassisted date/time/party/meal/price/next action, record time/help/confidently wrong answers, then ask them to type replies. Engineering targets: ≥95% critical-field comprehension, ≥90% whole-card, ≥95% reply accuracy. Participants are independent units; report raw denominators and per-person summaries. Any repeated critical misunderstanding requires revision/retest. Targets are not observations.

## Physical SMS and parser/model evaluations

20 varied requests on at least one real low-end Android → Bangla-capable basic phone carrier path; full reply/accept/ack exchange, all failures included. Record deidentified phone/browser/carrier/version, exact normalized text units, received text/delay, duplicates/copy/cancelled composer and signal loss. Test 70/71 boundaries separately with non-sensitive fixtures. Use physical-sms-log.csv. No real numbers in public reports.

Current frozen synthetic model report compares learned intent against a keyword-only baseline. It reports per-class/head scores and sizes, but is not independent-human or parser-candidate precision evidence. Add 60–100 blind unseen-author messages with exact spans/clarifications/unsupported truth. Evaluate candidate precision *and coverage*, silent acceptance, ambiguity and sources separately. No critical candidate precision or unsupported false-acceptance population rate is claimed now.

Freeze app/model/template/scenario before every formal round. Keep versioned raw denominators and adverse results. Do not combine synthetic, simulated, proxy, native participant or physical handset observations.
