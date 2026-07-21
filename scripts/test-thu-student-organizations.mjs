import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync("src/app/about/page.tsx", "utf8")

for (const expected of [
  "通班文化建设委员会",
  "通班信息网络技术委员会",
  "清华通班学生组织的统筹与执行机构",
  "通班学术发展与科研实践",
  "通班科研成果",
  "通班小班主任制度",
  "aria-expanded",
  "ChevronDown",
]) {
  assert.ok(source.includes(expected), `Missing ${expected}`)
}

console.log("THU student organizations source checks passed")
