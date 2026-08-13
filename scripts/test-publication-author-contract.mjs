import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const publicationAuthors = await import("../src/lib/publication-authors.ts")

function encodedAuthor(name, metadata) {
  return `${name} [tc-author:${encodeURIComponent(JSON.stringify(metadata))}]`
}

test("plain and malformed legacy author strings remain readable", () => {
  assert.deepEqual(publicationAuthors.parsePublicationAuthor("  Grace Hopper  "), {
    name: "Grace Hopper",
  })
  assert.deepEqual(
    publicationAuthors.parsePublicationAuthor("Broken [tc-author:%E0%A4%A]"),
    { name: "Broken" },
  )
  assert.deepEqual(
    publicationAuthors.parsePublicationAuthor(
      encodedAuthor("Array metadata", [{ userId: "users:private" }]),
    ),
    { name: "Array metadata" },
  )
  assert.deepEqual(
    publicationAuthors.parsePublicationAuthor(
      encodedAuthor("Wrong types", {
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

test("external corresponding authors use a stable structured roundtrip", () => {
  const input = publicationAuthors.normalizePublicationAuthorWriteInput({
    name: "  Ada Lovelace  ",
    corresponding: true,
  })

  assert.deepEqual(input, { name: "Ada Lovelace", corresponding: true })

  const encoded = publicationAuthors.encodePublicationAuthor(input)
  assert.equal(encoded, encodedAuthor("Ada Lovelace", { corresponding: true }))
  assert.deepEqual(publicationAuthors.parsePublicationAuthor(encoded), input)
})

test("Tong account authors preserve legacy username links and co-first metadata", () => {
  const legacy = encodedAuthor("  Tong Member  ", {
    isTongClass: true,
    userId: "users:member",
    username: "tong-member",
    coFirst: true,
  })

  assert.deepEqual(publicationAuthors.parsePublicationAuthor(legacy), {
    name: "Tong Member",
    isTongClass: true,
    userId: "users:member",
    username: "tong-member",
    coFirst: true,
  })

  const normalized = publicationAuthors.normalizePublicationAuthorWriteInput({
    name: " Tong Member ",
    userId: " users:member ",
    username: " tong-member ",
    coFirst: true,
  })
  assert.deepEqual(normalized, {
    name: "Tong Member",
    userId: "users:member",
    username: "tong-member",
    coFirst: true,
  })
  assert.equal(
    publicationAuthors.encodePublicationAuthor(normalized),
    encodedAuthor("Tong Member", {
      isTongClass: true,
      userId: "users:member",
      username: "tong-member",
      coFirst: true,
    }),
  )
})

test("institute corresponding authors roundtrip with a public person slug", () => {
  const input = {
    name: "  Institute Researcher ",
    institutePersonSlug: " professor-lin ",
    corresponding: true,
  }
  const normalized = publicationAuthors.normalizePublicationAuthorWriteInput(input)
  assert.deepEqual(normalized, {
    name: "Institute Researcher",
    institutePersonSlug: "professor-lin",
    corresponding: true,
  })

  const encoded = publicationAuthors.encodePublicationAuthor(input)
  assert.equal(
    encoded,
    encodedAuthor("Institute Researcher", {
      institutePersonSlug: "professor-lin",
      corresponding: true,
    }),
  )
  assert.deepEqual(publicationAuthors.parsePublicationAuthor(encoded), normalized)
  assert.deepEqual(publicationAuthors.toPublicPublicationAuthorDetail(encoded), {
    name: "Institute Researcher",
    corresponding: true,
    personSlug: "professor-lin",
  })
})

test("public author details expose only safe display fields", () => {
  const privateLegacyAuthor = encodedAuthor("Private account", {
    isTongClass: true,
    userId: "users:private",
    username: "private-account",
    coFirst: true,
    corresponding: true,
  })
  const unsafeInstituteAuthor = encodedAuthor("Unsafe slug", {
    userId: "users:also-private",
    institutePersonSlug: "../admin",
    corresponding: true,
  })

  assert.deepEqual(
    publicationAuthors.toPublicPublicationAuthorDetail(privateLegacyAuthor),
    { name: "Private account", coFirst: true, corresponding: true },
  )
  assert.deepEqual(
    publicationAuthors.toPublicPublicationAuthorDetail(unsafeInstituteAuthor),
    { name: "Unsafe slug", corresponding: true },
  )

  for (const value of [privateLegacyAuthor, unsafeInstituteAuthor]) {
    const detail = publicationAuthors.toPublicPublicationAuthorDetail(value)
    assert.deepEqual(
      Object.keys(detail).sort(),
      Object.keys(detail).filter((key) => (
        ["name", "coFirst", "corresponding", "personSlug"].includes(key)
      )).sort(),
    )
    assert.equal(Object.hasOwn(detail, "userId"), false)
    assert.equal(Object.hasOwn(detail, "username"), false)
    assert.doesNotMatch(JSON.stringify(detail), /users:private|users:also-private|private-account/)
  }
})

test("publication public DTO types declare the narrow author detail contract", async () => {
  const [typesSource, instituteTypesSource] = await Promise.all([
    readFile(new URL("../src/types/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/types/institute.ts", import.meta.url), "utf8"),
  ])

  assert.match(typesSource, /export interface PublicationAuthorWriteInput\s*\{[\s\S]*?institutePersonSlug\?: string[\s\S]*?\}/)
  assert.match(typesSource, /export interface PublicationPublicAuthorDetail\s*\{[\s\S]*?personSlug\?: string[\s\S]*?\}/)
  assert.match(instituteTypesSource, /authorDetails\?: PublicationPublicAuthorDetail\[\]/)
})
