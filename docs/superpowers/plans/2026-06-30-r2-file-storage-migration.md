# R2 File Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move new uploaded files from Convex Storage to Cloudflare R2 while preserving access to existing Convex Storage files.

**Architecture:** Convex remains the authorization and metadata layer. Upload mutations return either a legacy Convex upload URL or a new R2 presigned PUT target; database fields continue using the existing `storageId` names, with new R2 objects stored as `r2:<object-key>`. Download queries detect the prefix and return either an R2 presigned GET URL or the legacy `ctx.storage.getUrl()` result.

**Tech Stack:** Next.js App Router, Convex functions, Cloudflare R2 S3-compatible presigned URLs, WebCrypto SigV4, Node built-in test scripts.

---

### Task 1: Preserve the current Convex backend before edits

**Files:**
- Create: `/Users/photonyan/Desktop/cyber-tongclass-public-convex-backups/convex-r2-migration-<timestamp>/`

- [x] **Step 1: Copy the current Convex directory**

```bash
backup_dir="/Users/photonyan/Desktop/cyber-tongclass-public-convex-backups/convex-r2-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$(dirname "$backup_dir")"
cp -a /Users/photonyan/Desktop/cyber-tongclass-public/convex "$backup_dir"
printf '%s\n' "$backup_dir"
```

- [x] **Step 2: Verify the backup exists**

```bash
test -d "$backup_dir" && test -f "$backup_dir/schema.ts"
```

### Task 2: Add test coverage for storage-id and R2 signing helpers

**Files:**
- Create: `/Users/photonyan/Desktop/cyber-tongclass-public/scripts/test-r2-storage.mjs`
- Create: `/Users/photonyan/Desktop/cyber-tongclass-public/convex/lib/r2.ts`

- [ ] **Step 1: Write failing tests before helper implementation**

```js
import assert from "node:assert/strict"
import test from "node:test"
import { loadTypeScriptModule } from "./test-utils/load-typescript-module.mjs"

const r2 = loadTypeScriptModule("convex/lib/r2.ts")

test("R2 storage ids are prefixed and reversible", () => {
  const key = r2.createR2ObjectKey({ purpose: "oa-form-attachment", ownerId: "user-1", fileName: "报销 票据.pdf", now: new Date("2026-06-30T10:00:00Z"), randomId: "fixed" })
  assert.equal(key, "oa-form-attachment/2026/06/user-1/fixed-bao-xiao-piao-ju.pdf")
  assert.equal(r2.toR2StorageId(key), "r2:oa-form-attachment/2026/06/user-1/fixed-bao-xiao-piao-ju.pdf")
  assert.equal(r2.getR2ObjectKeyFromStorageId("r2:" + key), key)
  assert.equal(r2.getR2ObjectKeyFromStorageId("kg2legacy"), null)
})

test("R2 presigned URLs use path-style bucket URLs and SigV4 query params", async () => {
  const target = await r2.createR2SignedUrl({ method: "PUT", key: "oa/file.pdf", contentType: "application/pdf", now: new Date("2026-06-30T10:00:00Z"), expiresSeconds: 900, config: { endpoint: "https://example-account.r2.cloudflarestorage.com", bucket: "tongclass-uploads", accessKeyId: "AKIAEXAMPLE", secretAccessKey: "secret" } })
  const url = new URL(target)
  assert.equal(url.origin, "https://example-account.r2.cloudflarestorage.com")
  assert.equal(url.pathname, "/tongclass-uploads/oa/file.pdf")
  assert.equal(url.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256")
  assert.equal(url.searchParams.get("X-Amz-SignedHeaders"), "host")
  assert.match(url.searchParams.get("X-Amz-Signature"), /^[0-9a-f]{64}$/)
})
```

- [ ] **Step 2: Run test and confirm it fails because the helper does not exist yet**

```bash
node scripts/test-r2-storage.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` or missing export for `/convex/lib/r2.ts`.

### Task 3: Implement R2 helper and compatibility behavior

**Files:**
- Create: `/Users/photonyan/Desktop/cyber-tongclass-public/convex/lib/r2.ts`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/convex/schema.ts`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/convex/academicExchange.ts`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/convex/oaForms.ts`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/convex/techday/files.ts`

- [ ] **Step 1: Implement pure WebCrypto SigV4 helpers**

The helper exports `createR2ObjectKey`, `toR2StorageId`, `getR2ObjectKeyFromStorageId`, `createR2SignedUrl`, `createR2UploadTarget`, `getR2DownloadUrl`, and `isR2Configured`. It reads `R2_ENDPOINT`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_SIGNED_URL_TTL_SECONDS` from Convex environment variables.

- [ ] **Step 2: Update Convex schema validators**

Change file id fields from `v.id("_storage")` to `v.union(v.id("_storage"), v.string())` so existing Convex Storage ids and new `r2:` string ids can both be stored.

- [ ] **Step 3: Update upload mutations**

Return R2 upload targets when R2 env vars are configured; otherwise return the legacy Convex upload URL so local dev does not break before Convex env vars are set.

- [ ] **Step 4: Update download queries**

When a stored id starts with `r2:`, return an R2 presigned GET URL. Otherwise return `ctx.storage.getUrl()` for legacy Convex files.

### Task 4: Update browser upload callers for R2 PUT targets

**Files:**
- Create: `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/file-upload.ts`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/api.ts`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/src/app/intranet/reimbursements/academic-exchange/new/page.tsx`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/src/components/oa-forms/oa-form-renderer.tsx`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/src/components/techday/techday-file-controls.tsx`
- Modify: `/Users/photonyan/Desktop/cyber-tongclass-public/src/app/techday/reimbursements/page.tsx`

- [ ] **Step 1: Add a client helper for both legacy and R2 upload targets**

`uploadFileToStorageTarget(target, file, failureMessage)` posts to legacy Convex Storage URLs and PUTs to R2 signed targets, returning the resulting `storageId` string in both cases.

- [ ] **Step 2: Pass file metadata to upload URL mutations**

Academic exchange, OA forms, TechDay posters, and TechDay reimbursement attachments pass `fileName` and `mimeType` before uploading.

- [ ] **Step 3: Store returned storage ids unchanged**

New R2 uploads store `r2:<object-key>` in existing `storageId` fields; legacy fallback stores Convex `_storage` ids.

### Task 5: Verify

**Files:**
- Existing scripts and lint configuration.

- [ ] **Step 1: Run helper tests**

```bash
node scripts/test-r2-storage.mjs
```

Expected: all R2 helper tests pass.

- [ ] **Step 2: Run existing file-related tests**

```bash
node scripts/test-academic-exchange-pdf-source.mjs
node scripts/test-oa-forms.mjs
```

Expected: existing upload metadata tests still pass.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no lint errors. If unrelated pre-existing lint errors appear, report them without claiming a clean lint state.
