import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("AIA login presents the institute platform identity without a public registration path", () => {
  const source = readFileSync("src/app/login/page.tsx", "utf8")

  assert.match(source, /北京大学人工智能研究院综合服务系统/)
  assert.match(source, /Artificial Intelligence Agora/)
  assert.doesNotMatch(source, /Tong Class Official Website/)
  assert.doesNotMatch(source, /href=["']\/register/)
})
