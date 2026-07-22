import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import test from "node:test"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const repositoryRoot = resolve(dirname(new URL(import.meta.url).pathname), "..")

function readSource(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath)
  assert.ok(existsSync(absolutePath), `Expected ${relativePath} to exist`)
  return readFileSync(absolutePath, "utf8")
}

function loadTypeScriptModule(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath)
  const source = readSource(relativePath)
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  }).outputText
  const module = { exports: {} }
  const localRequire = createRequire(absolutePath)

  new Function("exports", "require", "module", "__filename", "__dirname", compiled)(
    module.exports,
    localRequire,
    module,
    absolutePath,
    dirname(absolutePath),
  )

  return module.exports
}

test("AIA root metadata uses an internal canonical site URL and local identity", () => {
  const site = loadTypeScriptModule("src/lib/site-url.ts")
  const layout = readSource("src/app/layout.tsx")

  assert.equal(site.DEFAULT_SITE_URL, "https://tongclass.ac.cn")
  assert.equal(site.resolveSiteUrl("https://iai.example.edu/aia?draft=1#brand").toString(), "https://iai.example.edu/")
  assert.equal(site.resolveSiteUrl("javascript:alert(1)").toString(), site.DEFAULT_SITE_URL + "/")
  assert.equal(site.resolveSiteUrl("not a url").toString(), site.DEFAULT_SITE_URL + "/")
  assert.equal(
    new URL(site.absoluteSiteUrl("//untrusted.example/landing")).origin,
    site.siteUrl.origin,
    "absolute URLs must remain on the configured site origin",
  )

  assert.match(layout, /from\s+["']@\/lib\/site-url["']/)
  assert.match(layout, /metadataBase:\s*siteUrl/)
  assert.match(layout, /北京大学人工智能研究院综合服务系统/)
  assert.match(layout, /Artificial Intelligence Agora/)
  assert.match(layout, /The Integrated Services Platform of PKU IAI/)
  assert.match(layout, /\/brand\/aia\/aia-seal\.png/)
  assert.match(layout, /canonical:\s*["']\/["']/)
})

test("canonical discovery contains only public AIA and Tong Class routes", () => {
  const sitemap = readSource("src/app/sitemap.tsx")
  const robots = readSource("src/app/robots.ts")

  for (const publicPath of [
    "\"/tong-class\"",
    "\"/tong-class/about\"",
    "\"/tong-class/members\"",
    "\"/tong-class/news\"",
    "\"/tong-class/publications\"",
    "\"/tong-class/resources\"",
    "\"/institute\"",
    "\"/research\"",
    "\"/updates\"",
    "\"/services\"",
    "\"/contact\"",
  ]) {
    assert.ok(sitemap.includes(publicPath), `Sitemap must include ${publicPath}`)
  }

  for (const nonDiscoveryPath of [
    "/admin",
    "/reviewer",
    "/account",
    "/login",
    "/search",
    "/tong-class/intranet",
    "/tong-class/courses",
    "/tong-class/events",
  ]) {
    assert.equal(sitemap.includes(`\"${nonDiscoveryPath}`), false, `Sitemap must exclude ${nonDiscoveryPath}`)
    assert.ok(robots.includes(`\"${nonDiscoveryPath}`), `Robots must disallow ${nonDiscoveryPath}`)
  }
})
