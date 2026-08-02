import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (file) => readFileSync(file, "utf8")
const form = read("src/components/reimbursements/academic-exchange-form-client.tsx")
const detail = read("src/components/reimbursements/academic-exchange-detail-client.tsx")
const download = read("src/lib/academic-exchange.ts")

test("new applications disclose the identity-derived PDF title", () => {
  assert.match(form, /resolveAcademicExchangeBrand/)
  assert.match(form, /getAcademicExchangeBrandTitle/)
  assert.match(form, /currentUser/)
  assert.match(form, /申请表抬头/)
})

test("saved applications disclose their persisted PDF brand", () => {
  assert.match(detail, /resolveAcademicExchangeBrand\(application\)/)
  assert.match(detail, /getAcademicExchangeBrandTitle/)
  assert.match(detail, /PDF 抬头/)
})

test("browser downloads honor the server-provided brand-aware filename", () => {
  assert.match(download, /parseAcademicExchangePdfContentDisposition/)
  assert.match(download, /response\.headers\.get\("content-disposition"\)/)
  assert.doesNotMatch(download, /anchor\.download\s*=\s*`通班/)
})
