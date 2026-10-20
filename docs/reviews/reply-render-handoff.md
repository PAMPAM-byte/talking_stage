# Typing-to-reply handoff

21 October 2026.

The reply metadata poll previously removed the active typing state as soon as the durable job completed, then requested a server refresh. Fetching and rendering the saved history took longer, leaving a visible blank interval before the reply appeared.

Completed polls now enter a presentation handoff. The existing character-name typing indicator stays visible until the exact job output message ID is present in the rendered history. The reply and indicator change in the same render. This adds no artificial typing delay and does not regenerate a reply. Stop reply is shown only while generation is still being observed, rather than after it has already completed. Stale retry controls remain hidden during the handoff. Stopping another generating job does not discard an already-completed handoff. Acknowledged handoffs are retired so they cannot reappear when older statuses leave the history window.

Migration 202610200025 adds `outputMessageId` to the existing owned reply status RPC. It retains adult, ownership, deletion and anonymous-access checks. It exposes no prompts, job leases, provider details or other private context. Exact output identity makes status-first and history-first refresh races safe and prevents an earlier character bubble from acknowledging a newer job. Existing parallel page reads are retained.

The frontend-design skill was applied to preserve the approved chat layout, colours, character-name typing treatment, composer and reduced-motion behaviour. This is a delivery-state correction with no visual redesign.

Browser regression coverage includes delayed/stale history refreshes, frame sampling at 390px and 1440px (no blank or overlapping typing/reply frames), server history arriving before the next poll, and an older rendered reply alongside a newer unrendered completion. Existing send, retry, stop, interruption, draft, receipt, late-completion, responsive and reduced-motion cases remain covered. Disposable database integration checks validate the completed output pointer, null output on pending jobs, bounded public fields and cross-owner denial. No live chat messages or paid model calls were used for validation.

The linked project migration was applied after an encrypted DDL snapshot and grant verification; see [activation record](../reply-handoff-activation.json). No existing messages were rewritten.
