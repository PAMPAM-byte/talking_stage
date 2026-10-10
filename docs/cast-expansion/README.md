# Expanded character cast

10 October 2026 · Fourteen additional fictional adults · Published locally

Open [the visual review](./review.html) in a browser to compare biographies, conversation clues, portraits and gallery photos. Full profile copy, appearance continuity and conversation direction are in [characters.json](./characters.json). The existing eight published characters remain separate.

The owner-requested [photography refresh](../character-photo-refresh/README.md) now supplies distinct candid galleries for all twenty-two profiles, plus new Seyi and Tunde portraits. This review uses those current gallery assets; the original generation prompts and sources remain historical records.

| Character | Age | Role | Distinct appearance |
| --- | --- | --- | --- |
| Adaora | 25 | Upcoming singer-songwriter | Deep brown skin, short natural curls, mustard linen |
| Raymond | 52 | Entrepreneur / sugar daddy personality | Broad square face, stocky build, salt-and-pepper hair and beard |
| Vivian | 46 | Business owner / sugar mummy personality | Mature round face, fuller build, side-part wavy wig |
| Chief Chukwudi | 64 | Chief and community patron | Long face, prominent nose, grey beard, traditional attire |
| Hon. Femi | 48 | Fictional civic leader | Slim build, narrow face, clean-shaven, navy tailoring |
| Nneka | 26 | Dancer and choreographer | Athletic build, cornrow braids in a high ponytail |
| Malik | 27 | Rapper and recording artist | Lean build, freeform locs, light moustache |
| Damilola | 36 | Corporate banker | Square face, chin-length bob wig, professional tailoring |
| Dr Aisha | 34 | Medical doctor | Warm brown skin, neutral hijab, rounded face |
| Emeka | 29 | Nurse | Sturdy build, round face, low taper, clean-shaven |
| Kunle | 35 | Public health programme officer | Shaved scalp, slim build, round glasses |
| Ranti | 28 | Hair stylist and salon owner | Shoulder-length natural locs with auburn tips, nose stud |
| Zuri | 29 | Beauty creator / Lagos baddie | Long centre-part wig, curvy BBL-style silhouette, plum styling |
| Kiki | 32 | People operations manager | Very deep brown skin, shaved head, tall lean build, cobalt tailoring |

Each has an individual biography, interests, conversation opening, voice and relationship pace. Career and lifestyle are background to a rounded personality. Sugar daddy/mummy characters never require payments or financial transfers for affection. Healthcare and civic careers are fictional background, without claims of real services or authority.

Profiles now have fictional neighbourhoods as well as cities. Eight profiles include selected favourite artists in their biography and interests, displayed in an “On repeat” section. Ages were adjusted as fictional editorial choices after reviewing both photos, rather than claims of verifiable age. Both the connected local application and the development preview contain all twenty-two characters and their owned photos.

## Implementation

- `node scripts/import-expanded-cast-drafts.mjs --check` validates fourteen profiles, six men and eight women. The local import uses expected-version audited commands and resumable IDs; it never publishes characters.
- `node scripts/build-expanded-cast-review.mjs` checks image dimensions and creates the responsive offline review page and prompt record.
- `node scripts/import-expanded-cast-assets.mjs --check` fully decodes all twenty-eight sources and produces the same sanitized responsive WebP variants used by the application.
- Running the asset importer without `--check` stores owned portrait/gallery assets in private local Storage for admin review. It does not approve or publish them. Temporary maintenance roles are removed and accounts disabled afterward.
- `node scripts/publish-expanded-cast.mjs` applies the owner's local publication authorization through audited approval and publication commands. It verifies final draft snapshots and image hashes, resumes saved progress, respects rate limits, backs up the database and removes its temporary administrator role.

Images are generated through the built-in image-generation tool. [The prompt record](./image-prompts.json) describes each identity and gallery scene. Matching gallery images use their own character portrait as reference. Generated originals are retained in `assets/`; private Storage serves normalized WebP versions.

## Verification completed

The subsequent owner-authorized publication passed two connected browser checks and two preview browser checks. An ordinary adult account loaded every new profile and its two owned photos, verified favourite artists, and exercised discovery pagination (twelve then ten cards). Final database totals are twenty-two published profiles and forty-four approved/published photos, with no remaining temporary publisher roles. [Publication evidence](../reviews/cast-expansion-publication.md) and [mobile profile capture](./profile-live-390.png).

- Fourteen private local drafts were saved and the importer rerun without duplicates; original eight published profiles remain intact.
- Twenty-eight images were visually inspected for adult appearance, distinct identities and portrait/gallery continuity. Chief and Ranti portraits were revised after comparison. This implementation review is not the owner's publication attestation.
- All twenty-eight sources fully decoded, with metadata stripped and 320/640/1280 WebP variants produced. Owned photos were uploaded into private local Storage with pending review and no publication.
- Browser inspection loaded fourteen cards and all twenty-eight images at widths of 390 and 1280 pixels, with no horizontal overflow. Captures: [mobile](./review-390.png), [desktop](./review-1280.png).
- The local authenticated discovery browser test passed (48.4 seconds overall), covering saved Men/Women preferences and explicit Everyone choices. Its assertions now account for independent gender pagination when the cast grows.
- ESLint and TypeScript checks passed. Temporary importer administrator roles were removed and maintenance accounts disabled. No AI-provider key was needed for the image-generation tool; application AI availability remains unchanged.

## Publication decision

The owner authorized implementing all fourteen profiles and twenty-eight photos on 10 October 2026, including editorial age selection, locations and artist preferences. [The authorization record](../reviews/cast-expansion-publication.md) covers this expansion separately from the original eight. Required attestations and local publication were completed through the [Stage 9 image/publication workflow](../stage-9-contracts.md). The local cast now contains twenty-two published profiles and forty-four approved, published photos; hosted deployment is not included.
