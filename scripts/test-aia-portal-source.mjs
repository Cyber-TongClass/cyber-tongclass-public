import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function readSource(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath)
  assert.ok(existsSync(absolutePath), `Expected ${relativePath} to exist`)
  return readFileSync(absolutePath, "utf8")
}

function assertNoDirectConvexImports(relativePaths) {
  for (const relativePath of relativePaths) {
    const source = readSource(relativePath)
    assert.doesNotMatch(
      source,
      /from\s+["'](?:convex(?:\/[^"']*)?|@\/lib\/convex(?:[^"']*)?)["']/,
      `${relativePath} must not import Convex directly`,
    )
  }
}

const portalSources = [
  "src/app/page.tsx",
  "src/app/institute/page.tsx",
  "src/app/research/page.tsx",
  "src/app/updates/page.tsx",
  "src/app/services/page.tsx",
  "src/app/contact/page.tsx",
  "src/components/institute/aia-home.tsx",
  "src/components/institute/aia-hero.tsx",
  "src/components/institute/service-directory.tsx",
  "src/components/institute/reservation-placeholder-card.tsx",
  "src/components/institute/institute-directory-preview.tsx",
]

const rootPage = readSource("src/app/page.tsx")
assert.match(rootPage, /from\s+["']@\/components\/institute\/aia-home["']/)
assert.match(rootPage, /<AIAHome\s*\/?\s*>/)

const hero = readSource("src/components/institute/aia-hero.tsx")
assert.match(hero, /北京大学人工智能研究院综合服务系统/)
assert.match(hero, /Artificial Intelligence Agora/)
assert.match(hero, /The Integrated Services Platform of PKU IAI/)
assert.equal((hero.match(/<h1\b/g) ?? []).length, 1, "The AIA hero must render exactly one h1")
assert.match(hero, /href=["']\/institute["']/)
assert.match(hero, /href=["']\/tong-class["']/)

const aiaHome = readSource("src/components/institute/aia-home.tsx")
assert.doesNotMatch(`${aiaHome}\n${hero}`, /setInterval|autoplay|auto-rotat/i)

const serviceDirectory = readSource("src/components/institute/service-directory.tsx")
assert.match(serviceDirectory, /Coffee Talk/)
assert.match(serviceDirectory, /href=["']\/services\/coffee-talk["']/)

const reservationCard = readSource("src/components/institute/reservation-placeholder-card.tsx")
assert.match(reservationCard, /西楼预约\s*·\s*筹备中/)
assert.match(reservationCard, /aria-disabled=["']true["']/)
assert.doesNotMatch(reservationCard, /<(?:a|Link|form)\b/)
assert.doesNotMatch(reservationCard, /href=/)

const directoryPreview = readSource("src/components/institute/institute-directory-preview.tsx")
for (const href of ["/people", "/groups", "/research", "/updates"]) {
  assert.match(directoryPreview, new RegExp(`href=["']${href}["']`))
}

assertNoDirectConvexImports(portalSources)

console.log("AIA portal source checks passed.")
