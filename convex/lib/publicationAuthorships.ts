import { v } from "convex/values"

export const publicationAuthorInputValidator = v.object({
  snapshot: v.string(),
  name: v.string(),
  coFirst: v.boolean(),
  corresponding: v.boolean(),
  tongClassUserId: v.optional(v.id("users")),
  tongClassUsername: v.optional(v.string()),
  institutePersonSlug: v.optional(v.string()),
})

export type PublicationAuthorInputLike = {
  snapshot: string
  name: string
  coFirst: boolean
  corresponding: boolean
  tongClassUserId?: string
  tongClassUsername?: string
  institutePersonSlug?: string
}

type InstitutePersonCandidate = {
  personId: string
  slug: string
  kind: string
  accountUserId?: string
  hidden?: boolean
}

type ExistingAuthorship = {
  id: string
  naturalKey: string
  personId: string
  role: string
  authorOrder: number
  isPrimary: boolean
}

export type ValidatedPublicationAuthorInput = PublicationAuthorInputLike & {
  personId?: string
}

type DesiredAuthorship = {
  naturalKey: string
  publicationId: string
  personId: string
  role: "author" | "corresponding_author"
  authorOrder: number
  isPrimary: boolean
}

function optionalString(value: unknown) {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized || undefined
}

function normalizeSlug(value: unknown) {
  const normalized = optionalString(value)?.toLowerCase()
  if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return undefined
  return normalized
}

function encodeSnapshot(author: Omit<ValidatedPublicationAuthorInput, "snapshot" | "personId">) {
  const metadata = {
    ...(author.tongClassUserId
      ? { isTongClass: true, userId: author.tongClassUserId }
      : {}),
    ...(author.tongClassUsername ? { username: author.tongClassUsername } : {}),
    ...(author.institutePersonSlug
      ? { institutePersonSlug: author.institutePersonSlug }
      : {}),
    ...(author.coFirst ? { coFirst: true } : {}),
    ...(author.corresponding ? { corresponding: true } : {}),
  }

  if (Object.keys(metadata).length === 0) return author.name
  return `${author.name} [tc-author:${encodeURIComponent(JSON.stringify(metadata))}]`
}

export function validatePublicationAuthorInputs(
  inputs: readonly PublicationAuthorInputLike[],
  people: readonly InstitutePersonCandidate[],
): ValidatedPublicationAuthorInput[] {
  const peopleBySlug = new Map<string, InstitutePersonCandidate>()
  for (const person of people) {
    const slug = normalizeSlug(person.slug)
    if (!slug) continue
    if (peopleBySlug.has(slug)) throw new Error("研究院成员标识重复")
    peopleBySlug.set(slug, person)
  }
  const usedPersonIds = new Set<string>()

  return inputs.map((input) => {
    const name = optionalString(input.name)
    if (!name) throw new Error("作者姓名不能为空")
    if (/\[tc-author:[^\]]*\]\s*$/i.test(name)) {
      throw new Error("作者姓名不能包含保留的元数据标记")
    }
    if (typeof input.coFirst !== "boolean") throw new Error("共同一作标记必须是布尔值")
    if (typeof input.corresponding !== "boolean") throw new Error("通讯作者标记必须是布尔值")

    const tongClassUserId = optionalString(input.tongClassUserId)
    const tongClassUsername = optionalString(input.tongClassUsername)
    const rawInstituteSlug = optionalString(input.institutePersonSlug)
    const institutePersonSlug = normalizeSlug(rawInstituteSlug)
    if (rawInstituteSlug && !institutePersonSlug) throw new Error("研究院成员标识无效")

    const normalizedBase = {
      name,
      coFirst: input.coFirst,
      corresponding: input.corresponding,
      ...(tongClassUserId ? { tongClassUserId } : {}),
      ...(tongClassUsername ? { tongClassUsername } : {}),
      ...(institutePersonSlug ? { institutePersonSlug } : {}),
    }
    const snapshot = encodeSnapshot(normalizedBase)
    if (input.snapshot !== snapshot) throw new Error("作者快照与结构化信息不一致")

    if (!institutePersonSlug) return { snapshot, ...normalizedBase }

    const person = peopleBySlug.get(institutePersonSlug)
    if (!person) throw new Error("所选研究院成员不存在")
    if (person.hidden) throw new Error("所选研究院成员未公开")
    if (person.kind !== "teacher" && person.kind !== "graduate") {
      throw new Error("所选研究院成员类型无效")
    }
    if (
      tongClassUserId
      && person.accountUserId
      && tongClassUserId !== String(person.accountUserId)
    ) {
      throw new Error("作者账户与研究院成员绑定不一致")
    }
    if (usedPersonIds.has(person.personId)) throw new Error("同一研究院成员不能重复关联")
    usedPersonIds.add(person.personId)

    return { snapshot, ...normalizedBase, personId: person.personId }
  })
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function byNaturalKey<T extends { naturalKey: string; id?: string }>(left: T, right: T) {
  return compareCodeUnits(left.naturalKey, right.naturalKey)
    || compareCodeUnits(left.id || "", right.id || "")
}

