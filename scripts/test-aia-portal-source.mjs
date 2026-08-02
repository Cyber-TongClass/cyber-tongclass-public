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
for (const lineHeightClass of ["leading-[1.24]", "sm:leading-[1.24]", "md:leading-[1.24]"]) {
  assert.ok(hero.includes(lineHeightClass), `The homepage title needs ${lineHeightClass}`)
}
assert.match(hero, /href=["']\/institute["']/)
assert.match(hero, /href=["']\/tong-class["']/)

const aiaHome = readSource("src/components/institute/aia-home.tsx")
assert.doesNotMatch(`${aiaHome}\n${hero}`, /setInterval|autoplay|auto-rotat/i)
assert.match(aiaHome, /<HomeLiveUpdates\s*\/>/)
assert.doesNotMatch(aiaHome, /<TongClassPeopleBand\b|<HomeLiveResearch\b|<InstituteDirectoryPreview\b/)

const homeLiveUpdates = readSource("src/components/institute/home-live-updates.tsx")
assert.match(homeLiveUpdates, /title="焦点动态"[\s\S]*showRule=\{false\}/)

const serviceDirectory = readSource("src/components/institute/service-directory.tsx")
assert.match(serviceDirectory, /Coffee Talk/)
assert.match(serviceDirectory, /href=["']\/services\/coffee-talk["']/)

const portalClient = readSource("src/components/portal/portal-client.tsx")
const siteCopy = readSource("src/config/site-copy.ts")
assert.equal(
  (siteCopy.match(/coffeeTalk:\s*\{\s*title: "Coffee Talk"/g) ?? []).length,
  1,
  "Portal should expose only the consolidated Coffee Talk entry",
)
assert.doesNotMatch(portalClient, /title: "我的 Coffee Talk 申请"/)
assert.doesNotMatch(portalClient, /title: "申请 Coffee Talk"/)
assert.match(portalClient, /function isDesktopLastGridRow\(index: number, total: number\)/)
assert.match(portalClient, /total % 2 === 0 \? 2 : 1/)
assert.match(portalClient, /moduleIndex === section\.modules\.length - 1 && "border-b-0"/)
assert.match(portalClient, /isDesktopLastGridRow\(moduleIndex, section\.modules\.length\) && "sm:border-b-0"/)
assert.match(portalClient, /<ul className="grid content-center gap-x-10 sm:grid-cols-2">/)

const portalPage = readSource("src/app/portal/page.tsx")
const portalListPage = readSource("src/app/portal/list/page.tsx")

assert.match(portalPage, /import\s*\{\s*redirect\s*\}\s*from\s*["']next\/navigation["']/)
assert.match(portalPage, /redirect\(`\/portal\/list/)
assert.doesNotMatch(portalPage, /PortalClient/)
assert.match(portalListPage, /from\s+["']@\/components\/portal\/portal-client["']/)
assert.match(portalListPage, /<PortalClient\s*\/?\s*>/)
assert.match(portalClient, /const loginHref = "\/login\?next=%2Fportal%2Flist"/)

const reservationCard = readSource("src/components/institute/reservation-placeholder-card.tsx")
assert.match(reservationCard, /西楼预约\s*·\s*筹备中/)
assert.match(reservationCard, /aria-disabled=["']true["']/)
assert.doesNotMatch(reservationCard, /<(?:a|Link|form)\b/)
assert.doesNotMatch(reservationCard, /href=/)

const directoryPreview = readSource("src/components/institute/institute-directory-preview.tsx")
assert.match(directoryPreview, /title="研究院目录"[\s\S]*showRule=\{false\}/)
for (const href of ["/people", "/groups", "/research", "/updates"]) {
  assert.match(directoryPreview, new RegExp(`href=["']${href}["']`))
}

assertNoDirectConvexImports(portalSources)

const servicesPage = readSource("src/app/services/page.tsx")
const aiaNavbar = readSource("src/components/layout/aia-navbar.tsx")
const aiaFooter = readSource("src/components/layout/aia-footer.tsx")
const sitemap = readSource("src/app/sitemap.tsx")
const contactPage = readSource("src/app/contact/page.tsx")
const institutePage = readSource("src/app/institute/page.tsx")
assert.match(institutePage, /title="服务范围"[\s\S]*showRule=\{false\}/)

assert.match(servicesPage, /import\s*\{\s*notFound\s*\}\s*from\s*["']next\/navigation["']/)
assert.match(servicesPage, /notFound\(\)/)
assert.doesNotMatch(aiaNavbar, /href:\s*["']\/services["']/)
assert.doesNotMatch(aiaFooter, /href:\s*["']\/services["']/)
assert.doesNotMatch(sitemap, /pathname:\s*["']\/services["']/)
assert.doesNotMatch(aiaHome, /ServiceDirectory/)
assert.doesNotMatch(contactPage, /href="\/services"/)
assert.doesNotMatch(institutePage, /href="\/services"/)
assert.match(portalClient, /href:\s*withReturnTo\(["']\/services\/oa["']/)
assert.match(siteCopy, /oa:\s*\{\s*title:\s*["']OA 与审批["']/)
assert.match(portalClient, /const isGraduate = currentUser\.identityType === "graduate"/)
assert.match(portalClient, /href: "\/tong-class\/intranet",[\s\S]*copy\.modules\.graduateIntranet/)
assert.match(siteCopy, /graduateIntranet:\s*\{\s*title: "人工智能研究院研究生内网"/)

const tongNavbar = readSource("src/components/layout/tong-class-navbar.tsx")
const tongMembers = readSource("src/app/tong-class/members/page.tsx")
const tongIntranet = readSource("src/app/tong-class/intranet/page.tsx")
const usersBackend = readSource("convex/users.ts")
const eventsBackend = readSource("convex/events.ts")
assert.match(tongNavbar, /currentUser\?\.identityType === "graduate"/)
assert.match(tongNavbar, /siteCopy\.brand\.graduateIntranetName/)
assert.match(tongMembers, /identityType: isGraduate \? "graduate" : undefined/)
assert.match(tongIntranet, /\["techday", "materials", "reimbursements", "forms"\]/)
assert.match(usersBackend, /identityType: v\.optional\(v\.union\(v\.literal\("undergrad"\), v\.literal\("graduate"\)\)\)/)
assert.match(eventsBackend, /const audienceValidator = v\.array\(v\.union\(v\.literal\("undergrad"\), v\.literal\("graduate"\)\)\)/)
assert.match(eventsBackend, /audiences: v\.optional\(audienceValidator\)/)

console.log("AIA portal source checks passed.")
