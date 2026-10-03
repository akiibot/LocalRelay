# Guided phone test observations — 4 October 2026 (Asia/Dhaka)

Source: the user's reports during the guided walkthrough. These observations were not independently inspected on the physical phones. Visitor phone: Samsung Galaxy A55; helper phone: Redmi Note 11. Carrier route: Grameenphone → Grameenphone, explicitly confirmed by the user after initially spelling it “Graminfo”. OS/browser versions, delivery times and exact native sent/received message pairs have not been recorded. This is a smartphone-to-smartphone pilot, not a basic-phone test or completed formal participant study.

Origin: https://localrelay-test.vercel.app. Request: `#CYUN39.1`; manual entry; date 11 October 2026; time 02:56, explicitly confirmed by the user; test offer total BDT 1500.

| Check | User-reported observation | Remaining evidence |
|---|---|---|
| Online preparation | Ready for offline use appeared after the Android/Chrome instructions. | Physical device/browser identification and cache observations. |
| Offline reopening | User reported reopening successfully and seeing Ready for offline use after the Wi-Fi/mobile-data-off instructions. | Independent device inspection; low-end hardware/performance/assistive-use tests. |
| Enquiry | User explicitly reported that the helper received it and could understand the Bangla, but found it insufficiently organized/professional. | Exact received text, field-by-field unassisted comprehension, rendering, segment count and delay. Layout/wording feedback remains open. |
| Offer review | User reported the reply-recording flow working after instructions for `#CYUN39.1 1 1500`. | Exact native offer receipt and sender verification log. |
| Recovery | App displayed the missing enquiry-send-report guard. User reported success after instructions to use the explicit matching-reply recovery checkbox. | Independent screenshot/receipt-state export. |
| Acceptance | User supplied `#CYUN39.1 4 11-10-26 02:56 1500`. | Explicit helper receipt confirmation and exact native message pair. |
| Acknowledgement | User reported Agreement recorded appearing after instructions to record `#CYUN39.1 5 11-10-26 02:56 1500`. | Exact native acknowledgement receipt; helper confirmation and delivery log. |
| Saved receipt after offline close/reopen | User confirmed that Agreement recorded and all details remained in Outbox after the offline close/reopen instructions: `#CYUN39.1`, 11 October 2026, 02:56, BDT 1500. | User-reported result; independent device inspection and receipt export not supplied. |
| Physical sending | User confirmed that all four messages were actually sent. | Only enquiry receipt was explicitly confirmed; retain exact native sent/received pairs for all four messages and delivery times. |

No formal physical SMS checklist item is complete on this record alone. The 20-message target, carrier/version/message-pair logs, basic-phone route, independent Bangla review and human evaluation gates remain open. The structured physical SMS log remains blank until actual message observations are supplied. This informal helper feedback is not one of the required two native reviewer approvals or the structured comprehension study. Browser simulation results stay separate.

## Presentation feedback — candidate for review

The current renderer uses compact counts with no colon separators and “মোট দাম?”. The following candidate separates the request ID, guest counts and vegetarian count and uses a more formal price phrase. It has not been adopted by the renderer or deployed. The exact received enquiry is still requested to distinguish source layout from any changes in the SMS app/carrier path. Both native reviewer approvals remain pending.

```text
#CYUN39.1
11-10-26 02:56
বড়:2 শিশু:1
নিরামিষ:1
মোট মূল্য জানান।
```

Measured after NFC normalization: 64 UTF-16 units for these values, compared with 53 for the existing renderer. This exceeds the 60-unit warning target but fits the 70-unit hard limit. New values/revision lengths must always be checked separately. No meaning, professional-quality or native-review approval is claimed from the unit count.

Additional actual software check: used the existing smsSize/validateTemplate functions on this candidate for every supported adult/child/vegetarian-count combination in the two bundled profiles, with revision suffixes 1, 9, 10, 99, 100 and 999 (4,584 cases). All passed the hard limit and estimated one Unicode segment; maximum 68 units, with 4,368 cases above the 60-unit warning target. This is a candidate encoding sweep, not a carrier segment/charge measurement, exhaustive revision-length proof or native readability review. No live template was changed.

## Offline AI attempt

The user reported a “Direct contact required” warning with “The local model cannot route this inquiry reliably” after the instructed AI test. Their quoted enquiry included 2011-10-11, while the guide used 2026-10-11. This attempt is recorded as AI abstention, not successful routing/extraction. Reproduction on the original future-date sentence also abstained, so the warning cannot be attributed solely to the year difference. See ai-routing-regression.json and evidence-status.md for the parser/manual-fallback fixes. After updating and following the offline retest instructions, the user reported the new “AI needs manual review” warning and confirmed that switching to the form retained all five expected fields without corrections: 2026-10-11, 02:56, adults 2, children 1, vegetarian meals 1. This is user-reported extraction/manual-fallback evidence; reliable AI routing is still not established.

The subsequent phone screenshot showed the unqueued live preview with temporary ID #XXXXXX.1, adults 5, children 1 and vegetarian meals 1; the queue button appeared disabled. The user was guided to confirm manual mode, return Adults to the test value 2 and check the meal/completeness confirmations again. They then reported “it works now” after the queueing instructions. This is a user-reported local queue success; the final queued ID/card was not supplied. The source of the intermediate adult count 5 is unknown and is not attributed to AI extraction. No additional physical SMS exchange is claimed for this draft. The next suggested phone check is blocking a synthetic unsupported allergy requirement.
