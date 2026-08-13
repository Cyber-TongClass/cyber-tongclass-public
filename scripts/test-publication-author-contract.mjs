import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const authors = await import("../src/lib/publication-authors.ts")

function encodedAuthor(name, metadata) {
  return `${name} [tc-author:${encodeURIComponent(JSON.stringify(metadata))}]`
}

function publicationWithAuthors(authorSnapshots) {
  return {
    _id: "publications:test",
    title: "Contract test",
    authors: authorSnapshots,
    venue: "Test venue",
    year: 2026,
    abstract: "Test abstract",
    category: "Test",
    userId: "users:owner",
    createdAt: 1,
    updatedAt: 1,
  }
}

test("plain and malformed legacy author strings remain readable", () => {
  assert.deepEqual(authors.parsePublicationAuthor("  Ada Lovelace  "), {
    name: "Ada Lovelace",
  })
  assert.deepEqual(
    authors.parsePublicationAuthor("Grace Hopper [tc-author:%7Bbroken]"),
    { name: "Grace Hopper" },
  )
  assert.deepEqual(
    authors.parsePublicationAuthor(
      encodedAuthor("Array metadata", [{ userId: "users:private" }]),
    ),
    { name: "Array metadata" },
  )
  assert.deepEqual(
    authors.parsePublicationAuthor(
      encodedAuthor("Wrong types", {
        isTongClass: "true",
        userId: 42,
        username: ["private"],
        institutePersonSlug: "../admin",
        coFirst: "yes",
        corresponding: 1,
      }),
    ),
    { name: "Wrong types" },
  )
})

test("co-first, external corresponding, and institute corresponding metadata roundtrip", () => {
  const external = { name: " Alan Turing ", coFirst: true, corresponding: true }
  assert.deepEqual(
    authors.parsePublicationAuthor(authors.encodePublicationAuthor(external)),
    { name: "Alan Turing", coFirst: true, corresponding: true },
  )

  const teacher = {
    name: " Yao Zhang ",
    corresponding: true,
    institutePersonSlug: " YAO-Zhang ",
  }
  const snapshot = authors.encodePublicationAuthor(teacher)
  assert.equal(
    snapshot,
    encodedAuthor("Yao Zhang", {
      institutePersonSlug: "yao-zhang",
      corresponding: true,
    }),
  )
  assert.deepEqual(authors.parsePublicationAuthor(snapshot), {
    name: "Yao Zhang",
    corresponding: true,
    institutePersonSlug: "yao-zhang",
  })
})

test("explicit Tong identity produces stable compatibility and structured snapshots", () => {
  const author = {
    name: " Tong Member ",
    isTongClass: true,
    userId: " users:member ",
    username: " tong-member ",
    coFirst: true,
  }
  const snapshot = encodedAuthor("Tong Member", {
    isTongClass: true,
    userId: "users:member",
    username: "tong-member",
    coFirst: true,
  })

  assert.equal(authors.encodePublicationAuthor(author), snapshot)
  assert.deepEqual(authors.toPublicationAuthorInput(author), {
    snapshot,
    name: "Tong Member",
    coFirst: true,
    corresponding: false,
    tongClassUserId: "users:member",
    tongClassUsername: "tong-member",
  })
  assert.deepEqual(authors.toPublicPublicationAuthor(author), {
    name: "Tong Member",
    coFirst: true,
    corresponding: false,
    profile: { kind: "tong_class_member", slug: "tong-member" },
  })
})

test("absent or false Tong flags never upgrade stale account metadata into permissions", () => {
  const staleSnapshots = [
    encodedAuthor("Absent flag", {
      userId: "users:stale",
      username: "stale-member",
      coFirst: true,
    }),
    encodedAuthor("False flag", {
      isTongClass: false,
      userId: "users:stale",
      username: "stale-member",
      coFirst: true,
    }),
  ]

  for (const staleSnapshot of staleSnapshots) {
    const parsed = authors.parsePublicationAuthor(staleSnapshot)
    const canonicalSnapshot = authors.encodePublicationAuthor(parsed)
    const canonicalPublication = publicationWithAuthors([canonicalSnapshot])

    assert.equal(
      canonicalSnapshot,
      encodedAuthor(parsed.name, { username: "stale-member", coFirst: true }),
    )
    assert.equal(authors.publicationBelongsToUser(canonicalPublication, "users:stale"), false)
    assert.equal(authors.canEditPublication(canonicalPublication, "users:stale"), false)
    assert.deepEqual(authors.toPublicationAuthorInput(parsed), {
      snapshot: canonicalSnapshot,
      name: parsed.name,
      coFirst: true,
      corresponding: false,
    })
    assert.deepEqual(authors.toPublicPublicationAuthor(parsed), {
      name: parsed.name,
      coFirst: true,
      corresponding: false,
    })
  }

  assert.equal(
    authors.encodePublicationAuthor({
      name: "Explicit false",
      isTongClass: false,
      userId: "users:stale",
      username: "stale-member",
    }),
    encodedAuthor("Explicit false", { username: "stale-member" }),
  )
})

