import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const portal = readFileSync(
  new URL("../src/components/portal/portal-client.tsx", import.meta.url),
  "utf8",
)
const copy = readFileSync(
  new URL("../src/config/site-copy.ts", import.meta.url),
  "utf8",
)

test("super administrators see permissions management inside the portal platform section", () => {
  assert.match(
    portal,
    /currentUser\.role === "super_admin"[\s\S]*href: "\/platform\/permissions"[\s\S]*copy\.modules\.permissions/,
  )
  assert.match(portal, /copy\.sections\.admin[\s\S]*modules: adminModules/)
  assert.match(copy, /permissions:\s*\{\s*title: "权限管理"/)
  assert.match(copy, /admin:\s*\{\s*kicker: "管理", title: "平台管理"/)
})
