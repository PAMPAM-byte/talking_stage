# Settings navigation and presentation

10 October 2026

The connected settings overview now shows three descriptive, clickable cards for preferences, saved memories and monetary requests. Icons, current preference summaries, plum hover/focus treatment and privacy/support links follow the design system and frontend-design skill. The layout uses a single column on mobile and a restrained reading width on desktop.

The shared protected layout now supplies authentication and navigation while each settings route renders its own content. Previously the layout selected content using its initial request path; client navigation could change the URL while leaving the settings overview visible. Preferences now render in the settings shell with a back link instead of the onboarding header and landing-page exit action. Memories and requests also return to settings.

Saving preferences or monetary-request controls invalidates the affected settings pages so their summaries and forms reflect the saved value. Request confirmations remain visible after refresh; controls disable during submission. Existing explicit memory consent and per-conversation request controls are preserved. Checkout remains unavailable pending payment integration. Unimplemented account deletion and payment-history routes show honest unavailable states rather than preview operations inside connected accounts.

Validation: authenticated browser coverage checks all three links through client navigation, a single visible header, preference persistence, request persistence and confirmation, updated overview summaries, and mobile overflow. It also checks enabling memory, saving with explicit consent, reload persistence, deleting the saved fact, disabling memory and returning through the settings navigation. Synthetic test data is removed after the run. TypeScript and scoped ESLint checks passed.

Screenshots: [desktop overview](./settings/settings-1280.png), [mobile overview](./settings/settings-390.png), [preferences](./settings/preferences-390.png), [requests](./settings/requests-390.png), [memories](./settings/memories-390.png).
