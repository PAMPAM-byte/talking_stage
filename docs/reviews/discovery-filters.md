# Discovery filter refinement · 14 October 2026

The founder requested custom, aligned, professional filters. Shared radio-card controls replace native dropdown presentation. Each labelled group has a consistent two-column grid, clear selected state, check indicator, full-card click target, and visible keyboard focus. Long option groups scroll within a bounded area. Desktop uses a centered dialog and mobile a bottom sheet, with aligned Clear and Apply actions.

The palette remains red/white/blush with Manrope utility type. Mock and connected discovery share the component. Draft selections remain separate until Apply; closing/Escape cancels them. Connected Apply uses the existing discovery URL filter contract. No server authorization or business operation is introduced.

Keyboard interaction uses native radio semantics rather than an improvised dropdown. Existing filter tests were updated to select radio options. Final verification covers combined filters, cancellation, reset, empty results, and failure recovery in local mock mode; live hosted filtering is not claimed.

TypeScript, targeted ESLint, and the filter behavior browser check passed. Browser rendering fits 320, 390, and 1440 pixel widths with no dialog overflow. The option area scrolls while footer actions stay visible. [Mobile screenshot](./discovery-filters-390.png) was visually reviewed; a desktop capture is available at `discovery-filters-1440.png`.
