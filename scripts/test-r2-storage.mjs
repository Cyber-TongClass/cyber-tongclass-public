import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")

function loadTypeScriptModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath)
  const source = fs.readFileSync(absolutePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  }).outputText

  const loadedModule = { exports: {} }
  const sandbox = {
    __dirname: path.dirname(absolutePath),
    __filename: absolutePath,
    console,
    crypto: globalThis.crypto,
    exports: loadedModule.exports,
    module: loadedModule,
    process,
    require,
    TextDecoder,
    TextEncoder,
    URL,
    URLSearchParams,
  }
  vm.runInNewContext(compiled, sandbox, { filename: absolutePath })
  return loadedModule.exports
}

const r2 = loadTypeScriptModule("convex/lib/r2.ts")

test("R2 storage ids are prefixed and reversible", () => {
  const key = r2.createR2ObjectKey({
    purpose: "oa-form-attachment",
    ownerId: "user-1",
    fileName: "报销 票据.pdf",
    now: new Date("2026-06-30T10:00:00Z"),
    randomId: "fixed",
  })

  assert.equal(key, "oa-form-attachment/2026/06/user-1/fixed-bao-xiao-piao-ju.pdf")
  assert.equal(r2.toR2StorageId(key), "r2:oa-form-attachment/2026/06/user-1/fixed-bao-xiao-piao-ju.pdf")
  assert.equal(r2.getR2ObjectKeyFromStorageId(`r2:${key}`), key)
  assert.equal(r2.getR2ObjectKeyFromStorageId("kg2legacy"), null)
  assert.equal(r2.isR2StorageId(`r2:${key}`), true)
  assert.equal(r2.isR2StorageId("kg2legacy"), false)
  assert.equal(r2.r2StorageIdBelongsToOwner(`r2:${key}`, "user-1"), true)
  assert.equal(r2.r2StorageIdBelongsToOwner(`r2:${key}`, "other-user"), false)
  assert.equal(r2.r2StorageIdBelongsToOwner("kg2legacy", "user-1"), false)
  assert.equal(r2.r2StorageIdMatches(`r2:${key}`, { ownerId: "user-1", purpose: "oa-form-attachment" }), true)
  assert.equal(r2.r2StorageIdMatches(`r2:${key}`, { ownerId: "user-1", purpose: "techday-poster" }), false)
  assert.equal(r2.getR2ObjectKeyFromStorageId("r2:not/a/generated/key"), null)
})

test("R2 presigned URLs use path-style bucket URLs and SigV4 query params", async () => {
  const target = await r2.createR2SignedUrl({
    method: "PUT",
    key: "oa/file.pdf",
    contentType: "application/pdf",
    now: new Date("2026-06-30T10:00:00Z"),
    expiresSeconds: 900,
    config: {
      endpoint: "https://example-account.r2.cloudflarestorage.com",
      bucket: "tongclass-uploads",
      accessKeyId: "AKIAEXAMPLE",
      secretAccessKey: "secret",
    },
  })
  const url = new URL(target)
  assert.equal(url.origin, "https://example-account.r2.cloudflarestorage.com")
  assert.equal(url.pathname, "/tongclass-uploads/oa/file.pdf")
  assert.equal(url.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256")
  assert.equal(url.searchParams.get("X-Amz-SignedHeaders"), "host")
  assert.match(url.searchParams.get("X-Amz-Signature"), /^[0-9a-f]{64}$/)
})
