import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (
        error?.code === "ERR_MODULE_NOT_FOUND"
        && /^\.{1,2}\//.test(specifier)
        && !/\.[cm]?[jt]sx?$/.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context)
      }
      throw error
    }
  },
})

function source(filePath) {
  return readFileSync(filePath, "utf8")
}

function createDb() {
  const records = {
    publications: [
      {
        _id: "pub-public",
        _creationTime: 1,
        title: "Public research",
        authors: ["Public Author"],
        venue: "SafeConf",
        year: 2026,
        abstract: "Public abstract",
        url: "https://example.edu/research",
        doi: "10.1000/public",
        category: "AI",
        subCategory: "Safety",
        visibility: "public",
        siteScope: "tong_class",
        userId: "user-owner",
        createdAt: 1,
        updatedAt: 2,
      },
      {
        _id: "pub-hidden",
        _creationTime: 2,
        title: "Hidden research",
        authors: ["Private Author"],
        venue: "PrivateConf",
        year: 2026,
        abstract: "Private abstract",
        category: "AI",
        visibility: "hidden",
        userId: "user-owner",
      },
    ],
    news: [
      {
        _id: "news-public",
        _creationTime: 3,
        title: "Public update",
        content: "Public body",
        sourceUrl: "https://example.edu/update",
        coverImageUrl: "https://example.edu/cover.png",
        homepageSubtitle: "Public subtitle",
        category: "Announcement",
        publishedAt: 1_700_000_000_000,
        isPublished: true,
        siteScope: "institute",
        authorId: "user-undergrad",
        authorName: "Private author field",
        createdAt: 1,
        updatedAt: 2,
      },
      {
        _id: "news-draft",
        _creationTime: 4,
        title: "Draft update",
        content: "Private body",
        category: "Announcement",
        publishedAt: 1_700_000_000_001,
        isPublished: false,
        authorId: "user-undergrad",
      },
    ],
    institutePeople: [
      {
        _id: "person-public",
        visibility: "public",
        slug: "public-person",
        kind: "teacher",
        nameZh: "公开教师",
        nameEn: "Public Person",
        titleZh: "教授",
        titleEn: "Professor",
        researchAreas: ["Safety"],
        publicLinks: [],
        publicEmail: "private@example.edu",
        accountUserId: "user-graduate",
        isDemo: false,
      },
    ],
    researchGroups: [
      {
        _id: "group-public",
        visibility: "public",
        slug: "safe-group",
        nameZh: "安全组",
        nameEn: "Safety Group",
        summaryZh: "Should not leak through a reference",
        researchAreas: ["Safety"],
        publicLinks: [],
        isDemo: false,
      },
    ],
    users: [
      { _id: "user-owner", identityType: "other", role: "member" },
      { _id: "user-graduate", identityType: "graduate", role: "member" },
      { _id: "user-undergrad", identityType: "undergrad", role: "member" },
    ],
    publicationAuthorships: [
      { _id: "authorship-1", publicationId: "pub-public", personId: "person-public" },
    ],
    contentMentions: [
      {
        _id: "mention-person",
        contentType: "publication",
        contentId: "pub-public",
        targetType: "person",
        targetId: "person-public",
        relation: "featured",
        sortOrder: 0,
      },
      {
        _id: "mention-group",
        contentType: "publication",
        contentId: "pub-public",
        targetType: "researchGroup",
        targetId: "group-public",
        relation: "related",
        sortOrder: 1,
      },
      {
        _id: "mention-news-person",
        contentType: "news",
        contentId: "news-public",
        targetType: "person",
        targetId: "person-public",
        relation: "contributor",
        sortOrder: 0,
      },
    ],
  }

  const allRecords = Object.values(records).flat()

  return {
    normalizeId(table, id) {
      if (id === "malformed-id") throw new Error("Malformed Convex ID")
      return records[table]?.some((record) => String(record._id) === id) ? id : null
    },
    async get(id) {
      return allRecords.find((record) => String(record._id) === String(id)) ?? null
    },
    query(table) {
      let filters = []
      const builder = {
        withIndex(_indexName, configure) {
          const index = {
            eq(field, value) {
              filters.push([field, value])
              return index
            },
          }
          configure(index)
          return builder
        },
        async collect() {
          return (records[table] ?? []).filter((record) => (
            filters.every(([field, value]) => record[field] === value)
          ))
        },
      }
      return builder
    },
  }
}

