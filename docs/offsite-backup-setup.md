# Off-site backup setup

11 October 2026 · Prepared requirements; no provider account, bucket, credentials or off-site copy exists yet. General-user deletion remains disabled.

## Recommended destination

Use a dedicated private Cloudflare R2 bucket with **Standard** storage, provisionally named `talkingstage-backups`. This is a recommendation, not an already selected or provisioned provider. R2 Standard includes 10 GB-month storage, one million Class A operations and ten million Class B operations per month; usage above the included allowance is billed. Standard avoids the 30-day minimum storage duration of Infrequent Access, which does not suit the project's seven-day snapshot policy. Check current [pricing](https://developers.cloudflare.com/r2/pricing/) when activating the service.

## Owner setup

1. Create/sign in to a [Cloudflare account](https://dash.cloudflare.com/). Open R2 Object Storage and follow the subscription setup. Review any billing details before activating it; an included allowance is not a spending cap. See [R2 setup](https://developers.cloudflare.com/r2/get-started/).
2. Create a dedicated bucket named `talkingstage-backups`, using Standard storage. Keep public access disabled: no `r2.dev` access, public custom domain, public Worker route or public share. See [public access controls](https://developers.cloudflare.com/r2/buckets/public-buckets/).
3. Tell the implementation agent the bucket name and that setup is complete. Account ID/S3 endpoint are configuration details; never send secret access keys in chat. The integration will provide an ignored server-only configuration file before credentials are needed.

## Integration requirements

Only verified encrypted `.dump` bundles and their signed metadata are eligible for snapshot upload. Never upload `.env` files, raw database dumps, test logins, CLI diagnostics, or loose encryption/signing keys. Bind destination paths to this project and a dedicated managed prefix; exclude unrelated bucket objects from all cleanup.

After upload, re-download and check the full ciphertext hash and signed metadata before recording off-site success. Interrupted uploads and failed verification must not claim success. The scheduled backup and replication outcomes must remain distinguishable so a local success cannot hide a remote failure. Use fixed failure labels without response bodies, paths, account IDs or credentials in public logs.

The owner's seven-day snapshot policy must apply remotely as well. Scope lifecycle expiry to snapshot objects only; do not apply blanket seven-day expiry to the erasure ledger or recovery keys. Review remote object locks, versions and any additional retained copies before promising a deletion time. Provider cleanup timing and retention require verification. See [object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

The current signed erasure ledger needs independent, durable protection and monotonic recovery checks. Replacing it with the older ledger from a snapshot would resurrect deleted accounts. Encryption and signing keys need a separate owner-controlled recovery copy, protected independently from the routine uploader. Select that recovery mechanism before enabling general-user deletion. A private bucket alone does not solve key loss or protect against a compromised uploader.

## Required acceptance before claiming disaster recovery

- Upload a verified encrypted snapshot to the real private bucket and re-download it with matching bytes/signature.
- Demonstrate denial of unauthenticated access and refusal of wrong keys/corrupt downloads.
- Exercise interrupted upload/retry without duplicate success or loss of the last verified remote copy.
- Verify snapshot-only seven-day cleanup and preserved current erasure records/recovery materials.
- Recover downloaded data into an isolated database/private local photo bucket, replay current erasures, and verify another account and all cast objects remain intact.
- Document access and key recovery from another machine; record where the independently protected recovery material is held without recording secrets.
- Add remote replication freshness/failure reporting and an operator notification destination.

The existing daily Windows job still depends on this computer, Docker, internet and CLI login. Off-site storage will protect copied data from loss of this computer; it will not make backup creation run while the computer is off. Always-on scheduling and offline recovery/promotion remain separate operational work.
