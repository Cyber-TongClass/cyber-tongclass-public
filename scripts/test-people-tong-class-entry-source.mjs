import assert from "node:assert/strict"
import fs from "node:fs"

const peoplePage = fs.readFileSync("src/app/people/page.tsx", "utf8")
const homePage = fs.readFileSync("src/components/institute/aia-home.tsx", "utf8")

assert.doesNotMatch(peoplePage, /<TongClassPeopleBand/)
assert.match(peoplePage, /<AiaSectionHeading/)
assert.match(peoplePage, /kicker="通班 · Tong Class"/)
assert.match(peoplePage, /title="通班人员"/)
assert.match(peoplePage, /description="来自通班的公开成员名录，在此优先呈现。"/)
assert.match(peoplePage, /href="\/tong-class\/members"/)
assert.match(peoplePage, /hrefLabel="通班成员目录"/)
assert.doesNotMatch(homePage, /<TongClassPeopleBand/)
assert.match(homePage, /<HomeLiveUpdates\s*\/>/)

console.log("People page Tong Class entry-only contract passed")
