import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const output = mkdtempSync(path.join(tmpdir(), "oa-document-review-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/server/oa-document-review.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(output, "review.js")}`,
])
const require = createRequire(import.meta.url)
const review = require(path.join(output, "review.js"))

const visual = { page: 1, x: 0.1, y: 0.2, width: 0.2, height: 0.05, pageWidth: 600, pageHeight: 800, rotation: 0, coordinateSpace: "normalized-pdf" }
const candidate = {
  id: "binding_canonical_1", label: "姓名", description: "table_cell · table-cell",
  partName: "word/document.xml", path: "/document[1]/body[1]/tbl[1]/tr[1]/tc[2]", contextHash: "0123456789abcdef",
  writeTarget: "table-cell", styleSourcePath: "/document[1]/body[1]/tbl[1]/tr[1]/tc[2]", visual,
}
const suggestion = {
  id: "region_name", kind: "table_cell", label: "姓名", inferredAnswerType: "text", confidence: "high",
  reviewState: "unresolved", evidence: ["fixture"], conflictIds: [], fieldId: "field_name_1234",
  partName: candidate.partName, path: candidate.path, contextHash: candidate.contextHash,
  visual, bindingCandidateIds: [candidate.id],
}
const manifest = { syntaxVersion: 2, compilerVersion: "test", suggestions: [suggestion], fields: [], anchors: [] }
const layout = { syntaxVersion: 1, sourceSha256: "a".repeat(64), analyzerVersion: "test", pages: [{ page: 1, width: 600, height: 800, rotation: 0 }], textBoxes: [], candidates: [candidate] }

test("rebuilds a confirmed field and dual anchor only from the canonical bundle candidate", () => {
  const rebuilt = review.buildReviewedManifest(manifest, layout, [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "申请人姓名", inferredAnswerType: "text",
    required: true, placeholder: "请输入证件上的姓名", visual: { ...visual, x: 0.15 }, bindingCandidateId: candidate.id,
  }])
  assert.deepEqual(rebuilt.fields, [{ fieldId: suggestion.fieldId, label: "申请人姓名", answerType: "text", required: true, placeholder: "请输入证件上的姓名" }])
  assert.equal(rebuilt.suggestions[0].placeholder, "请输入证件上的姓名")
  assert.equal(rebuilt.anchors[0].partName, candidate.partName)
  assert.equal(rebuilt.anchors[0].path, candidate.path)
  assert.equal(rebuilt.anchors[0].structural.contextHash, candidate.contextHash)
  assert.equal(rebuilt.anchors[0].bindingCandidateId, candidate.id)
  assert.equal(rebuilt.suggestions[0].bindingCandidateIds[0], candidate.id)
})

test("accepts a bounded manual placeholder and clears it without deriving Word text", () => {
  const parsed = review.parseReviewEdits({ edits: [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text",
    placeholder: "  请输入姓名  ", visual, bindingCandidateId: candidate.id,
  }] })
  assert.equal(parsed[0].placeholder, "请输入姓名")

  const confirmed = review.buildReviewedManifest(manifest, layout, parsed)
  const cleared = review.buildReviewedManifest(confirmed, layout, [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text",
    placeholder: "", visual, bindingCandidateId: candidate.id,
  }])
  assert.equal(cleared.suggestions[0].placeholder, undefined)
  assert.equal(cleared.fields[0].placeholder, undefined)
  assert.throws(() => review.parseReviewEdits({ edits: [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text",
    placeholder: "x".repeat(501), visual, bindingCandidateId: candidate.id,
  }] }), /提示文字/)
})

test("requires positive same-page overlap for every confirmed candidate", () => {
  assert.throws(() => review.buildReviewedManifest(manifest, layout, [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text",
    visual: { ...visual, x: 0.8 }, bindingCandidateId: candidate.id,
  }]), (error) => error.code === "BINDING_REQUIRED" && error.status === 409)
  assert.throws(() => review.buildReviewedManifest(manifest, layout, [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text",
    visual: { ...visual, page: 2 }, bindingCandidateId: candidate.id,
  }]), (error) => error.code === "BINDING_REQUIRED")
  assert.throws(() => review.buildReviewedManifest(manifest, layout, [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text", visual,
  }]), (error) => error.code === "BINDING_REQUIRED")
})

test("rejects unknown candidates and all browser-supplied structural locator keys", () => {
  assert.throws(() => review.parseReviewEdits({ edits: [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text", visual,
    bindingCandidateId: "binding_unknown", partName: "word/evil.xml",
  }] }), (error) => error.status === 422)
  assert.throws(() => review.parseReviewEdits({ edits: [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text", visual,
    bindingCandidateId: candidate.id, contextHash: candidate.contextHash,
  }] }), /不允许|字段/)
})

test("ignored and deleted edits remove their field and anchor", () => {
  const confirmed = review.buildReviewedManifest(manifest, layout, [{
    suggestionId: suggestion.id, reviewState: "confirmed", label: "姓名", inferredAnswerType: "text", visual,
    bindingCandidateId: candidate.id,
  }])
  for (const reviewState of ["ignored", "deleted"]) {
    const rebuilt = review.buildReviewedManifest(confirmed, layout, [{
      suggestionId: suggestion.id, reviewState, label: "姓名", inferredAnswerType: "text",
    }])
    assert.equal(rebuilt.fields.length, 0)
    assert.equal(rebuilt.anchors.length, 0)
    assert.equal(rebuilt.suggestions[0].reviewState, reviewState)
  }
})

test("creates a canonical server-side suggestion for a newly drawn confirmed region", () => {
  const rebuilt = review.buildReviewedManifest(manifest, layout, [{
    suggestionId: "drawn_1723456789_1", reviewState: "confirmed", label: "补充说明", inferredAnswerType: "textarea",
    visual, bindingCandidateId: candidate.id,
  }])
  const drawn = rebuilt.suggestions.find((item) => item.id === "drawn_1723456789_1")
  assert.ok(drawn)
  assert.equal(drawn.partName, candidate.partName)
  assert.equal(drawn.path, candidate.path)
  assert.deepEqual(drawn.bindingCandidateIds, [candidate.id])
  assert.equal(rebuilt.fields.at(-1).label, "补充说明")
  assert.equal(rebuilt.anchors.at(-1).bindingCandidateId, candidate.id)
})

test("accepts a drawn visual region only through a server-issued overlapping candidate", () => {
  const rebuilt = review.buildReviewedManifest(manifest, layout, [{
    suggestionId: "drawn_123_1", reviewState: "confirmed", label: "新增字段", inferredAnswerType: "text",
    visual, bindingCandidateId: candidate.id,
  }])
  const added = rebuilt.suggestions.find((item) => item.id === "drawn_123_1")
  assert.equal(added.reviewState, "confirmed")
  assert.equal(added.partName, candidate.partName)
  assert.equal(added.bindingCandidateIds[0], candidate.id)
  assert.equal(rebuilt.anchors.at(-1).structural.path, candidate.path)
  assert.throws(() => review.buildReviewedManifest(manifest, layout, [{
    suggestionId: "invented", reviewState: "confirmed", label: "越权字段", inferredAnswerType: "text",
    visual, bindingCandidateId: candidate.id,
  }]), (error) => error.code === "INVALID_REVIEW")
})
