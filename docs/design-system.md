# TalkingStage design system

Version 1.0 · 7 October 2026 · Design specification

This is the proposed visual system for TalkingStage, based on the PRD dated 6 October 2026 and the requested professional, attractive, minimal, modern, mobile-first direction. It defines the design; it does not implement application screens or commit to unresolved product providers. Character examples below are illustrative, pending cast approval.

## 1. Direction

**An intimate, polished dating interface with portraits at its centre.** Crisp white surfaces, a faint mauve canvas, deep plum actions, and soft rose accents make the product feel romantic without becoming sugary. Typography, generous breathing room, and a small number of purposeful controls provide the professional finish.

The audience is Nigerian adults exploring fictional AI companionship. The principal discovery task is to find a character whose personality interests them and start a conversation. The chat task is to continue that conversation with clear control over photos, memories, and optional payments.

The signature is a **conversation clue**: one character-specific line beneath each portrait, paired with a small plum opening-quotation mark. It gives personality a visible role before chat starts. The line is approved profile copy, not a fabricated message or activity indicator. Example: “Good music is a very good opening line.”

The deliberate aesthetic risk is using a restrained, expressive serif for key headings inside an otherwise contemporary sans-serif interface. This makes the experience recognisable without reducing legibility or relying on decorative romance symbols.

### Principles

- Portraits lead; controls support. Photography receives the most visual space on discovery and profiles.
- Each screen has one obvious primary action. Secondary actions have quieter treatment.
- Romance comes from colour, personality, and images. Avoid decorative heart patterns, glowing gradients, glass panels, and ornamental badges.
- Disclosure belongs where the decision happens. AI identity, image origin, and payment recipient remain legible.
- Calm states are complete states. Loading, failure, emptiness, and refusal receive the same design attention as ideal flows.
- Nigerian character comes through credible content and diverse styling rather than flags, forced slang, or stereotypes.

## 2. Colour tokens

### Core palette

| Token | Name | Value | Role |
| --- | --- | --- | --- |
| `color.canvas` | Mist | `#FAF8FA` | Page canvas and quiet background |
| `color.surface` | White | `#FFFFFF` | Cards, inputs, navigation, incoming messages |
| `color.ink` | Charcoal plum | `#241C23` | Main text and headings |
| `color.text.secondary` | Muted grape | `#716570` | Supporting copy and metadata |
| `color.brand` | Deep plum | `#682447` | Primary buttons, active controls, outgoing messages |
| `color.brand.soft` | Rose wash | `#F5EAF0` | Selected chips, subtle highlights, disclosure surfaces |

### Supporting tokens

| Token | Value | Role |
| --- | --- | --- |
| `color.border` | `#E8DFE6` | Decorative separators and card edges |
| `color.border.control` | `#8F7E8A` | Input outlines and boundaries needed to identify controls |
| `color.brand.hover` | `#541B39` | Primary hover |
| `color.brand.pressed` | `#44152D` | Primary pressed |
| `color.focus` | `#682447` | Focus ring |
| `color.success` | `#267052` | Verified success text and icon |
| `color.success.soft` | `#EAF5EE` | Success surface |
| `color.warning` | `#835B19` | Pending or caution text and icon |
| `color.warning.soft` | `#FFF6E6` | Pending surface |
| `color.danger` | `#A63A50` | Errors and destructive action text |
| `color.danger.soft` | `#FCEFF2` | Error surface |
| `color.disabled.surface` | `#EEE9ED` | Disabled control background |
| `color.disabled.text` | `#716570` | Disabled control label |

Use semantic tokens rather than independent component colours. Reserve plum for actions and selection; repeated filled plum blocks dilute hierarchy. Error colour must not also signify romantic interest. Success requires text and an icon, not colour alone.

### Verified text contrast

These ratios were calculated from the specified sRGB values. They validate these exact opaque pairings, not text over imagery or unlisted combinations.

| Foreground / background | Contrast |
| --- | --- |
| White / deep plum | 10.87:1 |
| Charcoal plum / mist | 15.70:1 |
| Muted grape / white | 5.53:1 |
| Muted grape / mist | 5.23:1 |
| Deep plum / rose wash | 9.27:1 |
| Danger / white | 6.28:1 |
| Success / white | 5.96:1 |
| Warning / warning soft | 5.63:1 |

