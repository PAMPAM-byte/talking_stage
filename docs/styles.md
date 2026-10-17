# Stylesheet architecture

16 October 2026. Follow `docs/design-system.md` and the frontend-design skill for visual changes.

`app/layout.tsx` imports one global entry, `app/styles.css`. Its import order preserves the accepted cascade. `globals.css` loads Tailwind followed by `styles/tokens.css`; that token file contains the final effective shared values from the former plum, violet and red roots, including the desktop type-scale override. Shared root tokens are owned by this one file. Scoped page variables remain local to their pages.

The older files remain in the entry in their original order because they contain overlapping structural rules. Moving them between routes or changing their order can alter mounted pages during client navigation. Existing refinement files are historical implementation units, not a pattern for new work.

For new components, colocate a `.module.css` file and import it from the owning component. Use shared variables for colour, type, spacing, radius and motion. Modify an existing owning rule when changing its presentation; do not add another global override file. Shared primitives belong in `globals.css`; accepted identity changes belong in `styles/tokens.css`. `--lavender` and `--lime` remain legacy aliases with blush values because existing rules consume them; new code should use `--brand-soft` and other semantic tokens.

Before removing old overrides, identify all matching selectors and media-query conditions and verify both mock and connected components. Theme, chat, discovery, profile, settings and admin browser coverage at mobile/desktop widths must pass. Keep reduced-motion, focus, image failure and overflow checks. A stylesheet cleanup does not authorize a visual redesign.
