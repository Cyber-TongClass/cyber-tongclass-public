import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, statSync } from "node:fs"

for (const asset of [
  "public/brand/aia/pku-iai-horizontal-lockup.png",
  "public/brand/aia/aia-seal.png",
]) {
  test(`${asset} is a non-empty local brand asset`, () => {
    assert.equal(existsSync(asset), true)
    assert.ok(statSync(asset).size > 1024)
  })
}
