# Stage 9 local Storage recovery

8 October 2026. Local acceptance evidence, not a hosted recovery-time or recovery-point commitment.

## What must be backed up together

The database preserves Auth identities, asset ownership, immutable object keys, original hashes, review/publication attestations, public snapshots, instruction history, controls and audit. Database backups do **not** contain image bytes. Keep a corresponding object export and manifest alongside each database snapshot in protected backup storage.

For each `public.character_assets` record, retain `storage_path` (the normalized original) and its sibling `320.webp`, `640.webp` and `1280.webp`. Preserve their exact character/asset UUID paths, content type, byte count and SHA-256 checksum. The original checksum must equal `source_hash`. Retain the bucket configuration: `cast-private`, private, 5 MB limit, WebP-only. Export every referenced object, including rejected/unpublished assets, while their retention policy requires keeping them. An incomplete export must not be labelled recoverable.

## Backup procedure

1. Coordinate a maintenance window that stops administrator cast/asset writes, uploads and physical object deletion. Customer account writes need the database provider's consistent snapshot mechanism. Pausing photo delivery alone does not stop operator uploads.
2. Create the consistent database backup described in [Stage 8 setup](./stage-8-setup.md), including managed Auth identities and public/private schemas. Record the environment, migration version and timestamp without credentials.
3. Export the referenced original and variant objects through trusted Storage access into a separately protected directory. Write a manifest with their original keys, sizes, content types, checksums and bucket configuration. Verify every downloaded checksum and the original's `source_hash` before completing the backup.
4. Retain the database snapshot and object manifest/export as one recovery set. Keep incomplete attempts separate. Resume operator writes after verification. Keep keys out of the manifest and all backups out of source control.

The repository's `test:storage-restore` command is a synthetic drill; it is **not** a full production backup command. `.local-backups` is ignored, and the retained drill evidence contains synthetic images only. Ignoring a directory does not encrypt it or establish a retention policy. Hosted backup encryption, access, scheduled exports, expiry and deletion-ledger handling must be configured and tested before production claims; Stages 12 and 13 own those requirements.

## Isolated restore procedure

1. Create an isolated database and private Storage destination. Never test by overwriting the running application's bucket or database.
2. Restore Auth/application schemas and grants, retaining user, character and asset IDs. Apply only migrations newer than the snapshot. Verify ownership, instruction history, publication attestations and capability controls.
3. Recreate the private bucket configuration through the Storage API. Upload manifest objects to their exact immutable keys with WebP content type and no overwrite. Do not restore `storage.objects` rows without the corresponding bytes; API uploads recreate the object metadata.
4. Re-download every restored object and compare its size/checksum with the manifest. Check approved/rejected and published/unpublished access with administrator and ordinary accounts. Verify global/character photo pauses and anonymous denial. Reapply later deletion/rejection records before admitting users so restoring an older snapshot does not resurrect removed access.
5. Record evidence and remove only the isolated test resources. Restoring into a hosted application or switching production endpoints requires separate release authorization.

## Executed evidence

`npm run test:storage-restore` passed against local Supabase Storage. It creates two unique private synthetic buckets, uploads a fully inspected original and three responsive variants, exports all four objects and bucket configuration to disk, removes the synthetic source objects, restores them into the second bucket, and verifies SHA-256 equality and anonymous download denial. It removes only its own buckets and retains the synthetic manifest/files in ignored `.local-backups`.

The real-account database restore check additionally verifies Stage 9 asset ownership, instruction history and character-control records when present in its synthetic snapshot. Together these are local database/object recovery evidence. They do not prove a hosted full-environment restore, actual launch-asset recovery, production backup scheduling or final recovery objectives.
