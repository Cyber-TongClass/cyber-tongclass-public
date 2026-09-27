import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"
import { NextResponse } from "next/server.js"

const root = new URL("../", import.meta.url)
function load(file, dependencies) {
  const source = fs.readFileSync(new URL(file, root), "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const loaded = { exports: {} }
  vm.runInNewContext(compiled, {
    module: loaded, exports: loaded.exports,
    require: (name) => dependencies[name] || {},
    console: { error() {} },
    URL,
  })
  return loaded.exports
}

test("public course catalog queries the shared backend without requiring a login", () => {
  const manifest = { resources: [{ resourceKey: "lec5-slides", source: "r2" }], managedKeys: [] }
  const api = load("src/lib/api.ts", {
    "convex/server": { makeFunctionReference: (name) => name },
    "convex/react": { useQuery: (name, args) => {
      assert.equal(name, "tongInitCourseResources:listPublicManifest")
      assert.equal(JSON.stringify(args), "{}")
      return manifest
    } },
  })
  assert.equal(api.useTongInitCourseResources(), manifest)
})

function downloadRoute(target) {
  return load("src/app/api/resources/tong-init-course/[id]/download/route.ts", {
    "next/server": { NextResponse },
    "convex/server": { makeFunctionReference: (name) => name },
    "@/lib/server/convex-http": { getConvexHttpClient: () => ({ action: async (name, args) => {
      assert.equal(name, "tongInitCourseResources:getDownloadTarget")
      assert.equal(args.id, "published-resource")
      if (target instanceof Error) throw target
      return target
    } }) },
  })
}
const request = { nextUrl: new URL("https://www.tongclass.ac.cn/resources/tong-init-course") }
const context = () => ({ params: Promise.resolve({ id: "published-resource" }) })

test("downloads obtain a fresh R2 target and redirect without caching the signed URL", async () => {
  const url = "https://example.r2.cloudflarestorage.com/bucket/slides.pdf?X-Amz-Signature=fresh"
  const response = await downloadRoute({ url }).GET(request, context())
  assert.equal(response.status, 307)
  assert.equal(response.headers.get("location"), url)
  assert.match(response.headers.get("cache-control"), /no-store/)
})

test("legacy static resources keep resolving on the website", async () => {
  const response = await downloadRoute({ url: "/resources/tong-init-course/slides-lec0.pdf" }).GET(request, context())
  assert.equal(response.status, 307)
  assert.equal(response.headers.get("location"), "https://www.tongclass.ac.cn/resources/tong-init-course/slides-lec0.pdf")
})

test("archived or missing resources return 404", async () => {
  const response = await downloadRoute(null).GET(request, context())
  assert.equal(response.status, 404)
  assert.match(response.headers.get("cache-control"), /no-store/)
})

test("backend failures return a retryable 503", async () => {
  const response = await downloadRoute(new Error("backend unavailable")).GET(request, context())
  assert.equal(response.status, 503)
  assert.match(response.headers.get("cache-control"), /no-store/)
})
