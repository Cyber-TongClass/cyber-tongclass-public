import assert from "node:assert/strict"
import test from "node:test"

const authorships = await import("../convex/lib/publicationAuthorships.ts")

function snapshot(name, metadata = {}) {
  const normalized = {
    ...(metadata.userId ? { isTongClass: true, userId: metadata.userId } : {}),
    ...(metadata.username ? { username: metadata.username } : {}),
    ...(metadata.institutePersonSlug
      ? { institutePersonSlug: metadata.institutePersonSlug }
      : {}),
    ...(metadata.coFirst === true ? { coFirst: true } : {}),
    ...(metadata.corresponding === true ? { corresponding: true } : {}),
  }
  const entries = Object.entries(normalized)
  return entries.length === 0
    ? name
    : `${name} [tc-author:${encodeURIComponent(JSON.stringify(normalized))}]`
}

const people = [
  {
    personId: "person-a",
    slug: "teacher-a",
    kind: "teacher",
    accountUserId: "user-a",
  },
  {
    personId: "person-b",
    slug: "graduate-b",
    kind: "graduate",
  },
]

function author(name, metadata = {}) {
  return {
    snapshot: snapshot(name, metadata),
    name,
    coFirst: metadata.coFirst === true,
    corresponding: metadata.corresponding === true,
    ...(metadata.userId ? { tongClassUserId: metadata.userId } : {}),
    ...(metadata.username ? { tongClassUsername: metadata.username } : {}),
    ...(metadata.institutePersonSlug
      ? { institutePersonSlug: metadata.institutePersonSlug }
      : {}),
  }
}

test("rejects an empty normalized author name", () => {
  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      { snapshot: "", name: "  ", coFirst: false, corresponding: false },
    ], people),
    /作者姓名不能为空/,
  )
})

test("rejects valid and malformed reserved author metadata suffixes in names", () => {
  const reservedNames = [
    snapshot("Injected", { userId: "users:forged", coFirst: true }),
    "Malformed [tc-author:%7Bbroken]",
  ]

  for (const name of reservedNames) {
    assert.throws(
      () => authorships.validatePublicationAuthorInputs([
        { snapshot: name, name, coFirst: false, corresponding: false },
      ], people),
      /作者姓名不能包含保留的元数据标记/,
    )
  }
})

test("requires explicit co-first and corresponding booleans", () => {
  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      { snapshot: "Teacher A", name: "Teacher A", corresponding: false },
    ], people),
    /共同一作标记必须是布尔值/,
  )
  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      { snapshot: "Teacher A", name: "Teacher A", coFirst: false },
    ], people),
    /通讯作者标记必须是布尔值/,
  )
})

test("rejects a snapshot that diverges from normalized structured input", () => {
  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      { ...author("Teacher A"), snapshot: "Forged Name" },
    ], people),
    /作者快照与结构化信息不一致/,
  )
})

test("normalizes names, slugs, account fields, and compatibility snapshots", () => {
  const input = {
    snapshot: snapshot("Teacher A", {
      isTongClass: true,
      userId: "user-a",
      username: "teacher-a-user",
      institutePersonSlug: "teacher-a",
      coFirst: true,
      corresponding: true,
    }),
    name: " Teacher A ",
    coFirst: true,
    corresponding: true,
    tongClassUserId: " user-a ",
    tongClassUsername: " teacher-a-user ",
    institutePersonSlug: " TEACHER-A ",
  }
  const [validated] = authorships.validatePublicationAuthorInputs([input], people)

  assert.deepEqual(validated, {
    ...input,
    snapshot: snapshot("Teacher A", {
      isTongClass: true,
      userId: "user-a",
      username: "teacher-a-user",
      institutePersonSlug: "teacher-a",
      coFirst: true,
      corresponding: true,
    }),
    name: "Teacher A",
    tongClassUserId: "user-a",
    tongClassUsername: "teacher-a-user",
    institutePersonSlug: "teacher-a",
    personId: "person-a",
  })
})

test("rejects unknown, hidden, and unsupported institute people", () => {
  const hidden = [...people, {
    personId: "person-hidden", slug: "hidden", kind: "teacher", hidden: true,
  }]
  const wrongKind = [...people, {
    personId: "person-undergrad", slug: "undergrad", kind: "undergrad",
  }]

  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      author("Unknown", { institutePersonSlug: "unknown" }),
    ], people),
    /所选研究院成员不存在/,
  )
  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      author("Hidden", { institutePersonSlug: "hidden" }),
    ], hidden),
    /所选研究院成员未公开/,
  )
  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      author("Undergrad", { institutePersonSlug: "undergrad" }),
    ], wrongKind),
    /所选研究院成员类型无效/,
  )
})

