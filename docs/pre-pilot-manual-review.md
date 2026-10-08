# Manual review required before private-pilot access

8 October 2026 · Pending; no device or screen-reader result is claimed.

The product owner accepted the frontend and explicitly authorised moving these checks from Stage 7 to before private-pilot access. Gate A permits backend work; this checklist remains a pilot admission requirement. Test the integrated release candidate, not only the disposable mock build. Do not admit participants until evidence exists and material findings are fixed.

Owner: product owner or a designated human tester. Record the release commit, date, tester, device/OS/browser/assistive-technology versions, results and associated findings. Backend implementation does not satisfy this checklist automatically.

| Check | Required walkthrough | Status |
| --- | --- | --- |
| Android phone | Chrome, portrait/landscape: 18+ checkbox, registration/recovery, discovery/profile/gallery, chat, settings and reporting | Pending |
| iPhone | Safari, portrait/landscape: the same customer journeys and hosted payment sandbox flow when integrated | Pending |
| Physical keyboard opening | Focus chat and form inputs; open/close keyboard, rotate, type multiline text, send/retry and open sheets. Verify composer/actions stay reachable and no content is trapped behind the keyboard | Pending |
| Zoom and readable text | Browser zoom and actual text-only enlargement where supported; inspect forms, navigation, dialogs, payment amount/recipient and admin records at 200%. Verify no clipped content or lost actions | Pending |
| TalkBack | Traverse customer journey; verify labels, reading order, checkbox state/error, message announcements, dialog focus/dismissal and payment status distinctions | Pending |
| VoiceOver | Repeat critical onboarding/chat/payment/report/deletion paths in Safari; verify rotor landmarks/headings and focus returns after sheets/viewers | Pending |
| Keyboard-only desktop | Use Tab/Shift+Tab/Enter/Escape through account, filter/viewer, chat/options, gift and admin confirmation flows; verify visible focus and modal/background behaviour | Pending |
| Findings and rerun | Record severity, affected journey and correction; rerun affected checks on the same release candidate | Pending |

Do not describe automated viewport or ARIA checks as physical-device or screen-reader evidence. Final legal/support text, published cast/assets and provider/payment approvals retain their separate integration/launch prerequisites.

## Evidence record

| Field | Value |
| --- | --- |
| Release/commit | Not recorded |
| Tester/date | Not recorded |
| Devices and assistive technologies | Not recorded |
| Results/findings | Not recorded |
| Material findings resolved and rerun | Not recorded |
| Pilot admission approval | Not granted |
