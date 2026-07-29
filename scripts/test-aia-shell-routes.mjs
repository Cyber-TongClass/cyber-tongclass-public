import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const routeModulePath = resolve("src/lib/tong-class-routes.ts")

function loadRoutes() {
  const source = readFileSync(routeModulePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: routeModulePath,
  }).outputText
  const moduleRecord = { exports: {} }
  const localRequire = createRequire(routeModulePath)

  new Function("exports", "require", "module", "__filename", "__dirname", compiled)(
    moduleRecord.exports,
    localRequire,
    moduleRecord,
    routeModulePath,
    dirname(routeModulePath),
  )

  return moduleRecord.exports
}

test("selects independent product shells before public contexts", () => {
  const { getPublicShellKind } = loadRoutes()

  for (const pathname of ["/admin", "/admin/users", "/reviewer", "/reviewer/login", "/techday", "/techday/awards"]) {
    assert.equal(getPublicShellKind(pathname), "none")
  }

  assert.equal(getPublicShellKind("/tong-class"), "tong-class")
  assert.equal(getPublicShellKind("/tong-class/news"), "tong-class")
  assert.equal(getPublicShellKind("/"), "aia")
  assert.equal(getPublicShellKind("/people"), "aia")
  assert.equal(getPublicShellKind("/login"), "aia")
})

test("builds canonical Tong Class paths once", () => {
  const {
    tongClassPath,
    tongClassHomePath,
    tongClassAboutPath,
    tongClassMembersPath,
    tongClassNewsPath,
    tongClassPublicationsPath,
    tongClassResourcesPath,
    tongClassCoursesPath,
    tongClassEventsPath,
    tongClassIntranetPath,
  } = loadRoutes()

  assert.equal(tongClassPath(), "/tong-class")
  assert.equal(tongClassPath("news"), "/tong-class/news")
  assert.equal(tongClassPath("/members/alice"), "/tong-class/members/alice")
  assert.equal(tongClassHomePath(), "/tong-class")
  assert.equal(tongClassAboutPath(), "/tong-class/about")
  assert.equal(tongClassMembersPath("alice"), "/tong-class/members/alice")
  assert.equal(tongClassNewsPath("announcement"), "/tong-class/news/announcement")
  assert.equal(tongClassPublicationsPath("paper"), "/tong-class/publications/paper")
  assert.equal(tongClassResourcesPath("links"), "/tong-class/resources/links")
  assert.equal(tongClassCoursesPath("introduction-to-ai"), "/tong-class/courses/introduction-to-ai")
  assert.equal(tongClassEventsPath("event-id"), "/tong-class/events/event-id")
  assert.equal(tongClassIntranetPath("forms"), "/tong-class/intranet/forms")
})

test("contextual shell sources avoid raw Convex usage", () => {
  const sources = [
    "src/components/layout/aia-navbar.tsx",
    "src/components/layout/aia-footer.tsx",
    "src/components/layout/tong-class-navbar.tsx",
    "src/components/layout/tong-class-footer.tsx",
    "src/components/layout/app-shell.tsx",
  ].map((file) => [file, readFileSync(file, "utf8")])

  for (const [file, source] of sources) {
    assert.doesNotMatch(source, /from\s+["']convex(?:\/[^"']*)?["']/)
    assert.doesNotMatch(source, /\b(?:useQuery|useMutation)\s*\(/)
    assert.doesNotMatch(source, /\bapi\.[A-Za-z0-9_]+\./)
    assert.ok(source.length > 0, `${file} should not be empty`)
  }
})

test("AIA navigation exposes an accessible mobile menu and discoverable search route", () => {
  const source = readFileSync("src/components/layout/aia-navbar.tsx", "utf8")

  assert.match(source, /aria-label=.*AIA.*导航菜单/)
  assert.match(source, /aria-expanded/)
  assert.match(source, /onKeyDown/)
  assert.match(source, /href=["']\/search["']/)
  assert.match(source, /aria-label=["']站内搜索["']/)
})

test("Tong Class navigation uses canonical undergraduate path helpers", () => {
  const source = readFileSync("src/components/layout/tong-class-navbar.tsx", "utf8")

  for (const helper of [
    "tongClassAboutPath",
    "tongClassMembersPath",
    "tongClassNewsPath",
    "tongClassPublicationsPath",
    "tongClassResourcesPath",
    "tongClassCoursesPath",
    "tongClassEventsPath",
    "tongClassIntranetPath",
  ]) {
    assert.match(source, new RegExp("\\b" + helper + "\\b"))
  }

  assert.doesNotMatch(source, /href=["']\/(?:about|members|news|publications|resources|courses|events|intranet)/)
})

test("AppShell delegates context selection to the public shell helper", () => {
  const source = readFileSync("src/components/layout/app-shell.tsx", "utf8")

  assert.match(source, /getPublicShellKind/)
  assert.match(source, /AiaNavbar/)
  assert.match(source, /TongClassNavbar/)
})
