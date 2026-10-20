# Chat opening and profile copy

20 October 2026. The founder requested only a portrait when starting a new chat, and more natural dating-profile copy.

The connected empty conversation now contains only the existing portrait. Its dedicated profile-clue database read has been removed. The accessible section label and image alternative remain; composer and message delivery are unchanged. The portrait automatically leaves the message area after the first outgoing message through the existing empty-state behavior.

All 50 short profile lines are individually written in first person, with ordinary preferences and small habits instead of interview questions, rhetorical challenges or a demand that users impress the character. Example for Adanna: ?I make clothes, but somehow I still have nothing to wear on Friday.? Profiles and Discover label this ?One thing about me?. Biographies, photos, identities, interests and private chat directions are preserved. Source data, generated frontend catalogue and versioned hosted publication share the same lines.

Validation: the actual ConnectedThread server component rendered with a synthetic account contains only the portrait in its empty section, retains its accessible label and does not query the profile clue; TypeScript and ESLint; 50-profile PostgreSQL round trips and discovery checks; desktop/mobile profile inspection. Hosted publication retains an encrypted baseline and verifies public profile fields and unchanged directions. See profile-lines-publication.json in docs/cast-50 for the publication outcome.
