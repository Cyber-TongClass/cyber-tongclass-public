import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const outputDirectory = mkdtempSync(path.join(tmpdir(), "oa-candidate-binding-"))
const outfile = path.join(outputDirectory, "binding.cjs")
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/oa-document-candidate-binding.ts"),
  "--bundle",
  "--platform=node",
  "--format=cjs",
  `--outfile=${outfile}`,
])
const require = createRequire(import.meta.url)
const { resolveDocumentCandidateBindings } = require(outfile)

const visual = (page, x) => ({
  page,
  x,
  y: 0.2,
  width: 0.1,
  height: 0.05,
  pageWidth: 595,
  pageHeight: 842,
  rotation: 0,
  coordinateSpace: "normalized-pdf",
})

const candidate = (id, label, page, x) => ({ id, label, visual: visual(page, x) })
const suggestion = (id, label, overrides = {}) => ({ id, label, ...overrides })

test.after(() => rmSync(outputDirectory, { recursive: true, force: true }))

test("uses server-issued explicit bindings before safe label fallback", () => {
  const candidates = [candidate("c_name", "姓名", 1, 0.2), candidate("c_email", "邮箱", 1, 0.5)]
  assert.deepEqual(resolveDocumentCandidateBindings([
    suggestion("s_name", "姓名", { bindingCandidateIds: ["c_name"] }),
    suggestion("s_email", " 邮 箱 "),
  ], candidates), { s_name: "c_name", s_email: "c_email" })
})

test("does not assign one candidate to duplicate suggestions", () => {
  const candidates = [candidate("c_name", "姓名", 1, 0.2)]
  assert.deepEqual(resolveDocumentCandidateBindings([
    suggestion("s_name_1", "姓名"),
    suggestion("s_name_2", "姓 名"),
  ], candidates), {})
})

test("keeps an explicit claim and blocks a lower-priority competing label fallback", () => {
  const candidates = [candidate("c_name", "姓名", 1, 0.2)]
  assert.deepEqual(resolveDocumentCandidateBindings([
    suggestion("s_explicit", "候选人", { bindingCandidateIds: ["c_name"] }),
    suggestion("s_fallback", "姓名"),
  ], candidates), { s_explicit: "c_name" })
})

test("ignored and deleted suggestions release candidates for active review", () => {
  const candidates = [candidate("c_name", "姓名", 1, 0.2)]
  assert.deepEqual(resolveDocumentCandidateBindings([
    suggestion("s_ignored", "姓名", { reviewState: "ignored", bindingCandidateIds: ["c_name"] }),
    suggestion("s_active", "姓名"),
  ], candidates), { s_active: "c_name" })
  assert.deepEqual(resolveDocumentCandidateBindings([
    suggestion("s_deleted", "姓名", { reviewState: "deleted", bindingCandidateIds: ["c_name"] }),
    suggestion("s_active", "姓名"),
  ], candidates), { s_active: "c_name" })
})

test("accepts only unique positive-overlap matches", () => {
  const candidates = [candidate("c_one", "候选一", 1, 0.2), candidate("c_two", "候选二", 1, 0.6)]
  assert.deepEqual(resolveDocumentCandidateBindings([
    suggestion("s_one", "任意标签", { visual: visual(1, 0.21) }),
  ], candidates), { s_one: "c_one" })
  assert.deepEqual(resolveDocumentCandidateBindings([
    suggestion("s_wide", "任意标签", { visual: { ...visual(1, 0.1), width: 0.7 } }),
  ], candidates), {})
})
