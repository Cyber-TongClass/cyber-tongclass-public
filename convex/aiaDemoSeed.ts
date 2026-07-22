import { mutation } from "./_generated/server"
import { v } from "convex/values"

import {
  classifyDemoUpsert,
  getAiaDemoDirectorySeed,
  type AiaDemoGroupSeed,
  type AiaDemoPersonSeed,
} from "./lib/aiaDemoSeed"
import { requireSuperAdminBySession } from "./reviewer/lib"

type SeedReport = {
  created: number
  updated: number
  skipped: number
  conflicts: number
}

function emptySeedReport(): SeedReport {
  return { created: 0, updated: 0, skipped: 0, conflicts: 0 }
}

function sameStringArray(left: unknown, right: readonly string[]): boolean {
  return Array.isArray(left)
    && left.length === right.length
    && left.every((value, index) => value === right[index])
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function hasMatchingDemoPerson(existing: any, desired: AiaDemoPersonSeed): boolean {
  return (
    existing.slug === desired.slug
    && existing.kind === desired.kind
    && existing.nameZh === desired.nameZh
    && existing.nameEn === desired.nameEn
    && existing.titleZh === desired.titleZh
    && existing.titleEn === desired.titleEn
    && existing.bioZh === desired.bioZh
    && existing.bioEn === desired.bioEn
    && existing.coffeeTalkOpen === desired.coffeeTalkOpen
    && existing.visibility === desired.visibility
    && existing.displayOrder === desired.displayOrder
    && existing.isDemo === desired.isDemo
    && sameStringArray(existing.researchAreas, desired.researchAreas)
    && sameJson(existing.publicLinks, desired.publicLinks)
  )
}

function hasMatchingDemoGroup(
  existing: any,
  desired: AiaDemoGroupSeed,
  leaderPersonId: any,
): boolean {
  return (
    existing.slug === desired.slug
    && existing.nameZh === desired.nameZh
    && existing.nameEn === desired.nameEn
    && existing.summaryZh === desired.summaryZh
    && existing.summaryEn === desired.summaryEn
    && existing.descriptionZh === desired.descriptionZh
    && existing.descriptionEn === desired.descriptionEn
    && String(existing.leaderPersonId) === String(leaderPersonId)
    && existing.recruitmentZh === desired.recruitmentZh
    && existing.recruitmentEn === desired.recruitmentEn
    && existing.visibility === desired.visibility
    && existing.displayOrder === desired.displayOrder
    && existing.isDemo === desired.isDemo
    && sameStringArray(existing.researchAreas, desired.researchAreas)
    && sameJson(existing.publicLinks, desired.publicLinks)
  )
}

function personPayload(person: AiaDemoPersonSeed, now: number) {
  return {
    slug: person.slug,
    kind: person.kind,
    nameZh: person.nameZh,
    nameEn: person.nameEn,
    ...(person.titleZh !== undefined ? { titleZh: person.titleZh } : {}),
    ...(person.titleEn !== undefined ? { titleEn: person.titleEn } : {}),
    ...(person.bioZh !== undefined ? { bioZh: person.bioZh } : {}),
    ...(person.bioEn !== undefined ? { bioEn: person.bioEn } : {}),
    researchAreas: person.researchAreas,
    publicLinks: person.publicLinks,
    ...(person.coffeeTalkOpen !== undefined ? { coffeeTalkOpen: person.coffeeTalkOpen } : {}),
    visibility: person.visibility,
    displayOrder: person.displayOrder,
    isDemo: person.isDemo,
    updatedAt: now,
  }
}

function groupPayload(group: AiaDemoGroupSeed, leaderPersonId: any, now: number) {
  return {
    slug: group.slug,
    nameZh: group.nameZh,
    nameEn: group.nameEn,
    ...(group.summaryZh !== undefined ? { summaryZh: group.summaryZh } : {}),
    ...(group.summaryEn !== undefined ? { summaryEn: group.summaryEn } : {}),
    ...(group.descriptionZh !== undefined ? { descriptionZh: group.descriptionZh } : {}),
    ...(group.descriptionEn !== undefined ? { descriptionEn: group.descriptionEn } : {}),
    leaderPersonId,
    researchAreas: group.researchAreas,
    publicLinks: group.publicLinks,
    ...(group.recruitmentZh !== undefined ? { recruitmentZh: group.recruitmentZh } : {}),
    ...(group.recruitmentEn !== undefined ? { recruitmentEn: group.recruitmentEn } : {}),
    visibility: group.visibility,
    displayOrder: group.displayOrder,
    isDemo: group.isDemo,
    updatedAt: now,
  }
}

async function upsertDemoPerson(
  ctx: any,
  person: AiaDemoPersonSeed,
  now: number,
  report: SeedReport,
) {
  const existing = await ctx.db
    .query("institutePeople")
    .withIndex("by_slug", (index: any) => index.eq("slug", person.slug))
    .first()

  try {
    const disposition = classifyDemoUpsert(existing, person.slug)
    if (disposition === "create") {
      const id = await ctx.db.insert("institutePeople", {
        ...personPayload(person, now),
        createdAt: now,
      })
      report.created += 1
      return await ctx.db.get(id)
    }

    if (hasMatchingDemoPerson(existing, person)) {
      report.skipped += 1
      return existing
    }

    await ctx.db.patch(existing._id, personPayload(person, now))
    report.updated += 1
    return await ctx.db.get(existing._id)
  } catch (error) {
    if (error instanceof Error && error.message === "AIA_DEMO_SLUG_CONFLICT") {
      report.conflicts += 1
      return null
    }
    throw error
  }
}

async function upsertDemoGroup(
  ctx: any,
  group: AiaDemoGroupSeed,
  peopleBySlug: Map<string, any>,
  now: number,
  report: SeedReport,
) {
  const leader = peopleBySlug.get(group.leaderSlug)
  if (!leader || leader.isDemo !== true) {
    report.conflicts += 1
    return null
  }

  const existing = await ctx.db
    .query("researchGroups")
    .withIndex("by_slug", (index: any) => index.eq("slug", group.slug))
    .first()

  try {
    const disposition = classifyDemoUpsert(existing, group.slug)
    if (disposition === "create") {
      const id = await ctx.db.insert("researchGroups", {
        ...groupPayload(group, leader._id, now),
        createdAt: now,
      })
      report.created += 1
      return await ctx.db.get(id)
    }

    if (hasMatchingDemoGroup(existing, group, leader._id)) {
      report.skipped += 1
      return existing
    }

    await ctx.db.patch(existing._id, groupPayload(group, leader._id, now))
    report.updated += 1
    return await ctx.db.get(existing._id)
  } catch (error) {
    if (error instanceof Error && error.message === "AIA_DEMO_SLUG_CONFLICT") {
      report.conflicts += 1
      return null
    }
    throw error
  }
}

async function insertMissingDemoMemberships(
  ctx: any,
  seed: ReturnType<typeof getAiaDemoDirectorySeed>,
  peopleBySlug: Map<string, any>,
  groupsBySlug: Map<string, any>,
  now: number,
  report: SeedReport,
) {
  for (const membership of seed.memberships) {
    const person = peopleBySlug.get(membership.personSlug)
    const group = groupsBySlug.get(membership.groupSlug)

    // Memberships have no isDemo column in the established schema. They are
    // demo-derived only when both referenced records are explicit demo rows.
    if (!person || !group || person.isDemo !== true || group.isDemo !== true) {
      report.conflicts += 1
      continue
    }

    const existing = await ctx.db
      .query("researchGroupMemberships")
      .withIndex("by_person_group", (index: any) => (
        index.eq("personId", person._id).eq("researchGroupId", group._id)
      ))
      .first()

    if (existing) {
      // A membership may have been curated after a prior seed run. Preserve it
      // rather than replacing its role, dates, or display ordering.
      report.skipped += 1
      continue
    }

    await ctx.db.insert("researchGroupMemberships", {
      personId: person._id,
      researchGroupId: group._id,
      role: membership.role,
      isPrimary: membership.isPrimary,
      visibility: membership.visibility,
      sortOrder: membership.sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    report.created += 1
  }
}

/**
 * Manual-only demonstration directory seed. It is not invoked by app startup,
 * deployment, or lifecycle hooks. A real collision always remains untouched.
 */
export const seedDirectory = mutation({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)

    const now = Date.now()
    const report = emptySeedReport()
    const seed = getAiaDemoDirectorySeed()
    const peopleBySlug = new Map<string, any>()

    for (const person of seed.people) {
      const record = await upsertDemoPerson(ctx, person, now, report)
      if (record) peopleBySlug.set(person.slug, record)
    }

    const groupsBySlug = new Map<string, any>()
    for (const group of seed.groups) {
      const record = await upsertDemoGroup(ctx, group, peopleBySlug, now, report)
      if (record) groupsBySlug.set(group.slug, record)
    }

    await insertMissingDemoMemberships(ctx, seed, peopleBySlug, groupsBySlug, now, report)
    return report
  },
})
