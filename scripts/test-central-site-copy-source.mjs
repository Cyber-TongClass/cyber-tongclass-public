import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const configPath = "src/config/site-copy.ts"
const centralSurfaces = [
  "src/app/layout.tsx",
  "src/components/layout/aia-navbar.tsx",
  "src/components/layout/tong-class-navbar.tsx",
  "src/components/layout/aia-footer.tsx",
  "src/components/layout/footer.tsx",
  "src/components/portal/portal-client.tsx",
  "src/app/tong-class/intranet/page.tsx",
  "src/lib/intranet-modules.ts",
  "src/components/auth/member-only-guard.tsx",
]

test("global page copy has one typed configuration source", () => {
  assert.equal(existsSync(configPath), true)
  const config = readFileSync(configPath, "utf8")
  assert.match(config, /export const siteCopy =/)
  assert.match(config, /as const/)
  assert.match(config, /navigation:/)
  assert.match(config, /portal:/)
  assert.match(config, /intranet:/)
  assert.match(config, /footer:/)
})

test("global navigation, portal, and intranet surfaces consume the central copy", () => {
  for (const path of centralSurfaces) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /@\/config\/site-copy/, `${path} must use the central page-copy config`)
  }
})
