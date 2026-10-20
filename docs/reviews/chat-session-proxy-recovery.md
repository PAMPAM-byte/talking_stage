# Chat replaced by a payment error page

20 October 2026. The reported screenshot matches proxy.ts, not a payment transaction or a chat reply.

The proxy checks session claims before private routes. A transient identity error returned raw HTML with payment recovery instructions for every private GET. During a background RSC refresh, that non-RSC response could trigger a document navigation and replace the mounted conversation, bypassing ConversationContinuity. The existing continuity checks only exercised the server boundary and did not cover this earlier proxy interception.

Standalone conversation GETs now pass temporary identity failures to ProtectedArea. This is not authorization: renderAccount still verifies identity, adult declaration and onboarding; the thread RPC independently enforces ownership. An initial unavailable check supplies no private children. A previously mounted authorized conversation can retain its own snapshot and draft while polling recovers. Missing, invalid and expired sessions still redirect to sign-in. Other actions remain unavailable during verification failures. Payment recovery copy is scoped to /payments and /gifts; unrelated pages/actions no longer mention a payment. No browser-supplied outage header or stored authorization cache is used.

Regression coverage executes the actual proxy with injected network, rate-limit, service-error and thrown failures, for document and RSC chat GETs, genuine session denial, neutral non-payment errors, and preserved payment recovery. The actual server boundary is also checked for initial-outage privacy and identity/adult/onboarding denials. Payment/reply/identity boundary scripts passed without network or model calls. TypeScript and ESLint passed.

All ten existing browser tests in conversation-continuity.spec.ts and conversation-sync.spec.ts passed against the isolated frontend preview: refresh-time outage retains draft; initial outage reveals no chat; slow refresh finishes; unchanged refresh keeps catching up; background replies arrive without navigation; network failures recover silently; transient reply status reads do not generate duplicates; expired sessions redirect; hidden tabs pause reads and focus does not overlap them. Browser tests use synthetic responses and do not replay user chats or contact a model.

This fixes the application response to identity-service interruptions; it does not claim that the upstream service or local internet connection can never fail.
