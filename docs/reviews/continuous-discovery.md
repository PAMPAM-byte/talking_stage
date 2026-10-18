# Continuous dating-app discovery · 18 October 2026

The founder requested every matching character in one Discover page, with no Next/Previous pages. This supersedes the earlier twelve-card presentation and the pagination controls added during the younger-cast rework.

## Research and design

[Bumble's People tab](https://support.bumble.com/hc/en-us/articles/28423154479645-Using-the-People-tab) documents preference-based profiles, left/right swipes, undo and opening profile details. [Tinder's Discovery settings](https://www.help.tinder.com/hc/en-gb/articles/115003340963-Discovery-Settings) describes a preference-driven profile discovery surface. These support the chosen card flow; they do not establish either service's internal data-loading implementation.

TalkingStage keeps its single portrait, profile detail panel and circular Undo/Pass/Meet actions. White `#FFFFFF`, rose `#FBF2F4`, red `#CF2445`, deep red `#BD2040`, ink `#242126` and muted `#75656C`, Manrope interface text and restrained serif quotes remain. The signature interaction is uninterrupted movement from character twelve to thirteen, with the same undo history and no page transition. The counter describes the whole matching deck. Exhaustion says “You're all caught up” and offers Browse again or Undo.

## Implementation

The server combines the existing authorized `discover_cast` reads into one ordered deck. For the fifty-person cast, it reads the first twelve and fetches the remaining four internal data batches concurrently. These batches never become user-visible page navigation. Only the active card's portrait is mounted. No database migration, new provider call, artificial match, subscription or permission change is introduced.

Gender, interest and personality preferences apply to every read. Missing/failed pages, changed totals or duplicate IDs produce the existing unavailable state rather than silently hiding characters. Profile/chat return preserves the current character with session storage. The storage version changes so completion of an old twelve-character batch cannot hide the remaining cast. Old page query parameters no longer limit discovery or propagate into profile return links.

Offline feed checks exercise all fifty profiles in order, filtered and empty feeds, and partial failure/changing-catalogue cases. Browser checks cover passing all fifty on one URL, no pagination controls, undo at the end, return/reload continuity, Meet, filters, responsive widths and touch gestures. Hosted authentication availability limits recorded in the younger-cast review remain separate from these offline/local checks.

Validation: TypeScript and scoped ESLint passed, alongside all seventeen offline core suites. Eleven discovery browser checks passed across the initial run and targeted rerun. The rerun corrected a test that expected the Everyone filter to disappear from the URL, plus three stale pre-rework age expectations; the full fifty-card pass/undo check then passed. No hosted writes, paid AI calls or new hosted-browser verification were performed for this update.