test("rejects account mismatch and duplicate institute person identities", () => {
  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      author("Teacher A", { userId: "other-user", institutePersonSlug: "teacher-a" }),
    ], people),
    /作者账户与研究院成员绑定不一致/,
  )
  assert.throws(
    () => authorships.validatePublicationAuthorInputs([
      author("Teacher A", { institutePersonSlug: "teacher-a" }),
      author("Teacher A Again", { institutePersonSlug: "teacher-a-alias" }),
    ], [...people, {
      personId: "person-a", slug: "teacher-a-alias", kind: "teacher",
    }]),
    /同一研究院成员不能重复关联/,
  )
})

test("rejects duplicate canonical people slugs regardless of source ordering", () => {
  const duplicates = [
    { personId: "person-first", slug: " Teacher-A ", kind: "teacher" },
    { personId: "person-second", slug: "teacher-a", kind: "graduate" },
  ]

  for (const candidates of [duplicates, duplicates.toReversed()]) {
    assert.throws(
      () => authorships.validatePublicationAuthorInputs([
        author("Teacher A", { institutePersonSlug: "teacher-a" }),
      ], candidates),
      /研究院成员标识重复/,
    )
  }
})

test("allows duplicate external names and multiple corresponding authors without joins", () => {
  const validated = authorships.validatePublicationAuthorInputs([
    author("Same Name", { corresponding: true }),
    author("Same Name", { corresponding: true, userId: "tong-only" }),
  ], people)
  const plan = authorships.planPublicationAuthorshipSync("pub-1", validated, [], 123)

  assert.deepEqual(validated.map(({ personId }) => personId), [undefined, undefined])
  assert.deepEqual(plan, { creates: [], updates: [], deletes: [] })
})

test("plans stable creates with 0-based order, roles, natural keys, and first-row primary", () => {
  const validated = authorships.validatePublicationAuthorInputs([
    author("Teacher A", {
      userId: "user-a", institutePersonSlug: "teacher-a", corresponding: true,
    }),
    author("External Corresponding", { corresponding: true }),
    author("Graduate B", { institutePersonSlug: "graduate-b" }),
  ], people)

  assert.deepEqual(
    authorships.planPublicationAuthorshipSync("pub-1", validated, [], 123),
    {
      creates: [
        {
          naturalKey: "pub-1:person-a", publicationId: "pub-1", personId: "person-a",
          role: "corresponding_author", authorOrder: 0, isPrimary: true,
          createdAt: 123, updatedAt: 123,
        },
        {
          naturalKey: "pub-1:person-b", publicationId: "pub-1", personId: "person-b",
          role: "author", authorOrder: 2, isPrimary: false,
          createdAt: 123, updatedAt: 123,
        },
      ],
      updates: [],
      deletes: [],
    },
  )
})

test("plans no-op, reorder, role upgrade and downgrade, and stale deletion", () => {
  const validated = authorships.validatePublicationAuthorInputs([
    author("Graduate B", { institutePersonSlug: "graduate-b", corresponding: true }),
    author("Teacher A", { userId: "user-a", institutePersonSlug: "teacher-a" }),
  ], people)
  const existing = [
    {
      id: "row-a", naturalKey: "pub-1:person-a", personId: "person-a",
      role: "corresponding_author", authorOrder: 0, isPrimary: true,
    },
    {
      id: "row-b", naturalKey: "pub-1:person-b", personId: "person-b",
      role: "author", authorOrder: 1, isPrimary: false,
    },
    {
      id: "row-stale", naturalKey: "pub-1:person-stale", personId: "person-stale",
      role: "advisor", authorOrder: 2, isPrimary: false,
    },
  ]
  const plan = authorships.planPublicationAuthorshipSync("pub-1", validated, existing, 456)

  assert.deepEqual(plan, {
    creates: [],
    updates: [
      {
        id: "row-a", naturalKey: "pub-1:person-a", role: "author",
        authorOrder: 1, isPrimary: false, updatedAt: 456,
      },
      {
        id: "row-b", naturalKey: "pub-1:person-b", role: "corresponding_author",
        authorOrder: 0, isPrimary: true, updatedAt: 456,
      },
    ],
    deletes: [{ id: "row-stale", naturalKey: "pub-1:person-stale" }],
  })

  const converged = existing
    .filter((row) => row.id !== "row-stale")
    .map((row) => {
      const update = plan.updates.find((item) => item.id === row.id)
      return update ? { ...row, ...update } : row
    })
  assert.deepEqual(
    authorships.planPublicationAuthorshipSync("pub-1", validated, converged, 999),
    { creates: [], updates: [], deletes: [] },
  )
})

