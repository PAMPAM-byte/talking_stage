# Stage 2 — Landing, accounts, and onboarding

Date: 8 October 2026 (Africa/Lagos).

Status: Frontend implemented, including the user-selected 18+ checkbox declaration added during Stage 7. This is self-declaration, not independent age verification, and does not establish production enforcement or pass Gate A on its own.

## Delivered

- Mobile-first landing with the plum/rose design system, locally served typography, generated adult portrait diptych, signature conversation clue, AI/adult disclosure, primary entry action, and policy navigation.
- Image loading/failure/reload handling and responsive Next.js image delivery. Draft artwork is labelled AI-generated; cast approval is not implied. [Image and complete generation prompt](./stage-2-image.md), using the built-in imagegen tool. Saved asset: `public/images/landing-characters.png`.
- Adult declaration and under-18 blocked state. Blocked demo access cannot continue through registration or sign-in.
- Registration, sign-in, duplicate-demo-account/invalid-input feedback, recovery request, recovery completion, expired/invalid reference, sign-out, and session-expired views.
- The initial assurance simulation was replaced during Stage 7 following the user's checkbox choice: unchecked adult declaration before registration, required confirmation/error, under-18 blocking and direct progression from registration to preferences. The legacy assurance route redirects to the declaration; no identity documents are collected and no independent verification is claimed.
- Preferred name, women/men/both selection, English/English-with-Pidgin choice, completion summary, explicit AI acknowledgement, and editable preferences before/after completion.
- Local mock account operations with latency/offline/failure scenarios. Disposable session-storage state preserves onboarding/preferences across refresh, but never stores email or password. Email draft is retained only in browser memory across client navigation; passwords are not preserved between screens.
- Mock eligibility redirects and a narrow allowlist for return paths. Client checks are presentation only; server security remains Stage 8 work.
- Draft terms, privacy, payment-information, and support pages. Content identifies unresolved policies instead of inventing a legal conclusion, operator contact, or retention period.
- `/discover` is a guarded onboarding handoff, not an implementation of the Stage 3 discovery screen.

## Design review

Applied frontend-design. Retained the minimal portrait-led direction with one primary entry action. The conversation clue sits on an opaque card below the portraits to keep copy readable. Account screens use a focused column, visible form labels, generous touch areas, and the same control styles as Stage 1.

The two AI-generated people visibly appear adult, wear tasteful non-explicit clothes, and are presented as fictional. The image is a draft marketing composition and is not a published character gallery or approved chat asset.

Evidence:

- [Landing, mobile](./stage-2/landing-390.png)
- [Landing, desktop](./stage-2/landing-1440.png)
- [Adult declaration, mobile](./stage-2/age-390.png)
- [Sign-in, mobile](./stage-2/sign-in-390.png)

## Validation

Checkbox follow-up during Stage 7, 8 October 2026: all five updated onboarding journeys passed, covering unchecked/required checkbox feedback, registration directly to preferences, incomplete-onboarding access blocking, explicit under-18 denial, retry, refresh, recovery and session expiry. Inspected the updated [mobile age screen](./stage-2/age-390.png). Lint, production build/TypeScript and production-exclusion checks passed. The following original validation record describes the earlier simulation before the user-selected method replaced it.

Final validation passed on 8 October 2026: lint, production build/TypeScript, all 10 Playwright tests, and production-preview exclusion. Checks cover:

- ESLint, TypeScript, production compilation, and route generation.
- Existing Stage 1 foundations plus adult onboarding, preference persistence, consent, underage blocking, private-destination redirects, sign-out, recovery validity, non-enumerating recovery response, offline retry, email-draft navigation, incomplete-account resume, external return-path rejection, and session expiry.
- Landing/account/policy layouts at 320, 390, 768, and 1440 px without horizontal overflow.
- Screenshot inspection of the portrait-led landing and form layouts.
- Production-preview exclusion using the existing production check script.

No provider, email delivery, real authentication, durable backend ownership, or actual age verification was tested because none is connected.

## Remaining decision and next stage

**Age method resolved on 8 October 2026:** The user selected a checkbox, after confirming 18+ eligibility and placement before onboarding. This supersedes the earlier provider-dependent frontend prerequisite. Server-enforced declaration and adult access remain Stage 8 work; checkbox presentation is not proof of age.

Account method, final terms/privacy/support content, and brand/cast approval also remain on their existing decision deadlines. Current labels are provisional: women, men, or both; English or English with Pidgin.

Stages 3–7 are complete for frontend handoff. The user accepted the frontend and authorised deferring manual device/accessibility review until before private-pilot access. Gate A now permits **Stage 8 — Backend foundation, identity and ownership**. Final launch/service decisions remain on their respective gates.
