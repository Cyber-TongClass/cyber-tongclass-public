import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const contentModuleUrl = pathToFileURL(path.resolve("convex/instituteContent.ts")).href
const dtoModuleUrl = pathToFileURL(path.resolve("convex/lib/instituteDto.ts")).href
const content = await import(contentModuleUrl)
const dto = await import(dtoModuleUrl)

function assertFieldsAreAbsent(value, fields) {
  for (const field of fields) {
    assert.equal(Object.hasOwn(value, field), false, `${field} must not be in the public content DTO`)
  }
}

test("DOI normalization and explicit content mention keys are deterministic", () => {
  assert.equal(content.normalizeDoi("https://doi.org/10.1000/ABC.1"), "10.1000/abc.1")
  assert.equal(content.normalizeDoi(" DOI: 10.1000/ABC.1 "), "10.1000/abc.1")
  assert.equal(content.normalizeDoi("https://dx.doi.org/10.1000/ABC.1"), "10.1000/abc.1")
  assert.equal(content.normalizeDoi("not a DOI"), undefined)
  assert.equal(
    content.contentMentionNaturalKey("publication", "pub-1", "person", "person-1", "featured"),
    "publication:pub-1:person:person-1:featured",
  )
})

test("content mention relationship validation accepts only explicit target unions", () => {
  assert.deepEqual(
    content.validateContentMentionRelation({
      contentType: "publication",
      contentId: "pub-1",
      targetType: "researchGroup",
      targetId: "group-1",
      relation: "featured",
    }),
    {
      contentType: "publication",
      contentId: "pub-1",
      targetType: "researchGroup",
      targetId: "group-1",
      relation: "featured",
    },
  )
  assert.throws(
    () => content.validateContentMentionRelation({
      contentType: "note",
      contentId: "pub-1",
      targetType: "person",
      targetId: "person-1",
      relation: "featured",
    }),
    /INSTITUTE_CONTENT_MENTION_RELATION_INVALID/,
  )
})

test("public institute content DTOs allow-list research and update fields", () => {
  const research = dto.toPublicInstituteResearch({
    _id: "publications:1",
    _creationTime: 1,
    title: "Safe Research",
    authors: ["Private Author"],
    venue: "Conference",
    year: 2026,
    abstract: "Abstract",
    url: "https://example.edu/paper",
    doi: "10.1000/safe",
    category: "AI",
    subCategory: "ML",
    siteScope: "institute",
    visibility: "public",
    userId: "users:owner",
    createdAt: 1,
    updatedAt: 2,
  })
  const update = dto.toPublicInstituteUpdate({
    _id: "news:1",
    _creationTime: 1,
    title: "Safe Update",
    content: "Public body",
    sourceUrl: "https://example.edu/news",
    coverImageUrl: "https://example.edu/cover.png",
    homepageSubtitle: "Subtitle",
    category: "Announcement",
    publishedAt: 1_700_000_000_000,
    isPublished: true,
    siteScope: "institute",
    authorId: "users:author",
    authorName: "Internal Name",
    createdAt: 1,
    updatedAt: 2,
  })

  assert.deepEqual(research, {
    title: "Safe Research",
    authors: ["Private Author"],
    venue: "Conference",
    year: 2026,
    abstract: "Abstract",
    url: "https://example.edu/paper",
    doi: "10.1000/safe",
    category: "AI",
    subCategory: "ML",
  })
  assert.deepEqual(update, {
    title: "Safe Update",
    content: "Public body",
    sourceUrl: "https://example.edu/news",
    coverImageUrl: "https://example.edu/cover.png",
    homepageSubtitle: "Subtitle",
    category: "Announcement",
    publishedAt: 1_700_000_000_000,
  })
  assertFieldsAreAbsent(research, ["_id", "_creationTime", "userId", "siteScope", "visibility", "createdAt", "updatedAt"])
  assertFieldsAreAbsent(update, ["_id", "_creationTime", "authorId", "authorName", "isPublished", "siteScope", "createdAt", "updatedAt"])
})

test("institute content source uses explicit relations and DTO projections", () => {
  const source = readFileSync("convex/instituteContent.ts", "utf8")

  assert.match(source, /validateContentMentionRelation/)
  assert.match(source, /toPublicInstituteResearch/)
  assert.match(source, /toPublicInstituteUpdate/)
  assert.match(source, /record\.siteScope === "institute"/)
  assert.match(source, /record\.visibility === "public"/)
  assert.match(source, /record\.isPublished === true/)
  assert.doesNotMatch(source, /publication\.authors/)
  assert.doesNotMatch(source, /return\s+(?:publication|publications|news|updates)\s*[;,]/)
  assert.doesNotMatch(source, /\.includes\([^)]*name/i)
})

test("canonical public content hooks translate the UI group slug to the server contract", () => {
  const apiSource = readFileSync("src/lib/api.ts", "utf8")

  for (const hook of ["usePublicInstituteResearch", "usePublicInstituteUpdates"]) {
    const start = apiSource.indexOf(`export function ${hook}(`)
    assert.notEqual(start, -1, `${hook} should exist`)
    const end = apiSource.indexOf("export function ", start + 1)
    const block = apiSource.slice(start, end === -1 ? undefined : end)
    assert.match(block, /researchGroupSlug:\s*groupSlug/)
  }
})