test("duplicate existing natural keys converge on the code-unit-smallest row id", () => {
  const validated = authorships.validatePublicationAuthorInputs([
    author("Teacher A", { institutePersonSlug: "teacher-a", corresponding: true }),
  ], people)
  const duplicates = [
    {
      id: "row-z", naturalKey: "pub-1:person-a", personId: "person-a",
      role: "corresponding_author", authorOrder: 0, isPrimary: true,
    },
    {
      id: "row-a", naturalKey: "pub-1:person-a", personId: "person-a",
      role: "author", authorOrder: 9, isPrimary: false,
    },
  ]
  const expected = {
    creates: [],
    updates: [{
      id: "row-a", naturalKey: "pub-1:person-a", role: "corresponding_author",
      authorOrder: 0, isPrimary: true, updatedAt: 456,
    }],
    deletes: [{ id: "row-z", naturalKey: "pub-1:person-a" }],
  }

  for (const existing of [duplicates, duplicates.toReversed()]) {
    const plan = authorships.planPublicationAuthorshipSync(
      "pub-1",
      validated,
      existing,
      456,
    )
    assert.deepEqual(plan, expected)

    const converged = existing
      .filter((row) => !plan.deletes.some((deletion) => deletion.id === row.id))
      .map((row) => {
        const update = plan.updates.find((item) => item.id === row.id)
        return update ? { ...row, ...update } : row
      })
    assert.deepEqual(
      authorships.planPublicationAuthorshipSync("pub-1", validated, converged, 999),
      { creates: [], updates: [], deletes: [] },
    )
  }

  assert.deepEqual(
    authorships.planPublicationAuthorshipSync("pub-1", [], duplicates, 456),
    {
      creates: [],
      updates: [],
      deletes: [
        { id: "row-a", naturalKey: "pub-1:person-a" },
        { id: "row-z", naturalKey: "pub-1:person-a" },
      ],
    },
  )
})

test("sorts every operation by natural key regardless of input row ordering", () => {
  const validated = authorships.validatePublicationAuthorInputs([
    author("Graduate B", { institutePersonSlug: "graduate-b" }),
    author("Teacher A", { institutePersonSlug: "teacher-a" }),
  ], people)
  const plan = authorships.planPublicationAuthorshipSync("pub-1", validated, [
    {
      id: "row-z", naturalKey: "pub-1:person-z", personId: "person-z",
      role: "author", authorOrder: 9, isPrimary: false,
    },
    {
      id: "row-y", naturalKey: "pub-1:person-y", personId: "person-y",
      role: "author", authorOrder: 8, isPrimary: false,
    },
    {
      id: "row-underscore", naturalKey: "pub-1:_", personId: "_",
      role: "author", authorOrder: 7, isPrimary: false,
    },
    {
      id: "row-uppercase", naturalKey: "pub-1:Z", personId: "Z",
      role: "author", authorOrder: 6, isPrimary: false,
    },
    {
      id: "row-lowercase", naturalKey: "pub-1:a", personId: "a",
      role: "author", authorOrder: 5, isPrimary: false,
    },
  ], 10)

  for (const operations of [plan.creates, plan.updates, plan.deletes]) {
    assert.deepEqual(
      operations.map((operation) => operation.naturalKey),
      operations.map((operation) => operation.naturalKey).toSorted(),
    )
  }
})

test("combined helper returns normalized snapshots and the sync plan", () => {
  const result = authorships.validateAndPlanPublicationAuthorshipSync({
    publicationId: "pub-1",
    inputs: [author("Teacher A", { institutePersonSlug: "teacher-a" })],
    peopleBySlug: people,
    existing: [],
    now: 321,
  })

  assert.deepEqual(result.normalizedSnapshots, [
    snapshot("Teacher A", { institutePersonSlug: "teacher-a" }),
  ])
  assert.equal(result.creates[0].naturalKey, "pub-1:person-a")
})
