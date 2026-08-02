import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const read = (file) => {
  const path = resolve(root, file)
  assert.ok(existsSync(path), `Expected ${file} to exist`)
  return readFileSync(path, "utf8")
}

const guard = read("src/components/class-work/class-work-access-guard.tsx")
assert.match(guard, /useAuth/)
assert.match(guard, /useMyContentPermissions/)
assert.match(guard, /正在确认班级工作权限/)
assert.match(guard, /你没有\{action\}\{categoryLabels\[category\]\}的权限/)
assert.doesNotMatch(guard, /role\s*===\s*["']admin["']/)

const routes = [
  ["news", "new", "create", "ContentSubmissionEditor"],
  ["news", "manage", "manage", "ContentReviewDesk"],
  ["events", "new", "create", "ContentSubmissionEditor"],
  ["events", "manage", "manage", "ContentReviewDesk"],
]

for (const [category, route, capability, component] of routes) {
  const source = read(`src/app/class-work/${category}/${route}/page.tsx`)
  assert.match(source, new RegExp(`<ClassWorkAccessGuard[\\s\\S]*category=["']${category}["'][\\s\\S]*capability=["']${capability}["']`))
  assert.match(source, new RegExp(`<${component}`))
  assert.doesNotMatch(source, /from\s+["']convex/)
}

for (const category of ["news", "events"]) {
  const source = read(`src/app/class-work/${category}/submissions/[id]/page.tsx`)
  assert.match(source, /<ClassWorkAccessGuard/)
  assert.match(source, /capability=["']either["']/)
  assert.match(source, /<ContentSubmissionDetail/)
  assert.match(source, /await params/)
}

console.log("AIA class-work portal source checks passed.")