Place names, ages, and essential portrait details on an opaque surface below the image. Do not rely on the image being dark enough for white text. Subtle border tokens are decorative; use the stronger control border where a visible boundary is needed.

## 3. Typography

| Role | Typeface | Fallback | Use |
| --- | --- | --- | --- |
| Display | DM Serif Display, regular | Georgia, serif | Landing headline, page title, profile name |
| Interface and body | Manrope, regular through bold | system-ui, sans-serif | Chat, buttons, forms, navigation, body copy |
| Utility | Manrope with tabular numerals | system-ui, sans-serif | Amounts, timestamps, references |

Use the display face sparingly. Do not use it for chat messages, payment amounts, long paragraphs, or control labels. Verify font licensing and available assets before implementation; self-host production fonts to avoid an external font request on each visit.

| Token | Mobile size / line height | Larger-screen size / line height | Weight |
| --- | --- | --- | --- |
| `type.hero` | 40 / 44 px | 64 / 68 px | Display regular |
| `type.page` | 30 / 36 px | 40 / 46 px | Display regular |
| `type.profile` | 32 / 38 px | 40 / 46 px | Display regular |
| `type.section` | 20 / 28 px | 24 / 32 px | Interface bold |
| `type.card.name` | 20 / 26 px | Same | Interface bold |
| `type.body` | 16 / 24 px | Same | Interface regular |
| `type.control` | 15 / 20 px | Same | Interface semibold |
| `type.supporting` | 14 / 20 px | Same | Interface medium |
| `type.caption` | 12 / 16 px | Same | Interface medium |

Use sentence case. Do not use tiny uppercase labels as the primary way to navigate. Inputs use at least 16 px text. Main reading columns stay near 55–65 characters wide. Allow text growth and wrapping; never fix card height around a single line of text.

