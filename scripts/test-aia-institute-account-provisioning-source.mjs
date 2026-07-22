import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const usersSource = await readFile("convex/users.ts", "utf8")
const newUserPage = await readFile("src/app/admin/users/new/page.tsx", "utf8")
const editUserPage = await readFile("src/app/admin/users/[id]/page.tsx", "utf8")
const dtoModuleUrl = pathToFileURL(path.resolve("convex/lib/userDto.ts")).href
const dto = await import(dtoModuleUrl)

function mutationBlock(name) {
  const marker = `export const ${name} = mutation({`
  const start = usersSource.indexOf(marker)
  assert.notEqual(start, -1, `${name} mutation is present`)
  const next = usersSource.indexOf("export const ", start + marker.length)
  return usersSource.slice(start, next === -1 ? undefined : next)
}

function user(overrides = {}) {
  return {
    email: "person@pku.edu.cn",
    username: "person",
    englishName: "Institute Person",
    chineseName: "研究院成员",
    role: "member",
    organization: "pku",
    cohort: 2026,
    studentId: "work-001",
    isEmailVerified: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

test("explicit institute identities default out of the Tong Class directory on create and identity changes", () => {
  const create = mutationBlock("create")
  const update = mutationBlock("update")

  assert.match(
    create,
    /const storedIdentityType = args\.identityType \?\? getDefaultStoredIdentityType\(requestedRole\)/,
    "create resolves the stored identity before computing visibility",
  )
  assert.match(
    create,
    /const defaultIsClassMember = \["graduate", "teacher", "other"\]\.includes\(storedIdentityType \?\? ""\) \? false : true/,
    "graduate, teacher, and other accounts default out of Tong Class",
  )
  assert.match(
    create,
    /isClassMember: args\.isClassMember \?\? defaultIsClassMember/,
    "a super-admin can explicitly opt an institute account into Tong Class",
  )
  assert.match(
    update,
    /const defaultIsClassMember = \["graduate", "teacher", "other"\]\.includes\(requestedIdentityType \?\? ""\) \? false : undefined/,
    "changing an account to an institute identity applies the safe directory default",
  )
  assert.match(
    update,
    /isClassMember: updates\.isClassMember \?\? defaultIsClassMember/,
    "an explicit update visibility choice wins over the default",
  )
  assert.match(
    create,
    /assertCanAssignUserIdentityType\(actor\.role\)/,
    "the server keeps super-admin-only identity assignment",
  )
  assert.match(
    update,
    /assertCanAssignUserIdentityType\(actor\.role\)/,
    "the server keeps super-admin-only identity changes",
  )
})

test("current and admin DTOs expose valid institute identities without leaking them publicly", () => {
  const teacher = user({ identityType: "teacher" })
  const graduate = user({ identityType: "graduate" })

  assert.equal(dto.toCurrentUserDto(teacher).identityType, "teacher")
  assert.equal(dto.toAdminUserDto(graduate).identityType, "graduate")
  assert.equal(Object.hasOwn(dto.toPublicTongClassMemberDto(teacher), "identityType"), false)
})

test("only the super-admin account screens submit institute identity and class-member visibility", () => {
  for (const [name, source] of [["new-user", newUserPage], ["edit-user", editUserPage]]) {
    assert.match(source, /useAuth\(\)/, `${name} page reads the authenticated role`)
    assert.match(source, /isSuperAdmin/, `${name} page gates institute account controls`)
    assert.match(source, /账号 ID（学号 \/ 工号）/, `${name} page labels the shared account identifier correctly`)
    assert.match(source, /研究院身份组/, `${name} page exposes the institute identity selector`)
    assert.match(source, /通班成员目录/, `${name} page exposes class-directory visibility`)
    assert.match(
      source,
      /\.\.\.\(isSuperAdmin \? \{[\s\S]*identityType[\s\S]*isClassMember[\s\S]*\} : \{\}\)/,
      `${name} page omits institute controls from ordinary-admin mutation payloads`,
    )
  }
})
