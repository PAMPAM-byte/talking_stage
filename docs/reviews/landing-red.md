# Landing page refresh · 13 October 2026

The founder approved a red colour direction, generous white space, professional fonts, and a complete modern dating-style landing page. The implementation is limited to the marketing frontend and uses the existing product routes and local cast fixtures.

## Design

Motion direction: retain the existing red/white tokens and type pairing. The signature portrait collage gains opposing scroll depths, with quieter motion on the illustrative chat. One-time section reveals and small CTA/photo hover transitions support the same hierarchy. Rejected perpetual floating and page-wide parallax because they compete with reading. Mobile depth is halved; system reduced-motion preferences disable motion, including changes made while the page is open. Server-rendered content remains visible without enhancement.

White surfaces, red calls to action, restrained blush sections, Manrope typography, and italic DM Serif Display accents establish the hierarchy. A staggered portrait collage and conversation clue provide the distinctive opening. Mobile layouts stack the main content and retain two-column personality previews; desktop layouts use wider editorial splits. Styles are scoped with the `tsl-` prefix.

The page includes navigation, hero, product assurances, three-step onboarding/discovery explanation, four personality previews, an illustrative conversation, user controls, six expandable FAQs, a final onboarding call to action, and policy/support footer links. Portraits are labelled as AI generated. Adult eligibility, fictional AI identity, non-explicit scope, and voluntary operator payments are explained without invented social proof. The chat illustration is labelled; fixture cast choices remain provisional.

## Validation

- TypeScript and targeted ESLint checks passed.
- Three dedicated Playwright checks passed: responsive rendering at 320, 360, 390, 430, 768, 1024, and 1440 pixels; keyboard navigation, FAQ operation and onboarding entry; failed photo recovery.
- After the motion enhancement, all five landing checks passed, including scroll-triggered reveal/parallax, live reduced-motion changes, and content/FAQ use without JavaScript. Screenshot captures use reduced motion for a stable review image.
- Browser assertions verify the actual white background, red CTA, positioned portrait layout, absence of horizontal overflow, and successful image decoding.
- The existing landing, account, and policy responsive regression test passed.
- [Desktop screenshot](./landing-red-1440.png) and [mobile screenshot](./landing-red-390.png) record the rendered page.

The review uses the existing local mock mode. It does not validate live authentication, AI replies, payments, or backend services. The layout intentionally has generous section spacing; mobile content is stacked to keep text and controls readable.
