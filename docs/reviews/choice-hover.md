# Character-choice interaction feedback

9 October 2026

The owner requested visible hover/action feedback on the welcome character-choice controls. Shared `.chip` styles previously defined their resting and selected appearance without a hover rule. Choice buttons and discovery links now use plum with white text on hover, darker plum while pressed and the existing rose selection after release. Colour transitions use the existing motion token. Keyboard focus and reduced-motion rules remain effective. Hover is restricted to devices that support it; pressed feedback also works for touch input.

The frontend-design skill and design system were followed. A temporary browser preview using the application's compiled CSS verified resting, hover, pressed and selected colours, navigation-link hover, visible keyboard focus and reduced motion. The hover capture was visually reviewed at 390px. This preview checks shared styles without creating an account or changing user data. Whitespace checks passed. No backend or preference logic changed.

The existing development server on port 3000 initially served CSS without the new rule. A separate fresh server on 3102 served the current rule and passed the checks, then was stopped. Restart the existing development server if it continues serving the older styles.

## Checkbox clarification

The owner clarified that the checkbox itself needed colour feedback. Shared native checkbox inputs now have a rose background and plum border when hovered, a solid plum background with a white tick when checked, and a darker plum checked hover. Selection remains visible after the pointer leaves. Native semantics, Space toggling, visible keyboard focus, disabled state and automatic native rendering in forced-colour mode are preserved. These styles apply to the existing `.choice` checkbox controls; radio inputs and switches are unchanged.

The actual connected age checkbox passed browser checks for hover, persistent selected colour/tick, keyboard toggling/focus and Windows high-contrast rendering. Hover and selected captures were visually reviewed at 390px. The temporary server was stopped and whitespace checks passed. No declaration was submitted, account created or stored user data changed.