export function planPublicationAuthorshipSync(
  publicationId: string,
  inputs: readonly ValidatedPublicationAuthorInput[],
  existing: readonly ExistingAuthorship[],
  now: number,
) {
  const desired = inputs.flatMap((author, authorOrder): DesiredAuthorship[] => {
    if (!author.personId) return []
    return [{
      naturalKey: `${publicationId}:${author.personId}`,
      publicationId,
      personId: author.personId,
      role: author.corresponding ? "corresponding_author" : "author",
      authorOrder,
      isPrimary: authorOrder === 0,
    }]
  })
  const existingGroups = new Map<string, ExistingAuthorship[]>()
  for (const row of existing) {
    const group = existingGroups.get(row.naturalKey) || []
    group.push(row)
    existingGroups.set(row.naturalKey, group)
  }
  for (const group of existingGroups.values()) {
    group.sort((left, right) => compareCodeUnits(left.id, right.id))
  }
  const existingByNaturalKey = new Map(
    Array.from(existingGroups, ([naturalKey, rows]) => [naturalKey, rows[0]] as const),
  )
  const desiredKeys = new Set(desired.map((row) => row.naturalKey))

  const creates = desired
    .filter((row) => !existingByNaturalKey.has(row.naturalKey))
    .map((row) => ({ ...row, createdAt: now, updatedAt: now }))
    .sort(byNaturalKey)

  const updates = desired.flatMap((row) => {
    const current = existingByNaturalKey.get(row.naturalKey)
    if (!current) return []
    if (
      current.role === row.role
      && current.authorOrder === row.authorOrder
      && current.isPrimary === row.isPrimary
    ) return []
    return [{
      id: current.id,
      naturalKey: row.naturalKey,
      role: row.role,
      authorOrder: row.authorOrder,
      isPrimary: row.isPrimary,
      updatedAt: now,
    }]
  }).sort(byNaturalKey)

  const deletes = existing
    .filter((row) => {
      if (!desiredKeys.has(row.naturalKey)) return true
      return existingByNaturalKey.get(row.naturalKey)?.id !== row.id
    })
    .map((row) => ({ id: row.id, naturalKey: row.naturalKey }))
    .sort(byNaturalKey)

  return { creates, updates, deletes }
}

export function validateAndPlanPublicationAuthorshipSync(args: {
  publicationId: string
  inputs: readonly PublicationAuthorInputLike[]
  peopleBySlug: readonly InstitutePersonCandidate[]
  existing: readonly ExistingAuthorship[]
  now: number
}) {
  const validated = validatePublicationAuthorInputs(args.inputs, args.peopleBySlug)
  return {
    normalizedSnapshots: validated.map((author) => author.snapshot),
    ...planPublicationAuthorshipSync(args.publicationId, validated, args.existing, args.now),
  }
}

export async function resolvePublicationAuthors(
  ctx: any,
  inputs: readonly PublicationAuthorInputLike[],
) {
  const slugs = Array.from(new Set(
    inputs.flatMap((input) => {
      const slug = normalizeSlug(input.institutePersonSlug)
      return slug ? [slug] : []
    }),
  )).sort(compareCodeUnits)
  const people = await Promise.all(slugs.map(async (slug) => {
    const person = await ctx.db
      .query("institutePeople")
      .withIndex("by_slug", (index: any) => index.eq("slug", slug))
      .unique()
    if (!person) return undefined
    return {
      personId: String(person._id),
      slug: person.slug,
      kind: person.kind,
      ...(person.accountUserId
        ? { accountUserId: String(person.accountUserId) }
        : {}),
      hidden: person.visibility !== "public",
    }
  }))

  const candidates: InstitutePersonCandidate[] = people.flatMap((person) => (
    person ? [{ ...person, hidden: person.hidden === true }] : []
  ))
  return validatePublicationAuthorInputs(inputs, candidates)
}

export async function syncPublicationAuthorships(
  ctx: any,
  publicationId: string,
  validated: readonly ValidatedPublicationAuthorInput[],
  now: number,
) {
  const rows = await ctx.db
    .query("publicationAuthorships")
    .withIndex("by_publication_order", (index: any) => (
      index.eq("publicationId", publicationId)
    ))
    .collect()
  const existing = rows.map((row: any): ExistingAuthorship => ({
    id: String(row._id),
    naturalKey: row.naturalKey,
    personId: String(row.personId),
    role: row.role,
    authorOrder: row.authorOrder,
    isPrimary: row.isPrimary === true,
  }))
  const plan = planPublicationAuthorshipSync(publicationId, validated, existing, now)

  for (const creation of plan.creates) {
    await ctx.db.insert("publicationAuthorships", creation)
  }
  for (const update of plan.updates) {
    await ctx.db.patch(update.id, {
      role: update.role,
      authorOrder: update.authorOrder,
      isPrimary: update.isPrimary,
      updatedAt: update.updatedAt,
    })
  }
  for (const deletion of plan.deletes) {
    await ctx.db.delete(deletion.id)
  }

  return plan
}

export async function deletePublicationRelations(ctx: any, publicationId: string) {
  const authorships = await ctx.db
    .query("publicationAuthorships")
    .withIndex("by_publication_order", (index: any) => (
      index.eq("publicationId", publicationId)
    ))
    .collect()
  const mentions = await ctx.db
    .query("contentMentions")
    .withIndex("by_content", (index: any) => (
      index.eq("contentType", "publication").eq("contentId", publicationId)
    ))
    .collect()
  const visibilityOverrides = await ctx.db
    .query("researchGroupPublicationVisibilityOverrides")
    .withIndex("by_publication", (index: any) => (
      index.eq("publicationId", publicationId)
    ))
    .collect()

  for (const relation of [...authorships, ...mentions, ...visibilityOverrides]) {
    await ctx.db.delete(relation._id)
  }
}
