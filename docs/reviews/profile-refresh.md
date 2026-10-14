# Profile refresh · 14 October 2026

The founder requested stronger profile design and research into leading dating products. [Hinge's profile approach](https://hinge.co/how-we-connect-daters) combines photographs and personality prompts; [Bumble Opening Moves](https://bumble.com/en/features/opening-moves/) uses opening questions to ease conversation entry. The design adapts the photo/prompt hierarchy to fictional AI characters without introducing mutual matching or human dating features.

Shared red `#CF2445`, blush `#FFF1F3`, white, ink `#242126`, and muted `#6C666E` remain the palette. Manrope provides readable interface headings and body; the conversation clue uses the existing serif for personality. The signature is a large framed portrait gallery paired with a blush conversation-clue panel. Desktop presents gallery and details alongside each other; mobile stacks them. Selected thumbnails use a red outline; clear photo expansion and reporting controls remain available.

The connected profile replaces the flat two-image grid with a selected-photo gallery, thumbnail selection, image expansion, keyboard gallery navigation, and selected-photo reporting. Identity, fictional setting, occupation, about text, interests, and the conversation action have separate visual roles. The existing mock profile receives the same scoped styling. Existing data reads, start-conversation operations, report actions, eligibility boundaries, and availability states are preserved. No backend service is introduced.

TypeScript passed. Rendering and interactions are reviewed using local fixtures; no claim of live authentication or reporting verification is made.

Targeted ESLint passed. Existing profile filter-continuity and responsive rendering tests passed at 320, 360, 390, 430, 768, 1024, and 1440 pixels. Rendered [desktop](./profile-refresh-1440.png) and [mobile](./profile-refresh-390.png) screenshots record the shared styling. The desktop rendering was visually reviewed for photograph framing, heading hierarchy, and chat-action prominence.
