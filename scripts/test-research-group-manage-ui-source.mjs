import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pagePath = new URL("../src/app/groups/manage/page.tsx", import.meta.url)
const profilePath = new URL("../src/components/institute/research-group-profile-editor.tsx", import.meta.url)
const membersPath = new URL("../src/components/institute/research-group-member-manager.tsx", import.meta.url)
const publicationsPath = new URL("../src/components/institute/research-group-publication-manager.tsx", import.meta.url)

async function source(path) {
  return readFile(path, "utf8")
}

test("management page composes the complete profile editor above a responsive dual-column workspace", async () => {
  const page = await source(pagePath)
  assert.match(page, /ResearchGroupProfileEditor/)
  assert.match(page, /ResearchGroupMemberManager/)
  assert.match(page, /ResearchGroupPublicationManager/)
  assert.match(page, /lg:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\]/)
  assert.ok(page.indexOf("<ResearchGroupProfileEditor") < page.indexOf("<ResearchGroupMemberManager"))
})

test("profile editor exposes every public profile field, tag editing, links, and visibility", async () => {
  const profile = await source(profilePath)
  for (const field of [
    "nameZh", "nameEn", "summaryZh", "summaryEn", "descriptionZh", "descriptionEn",
    "researchAreas", "recruitmentZh", "recruitmentEn", "publicLinks", "visibility",
  ]) {
    assert.match(profile, new RegExp(field), `missing ${field}`)
  }
  assert.match(profile, /添加研究方向/)
  assert.match(profile, /添加公开链接/)
  assert.match(profile, /已公开|暂不公开/)
})

test("member manager keeps the leader fixed and offers accessible member up/down ordering", async () => {
  const members = await source(membersPath)
  assert.match(members, /负责人 · 固定首位/)
  assert.match(members, /aria-label=\{`上移/)
  assert.match(members, /aria-label=\{`下移/)
  assert.match(members, /ArrowUp/)
  assert.match(members, /ArrowDown/)
  assert.match(members, /onReorder/)
  assert.match(members, /添加成员/)
  assert.match(members, /移除/)
})

test("publication manager shows counts, retains hidden rows, and independently toggles visibility", async () => {
  const publications = await source(publicationsPath)
  assert.match(publications, /全部.*公开.*隐藏/s)
  assert.match(publications, /publications\.map/)
  assert.doesNotMatch(publications, /publications\.filter\([^)]*visible/)
  assert.match(publications, /显示在课题组主页/)
  assert.match(publications, /已隐藏/)
  assert.match(publications, /pendingPublicationId/)
  assert.match(publications, /relationSource/)
})

test("workspace uses existing AIA typography and tokens without card or shadow styling", async () => {
  const joined = (await Promise.all([pagePath, profilePath, membersPath, publicationsPath].map(source))).join("\n")
  assert.match(joined, /aia-serif/)
  assert.match(joined, /aia-mono/)
  assert.match(joined, /aia-border-rule/)
  assert.match(joined, /--aia-ink/)
  assert.doesNotMatch(joined, /shadow(?:-|\b)/)
  assert.doesNotMatch(joined, /rounded-(?:xl|2xl|3xl)/)
})

test("page renders explicit loading, unauthorized, and empty-group states", async () => {
  const page = await source(pagePath)
  assert.match(page, /正在加载课题组管理信息/)
  assert.match(page, /!roster\.canManage/)
  assert.match(page, /!roster\.group/)
  assert.match(page, /当前账号未绑定/)
})
