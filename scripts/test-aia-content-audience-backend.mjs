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

const audienceModuleUrl = pathToFileURL(path.resolve("convex/lib/contentAudience.ts")).href
const dtoModuleUrl = pathToFileURL(path.resolve("convex/lib/instituteDto.ts")).href
const audience = await import(audienceModuleUrl)
const dto = await import(dtoModuleUrl)

function encodedAuthor(name, metadata) {
  return `${name} [tc-author:${encodeURIComponent(JSON.stringify(metadata))}]`
}

test("publication links combine encoded and structured account IDs in first-seen order", () => {
  assert.deepEqual(
    audience.collectPublicationUserIds({
      authors: [
        encodedAuthor("Undergrad", { userId: "users:undergrad" }),
        encodedAuthor("Graduate", { userId: "users:graduate" }),
        encodedAuthor("Duplicate", { userId: "users:undergrad" }),
      ],
      structuredAccountUserIds: ["users:graduate", "users:structured"],
      ownerUserId: "users:owner",
    }),
    ["users:undergrad", "users:graduate", "users:structured"],
  )
})

test("publication links use the owner only when no explicit account link exists", () => {
  assert.deepEqual(
    audience.collectPublicationUserIds({
      authors: ["Legacy Author"],
      structuredAccountUserIds: [],
      ownerUserId: "users:owner",
    }),
    ["users:owner"],
  )

  assert.deepEqual(
    audience.collectPublicationUserIds({
      authors: [encodedAuthor("Explicit", { userId: "users:explicit" })],
      structuredAccountUserIds: [],
      ownerUserId: "users:owner",
    }),
    ["users:explicit"],
  )
})

test("malformed and empty author metadata is ignored without suppressing owner fallback", () => {
  assert.deepEqual(
    audience.collectPublicationUserIds({
      authors: [
        "Broken [tc-author:%E0%A4%A]",
        `Array [tc-author:${encodeURIComponent(JSON.stringify([{ userId: "users:array" }]))}]`,
        encodedAuthor("Empty", { userId: "   " }),
        encodedAuthor("Wrong type", { userId: 42 }),
      ],
      structuredAccountUserIds: ["", "   "],
      ownerUserId: "users:owner",
    }),
    ["users:owner"],
  )
})

test("public audiences keep only undergrad and graduate values in stable order", () => {
  assert.deepEqual(
    audience.toPublicAudiences(["graduate", "undergrad", "graduate", "teacher", "other"]),
    ["undergrad", "graduate"],
  )
  assert.deepEqual(audience.toPublicAudiences(["teacher", "other"]), [])
})

test("stale explicit publication links fall back to the first resolvable owner account", async () => {
  const resolved = new Map([
    ["users:owner", "undergrad"],
  ])

  assert.deepEqual(
    await audience.resolvePublicationAudiences({
      authors: [encodedAuthor("Stale", { userId: "users:missing" })],
      structuredAccountUserIds: ["users:also-missing"],
      ownerUserId: "users:owner",
      resolveIdentityType: async (userId) => resolved.get(userId),
    }),
    ["undergrad"],
  )
})

test("a resolved teacher or other explicit link suppresses publication owner fallback", async () => {
  const requested = []
  const resolved = new Map([
    ["users:teacher", "teacher"],
    ["users:owner", "graduate"],
  ])

  assert.deepEqual(
    await audience.resolvePublicationAudiences({
      authors: [encodedAuthor("Teacher", { userId: "users:teacher" })],
      structuredAccountUserIds: [],
      ownerUserId: "users:owner",
      resolveIdentityType: async (userId) => {
        requested.push(userId)
        return resolved.get(userId)
      },
    }),
    [],
  )
  assert.deepEqual(requested, ["users:teacher"])
})

