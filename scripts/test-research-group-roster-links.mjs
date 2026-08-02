import assert from "node:assert/strict"
import test from "node:test"
import { pathToFileURL } from "node:url"
import path from "node:path"
import fs from "node:fs"

const moduleUrl = pathToFileURL(path.resolve("src/lib/research-group-roster.ts")).href
const { attachPublicRosterProfileHrefs } = await import(moduleUrl)
const safeExternalUrlModuleUrl = pathToFileURL(path.resolve("src/lib/safe-external-url.ts")).href
const { getSafeExternalUrl } = await import(safeExternalUrlModuleUrl)
const viewModelSource = fs.readFileSync("src/components/institute/live-directory-view-model.ts", "utf8")
const profileSource = fs.readFileSync("src/components/institute/research-group-profile.tsx", "utf8")
const liveProfileSource = fs.readFileSync("src/components/institute/live-research-group-profile.tsx", "utf8")

test("roster names link only to one exact public Tong Class profile", () => {
  const profiles = [
    { username: "photonyan", chineseName: "严绍恒", englishName: "Shaoheng Yan" },
    { username: "hezimo", chineseName: "何子默", englishName: "Zimo He" },
  ]

  assert.deepEqual(
    attachPublicRosterProfileHrefs(
      [{ name: "严绍恒" }, { name: "hezimo", subtitle: "本科生" }, { name: "未公开成员" }],
      profiles,
    ),
    [
      { name: "严绍恒", profileHref: "/tong-class/members/photonyan" },
      { name: "hezimo", subtitle: "本科生", profileHref: "/tong-class/members/hezimo" },
      { name: "未公开成员" },
    ],
  )
})

test("ambiguous display names remain plain text instead of linking the wrong person", () => {
  const profiles = [
    { username: "alex-one", chineseName: "同名成员", englishName: "Alex One" },
    { username: "alex-two", chineseName: "同名成员", englishName: "Alex Two" },
  ]

  assert.deepEqual(
    attachPublicRosterProfileHrefs([{ name: "同名成员" }], profiles),
    [{ name: "同名成员" }],
  )
})

test("the public group adapter preserves the allow-listed public links", () => {
  assert.match(
    viewModelSource,
    /publicLinks:\s*group\.publicLinks\.map\(\(link\)\s*=>\s*\(\{\s*label:\s*link\.label,\s*href:\s*link\.href,\s*\}\)\)/s,
  )
})

test("research-group public links use the shared external URL safety boundary", () => {
  assert.equal(getSafeExternalUrl("javascript:alert(1)"), undefined)
  assert.equal(getSafeExternalUrl("data:text/html,unsafe"), undefined)
  assert.equal(getSafeExternalUrl("https://example.edu/lab"), "https://example.edu/lab")
  assert.match(profileSource, /getSafeExternalUrl\(link\.href\)/)
  assert.match(profileSource, /safeHref\s*\?\s*\(/)
})

test("the public member presentation puts the leader first once and retains stored member order", () => {
  assert.match(profileSource, /buildOrderedPublicGroupMembers\(\{\s*leader,\s*memberRoles:\s*membershipMembers/s)
  assert.match(profileSource, /if\s*\(member\.person\.slug\s*===\s*leader\?\.slug\)\s*continue/)
  assert.doesNotMatch(profileSource, /\.sort\(/)
})

test("the live profile renders only effective-public research outputs", () => {
  assert.match(liveProfileSource, /toEffectivePublicDirectoryResearchOutputs\(research,\s*`\/groups\/\$\{slug\}`\)/)
  assert.match(
    viewModelSource,
    /item\.effectiveVisibility\s*!==\s*"hidden"/,
  )
})
