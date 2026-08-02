import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import path from "node:path"
import { pathToFileURL } from "node:url"

const forms = await import(pathToFileURL(path.resolve("src/lib/oa-forms.ts")).href)
const pickerSource = readFileSync("src/components/oa/oa-scope-picker.tsx", "utf8")
const scopeAuthorizationSource = readFileSync("convex/lib/oaScopeAuthorization.ts", "utf8")
const userGroupsSource = readFileSync("convex/userGroups.ts", "utf8")
const oaFormsSource = readFileSync("convex/oaForms.ts", "utf8")
const apiSource = readFileSync("src/lib/api.ts", "utf8")
const typesSource = readFileSync("src/types/index.ts", "utf8")

test("ordinary-user workflow roles survive normalization and remain selectable", () => {
  assert.deepEqual(forms.normalizeOAUserScope({ roles: ["member"] }), { roles: ["member"] })
  assert.match(pickerSource, /value:\s*"member",\s*label:\s*"普通用户"/)
  assert.match(scopeAuthorizationSource, /type OAScopeRole = "member" \| "admin" \| "super_admin"/)
  assert.match(scopeAuthorizationSource, /OA_WORKFLOW_ROLES[^=]*=\s*\["member",\s*"admin",\s*"super_admin"\]/)
})

test("destructive mutations protect user-group and fill-form references", () => {
  assert.match(userGroupsSource, /assertUserGroupIsUnreferenced/)
  assert.match(userGroupsSource, /workflowDefinitionSnapshot/)
  assert.match(userGroupsSource, /query\("contentSubmissions"\)/)
  assert.match(
    userGroupsSource,
    /await assertUserGroupIsUnreferenced\(ctx,\s*args\.groupId\)[\s\S]*?ctx\.db\.delete\(args\.groupId\)/,
  )

  assert.match(oaFormsSource, /assertFormIsNotFillTarget/)
  assert.match(oaFormsSource, /workflowDefinitionSnapshot/)
  assert.match(oaFormsSource, /query\("oaFormAccessGrants"\)/)
  assert.equal(
    [...oaFormsSource.matchAll(/await assertFormIsNotFillTarget\(ctx,\s*args\.id\)/g)].length,
    3,
  )
})

test("canonical client DTOs include workflow relationship fields", () => {
  assert.match(apiSource, /export type ContentSubmission[\s\S]*?tasks\?: Array<[\s\S]*?myTaskId\?: string/)
  assert.match(typesSource, /interface AcademicExchangeSupportApplication[\s\S]*?oaSubmissionId\?: string/)
})

test("the development-only font preview is not published", () => {
  assert.equal(existsSync("public/fonts/aia/preview.html"), false)
})
