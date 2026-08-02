import { queryGeneric } from "convex/server"
import { v } from "convex/values"
import { searchManageableScopeOptions as searchOptions } from "./lib/oaScopeAuthorization"
import { getUserBySession } from "./reviewer/lib"

const scopePurposeValidator = v.union(
  v.literal("form_audience"),
  v.literal("workflow_approver"),
  v.literal("notification"),
)

const selectedScopeValidator = v.object({
  identityTypes: v.optional(v.array(v.union(
    v.literal("undergrad"),
    v.literal("graduate"),
    v.literal("teacher"),
    v.literal("other"),
  ))),
  roles: v.optional(v.array(v.union(
    v.literal("member"),
    v.literal("admin"),
    v.literal("super_admin"),
  ))),
  userIds: v.optional(v.array(v.id("users"))),
  researchGroupIds: v.optional(v.array(v.id("researchGroups"))),
  userGroupIds: v.optional(v.array(v.id("userGroups"))),
})

export const searchManageableScopeOptions = queryGeneric({
  args: {
    sessionToken: v.string(),
    purpose: scopePurposeValidator,
    query: v.optional(v.string()),
    selectedScope: v.optional(selectedScopeValidator),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    return searchOptions(ctx, actor, {
      purpose: args.purpose,
      query: args.query,
      selectedScope: args.selectedScope,
    })
  },
})
