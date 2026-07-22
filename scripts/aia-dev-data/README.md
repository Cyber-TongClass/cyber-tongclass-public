# AIA development data tooling

`.env.aia-dev.local` is untracked and must remain local to the operator. The only allowed source is `clean-swordfish-983`, and the only write target is `bold-sandpiper-236`.

Every write uses `--confirm-target bold-sandpiper-236`. There is no `--prod` option. This tooling is manually triggered and is never tied to dev/build/start scripts.

Validate a local environment before any development-data operation:

```bash
node scripts/aia-dev-data/lib/target-gate.mjs \
  --env-file .env.aia-dev.local \
  --source clean-swordfish-983 \
  --target bold-sandpiper-236 \
  --confirm-target bold-sandpiper-236 \
  --mode write
```

## Snapshot clone, rollback, and verification

These commands are manual-only operator tools. They are not part of dev, build, start, or deployment automation. Keep `.env.aia-dev.local` local and untracked; do not print, share, or commit its contents. Snapshot ZIP files can contain application data, so keep the backup directory local and access-controlled as well.

The clone command requires a new or empty backup directory. It exports the development target before any import, then exports the approved source, imports only into the development target, and re-exports that target for a logical verification. The backup is created before the replacement import. Run exactly:

```bash
node scripts/aia-dev-data/clone-convex-snapshot.mjs \
  --env-file .env.aia-dev.local \
  --source clean-swordfish-983 \
  --target bold-sandpiper-236 \
  --confirm-target bold-sandpiper-236 \
  --backup-dir /secure/local/aia-snapshots/clone-2026-07-22
```

That directory receives `target-before.zip` and its manifest before the import, plus the source and target-after snapshots and manifests. Manifests contain only a SHA-256, archive size, per-table document-line counts, and native-storage totals; they do not contain exported document values. If clone verification fails, the command stops with `AIA_SNAPSHOT_VERIFY_MISMATCH`. It never performs an automatic rollback.

To manually roll the development target back to the pre-import backup, use that target backup and its matching manifest. Rollback imports only `bold-sandpiper-236`, then re-exports and logically verifies it. Run exactly:

```bash
node scripts/aia-dev-data/rollback-convex-snapshot.mjs \
  --env-file .env.aia-dev.local \
  --source clean-swordfish-983 \
  --target bold-sandpiper-236 \
  --confirm-target bold-sandpiper-236 \
  --snapshot /secure/local/aia-snapshots/clone-2026-07-22/target-before.zip \
  --manifest /secure/local/aia-snapshots/clone-2026-07-22/target-before.manifest.json
```

To compare two manifests or snapshot ZIPs without importing anything, use the read-only verifier:

```bash
node scripts/aia-dev-data/verify-convex-clone.mjs \
  --env-file .env.aia-dev.local \
  --source clean-swordfish-983 \
  --target bold-sandpiper-236 \
  --expected /secure/local/aia-snapshots/clone-2026-07-22/source.manifest.json \
  --actual /secure/local/aia-snapshots/clone-2026-07-22/target-after.manifest.json
```

All Convex commands use explicit approved `--deployment` names. There is no `--prod` path, and these scripts reject any unapproved source, target, confirmation, or local environment configuration.
