# Character photography refresh

Owner requested on 10 October 2026: distinguish Seyi and Tunde, and give every character a genuine second moment rather than repeating a portrait with different clothes. The requested examples include Zuri at the beach with coconut water, Ranti outside her named salon, Vivian in a different outfit, and Ifeoma photographing a subject candidly.

Direction: retain recognisable adult identities, varied hair and skin tones; use activity, camera angle, location, framing and light to distinguish each gallery from its portrait. Seyi and Tunde also receive different portrait locations. Preserve the existing TalkingStage design system and fictional AI disclosure.

Generated with the built-in image-generation tool. The exact prompts, reference assets and output paths are recorded in `prompts.json`. Original assets remain available for rollback. Publication uses inspected immutable images and audited admin commands in local Supabase; this does not deploy a hosted environment.

Scope: 24 replacements — two portraits and 22 gallery photos. Visual review must check identity continuity, believable anatomy, framing, activity and background variation before publication.

## Implemented

All 24 replacements were visually reviewed and published to the local application. Preview assets use new `-v2.webp` URLs, so earlier cached pictures cannot replace the refreshed photos. Connected images use newly inspected, immutable UUIDs and responsive private Storage variants. The public cast remains 22 characters with exactly 44 current approved photos. All 24 superseded images remain stored privately with an audited explanation; no source objects or character profiles were deleted. The temporary publishing administrator role was removed.

Seyi has a studio-doorway portrait and an outdoor soundcheck gallery. Tunde has a blue-wall portrait and a waterfront gallery. Ranti’s storefront reads “Ranti Locs Studio”; Ifeoma looks at her camera while working; Vivian wears an amber patterned kaftan at an art market; Zuri wears blue swimwear and a white wrap on the beach with coconut water. The other galleries show activities such as dance rehearsal, live music, bookshop work, plant shopping, football and pottery browsing.

Open [all 22 photo pairs](./review.html). The exact built-in generation prompts are in [prompts.json](./prompts.json), and the inspected source hashes and dimensions are in [review-status.json](./review-status.json). Sources are saved in `docs/character-photo-refresh/assets/`; optimized website copies are in `public/images/characters/`.

For future local recovery or reruns, use `scripts/publish-photo-refresh.mjs` with its ignored `.local-services/photo-refresh.json` manifest. It verifies the reviewed hashes and current owners, refuses newer operator photos, respects mutation limits, and resumes existing immutable uploads. Earlier cast-publication manifests remain historical import records.

## Validation

- All 24 sources fully decoded with responsive variants; each source hash matches the visual-review record.
- TypeScript and ESLint passed.
- Connected browser checks passed for all 22 profiles and 44 current owned photos at 390px, with no overflow or page errors. Seyi and Tunde also passed desktop profile and chat-header checks at 1280px. Superseded portraits return inaccessible responses to ordinary members.
- Expanded-cast pagination, profile details, favourite artists and private-image access checks passed with the replacement manifest.
- Preview gallery loading, keyboard navigation and conversation resumption passed with the new versioned gallery URL.
- At initial refresh publication: 68 total immutable image records, 44 approved/current, 24 superseded; no remaining temporary photo-publisher administrator role. Disposable browser-test accounts were cleaned up.

The initial photography test needed its synthetic-conversation cleanup corrected and stopped changing image attributes before React hydration. The corrected test passed; application code did not require a hydration change.

## Landing-page selection

The owner selected Zuri’s refreshed beach gallery and Kunle’s first portrait for the landing-page hero. They now appear in two independent optimized image panels, with a frame that preserves both portrait proportions and a smaller conversation-card overlap. Zuri’s actual conversation clue replaces the previous Amara attribution; the caption names both fictional characters. Each image has its own loading-failure recovery.

Verified image loading, no horizontal overflow, and the onboarding link at 320, 390, 768 and 1440 pixels. TypeScript and lint passed. Visual evidence: [mobile](./landing-390.png) and [desktop](./landing-1440.png).

## Damilola’s tennis gallery

The owner requested a tennis photo reflecting Damilola’s existing hobby: tennis sportswear, a face cap, a racket and a peace sign toward the camera. Her new second photo preserves her face and bob hairstyle and shows the complete racket and sports outfit on an outdoor court. The first portrait and profile copy remain the same.

Generated with the built-in image tool. Exact prompt and inspected source hash: [damilola-tennis.json](./damilola-tennis.json). Source: [char-damilola-gallery-v3.png](./assets/char-damilola-gallery-v3.png). Website copy: `public/images/characters/char-damilola-gallery-v3.webp`. Both visual review pages use this latest photo while original generation records remain intact.

The inspected image was published locally through audited commands; the previous gallery remains private. The current photo manifest records the new UUID and preserves its predecessor in photo history. The original batch preview script refuses to overwrite later revisions.

Connected browser verification passed at 390px and 1440px: both owned photos load, the tennis hobby remains visible, the previous gallery is inaccessible to ordinary members, and the page has no horizontal overflow. TypeScript and lint passed. Evidence: [mobile](./damilola-tennis-390.png) and [desktop](./damilola-tennis-1440.png).
