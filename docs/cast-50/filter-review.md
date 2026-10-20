# Character discovery and conversation identity

20 October 2026.

All 50 characters have individually reviewed personality and interest assignments in [discovery-profiles.json](./discovery-profiles.json). Each assignment includes a distinct conversation expression, a personal angle and specific established interests. The roster compiler applies these assignments to both the public profile and private conversation direction. The public frontend contains no private direction or backstory.

## Research and editorial approach

The [APA Big Five model](https://dictionary.apa.org/big-five-personality-model) and [IPIP facet definitions](https://www.ipip.ori.org/newNEO_FacetsTable.htm) informed the distinction between broad traits and their specific expressions. These fictional editorial assignments are not diagnoses or personality test results. Style labels such as baddie are separate from temperament: [Merriam-Webster's description](https://scrabble.m-w.com/slang/baddie) informed the confident, fashion-conscious interpretation. A reserved character can also have baddie styling.

Assignments follow existing occupation, hobbies, voice, relationships and life history. They are not inferred from photographs, ethnicity or gender. Nigerian identity does not imply unsolicited Pidgin or identical slang. No claim is made that a label predicts how a real person behaves.

## Discover behaviour

- 17 populated personality/style options and 29 populated interest categories replace fragmented legacy tags.
- Gender, personality and interest combine as an intersection. Characters must match every selected category. An empty intersection stays empty.
- Broader categories retain specific interests privately: books can mean mystery novels for one character and literary fiction for another.
- Each selected option has a concise explanation. The panel has one scrolling content area and an accessible persistent action footer.
- Filters discover an existing character identity. They do not become saved user preferences, change a character's history or override boundaries.

Examples:

| Character | Distinction preserved |
| --- | --- |
| Zuri | Confident, playful baddie; beauty, fashion and music opinions. |
| Ranti | Sociable, creative and warm; beauty and music interests. |
| Ese | Reserved, dry-witted baddie; film, art and books. |
| Damilola | Reserved, confident big girl; novels, tennis, travel and music. |
| Chuka | Automotive entrepreneur with cars and tailoring interests; obsolete gardening tags removed. |

## Validation and publication

`scripts/test-discovery-identities.mjs` verifies all 50 public/private assignments, populated categories, distinct expression guidance, provider prompt inclusion and representative intersections. `scripts/test-cast-roster.mjs` validates the complete roster against PostgreSQL draft validation and context limits. Browser checks cover combined filtering, reset/cancel/failure behaviour and panel widths from 320 to 1440 pixels.

`scripts/publish-cast-filters.mjs` changes only published personality/interest fields and an appended private discovery identity block. It uses versioned cast commands, checks existing profile/direction/version state and retains an encrypted baseline outside source control. Existing names, profile copy, IDs, portraits and conversation relationships are preserved. The publication receipt is [filter-publication.json](./filter-publication.json) after successful verification. Hosted verification checks every filter count and representative combined queries as an ordinary adult account.

Prompt and data checks do not guarantee every model reply. No real user conversations are replayed and no paid model evaluations are part of these checks. Ongoing synthetic conversation evaluation remains necessary to assess voice quality.