test("public content detail queries are exported and public pages use only their safe hooks", () => {
  const backend = source("convex/instituteContent.ts")
  const api = source("src/lib/api.ts")
  const publicationPage = source("src/app/tong-class/publications/[id]/page.tsx")
  const newsPage = source("src/app/tong-class/news/[id]/page.tsx")

  assert.match(backend, /export const getPublicInstituteResearchById\s*=\s*queryGeneric/)
  assert.match(backend, /export const getPublicInstituteUpdateById\s*=\s*queryGeneric/)
  assert.match(api, /instituteContent:getPublicInstituteResearchById/)
  assert.match(api, /instituteContent:getPublicInstituteUpdateById/)
  assert.match(api, /export function usePublicInstituteResearchById/)
  assert.match(api, /export function usePublicInstituteUpdateById/)
  assert.match(publicationPage, /usePublicInstituteResearchById\(publicationId\)/)
  assert.doesNotMatch(publicationPage, /usePublicationById/)
  assert.match(newsPage, /usePublicInstituteUpdateById\(newsId\)/)
  assert.doesNotMatch(newsPage, /useNewsById/)

  assert.match(api, /useQuery\(api\.publications\.getById/)
  assert.match(api, /useQuery\(api\.news\.getById/)
})

test("public detail reads return sanitized DTOs with audiences and public relations", async () => {
  const content = await import(
    `${pathToFileURL(path.resolve("convex/instituteContent.ts")).href}?details-functional`
  )
  const ctx = { db: createDb() }

  assert.deepEqual(
    await content.getPublicInstituteResearchById._handler(ctx, { id: "pub-public" }),
    {
      id: "pub-public",
      audiences: ["graduate"],
      title: "Public research",
      authors: ["Public Author"],
      authorDetails: [{
        name: "Public Author",
        coFirst: false,
        corresponding: false,
      }],
      venue: "SafeConf",
      year: 2026,
      abstract: "Public abstract",
      url: "https://example.edu/research",
      doi: "10.1000/public",
      category: "AI",
      subCategory: "Safety",
      people: [{
        slug: "public-person",
        kind: "teacher",
        nameZh: "公开教师",
        nameEn: "Public Person",
        titleZh: "教授",
        titleEn: "Professor",
        isDemo: false,
      }],
      researchGroups: [{
        slug: "safe-group",
        nameZh: "安全组",
        nameEn: "Safety Group",
        isDemo: false,
      }],
    },
  )

  assert.deepEqual(
    await content.getPublicInstituteUpdateById._handler(ctx, { id: "news-public" }),
    {
      id: "news-public",
      audiences: ["undergrad"],
      title: "Public update",
      content: "Public body",
      sourceUrl: "https://example.edu/update",
      coverImageUrl: "https://example.edu/cover.png",
      homepageSubtitle: "Public subtitle",
      category: "Announcement",
      publishedAt: 1_700_000_000_000,
      people: [{
        slug: "public-person",
        kind: "teacher",
        nameZh: "公开教师",
        nameEn: "Public Person",
        titleZh: "教授",
        titleEn: "Professor",
        isDemo: false,
      }],
      researchGroups: [],
    },
  )
})

test("public detail reads return null for hidden, draft, missing, and invalid IDs", async () => {
  const content = await import(
    `${pathToFileURL(path.resolve("convex/instituteContent.ts")).href}?details-visibility`
  )
  const ctx = { db: createDb() }

  assert.equal(await content.getPublicInstituteResearchById._handler(ctx, { id: "pub-hidden" }), null)
  assert.equal(await content.getPublicInstituteResearchById._handler(ctx, { id: "missing" }), null)
  assert.equal(await content.getPublicInstituteResearchById._handler(ctx, { id: "malformed-id" }), null)
  assert.equal(await content.getPublicInstituteUpdateById._handler(ctx, { id: "news-draft" }), null)
  assert.equal(await content.getPublicInstituteUpdateById._handler(ctx, { id: "missing" }), null)
  assert.equal(await content.getPublicInstituteUpdateById._handler(ctx, { id: "malformed-id" }), null)
})

test("the shared URL helper accepts parsed HTTP(S) URLs and rejects every other href", async () => {
  const urls = await import(
    `${pathToFileURL(path.resolve("src/lib/safe-external-url.ts")).href}?safe-urls`
  )

  assert.equal(urls.getSafeExternalUrl("https://example.edu/paper"), "https://example.edu/paper")
  assert.equal(urls.getSafeExternalUrl("http://example.edu/paper"), "http://example.edu/paper")
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "/relative/path",
    "//example.edu/protocol-relative",
    "https:example.edu/no-slashes",
    "http:example.edu/no-slashes",
    "https://",
    "not a URL",
    "",
    undefined,
  ]) {
    assert.equal(urls.getSafeExternalUrl(value), undefined, `${String(value)} must be rejected`)
  }
})

test("all public list and detail hrefs use the one shared external URL helper", () => {
  for (const filePath of [
    "src/components/content/publication-archive.tsx",
    "src/components/content/news-timeline.tsx",
    "src/app/tong-class/publications/[id]/page.tsx",
    "src/app/tong-class/news/[id]/page.tsx",
  ]) {
    const contents = source(filePath)
    assert.match(contents, /from\s+["']@\/lib\/safe-external-url["']/, `${filePath} must import the helper`)
    assert.match(contents, /getSafeExternalUrl\(/, `${filePath} must parse external hrefs`)
    assert.doesNotMatch(contents, /href=\{(?:publication\.url|news\.sourceUrl|item\.sourceUrl)\}/)
  }
})