test("public content DTOs expose only safe IDs and normalized audiences", () => {
  const encodedPrivateAuthor = encodedAuthor("Public display name", {
    userId: "users:private-encoded-author",
    username: "private-account",
  })
  const relatedPerson = {
    slug: "graduate-one",
    kind: "graduate",
    nameZh: "研究生甲",
    nameEn: "Graduate One",
    titleZh: "博士生",
    titleEn: "PhD Student",
    bioZh: "Private-in-context biography",
    photoUrl: "https://example.edu/private-photo.png",
    researchAreas: ["Safe AI"],
    publicLinks: [{ kind: "homepage", label: "Homepage", href: "https://private.example" }],
    publicEmail: "private@example.edu",
    coffeeTalkOpen: true,
    accountUserId: "users:private-person-account",
    isDemo: false,
  }
  const research = dto.toPublicInstituteResearch(
    {
      title: "Mixed research",
      authors: [encodedPrivateAuthor],
      venue: "Conference",
      year: 2026,
      abstract: "Abstract",
      category: "AI",
      userId: "users:private-owner",
    },
    { id: "publications:1", audiences: ["undergrad", "graduate"] },
    { people: [relatedPerson] },
  )
  const update = dto.toPublicInstituteUpdate(
    {
      title: "Graduate update",
      content: "Public body",
      category: "News",
      publishedAt: 1_700_000_000_000,
      authorId: "users:private-author",
    },
    { id: "news:1", audiences: ["graduate"] },
    { people: [relatedPerson] },
  )

  assert.equal(research.id, "publications:1")
  assert.deepEqual(research.audiences, ["undergrad", "graduate"])
  assert.deepEqual(research.authors, ["Public display name"])
  assert.equal(update.id, "news:1")
  assert.deepEqual(update.audiences, ["graduate"])
  const expectedPeople = [{
    slug: "graduate-one",
    kind: "graduate",
    nameZh: "研究生甲",
    nameEn: "Graduate One",
    titleZh: "博士生",
    titleEn: "PhD Student",
    isDemo: false,
  }]
  assert.deepEqual(research.people, expectedPeople)
  assert.deepEqual(update.people, expectedPeople)
  const serialized = JSON.stringify({ research, update })
  assert.doesNotMatch(serialized, /tc-author|users:private|private-account|private@example\.edu|private\.example/)
  for (const value of [research, update]) {
    for (const privateField of ["userId", "authorId", "accountUserId", "role", "identityType"]) {
      assert.equal(Object.hasOwn(value, privateField), false, `${privateField} must stay private`)
    }
  }
})

test("institute content queries reuse every eligible real record and resolve linked identities", () => {
  const source = readFileSync("convex/instituteContent.ts", "utf8")

  assert.match(source, /by_siteScope_visibility_year/)
  assert.match(source, /by_siteScope_isPublished_publishedAt/)
  assert.match(source, /readPublicationBucket\(ctx, undefined, undefined, limit\)/)
  assert.match(source, /readPublicationBucket\(ctx, "tong_class", "public", limit\)/)
  assert.match(source, /readPublicationBucket\(ctx, "institute", "public", limit\)/)
  assert.match(source, /readNewsBucket\(ctx, undefined\)/)
  assert.match(source, /readNewsBucket\(ctx, "tong_class"\)/)
  assert.match(source, /readNewsBucket\(ctx, "institute"\)/)
  assert.match(source, /\.eq\("siteScope",\s*siteScope\)/)
  assert.match(source, /readPublicationBucket\([\s\S]*?limit:\s*number/)
  const newsBucket = source.slice(source.indexOf("async function readNewsBucket"), source.indexOf("async function listNewsCandidates"))
  assert.match(newsBucket, /\.collect\(\)/)
  assert.doesNotMatch(newsBucket, /\.take\(limit\)/)
  assert.match(source, /\.take\(limit\)/)
  assert.doesNotMatch(source, /\.take\(MAX_PUBLIC_LIMIT\)/)
  assert.match(source, /left\.year\s*!==\s*right\.year/)
  assert.match(source, /right\.publishedAt\s*-\s*left\.publishedAt/)
  assert.doesNotMatch(source, /\.query\("publications"\)\s*\.order\("desc"\)\s*\.collect\(\)/)
  assert.doesNotMatch(source, /\.query\("news"\)\s*\.order\("desc"\)\s*\.collect\(\)/)
  assert.match(source, /record\.visibility\s*!==\s*"hidden"/)
  assert.match(source, /record\.isPublished\s*===\s*true/)
  assert.match(source, /resolveUserIdentityType/)
  assert.match(source, /publicationAuthorships/)
  assert.match(source, /accountUserId/)
  assert.match(source, /loadPublicationAuthorSources/)
  assert.equal((source.match(/\.query\("publicationAuthorships"\)/g) || []).length, 2)
  assert.match(source, /resolvePublicationAudiences/)
  assert.match(source, /publicationAuthorDisplayName/)
  assert.doesNotMatch(source, /copyStringList\(record\.authors\)/)
  assert.doesNotMatch(source, /index\.eq\("siteScope",\s*"institute"\)/)
  assert.match(source, /loadMatchingPublicationRecords\(ctx, matchingKeys\)/)
  assert.match(source, /loadMatchingNewsRecords\(ctx, matchingKeys\)/)
  assert.match(source, /ctx\.db\.normalizeId\("publications", contentId\)/)
  assert.match(source, /ctx\.db\.normalizeId\("news", contentId\)/)
  assert.match(source, /matchingKeys === undefined[\s\S]*?listPublicationCandidates\(ctx, limit\)/)
  assert.match(source, /matchingKeys === undefined[\s\S]*?listNewsCandidates\(ctx, limit\)/)

  const referenceStart = source.indexOf("function toPublicInstitutePersonReference")
  assert.notEqual(referenceStart, -1)
  const referenceEnd = source.indexOf("function toPublicInstituteResearchGroupReference", referenceStart)
  const referenceBlock = source.slice(referenceStart, referenceEnd)
  assert.doesNotMatch(referenceBlock, /publicEmail|publicLinks|accountUserId|researchAreas|bioZh|bioEn/)
})
