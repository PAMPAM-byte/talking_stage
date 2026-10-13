# Terms and shared theme review

The founder requested a professional Terms page and the landing page's design and colours across every page.

## Direction and scope

The design retains landing red `#CF2445`, white `#FFFFFF`, blush `#FFF1F3`, ink `#242126`, and muted `#6C666E`. Manrope carries the interface; DM Serif Display italic adds a restrained supporting line on information pages. White app navigation, red selections, 12px controls, and generous spacing replace the previous violet/lime treatment. Functional layouts, semantic status colours, discovery gestures, and direct chat entry are preserved.

The policy layout uses a title and introduction above an essentials panel, followed by a desktop sticky section index and readable content column. Mobile stacks the index before the document. Section numbers map to real document navigation. The draft label and unresolved contractual details are retained. The Terms page explains adult eligibility, the fictional AI experience, account/conversation controls, non-explicit boundaries, memory choices, voluntary operator payments, reporting/support, and remaining review requirements. These are existing product descriptions, not newly approved legal provisions. No operator identity, effective date, jurisdiction, liability clauses, refund promises, support contact, or retention period is invented.

Privacy, payment information, and support retain their existing provisional copy and receive the same layout. Shared tokens reach public, account, customer, chat, and administration screens without introducing service integrations.

## Review evidence

Browser validation covers information and account routes at 320, 390, 768, and 1440 pixels, section navigation, linked policies, and representative authenticated discovery, profile, messages, settings, chat, and admin views in local mock mode. Production account and legal acceptance are outside this frontend review.

TypeScript and targeted ESLint checks passed. All eight Terms/theme and existing discovery-deck checks passed, including swipe, undo, keyboard/touch controls, direct chat entry, paused-chat recovery, and responsive action placement. Rendered desktop Terms and mobile Discover screenshots were visually reviewed for hierarchy, spacing, and shared colour treatment.

Two targeted landing regressions also passed: keyboard/FAQ/onboarding navigation and scroll motion with live reduced-motion changes.

Screenshots: [Terms mobile](./terms-red-390.png), [Terms desktop](./terms-red-1440.png), [Discover mobile](./discovery-red-390.png), [Discover desktop](./discovery-red-1440.png).
