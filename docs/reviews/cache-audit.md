# Cache audit · 14 October 2026

The founder requested work on website caching. The audit inspected Next Cache Components, data access, auth proxy headers, authenticated image/reply routes, mutation revalidation, optimized public images, and browser fixture storage. Relevant installed Next guides: authentication with Cache Components, fetch, and revalidatePath.

Private data access already waits for the request and reads cookies. Matched hosted private/auth pages use `private, no-store`, including refreshed-cookie responses and denied redirects. Authenticated cast assets are served through an ownership/access-checking no-store proxy; reply endpoints also disable response caching. No service worker was found in the application sources inspected. Mock session storage contains deliberately persistent disposable fixtures, not a production response cache, and is preserved.

Fixes: shared backend fetches now explicitly force `cache: 'no-store'`, including overriding caller/Request cache hints while preserving payload, headers, timeout, and cancellation. Cast edits/deactivation now revalidate character profiles and message pages. Asset changes refresh messages that show character photos. Availability changes refresh messages and payment pages in addition to discovery/profiles/admin.

Public marketing and optimized-image caches remain enabled. Disabling Cache Components or deleting all generated caches would discard useful static caching without addressing mutation freshness. Public asset replacement still needs a new filename/version to avoid previously cached image URLs. Server-action invalidation refreshes affected routes; a change from another browser does not push an update into a page already open elsewhere.

No production records, sessions, mock drafts, or local build directories were deleted. No new backend business operation was introduced. Validation uses the existing synthetic dependency-fetch check, TypeScript, and targeted ESLint; live multi-account/cache isolation is not claimed.

All three checks passed, including no-store enforcement when callers explicitly request force-cache and preservation of request cancellation.
