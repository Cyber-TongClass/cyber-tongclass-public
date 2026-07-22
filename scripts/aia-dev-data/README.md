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
