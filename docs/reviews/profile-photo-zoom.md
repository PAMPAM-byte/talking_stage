# Profile photo viewer

10 October 2026

Clicking or tapping either connected profile photo opens the whole image in a larger dialog without cropping. Hovering leaves the image unchanged. The viewer has a close button, Escape support and previous/next photo navigation; it has no zoom controls or "View and zoom" badge. Closing restores focus to the photo that opened it. The preview main photo uses the same interaction.

Approved photos retain authenticated responsive delivery up to 1280px. Failed images have retry controls, and photo reporting remains available. Styling follows the design system and frontend-design skill.

Verified: the connected browser test passed at 1280px and in a genuine touch-emulated 390px viewport. It checks both photos, unchanged hover behavior, full-image rendering, close/focus restoration, gallery navigation, absence of zoom controls, and retained discovery filters. Both preview regression tests passed for gallery/conversation navigation and missing/deactivated/paused/broken-photo recovery. TypeScript and scoped ESLint checks passed.

Current evidence: [desktop](./profile-photo-zoom/click-full-photo-1280.png), [mobile](./profile-photo-zoom/click-full-photo-390.png). Earlier captures show superseded interactions.
