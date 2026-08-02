import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const read = (file) => readFileSync(resolve(root, file), "utf8")

const list = read("src/components/reimbursements/academic-exchange-list-client.tsx")
const form = read("src/components/reimbursements/academic-exchange-form-client.tsx")
const detail = read("src/components/reimbursements/academic-exchange-detail-client.tsx")
const edit = read("src/components/reimbursements/academic-exchange-edit-client.tsx")
const clients = [list, form, detail, edit]

for (const [index, source] of clients.entries()) {
  assert.match(source, /useAuth\(\)/, `client ${index + 1} must resolve the current AIA identity`)
  assert.match(source, /AiaOAAuthLoading/, `client ${index + 1} must hold rendering while auth resolves`)
  assert.match(source, /AiaOALoginRequired/, `client ${index + 1} must reject anonymous access`)
  assert.doesNotMatch(source, /isStudentIdAllowed|role\s*===|isAdmin|isSuperAdmin/, `client ${index + 1} must not restrict authenticated identities by cohort or role`)
  assert.match(source, /aia-serif|aia-mono|aia-text-muted|aia-border-rule/, `client ${index + 1} must use the existing AIA typography/tokens`)
}

assert.match(list, /\/services\/oa\/reimbursements\/academic-exchange\/new/)
assert.match(list, /\/services\/oa\/reimbursements\/academic-exchange\/\$\{application\._id\}/)
assert.ok(form.includes("router.push(`/services/oa/reimbursements/academic-exchange/${id}`)"))
assert.ok(detail.includes('href="/services/oa/reimbursements/academic-exchange"'))
assert.doesNotMatch(clients.join("\n"), /\/tong-class\/intranet\/reimbursements\/academic-exchange/)

const routeExpectations = [
  ["src/app/services/oa/reimbursements/academic-exchange/page.tsx", "AcademicExchangeListClient"],
  ["src/app/services/oa/reimbursements/academic-exchange/new/page.tsx", "AcademicExchangeFormClient"],
  ["src/app/services/oa/reimbursements/academic-exchange/[id]/page.tsx", "AcademicExchangeDetailClient"],
  ["src/app/services/oa/reimbursements/academic-exchange/[id]/edit/page.tsx", "AcademicExchangeEditClient"],
]
for (const [file, component] of routeExpectations) {
  const source = read(file)
  assert.match(source, new RegExp(component), `${file} must render ${component}`)
  assert.match(source, /robots:\s*\{\s*index:\s*false/, `${file} must remain private in search metadata`)
}

const resourceRouteExpectations = [
  "src/app/services/oa/materials/[slug]/page.tsx",
  "src/app/services/oa/tables/[slug]/page.tsx",
]
for (const file of resourceRouteExpectations) {
  const source = read(file)
  assert.match(source, /tong-class\/intranet\/reimbursements/, `${file} must preserve the existing reimbursement resource implementation`)
}

const legacyExpectations = [
  ["src/app/tong-class/intranet/reimbursements/academic-exchange/page.tsx", "/services/oa/reimbursements/academic-exchange"],
  ["src/app/tong-class/intranet/reimbursements/academic-exchange/new/page.tsx", "/services/oa/reimbursements/academic-exchange/new"],
  ["src/app/tong-class/intranet/reimbursements/academic-exchange/[id]/page.tsx", "/services/oa/reimbursements/academic-exchange/${id}"],
  ["src/app/tong-class/intranet/reimbursements/academic-exchange/[id]/edit/page.tsx", "/services/oa/reimbursements/academic-exchange/${id}/edit"],
]
for (const [file, target] of legacyExpectations) {
  const source = read(file)
  assert.match(source, /redirect\(/, `${file} must preserve the legacy URL with a redirect`)
  assert.ok(source.includes(target), `${file} must redirect to ${target}`)
}

console.log("AIA academic-exchange access source contract passed.")
