# Discovery gender preferences

9 October 2026

The owner reported that choosing Men during onboarding opened the entire cast. Connected discovery previously forwarded only URL filters to the database and ignored saved preferences. When the URL has no gender choice, it now uses the current account's single saved gender. Selecting both genders defaults to everyone. Explicit Men/Women links switch the list immediately; Everyone and Explore all characters use `gender=all` and clear other filters to show the complete eligible cast. They do not change saved preferences.

Interest/personality submissions retain the active gender. Pagination carries the effective choice, including explicit all, so later pages cannot silently revert to a saved preference. The empty-state reset also uses explicit all. The chips reuse the accepted mobile design and expose the active link with `aria-current`. The frontend-design skill and design system were followed.

The disposable-account browser regression covers men-only onboarding and refresh, Women and Everyone, interest-filter clearing, explicit all after refresh/filter submission, Explore all characters, updated women-only preferences, both-gender preferences and 390px overflow. The test account is removed afterward; no AI calls or conversations are created. TypeScript, focused ESLint and whitespace checks pass. See the [mobile men-only controls](./stage-10/discovery-men-390.png).

The final browser regression passed in 25 seconds after correcting its interest-field locator. The earlier gender/preference checks also passed. The mobile gender controls were visually reviewed; the active Men choice and four-character result agree with the saved preference.
