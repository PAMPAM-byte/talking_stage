# Direct signup and sign-in

9 October 2026. Owner explicitly requested removing email confirmation for signup and sign-in in both local and production environments. This instruction supersedes the earlier confirmation requirement.

Local Supabase email confirmation is disabled in checked-in configuration and the running Auth container. The guarded startup helper preserves native anonymous IP limits while applying the direct-signup policy. Signup immediately receives a session and opens preferences. The same application code runs in production; no confirmation instruction remains in signup/sign-in or the email-link error screen. The 18+ declaration, terms/AI consent, onboarding, passwords, ownership and private-route checks remain enforced. Recovery still uses a user-bound email link.

Disabling confirmation does not unblock older unconfirmed users automatically. After a private Auth/application database snapshot, the one existing unconfirmed local email/password account was implicitly confirmed through the trusted Auth admin API. No password was changed. A separate disposable-user check verified that the same policy permits correct-password sign-in and rejects an incorrect password. Implicit confirmation is the selected access policy, not evidence of email ownership.

The real two-account browser journey passed immediate signup, declarations, onboarding/refresh, password sign-in, ownership/RLS, admin restrictions, recovery/expired/reused links, password updates, sign-out, duplicate-account guidance and an isolated backup/restore. Targeted ESLint, production build/type checking, production private-route/development-exclusion checks and diff checks pass. The owner confirmed that no hosted Supabase project exists, so hosted settings and hosted acceptance cannot be claimed applied or tested.

Before production connection, disable **Confirm Email** in the hosted project's Email provider (`mailer_autoconfirm: true`) and verify the same immediate-signup/direct-sign-in journey. Local TOML configuration does not update a hosted project. Follow [setup instructions](../stage-8-setup.md).
