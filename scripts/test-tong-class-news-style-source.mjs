import assert from "node:assert/strict"
import fs from "node:fs"

const tongPage = fs.readFileSync("src/app/tong-class/news/page.tsx", "utf8")
const updatesPage = fs.readFileSync("src/app/updates/page.tsx", "utf8")
const tongTimelinePath = "src/components/content/tong-class-news-timeline.tsx"

assert.match(tongPage, /TongClassNewsTimeline/)
assert.doesNotMatch(tongPage, /<NewsTimeline(?:\s|>)/)
assert.match(updatesPage, /<NewsTimeline(?:\s|>)/)
assert.equal(fs.existsSync(tongTimelinePath), true)

const tongTimeline = fs.readFileSync(tongTimelinePath, "utf8")
assert.match(tongTimeline, /bg-primary/)
assert.match(tongTimeline, /groupedNews/)
assert.match(tongTimeline, /sortedMonths/)
assert.match(tongTimeline, /hover:border-primary/)
assert.doesNotMatch(tongTimeline, /--aia-red/)

console.log("Tong Class news timeline style contract passed")
