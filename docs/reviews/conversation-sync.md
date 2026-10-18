# Automatic conversation updates · 18 October 2026

The founder requested messaging that updates without manually refreshing. Adaptive HTTP polling fits the existing server-only, HTTP-only cookie session and whole-reply generation model. WebSockets remain an option when instant push or sustained concurrency warrants authenticated realtime channels and their operational cost. This change makes no Realtime publication, browser-token, database-policy or provider changes.

## Behavior

- Active reply metadata is checked after one second, then every two seconds. After sixty seconds observation slows to ten seconds instead of ending. Temporary errors keep observation alive. Existing one-time recovery of a never-attempted job remains; failed or attempted jobs never automatically regenerate.
- The latest open conversation independently checks a private revision every five seconds, beginning after one second. This catches replies and messages arriving outside the current send flow, including another tab. The revision hashes message IDs/sequences, conversation generation/version/status, chat capability and reply states/attempts. The endpoint returns no message text or private character context.
- A changed revision refreshes the Server Component payload through `router.refresh()`, merging current history while retaining the composer draft and existing near-bottom scroll behavior. Older-history pages keep their explicit pagination rather than jumping to the latest page.
- Requests do not overlap within an observer. Hidden/offline tabs pause checks. Focus, visibility restoration and reconnection trigger immediate conversation catch-up. Sync failures back off to thirty seconds and show a quiet status using the existing Manrope, rose, white and red chat styling. Leaving the route aborts requests and removes event listeners.
- Conversation API paths now pass through the existing session-refresh Proxy. A true 401 routes to sign-in; 403/404 reconcile the protected page and stop that observer. Temporary reply-status database errors return 503 rather than being misclassified as lost conversation access. No authorization check is bypassed.

## Boundaries

This is near-real-time synchronization of the open conversation, not token streaming or an unattended durable generation worker. Fast reply observation and the independent five-second sync overlap intentionally to provide recovery. Each sync uses existing owner-authorized RPCs; at larger concurrency a narrower metadata RPC or authenticated push should replace these repeated reads. Current deployment behavior and long-term traffic capacity are not established by local tests. The Messages inbox retains its existing navigation behavior.

All background sync requests are reads and cannot call the provider. Provider leases, spending limits, idempotent delivery, retries, cancellation and generation checks remain authoritative. No paid live model request is required for these checks.

## Sources

The installed Next.js `useRouter` guide documents preserving client state and scroll when merging a refreshed Server Component payload. Supabase documents [cookie refresh through Proxy](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [private authenticated realtime channels](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes).

## Validation

TypeScript and scoped ESLint passed. All sixteen targeted browser checks passed across the delivery suite and sync suite, including an actual refreshed server-rendered reply without document navigation, draft preservation, late completion, transient failures, session expiry, hidden-tab pause, overlapping-focus protection and cleanup. The offline reply-recovery and server-boundary suites passed, including owner/adult/session denials, retryable database errors, revision privacy and read-only provider isolation. No hosted deployment, paid model call or traffic-capacity test was performed.
