# Hosted Supabase preparation

Current-status note, 16 October 2026: this is the 11 October handoff record. AI-disabled/fourteen-migration descriptions below are historical. [15 October activation](./claude-haiku.md) records enabled Haiku with approved finite budgets and migration 015. See [current project status](./project-status.md) for remaining gates. The operational hosted-test environment remains separately AI-disabled.

11 October 2026. Project reference: `hoxeembcwureucdsssct`.

The owner saved the hosted server credential directly in ignored `.env.hosted.local` and authenticated the Supabase CLI. CLI 2.120.0 is linked to this project. The hosted preparation file is not automatically loaded by Next.js; the working .env.local now uses the hosted credentials after the core browser check passed. The previous complete Docker configuration is preserved in ignored .env.docker.local. Credentials and account records were not printed.

## Database and storage

The initial SDK probe misleadingly reported that application tables existed. Direct hosted HTTP returned 404/PGRST205 for profiles, and trusted SQL confirmed no public/private application tables and no recorded migrations. These direct checks supersede the initial probe. Future acceptance must check actual responses and persisted SQL state, rather than treating absence of an SDK error field as success.

A migration dry run identified all fourteen checked-in migrations. After one temporary login-role transport failure, a retry applied migrations 202610080001 through 202610100014 successfully. No seeds, local accounts, conversations or local database backup were imported.

Verified persisted hosted state:

- Fourteen migration history entries.
- All public application tables have row security enabled.
- Neither anon nor authenticated has private-schema usage.
- Database AI configuration is disabled.
- Profiles endpoint returns HTTP 200 for an empty selection with the hosted server key.
- The cast-private bucket is private, WebP-only, with a 5 MB limit; its hosted endpoint returns HTTP 200.

These checks do not substitute for two-user hosted ownership tests, function/grant regression, live Auth acceptance or object recovery. The subsequent authorized cast promotion published 22 profiles and 44 current photos; see the acceptance below.

## Hosted Auth verification

The owner saved Confirm Email off in the hosted dashboard. Two disposable synthetic adults registered through the hosted signup endpoint and each immediately received an access token. Password sign-in succeeded for both. Each authenticated profile query returned exactly its own profile with the 18-plus-v1 declaration, including while the other account existed. Both synthetic Auth accounts were deleted in finally cleanup. No passwords, tokens or account IDs were printed. This confirms hosted Auth/profile behavior, not the full browser onboarding or recovery delivery journey.

The existing cast-publication tools explicitly reject remote projects and must not be repointed by removing their local guards. Hosted promotion needs a separate guarded import of the approved cast/profile/photo snapshots, resumable hosted IDs, inspected immutable bytes and administrator publication checks. Do not copy local users, messages, memories, roles or test fixtures.

## Cast promotion and application handoff

The owner authorized importing the 22 approved cast profiles and 44 current photos and switching the application to hosted Supabase. The separate scripts/publish-hosted-cast.mjs tool whitelists owners from the local publication manifests, checks the selected project/link, decodes every current local original and verifies its approved stored hash before writing remotely. It preserves approved original bytes, creates 320/640/1280 display variants, uses hosted expected-version administrator review/publication RPCs and maintains a separate ignored checkpoint. No local accounts, conversations, memories, user roles or test fixtures were imported.

A temporary DNS/network interruption stopped the first batch after six profiles. Manifest-bounded trusted SQL removed the recorded maintenance role and disabled that login. Publication resumed after connection recovery and existing hosted snapshot verification. Cleanup now checks its persisted SQL result. No rejected photo, changed draft or later character deactivation is overwritten by rerunning the importer.

Independent hosted SQL confirmed 22 published characters, 44 approved current assets, 176 private WebP objects, zero maintenance administrator roles and disabled AI. Publication audit/direction history retains disabled synthetic maintenance attribution; those identities have no administrator role or active login.

