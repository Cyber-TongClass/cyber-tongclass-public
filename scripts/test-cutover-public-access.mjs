import assert from "node:assert/strict"
import fs from "node:fs"

const api = fs.readFileSync("src/lib/api.ts", "utf8")
const members = fs.readFileSync("src/app/members/members-list.tsx", "utf8")
const page = fs.readFileSync("src/app/members/page.tsx", "utf8")
const search = fs.readFileSync("src/app/search/page.tsx", "utf8")
const courses = fs.readFileSync("src/components/courses/course-directory-page.tsx", "utf8")

assert.match(api, /users:listPublicTongClassMembers/)
assert.match(api, /users:getPublicTongClassMemberBySlug/)
assert.match(api, /users:listTongClassDirectoryMembers/)
assert.match(api, /export function useAdminUsers[\s\S]*api\.users\.list[\s\S]*sessionToken/)
assert.match(api, /export function useUsersCount[\s\S]*useUsers\(\{ \.\.\.args, limit: 1000 \}\)/)
assert.match(api, /api\.courses\.list[\s\S]*sessionToken/)
assert.match(api, /api\.publications\.listByUser[\s\S]*sessionToken/)
assert.match(api, /normalized\?\.courseName && sessionToken \? \(\{ \.\.\.normalized, sessionToken \} as any\) : "skip"/)
assert.match(api, /export function useCourseListWithReviews\(\)[\s\S]*sessionToken \? \{ sessionToken \} : "skip"/)
assert.match(api, /export function useCommonReviewTags\(\)[\s\S]*sessionToken \? \{ sessionToken \} : "skip"/)
assert.doesNotMatch(members, /\.filter\(.*role/)
assert.match(api, /classMembersOnly: _classMembersOnly/)
assert.match(page, /useUsers\(\{ limit: 1000, classMembersOnly: true \}\)/)
assert.match(search, /useCourses\(\{\}\)/)
assert.match(courses, /useCourses\(\)/)

console.log("cutover public access contract passed")