test("public institute profiles normalize safe slugs and reject invalid boundaries", () => {
  const projected = authors.toPublicPublicationAuthor({
    name: " Yao Zhang ",
    corresponding: true,
    userId: "users-secret",
    username: "private-account",
    institutePersonSlug: " YAO-Zhang ",
  })
  assert.deepEqual(projected, {
    name: "Yao Zhang",
    coFirst: false,
    corresponding: true,
    profile: { kind: "institute_person", slug: "yao-zhang" },
  })
  assert.deepEqual(Object.keys(projected), ["name", "coFirst", "corresponding", "profile"])
  assert.deepEqual(Object.keys(projected.profile), ["kind", "slug"])
  assert.doesNotMatch(JSON.stringify(projected), /users-secret|private-account/)

  for (const institutePersonSlug of [
    "-yao-zhang",
    "yao-zhang-",
    "yao--zhang",
    "yao_zhang",
    "../yao-zhang",
  ]) {
    const publicAuthor = authors.toPublicPublicationAuthor({
      name: "Unsafe slug",
      institutePersonSlug,
    })
    assert.deepEqual(publicAuthor, {
      name: "Unsafe slug",
      coFirst: false,
      corresponding: false,
    })
    assert.equal(Object.hasOwn(publicAuthor, "profile"), false)
  }
})

test("public Tong profiles also normalize and validate their username slug", () => {
  assert.deepEqual(
    authors.toPublicPublicationAuthor({
      name: "Tong Member",
      isTongClass: true,
      userId: "users:member",
      username: " Tong-MEMBER ",
    }),
    {
      name: "Tong Member",
      coFirst: false,
      corresponding: false,
      profile: { kind: "tong_class_member", slug: "tong-member" },
    },
  )

  for (const username of ["-member", "member-", "member--name", "../member"]) {
    assert.deepEqual(
      authors.toPublicPublicationAuthor({
        name: "Unsafe Tong username",
        isTongClass: true,
        userId: "users:member",
        username,
      }),
      {
        name: "Unsafe Tong username",
        coFirst: false,
        corresponding: false,
      },
    )
  }
})

test("structured input drops invalid institute slugs instead of persisting them", () => {
  assert.deepEqual(
    authors.toPublicationAuthorInput({
      name: " Invalid institute link ",
      institutePersonSlug: "teacher-",
    }),
    {
      snapshot: "Invalid institute link",
      name: "Invalid institute link",
      coFirst: false,
      corresponding: false,
    },
  )
})

test("publication DTO types expose the exact write and public author contracts", async () => {
  const [typesSource, instituteTypesSource] = await Promise.all([
    readFile(new URL("../src/types/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/types/institute.ts", import.meta.url), "utf8"),
  ])

  assert.match(typesSource, /export type PublicationAuthorProfile\s*=\s*\{[\s\S]*?kind:\s*"institute_person"\s*\|\s*"tong_class_member"[\s\S]*?slug:\s*string[\s\S]*?\}/)
  assert.match(typesSource, /export type PublicPublicationAuthor\s*=\s*\{[\s\S]*?name:\s*string[\s\S]*?coFirst:\s*boolean[\s\S]*?corresponding:\s*boolean[\s\S]*?profile\?:\s*PublicationAuthorProfile[\s\S]*?\}/)
  assert.match(typesSource, /export type PublicationAuthorInput\s*=\s*\{[\s\S]*?snapshot:\s*string[\s\S]*?tongClassUserId\?:\s*string[\s\S]*?tongClassUsername\?:\s*string[\s\S]*?institutePersonSlug\?:\s*string[\s\S]*?\}/)
  assert.match(typesSource, /export interface Publication\s*\{[\s\S]*?authorDetails\?:\s*PublicPublicationAuthor\[\][\s\S]*?\}/)
  assert.match(instituteTypesSource, /authorDetails:\s*PublicPublicationAuthor\[\]/)
  assert.doesNotMatch(instituteTypesSource, /authorDetails\?:\s*PublicPublicationAuthor\[\]/)
})

test("public publication DTOs preserve safe corresponding-author metadata", async () => {
  const [publicationsSource, instituteContentSource, instituteDtoSource] = await Promise.all([
    readFile(new URL("../convex/publications.ts", import.meta.url), "utf8"),
    readFile(new URL("../convex/instituteContent.ts", import.meta.url), "utf8"),
    readFile(new URL("../convex/lib/instituteDto.ts", import.meta.url), "utf8"),
  ])

  assert.match(publicationsSource, /authorDetails/)
  assert.match(publicationsSource, /by_publication_order/)
  assert.match(publicationsSource, /visibility\s*===\s*["']public["']/)
  assert.match(publicationsSource, /Promise\.all\(page\.map/)
  assert.match(instituteContentSource, /role:\s*["']author["']\s*\|\s*["']corresponding_author["']\s*\|\s*["']advisor["']/)
  assert.match(instituteContentSource, /authorOrder:\s*number/)
  assert.match(instituteContentSource, /authorDetails/)
  assert.match(instituteDtoSource, /authorDetails/)
  assert.doesNotMatch(
    instituteDtoSource,
    /PublicPublicationAuthor[\s\S]{0,500}accountUserId/,
  )
})

test("publication editors bind institute teachers through the canonical API hook", async () => {
  const [editorSource, apiSource, myPageSource, adminPageSource] = await Promise.all([
    readFile(new URL("../src/components/publications/publication-author-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/api.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/my-publications/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/admin/publications/[id]/page.tsx", import.meta.url), "utf8"),
  ])

  for (const expected of [
    "instituteTeacherOptions",
    "institutePersonSlug",
    "toPublicationAuthorInput",
    "关联研究院教师",
    "共同第一作者",
    "通讯作者",
  ]) assert.match(editorSource, new RegExp(expected))
  assert.match(apiSource, /publications:listInstituteTeacherAuthorOptions/)
  assert.match(apiSource, /export function usePublicationTeacherAuthorOptions/)
  for (const pageSource of [myPageSource, adminPageSource]) {
    assert.match(pageSource, /usePublicationTeacherAuthorOptions/)
    assert.match(pageSource, /authorDetails/)
    assert.doesNotMatch(pageSource, /from\s+["'][^"']*convex\//)
  }
})
