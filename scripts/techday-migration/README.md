# TechDay Migration Scripts

These scripts are intentionally standalone. Do not wire them into `dev`, `build`, `start`, `postinstall`, or any npm lifecycle hook.

Expected inputs:

- A JSON export of the old TechDay SQL database.
- A file manifest for the old `data/uploads` directory with checksums.
- Optional Markdown posts exported from the old `POSTS_DIR`.

Workflow:

1. Run `node scripts/techday-migration/export-source.mjs --db <sqlite-file> --uploads <uploads-dir> --out <export-dir>` on a copy of the old TechDay server data.
2. Review the generated JSON and file manifest.
3. Run `node scripts/techday-migration/import-to-convex.mjs --input <export-dir>` after configuring Convex credentials.

Every imported row must carry `legacyId` or a `(sourceTable, sourceId)` mapping so the import can be retried safely.
