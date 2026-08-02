import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (file) => fs.readFileSync(path.join(projectRoot, file), "utf8")

const schemaSource = read("convex/schema.ts")
const backendSource = read("convex/academicExchange.ts")
const typesSource = read("src/types/index.ts")

const applicationTable = schemaSource.match(
  /academicExchangeSupportApplications:\s*defineTable\(\{([\s\S]*?)\n\s*\}\)\s*\n\s*\.index\("by_user_createdAt"/,
)?.[1]
assert.ok(applicationTable, "Academic-exchange application schema must remain discoverable")
assert.match(
  applicationTable,
  /pdfBrand:\s*v\.optional\(v\.union\(v\.literal\("tong_class"\),\s*v\.literal\("institute"\)\)\)/,
  "Applications must persist an optional, backward-compatible PDF brand snapshot",
)

const applicationType = typesSource.match(
  /export interface AcademicExchangeSupportApplication \{([\s\S]*?)\n\}/,
)?.[1]
assert.ok(applicationType, "Academic-exchange application TypeScript contract must remain discoverable")
assert.match(applicationType, /pdfBrand\?:\s*"tong_class"\s*\|\s*"institute"/)
assert.match(
  applicationType,
  /ownerIdentity\?:\s*\{\s*identityType\?:\s*UserIdentityType\s*\}/,
  "Historical reviewer projections need a narrow owner-identity fallback",
)

assert.match(
  backendSource,
  /\.query\("institutePeople"\)[\s\S]*?\.withIndex\("by_accountUserId"/,
  "Creation must prefer the linked institute-person identity",
)
assert.match(backendSource, /identityType\s*===\s*"undergrad"/)
assert.match(backendSource, /isClassMember/)
assert.match(backendSource, /cohort/)
assert.match(
  backendSource,
  /ctx\.db\.insert\("academicExchangeSupportApplications",\s*\{[\s\S]*?pdfBrand,/,
  "Creation must write the resolved snapshot",
)

const adminUpdate = backendSource.match(
  /export const updateApplicationForSuperAdmin[\s\S]*?export const deleteApplicationForSuperAdmin/,
)?.[0]
assert.ok(adminUpdate, "Super-admin update mutation must remain discoverable")
assert.doesNotMatch(
  adminUpdate,
  /pdfBrand\s*:/,
  "The brand snapshot is write-once and must not be editable by update mutations",
)

for (const queryName of [
  "listApplicationsForReviewer",
  "getApplicationForReviewer",
]) {
  const queryStart = backendSource.indexOf(`export const ${queryName}`)
  const queryEnd = backendSource.indexOf("\nexport const ", queryStart + 1)
  const queryBlock = queryStart >= 0
    ? backendSource.slice(queryStart, queryEnd >= 0 ? queryEnd : undefined)
    : ""
  assert.ok(queryBlock, `${queryName} must remain discoverable`)
  assert.match(
    queryBlock,
    /projectAcademicExchangeApplication/,
    `${queryName} must return a brand-safe projection for PDF/detail/export consumers`,
  )
}

assert.match(
  backendSource,
  /ownerIdentity:\s*\{\s*identityType(?:\s*:|\s*\})/,
  "Historical projections must return only the identity needed for deterministic brand fallback",
)
assert.match(
  backendSource,
  /pdfBrand:\s*application\.pdfBrand/,
  "Persisted snapshots must remain authoritative in projections",
)

console.log("Academic exchange backend brand source checks passed.")