## 4. Spacing, shape, and elevation

Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80` px.

| Purpose | Default |
| --- | --- |
| Icon-to-label gap | 8 px |
| Related metadata gap | 4–8 px |
| Form field group gap | 20 px |
| Card content padding | 16 px |
| Mobile page gutter | 20 px; 16 px at very narrow widths |
| Section separation | 32 px mobile; 48 px desktop |
| Sheet/dialog content padding | 24 px |

| Shape token | Value | Use |
| --- | --- | --- |
| `radius.control` | 12 px | Buttons and fields |
| `radius.card` | 20 px | Portrait cards and grouped content |
| `radius.message` | 18 px | Chat bubbles |
| `radius.sheet` | 24 px | Top corners of mobile sheets |
| `radius.pill` | Full | Chips and compact badges |

Default surfaces are flat with a fine border. Floating menus and sheets may use a soft shadow: 0 px horizontal, 8 px vertical, 32 px blur, charcoal plum at 10% opacity. Avoid shadows on every card. Dialog backdrops use charcoal plum at 40% opacity.

## 5. Mobile layout and navigation

Design the primary compositions at 390 px wide. Validate at 320, 360, 390, and 430 px; these are reference widths, not device detection rules.

| Width | Layout behaviour |
| --- | --- |
| Under 600 px | Mobile navigation; one discovery column; full-width chat |
| 600–899 px | Two discovery columns; centred forms; mobile-style navigation |
| 900 px and above | Left navigation rail; three discovery columns where space permits; message list beside chat |

The app shell has a maximum content width of 1200 px. Forms and onboarding use a maximum width of 440 px. On desktop, profiles use a gallery/detail split. Chat message content stays readable rather than spanning the full screen.

### Mobile discovery

```text
┌────────────────────────────┐
│ TalkingStage        Account│
│ Discover                   │
│ Find your kind of banter.  │
│ [All] [Women] [Men] Filters│
│ ┌────────────────────────┐ │
│ │                        │ │
│ │      Portrait          │ │
│ │                        │ │
│ ├────────────────────────┤ │
│ │ Name, 27   AI character│ │
│ │ Fictional Lagos setting│ │
│ │ “Conversation clue…”   │ │
│ │ [Interest] [Interest]  │ │
│ │ View profile           │ │
│ └────────────────────────┘ │
│ Discover  Messages  Settings│
└────────────────────────────┘
```

Discovery uses a vertical feed, with a 4:5 portrait inside each card. This gives each character room without forcing a swipe or implying mutual human matching. On larger screens use a grid. The whole profile card can navigate, but avoid nested competing click targets.

Bottom navigation has three labelled destinations: Discover, Messages, Settings. Payment history belongs within Settings. Favourites are deferred in accordance with the PRD. Admin has a separate navigation system.

Navigation is 64 px tall plus the bottom safe area. Active state combines plum text/icon with a quiet rose background. Reserve layout space for fixed navigation so it never hides content. Do not invent unread messages or notifications to create activity.

### Mobile conversation

```text
┌────────────────────────────┐
│ Back  Avatar Name     Menu │
│       Fictional AI character│
├────────────────────────────┤
│            Today           │
│ ┌───────────────────┐      │
│ │ Incoming message  │      │
│ └───────────────────┘      │
│       ┌──────────────────┐ │
│       │ Your message     │ │
│       └──────────────────┘ │
│ ┌───────────────────┐      │
│ │ Approved photo    │      │
│ │ AI-generated photo│      │
│ └───────────────────┘      │
│ [Write a message…] [Send]  │
└────────────────────────────┘
```

Chat uses a dedicated header and composer; bottom app navigation is removed to protect conversation space. The composer follows the visible viewport when the keyboard opens. Allow message scrolling behind neither the header nor composer. Respect top and bottom safe areas.

## 6. Component specifications

### Buttons

- Primary: plum fill, white label, 48 px minimum height, 16 px horizontal padding, 12 px radius. Use “Shoot your shot” on profiles and “Send” in chat.
- Secondary: white fill, plum label, visible control outline. Use for meaningful alternatives such as “View profile”.
- Quiet: transparent surface, plum text. Use for “Reset filters” or “Not now”.
- Destructive: explicit danger label and confirmation where consequences are irreversible. Keep away from primary conversation actions.
- Icon buttons: at least 44 × 44 px hit area, usually 48 × 48 px; accessible action name required.
- States: default, hover where supported, pressed, focus, disabled, loading. Loading keeps the label and button width stable; explain long-running work nearby.

Focus uses a 2 px plum ring with a 3 px surface-coloured separation. Do not remove focus indicators. Disabled state communicates availability and does not substitute for validation feedback.

### Inputs and forms

Visible label above each field; 52 px minimum height for single-line inputs. Supporting text follows the field. Error state includes a danger outline, icon, and actionable text. Preserve entered values after failure. Placeholder text is an example, never the only label.

Prefer explicit choices for language and gender preferences. Do not preselect consent. Use progressive onboarding with one clear decision group per screen and a back action that preserves progress.

### Chips, filters, and badges

Filter chips have 44 px minimum hit height. Selected chips use rose wash, plum text, and a selection mark. Interest tags are informational, have no hover affordance, and can be smaller. A filter sheet has Apply filters and Reset filters actions, with the result count where available.

The “AI character” badge uses rose wash and plum text. It is legible but secondary to the name. Do not add online dots, live status, verification ticks suggesting a real person, or invented distance indicators.

### Character cards and profiles

Each card shows portrait, name, adult age, AI identity, fictional location, conversation clue, and up to two interests. Keep the same portrait ratio across the cast; use per-image focal points to preserve faces across crops.

Profiles show a large gallery, name and age, fictional location, bio, interests, conversation clues, and “Shoot your shot”. The CTA may remain at the bottom of the viewport on mobile, with sufficient content padding and safe-area spacing. Gallery controls require labels and an image count. Photos open in an accessible viewer with a clear close action.

### Conversation list

Rows show a 56 px character avatar, name, latest message preview, timestamp, and a real unread indicator when applicable. Provide archive/delete through a visible menu as well as any optional gesture. Avoid making swipe gestures the only way to act.

### Chat bubbles and composer

- Incoming messages: white bubble, charcoal text, quiet border.
- Outgoing messages: plum bubble, white text.
- Bubble width: at most 84% on mobile and 480 px on larger screens. Long words and links wrap safely.
- Message padding: 12 px vertically and 16 px horizontally. Group related messages with 4 px gaps; separate turns with 12 px.
- Timestamps and delivery labels sit outside filled bubbles on the canvas using supporting text colour.
- Sending, failed, and retry states remain attached to the affected message. A retry reuses the existing message; the UI must not encourage duplicate submission.
- Response status says “Preparing a reply…” or uses a labelled progress indicator. It must not imply a real person is typing.
- Composer has a labelled multiline field, a maximum visible height before internal scrolling, and a separate send button. Enter behaviour should be deliberate across mobile and desktop; provide a newline option.
- The menu provides memories, monetary-request controls, reporting, and conversation management. Photos are delivered by the character; do not expose unsupported user attachments.

### Photo message

Use the original image ratio within a capped container. Always show “AI-generated character photo” in a persistent caption. Reserve image space during loading. Failed delivery offers “Reload photo”. No photo blurring or pay-to-reveal treatment at launch.

### Payment confirmation and cards

Payment interfaces are clear and factual. Use a white bordered card, regular UI typography, tabular numerals, and generous spacing. They must never resemble a romantic reward or urgency banner.

Before a link is created, show amount, NGN currency, selected character association, recipient, and voluntary purpose. Recipient wording: “Received by TalkingStage’s operator.” Explain that the payment does not buy a romantic response. The amount-confirmation action says “Confirm ₦5,000”, using the actual entered amount; the secondary action says “Not now”.

After creation, a chat card displays amount, reference, state, recipient, and “Open secure checkout”. Do not label link creation as payment success. “Payment received” appears only after backend verification.

| State | Treatment | Available action |
| --- | --- | --- |
| Awaiting checkout | Neutral icon, explicit label | Open secure checkout |
| Pending verification | Amber icon and “Payment pending” | Check status when supported |
| Paid | Green check and “Payment received” | View details |
| Failed | Error icon and explanation | User-initiated retry |
| Cancelled | Neutral icon and label | User-initiated retry |
| Expired | Neutral icon and explanation | Create a new link |
| Refunded / disputed | Explicit ledger-derived status | View details / contact support |

Refund and dispute display needs a final backend state definition; these states must not be silently treated as paid. Always use text with colour. Keep decline controls available and conversational treatment unchanged after refusal.

### Sheets, dialogs, and notices

Use bottom sheets on mobile for filters and short action groups. Use full-page flows for lengthy forms and account deletion. Desktop equivalents are anchored menus or centred dialogs. Restore focus after closing, support keyboard dismissal where appropriate, and provide a visible close control.

Use inline notices for consequential information. Toasts are appropriate for reversible confirmations such as “Preferences saved”; errors needing action remain visible. Destructive confirmations identify what will be removed and any retained records.

### Memory and privacy controls

Show each remembered detail as a readable row with its associated character and delete control. Explain disabling future memory separately from deleting existing memory. Stage 5 user-confirmed semantics keep memories by default when resetting or deleting a conversation; show an explicit unchecked option to clear that character’s memories. Both actions preserve payment history. Archive preserves the thread; reset restarts its introductory relationship state.

Offer a clearly labelled “Allow monetary requests” setting with immediate feedback. Reports show the target message/photo/character and let users choose a reason without restating sensitive conversation text unnecessarily.

## 7. Screen hierarchy

| Screen | Visual focus | Primary action |
| --- | --- | --- |
| Landing | Portrait composition and concise AI dating explanation | Explore characters / start onboarding |
| Adult onboarding | Age assurance, disclosure, preferences | Continue |
| Discover | Character portraits and conversation clues | View profile |
| Profile | Portrait gallery and personality | Shoot your shot |
| Messages | Recent conversations | Resume a conversation |
| Chat | Conversation with one selected character | Send |
| Payment result | Verified status and amount | Back to conversation |
| Settings | Clearly grouped personal controls | Save changes where needed |
| Payment history | Amount, date, reference, status | View payment details |
| Admin | Operational state and clear tables | Contextual management action |

The landing headline can use the display face and a small, carefully art-directed portrait composition. Do not make it a dashboard of metrics or fictitious testimonials. Paid commercial access, subscriptions, and favourites are not introduced by the design.

Admin uses the same colours, body typography, controls, and focus rules with denser tables. Display typography is unnecessary in operational tables. Distinguish draft, published, paused, and deactivated states explicitly; sensitive operations need audit-aware designs.

## 8. Photography and iconography

Character portraits use believable light, clear faces, natural skin texture, and controlled backgrounds. Represent varied adult body types and styling without linking appearance to personality or romantic availability. Every image is reviewed for a clearly adult appearance and character continuity.

Crop deliberately rather than applying one face position to all assets. Use high-quality portraits but compressed responsive variants; load the first visible image promptly and later images lazily. Image failure shows a neutral placeholder and the character name, not another character's photo.

Icons use one consistent rounded outline family, usually 20 or 24 px with a consistent stroke. Pair navigation icons with labels. Reserve filled shapes for active states where they improve recognition. Use simple message, compass/discovery, settings, image, and payment symbols. Do not use emoji as payment status or primary navigation.

## 9. Motion

| Purpose | Duration | Behaviour |
| --- | --- | --- |
| Button/selection feedback | 120 ms | Colour transition; no bounce |
| Menu or sheet | 200 ms | Gentle opacity and position change |
| New message appearance | 160 ms | Small fade; no distracting spring |
| Gallery transition | 200 ms | Controlled crossfade |

The signature conversation clue is static; it does not animate repeatedly. Avoid ambient floating hearts, parallax, looping gradients, and fake activity. Reduced-motion preference removes positional movement and uses immediate or short opacity changes. Do not animate layout in a way that moves a control while the user is trying to tap it.

## 10. Voice and content

Product interface copy is warm, short, and straightforward. Character conversation carries more individuality and optional Pidgin. Critical age, money, privacy, and deletion copy stays unambiguous.

| Situation | Suggested copy |
| --- | --- |
| Discovery support | Find your kind of banter. |
| AI identity | Fictional AI character |
| No filter results | No characters fit these filters. Try fewer filters. |
| Empty messages | Your conversations start here. |
| Chat error | Your message wasn’t sent. Try again. |
| Reply failure after user message saved | A reply couldn’t be generated. Retry reply. |
| Photo error | This photo couldn’t load. Reload photo. |
| Pending payment | We’re waiting for payment confirmation. |
| Requests disabled | Monetary requests are off. |
| Deleted memory | Memory deleted. |

Keep action labels consistent through confirmation and completion. Do not promise mutual matches, real dates, guaranteed affection, or live photographs. Avoid pressure in reminders, checkout, or empty states.

## 11. Accessibility and resilience

- Design toward WCAG 2.2 AA, with implementation and testing required before claiming conformance.
- Text uses approved contrast pairings. Interactive boundaries and focus indicators need sufficient non-text contrast.
- Controls have at least 44 × 44 px hit areas. Layout must work with larger text and browser zoom.
- Information and errors never depend on colour, hover, or gesture alone.
- Give icons, gallery controls, inputs, and dialog actions meaningful accessible names.
- Announce message delivery and verified payment updates without repeatedly reading the whole conversation.
- Respect reduced motion and preserve keyboard focus during navigation and asynchronous updates.
- At 320 px, payment amounts, long names, translated labels, and references wrap without horizontal page scrolling.
- Skeletons reserve portrait and card geometry. Do not use a skeleton that implies content exists when it may not.
- Maintain readable states for offline operation, expired sessions, inactive characters, exhausted usage limits, and independently paused chat/photos/payments.

## 12. Review and implementation handoff

The initial exploration considered a conventional blush-heavy dating interface and a portrait-led plum interface. The final direction reduces pink to a supporting tint, replaces repeated heart decoration with character-specific conversation clues, and puts card text below images. This keeps the requested romantic appeal while improving hierarchy, disclosure legibility, and distinction.

### Handoff order

1. Approve this visual direction, type pairing, and portrait treatment.
2. Produce representative mobile compositions for Discover, Profile, and Chat, including one payment confirmation and memory-control flow.
3. Review with approved cast assets and realistic conversation lengths.
4. Implement semantic tokens and accessible primitives before screen-specific styling.
5. Validate responsive layouts, font loading, keyboard interaction, reduced motion, and asynchronous states.

### Design acceptance checklist

- Discovery feels like browsing characters, and AI identity is visible before entering chat.
- The primary action is identifiable on each screen without competing filled buttons.
- Portrait crops retain faces and the character's established appearance.
- The interface works at narrow widths and with the mobile keyboard open.
- Declining or muting monetary requests is easy and visually neutral.
- Payment cards disclose recipient and distinguish checkout creation from verified success.
- Memory removal, conversation deletion/reset, and account deletion communicate their actual scope.
- Long content, errors, offline states, and pauses are designed, not left as raw technical messages.
- Navigation, labels, typography, radius, and spacing follow the shared tokens.

### Still subject to product decisions

Final cast, branding clearance, age-assurance method, payment limits and gateway, memory retention rules, account deletion exceptions, provider response behaviour, and pilot usage limits remain unresolved. This design system supplies consistent presentation without pretending those decisions have been made.

Light mode is the launch design baseline. Dark mode requires a separately tested token mapping and is not implied by this specification.
