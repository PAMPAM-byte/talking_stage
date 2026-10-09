# Expanded character cast

10 October 2026 · Fourteen additional fictional adults · Private local drafts

Open [the visual review](./review.html) in a browser to compare biographies, conversation clues, portraits and gallery photos. Full profile copy, appearance continuity and conversation direction are in [characters.json](./characters.json). The existing eight published characters remain separate.

| Character | Age | Role | Distinct appearance |
| --- | --- | --- | --- |
| Adaora | 24 | Upcoming singer-songwriter | Deep brown skin, short natural curls, mustard linen |
| Raymond | 49 | Entrepreneur / sugar daddy personality | Broad square face, stocky build, salt-and-pepper hair and beard |
| Vivian | 46 | Business owner / sugar mummy personality | Mature round face, fuller build, side-part wavy wig |
| Chief Chukwudi | 56 | Chief and community patron | Long face, prominent nose, grey beard, traditional attire |
| Hon. Femi | 44 | Fictional civic leader | Slim build, narrow face, clean-shaven, navy tailoring |
| Nneka | 26 | Dancer and choreographer | Athletic build, cornrow braids in a high ponytail |
| Malik | 27 | Rapper and recording artist | Lean build, freeform locs, light moustache |
| Damilola | 34 | Corporate banker | Square face, chin-length bob wig, professional tailoring |
| Dr Aisha | 33 | Medical doctor | Warm brown skin, neutral hijab, rounded face |
| Emeka | 29 | Nurse | Sturdy build, round face, low taper, clean-shaven |
| Kunle | 31 | Public health programme officer | Shaved scalp, slim build, round glasses |
| Ranti | 28 | Hair stylist and salon owner | Shoulder-length natural locs with auburn tips, nose stud |
| Zuri | 29 | Beauty creator / Lagos baddie | Long centre-part wig, curvy BBL-style silhouette, plum styling |
| Kiki | 32 | People operations manager | Very deep brown skin, shaved head, tall lean build, cobalt tailoring |

Each has an individual biography, interests, conversation opening, voice and relationship pace. Career and lifestyle are background to a rounded personality. Sugar daddy/mummy characters never require payments or financial transfers for affection. Healthcare and civic careers are fictional background, without claims of real services or authority.

## Implementation

- `node scripts/import-expanded-cast-drafts.mjs --check` validates fourteen profiles, six men and eight women. The local import uses expected-version audited commands and resumable IDs; it never publishes characters.
- `node scripts/build-expanded-cast-review.mjs` checks image dimensions and creates the responsive offline review page and prompt record.
- `node scripts/import-expanded-cast-assets.mjs --check` fully decodes all twenty-eight sources and produces the same sanitized responsive WebP variants used by the application.
- Running the asset importer without `--check` stores owned portrait/gallery assets in private local Storage for admin review. It does not approve or publish them. Temporary maintenance roles are removed and accounts disabled afterward.

Images are generated through the built-in image-generation tool. [The prompt record](./image-prompts.json) describes each identity and gallery scene. Matching gallery images use their own character portrait as reference. Generated originals are retained in `assets/`; private Storage serves normalized WebP versions.

## Publication decision

These fourteen profiles and twenty-eight new photos require their own adult appearance, identity continuity and non-explicit review attestations before customer publication, as specified by [the Stage 9 image/publication contract](../stage-9-contracts.md). The [earlier owner approval](../reviews/stage-9/cast-approval.md) covered the original eight characters and sixteen photos only. This document does not extend that approval or authorize hosted deployment.
