# Stage 8 implementation review

8 October 2026 · **In progress**, not complete. Supabase selected with user approval; no live project is connected.

## Implemented locally

- Official Supabase SSR packages, validated public configuration, server-only data access and Next.js 16 Proxy session refresh. Server account reads validate identity with Auth `getUser`; RLS enforces data ownership independently.
- Versioned foundation migration for the minimum PRD entities, private character direction/roles/payment events/report resolution/audit, read-only client grants, composite ownership references, sequence/idempotency constraints and onboarding restrictions.
- Register/sign-in/confirmation/recovery/sign-out actions, signed declaration/recovery cookies, persisted 18+ declaration, explicit onboarding consent, narrow preference RPCs with optimistic versions and transactional request limits.
- Connected account forms reuse the approved design system. Production cannot use mock identity. Unfinished cast/chat/payment/privacy/admin operations display availability states in Supabase mode; their approved frontend fixtures remain reviewable in development mock mode.

## Verification

- Local PGlite/PostgreSQL migration and ownership checks passed: two actors, changed target ID, anonymous/incomplete access, no role from metadata, private-table denial, direct-write denial, stale/invalid preferences, consent, cross-owner ledger reference, message sequence uniqueness, trusted admin provisioning and mutation limits.
- Final TypeScript/production build and ESLint passed. `npm run check:production` passed: development tooling/private-fixture exclusion, private-route denial with forged preview cookies and missing configuration, real account screens at 320/390/768/1440px, under-18 refusal and zero browser page errors. Mobile screenshots were visually reviewed and the approved heading typography restored.
- All five existing onboarding Playwright tests passed (1.3 minutes); development mock registration/preferences/recovery/expiry/refresh/sign-out and responsive public/account screens remain intact.
- These tests do **not** establish live Supabase Auth/email behaviour. Docker's daemon was unavailable and no project configuration was present.

## Remaining acceptance

Complete the [live integration checklist](../stage-8-setup.md), including SMTP/template configuration, real two-account tests, provider/anonymous rate limits, connected UI review and a backup/restore drill. The stage tracker stays open until that evidence exists. Stage 9 feature integration has not begun. The separate pre-pilot manual-device/accessibility gate remains required.

Reviewed mobile evidence: [age / service unavailable](./stage-8/age-unconfigured-390.png), [sign-in / service unavailable](./stage-8/sign-in-unconfigured-390.png). These depict the production boundary without a configured backend, not live Auth success.

Dependency audit reported five high-severity entries in the development-only Next ESLint → fast-glob → micromatch → braces chain. The upstream [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) currently lists no patched version. No forced Next/ESLint downgrade was applied. `npm audit --omit=dev` reported zero production vulnerabilities.
