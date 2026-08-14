import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("form management skips its restricted list query for unauthorized members", () => {
  const page = readFileSync("src/app/forms/manage/page.tsx", "utf8")
  const api = readFileSync("src/lib/api.ts", "utf8")

  assert.match(page, /const canAccessFormManagement =/)
  assert.match(page, /useManageOAForms\(canAccessFormManagement\)/)
  assert.match(api, /export function useManageOAForms\(enabled = true\)/)
})

test("teacher recognition skips teacher-only history for non-teachers", () => {
  const workspace = readFileSync("src/components/teacher-recognition/teacher-recognition-workspace.tsx", "utf8")
  const api = readFileSync("src/lib/api.ts", "utf8")

  assert.match(workspace, /useMyTeacherRecognitions\(access\?\.isTeacher === true\)/)
  assert.match(api, /export function useMyTeacherRecognitions\(enabled = true\)/)
})

test("TechDay author and news desks skip restricted queries until their roles are confirmed", () => {
  const authorPage = readFileSync("src/app/techday/author/profile/page.tsx", "utf8")
  const authorEditPage = readFileSync("src/app/techday/author/submissions/[id]/edit/page.tsx", "utf8")
  const awardsPage = readFileSync("src/app/techday/awards/page.tsx", "utf8")
  const newsPage = readFileSync("src/app/techday/news/manage/page.tsx", "utf8")
  const newsEditPage = readFileSync("src/app/techday/news/editor/[slug]/page.tsx", "utf8")
  const api = readFileSync("src/lib/api.ts", "utf8")

  assert.match(authorPage, /const canAccessAuthorTools =/)
  assert.match(authorPage, /useMyTechDaySubmissions\(canAccessAuthorTools \? actorArgs : null\)/)
  assert.match(authorEditPage, /useTechDaySubmissionById\(params\.id, canAccessAuthorTools \? actorArgs : null\)/)
  assert.match(awardsPage, /useTechDayAwardSubmissions\(canReviewAwards \? \{ \.\.\.actorArgs,/)
  assert.match(newsPage, /const canManageNews =/)
  assert.match(newsPage, /useManageTechDayPosts\(canManageNews \? actorArgs : null\)/)
  assert.match(newsPage, /useExportTechDayPosts\(canManageNews \? actorArgs : null\)/)
  assert.match(newsEditPage, /useTechDayPostBySlug\(params\.slug, canManageNews \? actorArgs : null\)/)
  assert.match(api, /export function useTechDaySubmissionById\(id\?: string \| null, args\?: TechDayActorArgs \| null\)/)
  assert.match(api, /export function useMyTechDaySubmissions\(args\?: TechDayActorArgs \| null\)/)
  assert.match(api, /export function useTechDayAwardSubmissions\(args\?: \(TechDayActorArgs & \{/)
  assert.match(api, /\}\) \| null\) \{\s*return useQuery\(techdayApi\.techday\.awards\.listAwardSubmissions, args === null \? "skip"/)
  assert.match(api, /export function useTechDayPostBySlug\(slug\?: string \| null, args\?: TechDayActorArgs \| null\)/)
  assert.match(api, /export function useManageTechDayPosts\(args\?: TechDayActorArgs \| null\)/)
})
