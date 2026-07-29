import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(path, "utf8")

function exportedBlock(source, name) {
  const start = source.indexOf(`export const ${name} =`)
  assert.notEqual(start, -1, `Expected export ${name}`)
  const next = source.indexOf("\nexport const ", start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

test("course review reads and writes enforce the main-site session boundary", () => {
  const source = read("convex/courseReviews.ts")

  assert.match(source, /getUserBySession/)
  assert.match(source, /requireContentAdmin/)
  assert.doesNotMatch(exportedBlock(source, "create"), /authorId:\s*v\.optional/)

  for (const name of [
    "listByCourse",
    "listByCourseAll",
    "listPending",
    "listCourses",
    "create",
    "update",
    "approve",
    "reject",
    "remove",
    "assignByTags",
    "listTags",
    "setTagColor",
    "editTag",
    "updateCourseName",
  ]) {
    assert.match(exportedBlock(source, name), /sessionToken:\s*v\.string\(\)/, `${name} must require a session`)
    assert.match(exportedBlock(source, name), /getUserBySession/, `${name} must resolve the actor server-side`)
  }

  for (const name of [
    "listByCourseAll",
    "listPending",
    "approve",
    "reject",
    "assignByTags",
    "setTagColor",
    "editTag",
    "updateCourseName",
  ]) {
    assert.match(exportedBlock(source, name), /requireContentAdmin/, `${name} must require an administrator`)
  }
})

test("course reads stay behind the login boundary and all course writes require an administrator", () => {
  const source = read("convex/courses.ts")

  for (const name of ["list", "getById", "getByName", "count", "search"]) {
    assert.match(exportedBlock(source, name), /sessionToken:\s*v\.string\(\)/, `${name} must require a session`)
    assert.match(exportedBlock(source, name), /getUserBySession/, `${name} must resolve the actor`)
  }

  for (const name of ["create", "update", "updateReviewStats", "remove"]) {
    assert.match(exportedBlock(source, name), /requireContentAdmin/, `${name} must require an administrator`)
  }
})

test("internal materials are not shipped as public static files", () => {
  const publicDirectory = "public/intranet-materials"
  const publicFiles = existsSync(publicDirectory)
    ? readdirSync(publicDirectory).filter((name) => !name.startsWith("."))
    : []

  assert.deepEqual(publicFiles, [])
  assert.ok(existsSync("src/app/api/intranet-materials/[name]/route.ts"))
  assert.match(read("src/app/tong-class/intranet/materials/page.tsx"), /\/api\/intranet-materials\//)
})

test("the container health endpoint and CI release gate exist", () => {
  assert.ok(existsSync("src/app/api/health/route.ts"))
  assert.ok(existsSync(".github/workflows/ci-cd.yml"))
  assert.match(read("Dockerfile"), /\/api\/health/)
  assert.match(read(".github/workflows/ci-cd.yml"), /npm run lint/)
  assert.match(read(".github/workflows/ci-cd.yml"), /npm run build/)
})
