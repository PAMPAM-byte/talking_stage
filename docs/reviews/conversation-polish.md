# Conversation screen audit · 14 October 2026

The founder requested a researched, polished conversation screen. [W3C ARIA23](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA23.html) recommends a labelled log for sequential chat additions. [GOV.UK input guidance](https://design-system.service.gov.uk/components/text-input/) supports explicit labels and associated feedback. These inform accessibility improvements, not a claim of complete standards certification.

Audit findings: connected chat placed profile, memory, and lifecycle controls above messages, competing with the conversation; names could wrap poorly; metadata and bubble shadows added noise. The approved minimal portrait/clue opening state and soft rose canvas are retained.

The connected header now opens an accessible options dialog for profile/memory links and existing lifecycle controls. No destructive action is made immediate. The message region receives labelled log semantics. Incoming white/outgoing deep-red bubbles, compact metadata, a crisp focusable composer, and a bounded desktop room create a quieter hierarchy. Textareas retain accessible labels, 16px input text, existing Enter/Shift+Enter behavior, disabled states, and error handling.

Connected history initially follows the latest messages; new additions follow only while the reader is near the bottom. Scrolling up preserves the reading position. No fake presence, replies, unread counts, audio, or new backend operation is introduced. Mock chat retains its existing interaction model and shares visual styling.

TypeScript and targeted ESLint checks and local responsive/sending verification are used. Live account data, full screen-reader compatibility, and a complete WCAG audit are outside this review.

The local sending/layout check passed at 320, 390, 768, and 1440 pixels and a compact 390×460 viewport. Shared mobile styling was visually reviewed from the generated chat screenshot. Connected menu and scroll-follow changes were typechecked; their live-account behavior is not claimed as browser-verified.
