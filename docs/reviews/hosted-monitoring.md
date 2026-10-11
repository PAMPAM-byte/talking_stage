# Hosted availability and backup diagnostics

11 October 2026 · Read-only checks delivered; external alerts and Stage 12 acceptance remain open.

Run `npm run health:hosted` from the project directory. It reads `.env.hosted.local` server-side and only accepts the configured TalkingStage hosted project. It makes no database/storage writes, creates no signed URLs, and reads no user accounts, messages or memories. Output contains a timestamp, fixed dependency labels, booleans, elapsed milliseconds, and backup age/state. Any failed dependency or backup check produces exit code 1; successful checks produce exit code 0.

The checks cover:

- Auth settings availability through the authenticated service API. This is not a user sign-in or password-reset delivery test.
- A minimal published-character database query. An empty published catalogue fails rather than appearing available to discovery.
- The private `cast-private` bucket, one deterministic approved photo's original and 640px variant, WebP signatures, original source hash, and denial of unauthenticated public access. This samples two objects; it does not audit every character, variant, or user-authorized delivery route.
- The private daily-job status file, reporting `recent`, `failed`, `stale`, `missing`, or `invalid`. A latest failed attempt fails the check even when an earlier successful snapshot exists. Success older than 26 hours is stale, allowing two hours beyond a daily interval. Future timestamps, malformed IDs/status and unreadable history fail safely. This is a freshness diagnostic, not cryptographic verification of a backup or proof of scheduler registration. Use the backup verification commands for integrity.

Hosted HTTP requests use an eight-second deadline per request and reject redirects. Calls are read-only and do not retry failures inside this probe; the operator can repeat after resolving availability. SDK sequences can include several requests, so eight seconds is not a whole-command deadline. The photo check includes database and Storage work; its duration is not pure Storage latency. Durations are diagnostic measurements, without an approved service-level latency threshold.

## Executed verification

The live hosted probe on 11 October passed Auth (~1.0s), database (~1.1s), sampled photos/private access (~3.2s), and backup freshness (~2 hours). No hosted data or configuration changed.

`npm run test:hosted-health` covers stale and failed backups, invalid clocks/IDs, missing history, safe probe results, and the actual command under a simulated total network outage using fake private credentials. The command returned exit code 1, marked dependencies unavailable, and excluded the sensitive canary from stdout/stderr. Existing monitoring privacy and request cancellation/deadline tests also passed. Scoped ESLint passed.

## Remaining work

There is no deployed application URL yet, so this checks hosted Supabase dependencies and local backup history rather than production website uptime. Existing `/api/health` remains application liveness only. These diagnostics are manual; they do not install an uptime schedule, send notifications, collect durable hosted logs, or warn while this computer is offline. Select alert destination, incident owner, protected log retention and deployment URL before configuring external collection/alerts. Off-site backup protection, email delivery, AI usage/cost and payment monitoring remain separate pending work. General-user hosted deletion stays disabled. Stage 12 and Gate B remain open.