The isolated hosted production build and production exclusion/private-route/account-layout checks passed. TypeScript and scoped lint passed. The connected hosted browser journey passed registration through the age checkbox, immediate onboarding, women/men/everyone discovery, all 44 authenticated photo deliveries, anonymous/direct-public-object denial, keyboard photo viewer, preserved women filter on profile return, character portrait in chat, Enter send and durable reload, cross-account conversation/message denial, durable settings preferences, responsive preferences at 320/390/768/1440, sign-out and direct sign-in. Both disposable browser accounts and their test conversations/messages were removed. Evidence: [mobile hosted chat](./reviews/hosted/chat-390.png). These are development browser checks against real hosted services, not a public-site deployment.

After those checks, .env.local was switched to the hosted configuration. The already-running localhost:3000 application was independently verified with the new hosted synthetic test account, ordinary onboarding and both current Ranti photos. Evidence: [active hosted profile](./reviews/hosted/active-ranti-390.png). The local test-account shortcut remains restricted to loopback Supabase and is absent for this hosted connection.

The hosted tester account has a separately generated password stored only in ignored .local-services/hosted-cast/test-login.txt. It is for development review and must be removed before pilot/public access. No shared local sample password was reused.

Commands: npm run backend:check-hosted-cast, npm run backend:publish-hosted-cast, npm run backend:hosted-test-account and npm run test:hosted. The importer reads preserved Docker credentials from .env.docker.local after the application switch; Docker must remain available as the approved source. Existing local test/configuration tools still reject a hosted .env.local. To return to Docker, restore the contents of .env.docker.local to .env.local and restart development; do not overwrite the hosted preparation file. Local backup schedules continue to target their Docker project and do not protect this hosted database.

## Remaining launch work

Confirm Email off is verified. Configure the hosted minimum password, exact site/recovery redirects and recovery delivery. While testing on this machine, use site URL http://localhost:3000 and the exact allowed recovery redirect http://localhost:3000/auth/confirm; use the deployed origin before launch. The owner saved the localhost site URL and exact /auth/confirm redirect in the hosted dashboard. Cast publication, signup/sign-in, onboarding, selected ownership/image checks and the development app switch are now verified.

On 27 October 2026 the owner configured hosted email for production (fix.md F03). Custom SMTP sends through Resend (`smtp.resend.com:465`, user `resend`, sender `TalkingStage <no-reply@talkingstage.buzz>`); the API key lives only in the Supabase dashboard. The email rate limit is 100 per hour. The recovery and confirmation templates from `supabase/templates/` are pasted in with the subjects “Reset your TalkingStage password” and “Confirm your TalkingStage account”. The site URL is now `https://www.talkingstage.buzz`; the redirect allow list holds `https://www.talkingstage.buzz/**` and `http://localhost:3000` for local development. Cloudflare DNS publishes `_dmarc` as `v=DMARC1; p=none` alongside the Resend DKIM and `send.` records. A recovery request from www.talkingstage.buzz to a Gmail account arrived in the inbox from no-reply@talkingstage.buzz with the new design, and the owner completed the reset and signed in. Yahoo and Outlook delivery were not tested because the owner has no accounts there; the SPF/DKIM/DMARC results in a received header are not yet checked.

Enabled hosted browser deletion, monitoring, off-site recovery protection and alerts remain pending. The original local seven-day tasks protect Docker; the separate hosted job described below protects encrypted local copies of hosted exports. AI remains disabled; this setup does not authorize a pilot or public launch.

The owner confirmed the Free plan on 11 October 2026 and downloaded the dashboard server root certificate. Verified TLS export, encrypted Auth/application/private data plus all 176 photo objects, isolated database/photo recovery and seven-day local-copy retention now pass; see [hosted backups](./hosted-backups.md). The daily 03:15 Lagos-time Windows job is installed and its actual task invocation completed with exit code zero and same-day deduplication. Local scheduled backups now select the preserved Docker configuration automatically when no explicit process URL is set. Hosted-origin deletion and historical restore suppression subsequently passed with disposable accounts under a transaction-scoped gate; see [review](./reviews/hosted-account-deletion.md). General-user deletion stays disabled. Off-site protection, enabled browser deletion acceptance and external failure alerts remain open.
