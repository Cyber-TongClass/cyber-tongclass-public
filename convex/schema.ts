import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const oaFieldType = v.union(
  v.literal("text"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("date"),
  v.literal("select"),
  v.literal("radio"),
  v.literal("checkbox"),
  v.literal("file"),
  v.literal("table")
)

const oaResultFieldType = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("date"),
  v.literal("select")
)

const oaOption = v.object({
  label: v.string(),
  value: v.string(),
})

const oaTableColumn = v.object({
  id: v.string(),
  label: v.string(),
  type: v.union(v.literal("text"), v.literal("number"), v.literal("date")),
  required: v.optional(v.boolean()),
})

const oaFormField = v.object({
  id: v.string(),
  type: oaFieldType,
  label: v.string(),
  helpText: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  required: v.optional(v.boolean()),
  options: v.optional(v.array(oaOption)),
  acceptedMimeTypes: v.optional(v.array(v.string())),
  maxFiles: v.optional(v.number()),
  maxFileSizeMB: v.optional(v.number()),
  columns: v.optional(v.array(oaTableColumn)),
})

const oaResultField = v.object({
  id: v.string(),
  label: v.string(),
  type: oaResultFieldType,
  visibleToSubmitter: v.optional(v.boolean()),
  options: v.optional(v.array(oaOption)),
})

// These OA workflow validators are additive. A form without targetScope or
// approvalSteps remains a legacy Tong Class form and keeps its current manual
// review behavior.
const oaUserIdentityType = v.union(
  v.literal("undergrad"),
  v.literal("graduate"),
  v.literal("teacher"),
  v.literal("other"),
)

const oaUserRole = v.union(
  v.literal("member"),
  v.literal("admin"),
  v.literal("super_admin"),
)

/** A scope is the union of its configured account identities, roles, and IDs. */
const oaUserScope = v.object({
  identityTypes: v.optional(v.array(oaUserIdentityType)),
  roles: v.optional(v.array(oaUserRole)),
  userIds: v.optional(v.array(v.id("users"))),
  researchGroupIds: v.optional(v.array(v.id("researchGroups"))),
  userGroupIds: v.optional(v.array(v.id("userGroups"))),
})

const oaApprovalStep = v.object({
  id: v.string(),
  title: v.string(),
  scope: oaUserScope,
  // "any" lets one recipient complete the step; "all" requires every
  // recipient in the immutable submission snapshot to approve.
  completion: v.optional(v.union(v.literal("any"), v.literal("all"))),
})

const oaWorkflowNode = v.union(
  v.object({
    id: v.string(),
    type: v.literal("create_form"),
    title: v.string(),
  }),
  v.object({
    id: v.string(),
    type: v.literal("approval"),
    title: v.string(),
    scope: oaUserScope,
  }),
  v.object({
    id: v.string(),
    type: v.literal("batch_approval"),
    title: v.string(),
    scope: oaUserScope,
    completion: v.union(v.literal("any"), v.literal("all")),
  }),
  v.object({
    id: v.string(),
    type: v.literal("fill_form"),
    title: v.string(),
    targetFormId: v.id("oaForms"),
  }),
  v.object({
    id: v.string(),
    type: v.literal("notification"),
    title: v.string(),
    scope: oaUserScope,
    message: v.string(),
  }),
)

const oaWorkflowDefinition = v.object({
  version: v.literal(2),
  nodes: v.array(oaWorkflowNode),
})

const oaWorkflowStatus = v.union(
  v.literal("pending"),
  v.literal("needs_changes"),
  v.literal("approved"),
  v.literal("rejected"),
)

const oaApprovalTaskStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("skipped"),
  v.literal("changes_requested"),
)

const oaApprovalEventAction = v.union(
  v.literal("workflow_started"),
  v.literal("step_started"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("step_completed"),
  v.literal("workflow_approved"),
  v.literal("workflow_rejected"),
  v.literal("changes_requested"),
  v.literal("workflow_changes_requested"),
  v.literal("resubmitted"),
  v.literal("form_access_granted"),
  v.literal("notification_sent"),
  v.literal("workflow_paused"),
  v.literal("workflow_withdrawn"),
)

// Coffee Talk is intentionally a lightweight application workflow, not a
// reservation or calendar system. These validators are kept at schema level
// so application rows and their append-only history share one fixed contract.
const coffeeTalkStatus = v.union(
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("needs_information"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("withdrawn"),
  v.literal("cancelled"),
  v.literal("completed"),
)

const coffeeTalkEventAction = v.union(
  v.literal("submitted"),
  v.literal("start_review"),
  v.literal("accept"),
  v.literal("decline"),
  v.literal("withdraw"),
  v.literal("cancel"),
  v.literal("complete"),
  v.literal("reassign"),
  v.literal("correct"),
  v.literal("request_information"),
  v.literal("supplement"),
)

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    username: v.string(),
    englishName: v.string(),
    chineseName: v.optional(v.string()),
    role: v.union(v.literal("member"), v.literal("admin"), v.literal("super_admin")),
    // AIA descriptive identity remains independent from the persisted access
    // role. It stays optional so legacy accounts can resolve safely without a
    // destructive migration.
    identityType: v.optional(v.union(
      v.literal("undergrad"),
      v.literal("graduate"),
      v.literal("teacher"),
      v.literal("other"),
    )),
    accountStatus: v.optional(v.union(
      v.literal("active"),
      v.literal("disabled"),
    )),
    organization: v.union(v.literal("pku"), v.literal("thu")),
    cohort: v.union(v.number(), v.literal("mascot")),
    studentId: v.string(),
    personalEmails: v.optional(v.array(v.string())),
    personalEmail: v.optional(v.string()),
    bio: v.optional(v.string()),
    profileMarkdown: v.optional(v.string()),
    researchDirections: v.optional(v.array(v.string())),
    researchInterests: v.optional(v.array(v.string())),
    links: v.optional(v.array(v.object({
      type: v.union(
        v.literal("homepage"),
        v.literal("scholar"),
        v.literal("orcid"),
        v.literal("github"),
        v.literal("x"),
        v.literal("xiaohongshu"),
        v.literal("linkedin"),
        v.literal("custom")
      ),
      label: v.string(),
      url: v.string(),
    }))),
    titles: v.optional(v.array(v.object({ title: v.string(), link: v.string() }))),
    scholarUrl: v.optional(v.string()),
    orcidUrl: v.optional(v.string()),
    avatar: v.optional(v.string()),
    realPhoto: v.optional(v.string()),
    isClassMember: v.optional(v.boolean()),
    isEmailVerified: v.boolean(),
    lastVerificationRequestedAt: v.optional(v.number()),
    // Track approvals for moderation reputation
    approvedContributions: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_studentId", ["studentId"])
    .index("by_role", ["role"])
    .index("by_organization", ["organization", "cohort"]),

  // Account capabilities are explicit, reusable grants. A missing row uses the
  // capability's documented default; an explicit disabled row preserves a
  // super administrator's revocation through repeated provisioning.
  accountCapabilities: defineTable({
    userId: v.id("users"),
    capability: v.union(
      v.literal("manage_research_group_members"),
      v.literal("coordinate_coffee_talk"),
    ),
    enabled: v.boolean(),
    grantedAt: v.number(),
    updatedAt: v.number(),
    changedByUserId: v.optional(v.id("users")),
  })
    .index("by_user_capability", ["userId", "capability"]),

  // Admin-curated user groups for organizational scoping (form visibility,
  // approval routing). Membership is explicit and many-to-many — unlike
  // research-group assignments, one account can belong to any number of
  // user groups.
  userGroups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  userGroupMemberships: defineTable({
    groupId: v.id("userGroups"),
    userId: v.id("users"),
    addedByUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_groupId", ["groupId"])
    .index("by_userId", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),

  // Publications table
  publications: defineTable({
    title: v.string(),
    authors: v.array(v.string()),
    venue: v.string(),
    year: v.number(),
    abstract: v.string(),
    url: v.optional(v.string()),
    doi: v.optional(v.string()),
    category: v.string(),
    subCategory: v.optional(v.string()),
    // Existing records without a scope remain Tong Class content.
    siteScope: v.optional(v.union(v.literal("tong_class"), v.literal("institute"))),
    visibility: v.optional(v.union(v.literal("public"), v.literal("hidden"))),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_year", ["year"])
    .index("by_category", ["category"])
    .index("by_siteScope_visibility_year", ["siteScope", "visibility", "year"])
    .index("by_doi", ["doi"])
    .searchIndex("search_title", { searchField: "title" }),

  publicationVenues: defineTable({
    name: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"]),

  // Course reviews table
  courseReviews: defineTable({
    courseName: v.string(),
    instructor: v.optional(v.string()),
    semesterYear: v.optional(v.number()),
    semesterTerm: v.optional(v.union(v.literal("spring"), v.literal("fall"))),
    overallRating: v.optional(v.number()),
    rating: v.optional(v.number()),
    semester: v.optional(v.string()),
    department: v.optional(v.string()),
    attendanceRequired: v.optional(v.boolean()),
    workload: v.optional(v.number()),
    pace: v.optional(v.number()),
    gradingFairness: v.optional(v.number()),
    courseAverageScore: v.optional(v.number()),
    personalScore: v.optional(v.number()),
    recommendedStudyMethod: v.optional(v.union(v.literal("attend"), v.literal("recording"), v.literal("self_study"))),
    content: v.string(),
    isAnonymous: v.boolean(),
    authorId: v.optional(v.id("users")),
    // New fields: tags and active flag (optional for migration)
    tags: v.optional(v.array(v.string())),
    active: v.optional(v.boolean()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_course", ["courseName"])
    .index("by_status", ["status"])
    .index("by_instructor", ["instructor"])
    .index("by_semester", ["semesterYear", "semesterTerm"]),

  // Review tag metadata (color, etc.)
  reviewTags: defineTable({
    name: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"]),

  // News table
  news: defineTable({
    title: v.string(),
    content: v.string(),
    sourceUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    showOnHomepage: v.optional(v.boolean()),
    homepageSubtitle: v.optional(v.string()),
    authorId: v.id("users"),
    authorName: v.optional(v.string()),
    category: v.string(),
    publishedAt: v.number(),
    isPublished: v.boolean(),
    // Existing records without a scope remain Tong Class content.
    siteScope: v.optional(v.union(v.literal("tong_class"), v.literal("institute"))),
    // Optional audience restriction set by permission-created content.
    targetScope: v.optional(v.object({
      identityTypes: v.optional(v.array(v.string())),
      roles: v.optional(v.array(v.string())),
      userIds: v.optional(v.array(v.id("users"))),
      researchGroupIds: v.optional(v.array(v.id("researchGroups"))),
      userGroupIds: v.optional(v.array(v.id("userGroups"))),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_publishedAt", ["publishedAt"])
    .index("by_category", ["category"])
    .index("by_author", ["authorId"])
    .index("by_siteScope_isPublished_publishedAt", ["siteScope", "isPublished", "publishedAt"])
    .searchIndex("search_title", { searchField: "title" }),

  // Institute directory records intentionally remain separate from login accounts.
  institutePeople: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("teacher"), v.literal("graduate")),
    // Optional account identity snapshot for directory records. `kind` remains
    // the public-directory presentation while identityType drives private
    // audience/brand decisions when this person is linked to an account.
    identityType: v.optional(v.union(
      v.literal("undergrad"),
      v.literal("graduate"),
      v.literal("teacher"),
      v.literal("other"),
    )),
    nameZh: v.string(),
    nameEn: v.string(),
    titleZh: v.optional(v.string()),
    titleEn: v.optional(v.string()),
    bioZh: v.optional(v.string()),
    bioEn: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    researchAreas: v.array(v.string()),
    publicLinks: v.array(v.object({
      kind: v.union(
        v.literal("homepage"),
        v.literal("scholar"),
        v.literal("orcid"),
        v.literal("github"),
        v.literal("other"),
      ),
      label: v.string(),
      href: v.string(),
    })),
    publicEmail: v.optional(v.string()),
    coffeeTalkOpen: v.optional(v.boolean()),
    visibility: v.union(v.literal("public"), v.literal("hidden")),
    displayOrder: v.number(),
    isDemo: v.boolean(),
    accountUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_visibility_kind_order", ["visibility", "kind", "displayOrder"])
    .index("by_accountUserId", ["accountUserId"]),

  researchGroups: defineTable({
    slug: v.string(),
    nameZh: v.string(),
    nameEn: v.string(),
    summaryZh: v.optional(v.string()),
    summaryEn: v.optional(v.string()),
    descriptionZh: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    leaderPersonId: v.id("institutePeople"),
    researchAreas: v.array(v.string()),
    publicLinks: v.array(v.object({
      label: v.string(),
      href: v.string(),
    })),
    recruitmentZh: v.optional(v.string()),
    recruitmentEn: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("hidden")),
    displayOrder: v.number(),
    isDemo: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_visibility_order", ["visibility", "displayOrder"])
    .index("by_leaderPersonId", ["leaderPersonId"]),

  researchGroupMemberships: defineTable({
    personId: v.id("institutePeople"),
    researchGroupId: v.id("researchGroups"),
    role: v.union(
      v.literal("leader"),
      v.literal("faculty"),
      v.literal("graduate"),
      v.literal("member"),
    ),
    isPrimary: v.boolean(),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    visibility: v.union(v.literal("public"), v.literal("hidden")),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_person_group", ["personId", "researchGroupId"])
    .index("by_group_order", ["researchGroupId", "sortOrder"])
    .index("by_person_order", ["personId", "sortOrder"]),

  // This private account-level assignment drives internal group scoping. It is
  // deliberately separate from the public-directory membership table above;
  // one account can belong to at most one research group. The optional
  // subtitle is a per-member role note set by the group leader (e.g. 工程师);
  // only the member's display name and subtitle are ever exposed publicly.
  studentResearchGroupAssignments: defineTable({
    studentUserId: v.id("users"),
    researchGroupId: v.id("researchGroups"),
    subtitle: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    assignedByUserId: v.id("users"),
    assignedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_studentUserId", ["studentUserId"])
    .index("by_researchGroupId", ["researchGroupId"]),

  researchGroupPublicationVisibilityOverrides: defineTable({
    researchGroupId: v.id("researchGroups"),
    publicationId: v.id("publications"),
    visible: v.boolean(),
    changedByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_group_publication", ["researchGroupId", "publicationId"])
    .index("by_group", ["researchGroupId"]),

  publicationAuthorships: defineTable({
    publicationId: v.id("publications"),
    personId: v.id("institutePeople"),
    role: v.union(
      v.literal("author"),
      v.literal("corresponding_author"),
      v.literal("advisor"),
    ),
    authorOrder: v.number(),
    isPrimary: v.optional(v.boolean()),
    naturalKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_naturalKey", ["naturalKey"])
    .index("by_publication_person", ["publicationId", "personId"])
    .index("by_person_publication", ["personId", "publicationId"])
    .index("by_publication_order", ["publicationId", "authorOrder"]),

  contentMentions: defineTable({
    contentType: v.union(v.literal("publication"), v.literal("news")),
    contentId: v.union(v.id("publications"), v.id("news")),
    targetType: v.union(v.literal("person"), v.literal("researchGroup")),
    targetId: v.union(v.id("institutePeople"), v.id("researchGroups")),
    relation: v.union(
      v.literal("featured"),
      v.literal("related"),
      v.literal("contributor"),
    ),
    sortOrder: v.number(),
    naturalKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_naturalKey", ["naturalKey"])
    .index("by_content", ["contentType", "contentId", "sortOrder"])
    .index("by_target", ["targetType", "targetId", "sortOrder"]),

  // A request is tied to the authenticated applicant and an explicitly
  // selected public institute teacher record. The record never stores a
  // client-supplied teacher user ID, so account bindings stay server-derived.
  coffeeTalkApplications: defineTable({
    applicantUserId: v.id("users"),
    assignedTeacherPersonId: v.id("institutePeople"),
    applicantName: v.optional(v.string()),
    applicantAffiliation: v.optional(v.string()),
    applicantIdentity: v.optional(v.union(
      v.literal("undergraduate"),
      v.literal("graduate"),
      v.literal("teacher"),
      v.literal("other"),
    )),
    applicantEmail: v.optional(v.string()),
    topic: v.string(),
    purpose: v.optional(v.string()),
    researchBackground: v.optional(v.string()),
    expectedOutcome: v.optional(v.string()),
    preferredFormat: v.optional(v.union(
      v.literal("online"),
      v.literal("offline"),
      v.literal("either"),
    )),
    availability: v.string(),
    notes: v.optional(v.string()),
    supplementalInformation: v.optional(v.string()),
    consentToShareProfile: v.optional(v.boolean()),
    idempotencyKey: v.optional(v.string()),
    requestPayloadFingerprint: v.optional(v.string()),
    status: coffeeTalkStatus,
    contentFingerprint: v.string(),
    version: v.number(),
    submittedAt: v.number(),
    statusChangedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_applicant_fingerprint", ["applicantUserId", "contentFingerprint"])
    .index("by_applicant_updatedAt", ["applicantUserId", "updatedAt"])
    .index("by_teacher_updatedAt", ["assignedTeacherPersonId", "updatedAt"]),

  // Events are append-only by contract. No Coffee Talk endpoint updates or
  // deletes this table; mutations only add the next sequence number.
  coffeeTalkEvents: defineTable({
    applicationId: v.id("coffeeTalkApplications"),
    sequenceNo: v.number(),
    actorUserId: v.optional(v.id("users")),
    actorKind: v.union(
      v.literal("applicant"),
      v.literal("teacher"),
      v.literal("coordinator"),
      v.literal("system"),
    ),
    action: coffeeTalkEventAction,
    fromStatus: v.optional(coffeeTalkStatus),
    toStatus: coffeeTalkStatus,
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_application_sequence", ["applicationId", "sequenceNo"]),

  // Notifications deliberately contain no request topic, availability, or
  // contact data. The authorized recipient can load a role-specific DTO.
  notifications: defineTable({
    userId: v.id("users"),
    // Keep the existing Coffee Talk rows valid while making the inbox usable
    // for staged OA approvals. Resource IDs stay typed by resourceType.
    kind: v.union(v.literal("coffee_talk"), v.literal("oa_workflow"), v.literal("content_review")),
    title: v.string(),
    body: v.string(),
    resourceType: v.union(v.literal("coffee_talk"), v.literal("oa_workflow"), v.literal("content_review")),
    resourceId: v.union(v.id("coffeeTalkApplications"), v.id("oaFormSubmissions"), v.id("contentSubmissions")),
    naturalKey: v.optional(v.string()),
    readAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_naturalKey", ["naturalKey"]),

  // Per-category content rights granted by the super admin. A row exists for
  // every listed person; the two flags carry the actual rights.
  contentPermissions: defineTable({
    category: v.union(v.literal("news"), v.literal("events"), v.literal("reimbursement")),
    userId: v.id("users"),
    canCreate: v.boolean(),
    canManage: v.boolean(),
    grantedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category_user", ["category", "userId"])
    .index("by_user", ["userId"]),

  // Fixed publication flow for permission-created news/events:
  // creator submits -> every reviewer in the resolved panel approves, or any
  // one reviewer rejects.
  contentSubmissions: defineTable({
    category: v.union(v.literal("news"), v.literal("events")),
    title: v.string(),
    payload: v.object({
      content: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
      coverImageUrl: v.optional(v.string()),
      newsCategory: v.optional(v.string()),
      date: v.optional(v.string()),
      time: v.optional(v.string()),
      endDate: v.optional(v.string()),
      endTime: v.optional(v.string()),
      location: v.optional(v.string()),
      description: v.optional(v.string()),
      url: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
    // Explicit empty scope means all institute accounts; absent means public.
    targetScope: v.optional(v.object({
      identityTypes: v.optional(v.array(v.string())),
      roles: v.optional(v.array(v.string())),
      userIds: v.optional(v.array(v.id("users"))),
      researchGroupIds: v.optional(v.array(v.id("researchGroups"))),
      userGroupIds: v.optional(v.array(v.id("userGroups"))),
    })),
    createdBy: v.id("users"),
    creatorName: v.string(),
    // A caller-generated key makes submit retries safe. The fingerprint
    // rejects accidental reuse of the same key for different draft content.
    idempotencyKey: v.optional(v.string()),
    requestFingerprint: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reviewedBy: v.optional(v.id("users")),
    reviewerName: v.optional(v.string()),
    reviewComment: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    publishedContentId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category_status_createdAt", ["category", "status", "createdAt"])
    .index("by_creator_createdAt", ["createdBy", "createdAt"])
    .index("by_creator_idempotency", ["createdBy", "idempotencyKey"]),

  // Immutable reviewer panel resolved when content is submitted. Every task
  // must approve; one rejection skips the still-pending siblings.
  contentReviewTasks: defineTable({
    submissionId: v.id("contentSubmissions"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("skipped"),
    ),
    comment: v.optional(v.string()),
    naturalKey: v.string(),
    decidedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_naturalKey", ["naturalKey"])
    .index("by_submission", ["submissionId"])
    .index("by_submission_user", ["submissionId", "userId"])
    .index("by_user_status_createdAt", ["userId", "status", "createdAt"]),

  // Events table
  events: defineTable({
    title: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    endDate: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    color: v.string(),
    audiences: v.optional(v.array(v.union(v.literal("undergrad"), v.literal("graduate")))),
    // Optional audience restriction set by permission-created content.
    targetScope: v.optional(v.object({
      identityTypes: v.optional(v.array(v.string())),
      roles: v.optional(v.array(v.string())),
      userIds: v.optional(v.array(v.id("users"))),
      researchGroupIds: v.optional(v.array(v.id("researchGroups"))),
      userGroupIds: v.optional(v.array(v.id("userGroups"))),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"]),

  // Courses table
  courses: defineTable({
    name: v.string(),
    department: v.optional(v.string()),
    instructor: v.optional(v.string()),
    isTongClassCourse: v.optional(v.boolean()),
    // Soft-delete support
    isActive: v.optional(v.boolean()),
    removedAt: v.optional(v.number()),
    reviewCount: v.number(),
    averageRating: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"]),

  treeholePosts: defineTable({
    serialNumber: v.optional(v.number()),
    title: v.string(),
    content: v.string(),
    isAnonymous: v.boolean(),
    authorId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"]),

  treeholeReplies: defineTable({
    postId: v.id("treeholePosts"),
    content: v.string(),
    isAnonymous: v.boolean(),
    authorId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"]),

  contentVotes: defineTable({
    userId: v.id("users"),
    targetType: v.union(v.literal("treeholePost"), v.literal("treeholeReply"), v.literal("courseReview")),
    targetId: v.string(),
    value: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_target", ["targetType", "targetId"])
    .index("by_user_target", ["userId", "targetType", "targetId"]),

  feedbackEntries: defineTable({
    title: v.string(),
    content: v.string(),
    isAnonymous: v.boolean(),
    authorId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"]),

  studentFormProfiles: defineTable({
    userId: v.id("users"),
    gender: v.optional(v.string()),
    phone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  academicExchangeSupportApplications: defineTable({
    userId: v.id("users"),
    applicantName: v.string(),
    studentId: v.string(),
    email: v.string(),
    gender: v.optional(v.string()),
    phone: v.optional(v.string()),
    projectCategory: v.string(),
    projectName: v.string(),
    exchangeLocation: v.string(),
    projectTime: v.string(),
    otherFunding: v.string(),
    projectPlan: v.string(),
    expenseItems: v.array(v.object({
      item: v.string(),
      amount: v.number(),
      note: v.optional(v.string()),
    })),
    totalAmount: v.number(),
    applicationDate: v.string(),
    publicationId: v.optional(v.id("publications")),
    paperTitle: v.optional(v.string()),
    paperAuthors: v.optional(v.array(v.string())),
    applicantAuthorName: v.optional(v.string()),
    applicantAuthorIndexLabel: v.optional(v.string()),
    applicantAffiliation: v.optional(v.string()),
    totalPages: v.optional(v.number()),
    bodyPages: v.optional(v.number()),
    paperPdfUrl: v.optional(v.string()),
    paperPdfSource: v.optional(v.union(v.literal("url"), v.literal("upload"))),
    paperPdfStorageId: v.optional(v.union(v.id("_storage"), v.string())),
    paperPdfFileName: v.optional(v.string()),
    paperPdfMimeType: v.optional(v.string()),
    paperPdfSize: v.optional(v.number()),
    // Immutable at creation. Optional keeps applications created before the
    // brand split readable through the owner-identity fallback.
    pdfBrand: v.optional(v.union(v.literal("tong_class"), v.literal("institute"))),
    status: v.union(
      v.literal("submitted"),
      v.literal("reviewing"),
      v.literal("needs_changes"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("withdrawn"),
    ),
    reviewNote: v.optional(v.string()),
    reviewerName: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    // New applications bridge into the unified OA task system. Optional keeps
    // historical Reviewer-only records readable without a migration.
    oaSubmissionId: v.optional(v.id("oaFormSubmissions")),
    // Stable client request identity prevents double-clicks and transport
    // retries from creating two applications and two OA workflows.
    creationIdempotencyKey: v.optional(v.string()),
    creationRequestFingerprint: v.optional(v.string()),
    submittedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_user_idempotency", ["userId", "creationIdempotencyKey"])
    .index("by_oaSubmissionId", ["oaSubmissionId"])
    .index("by_createdAt", ["createdAt"]),

  reimbursementMaterialTables: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    columns: v.array(v.object({
      id: v.string(),
      label: v.string(),
      width: v.optional(v.string()),
    })),
    rows: v.array(v.object({
      id: v.string(),
      cells: v.array(v.string()),
      kind: v.optional(v.union(v.literal("data"), v.literal("section"))),
      sectionLevel: v.optional(v.number()),
    })),
    isPublished: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_published_category", ["isPublished", "category"]),

  oaForms: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    kind: v.optional(v.union(v.literal("form"), v.literal("reimbursement"))),
    // Admin-curated pin for the OA workspace; the timestamp doubles as the pin order.
    pinnedAt: v.optional(v.number()),
    visibility: v.union(v.literal("members"), v.literal("admins")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    allowMultipleSubmissions: v.optional(v.boolean()),
    maxSubmissionsPerUser: v.optional(v.number()),
    allowSubmissionEdits: v.optional(v.boolean()),
    openAt: v.optional(v.number()),
    closeAt: v.optional(v.number()),
    fields: v.array(oaFormField),
    resultFields: v.optional(v.array(oaResultField)),
    resultsVisible: v.optional(v.boolean()),
    // Optional AIA audience and workflow configuration. Their absence is the
    // compatibility contract for all legacy Tong Class forms.
    targetScope: v.optional(oaUserScope),
    approvalSteps: v.optional(v.array(oaApprovalStep)),
    workflowDefinition: v.optional(oaWorkflowDefinition),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_category", ["status", "category"])
    .index("by_creator_createdAt", ["createdBy", "createdAt"])
    .index("by_updatedAt", ["updatedAt"]),

  oaFormSubmissions: defineTable({
    formId: v.id("oaForms"),
    formSlug: v.string(),
    submitterId: v.id("users"),
    submitterName: v.string(),
    studentId: v.string(),
    submitterEmail: v.optional(v.string()),
    answers: v.any(),
    formSnapshot: v.optional(v.any()),
    reviewStatus: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("needs_changes")),
    adminNote: v.optional(v.string()),
    reviewerId: v.optional(v.id("users")),
    reviewerName: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    resultValues: v.optional(v.any()),
    // Workflow fields are optional so pre-existing submissions remain valid.
    workflowStatus: v.optional(oaWorkflowStatus),
    currentApprovalStep: v.optional(v.number()),
    approvalStepsSnapshot: v.optional(v.array(oaApprovalStep)),
    workflowDefinitionSnapshot: v.optional(oaWorkflowDefinition),
    currentWorkflowNodeIndex: v.optional(v.number()),
    workflowError: v.optional(v.string()),
    workflowStartedAt: v.optional(v.number()),
    workflowCompletedAt: v.optional(v.number()),
    workflowVersion: v.optional(v.number()),
    submissionIdempotencyKey: v.optional(v.string()),
    submissionRequestFingerprint: v.optional(v.string()),
    submittedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_form_createdAt", ["formId", "createdAt"])
    .index("by_form_status_createdAt", ["formId", "reviewStatus", "createdAt"])
    .index("by_submitter_createdAt", ["submitterId", "createdAt"])
    .index("by_form_submitter_createdAt", ["formId", "submitterId", "createdAt"])
    .index("by_submitter_idempotency", ["submitterId", "submissionIdempotencyKey"])
    .index("by_form_studentId", ["formId", "studentId"]),

  // A workflow fill-form node grants one submitter access to a later form.
  // The deterministic natural key keeps retries idempotent.
  oaFormAccessGrants: defineTable({
    formId: v.id("oaForms"),
    userId: v.id("users"),
    sourceSubmissionId: v.id("oaFormSubmissions"),
    nodeId: v.string(),
    workflowVersion: v.number(),
    naturalKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_naturalKey", ["naturalKey"])
    .index("by_form_user", ["formId", "userId"])
    .index("by_user_createdAt", ["userId", "createdAt"]),

  // A task is the authorization snapshot for one recipient at one ordered
  // workflow step. A scope change on the form cannot retarget submissions
  // that have already started.
  oaApprovalTasks: defineTable({
    submissionId: v.id("oaFormSubmissions"),
    formId: v.id("oaForms"),
    stepIndex: v.number(),
    stepId: v.string(),
    userId: v.id("users"),
    status: oaApprovalTaskStatus,
    workflowVersion: v.optional(v.number()),
    naturalKey: v.optional(v.string()),
    actedAt: v.optional(v.number()),
    comment: v.optional(v.string()),
    actionIdempotencyKey: v.optional(v.string()),
    actionRequestFingerprint: v.optional(v.string()),
    actionResult: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_naturalKey", ["naturalKey"])
    .index("by_submission_step", ["submissionId", "stepIndex"])
    .index("by_submission_user", ["submissionId", "userId"])
    .index("by_user_status_createdAt", ["userId", "status", "createdAt"]),

  // Workflow history is append-only. It intentionally stores no form answer
  // data, allowing task timelines without widening access to sensitive fields.
  oaApprovalEvents: defineTable({
    submissionId: v.id("oaFormSubmissions"),
    formId: v.id("oaForms"),
    stepIndex: v.optional(v.number()),
    stepId: v.optional(v.string()),
    actorUserId: v.optional(v.id("users")),
    workflowVersion: v.optional(v.number()),
    nodeType: v.optional(v.string()),
    action: oaApprovalEventAction,
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_submission_createdAt", ["submissionId", "createdAt"]),

  reviewerAccounts: defineTable({
    username: v.string(),
    displayName: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    passwordAlgorithm: v.optional(v.literal("pbkdf2-sha256")),
    passwordIterations: v.optional(v.number()),
    failedLoginAttempts: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
    enabled: v.boolean(),
    permissions: v.array(v.string()),
    createdBy: v.id("users"),
    // A Reviewer credential stays independent. This optional link is the
    // only way a main-site teacher can derive the narrow Reviewer capability.
    // No name or email is stored or used as a fallback identifier.
    mainUserId: v.optional(v.id("users")),
    teacherDerivedEnabled: v.optional(v.boolean()),
    linkedAt: v.optional(v.number()),
    linkedByUserId: v.optional(v.id("users")),
    linkMethod: v.optional(v.union(
      v.literal("super_admin"),
      v.literal("dual_session"),
    )),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_enabled", ["enabled"])
    .index("by_mainUserId", ["mainUserId"]),

  reviewerSessions: defineTable({
    reviewerId: v.id("reviewerAccounts"),
    tokenHash: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_reviewer", ["reviewerId"]),

  reviewerAuditLogs: defineTable({
    reviewerId: v.id("reviewerAccounts"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    credentialSource: v.optional(v.union(
      v.literal("independent"),
      v.literal("teacher_derived"),
    )),
    mainUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_reviewer_createdAt", ["reviewerId", "createdAt"])
    .index("by_target", ["targetType", "targetId"]),

  // Auth config table (for pre-registered student IDs)
  authConfig: defineTable({
    allowedStudentIds: v.array(v.string()),
    updatedAt: v.number(),
  }),

  // Auth credentials table (for password auth)
  authCredentials: defineTable({
    userId: v.id("users"),
    passwordHash: v.string(),
    salt: v.optional(v.string()),
    passwordAlgorithm: v.optional(v.literal("pbkdf2-sha256")),
    passwordIterations: v.optional(v.number()),
    failedLoginAttempts: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
  })
    .index("by_userId", ["userId"]),

  authSessions: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_user", ["userId"]),

  emailVerifications: defineTable({
    tokenHash: v.string(),
    codeHash: v.optional(v.string()),
    purpose: v.union(v.literal("email_verification"), v.literal("password_reset")),
    userId: v.optional(v.id("users")),
    sentTo: v.string(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    resetCompletedAt: v.optional(v.number()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_sentTo", ["sentTo"])
    .index("by_ip", ["ip"])
    .index("by_createdAt", ["createdAt"]),

  techDayUsers: defineTable({
    email: v.string(),
    name: v.string(),
    school: v.optional(v.string()),
    college: v.optional(v.string()),
    grade: v.optional(v.string()),
    studentId: v.optional(v.string()),
    role: v.union(v.literal("author"), v.literal("volunteer"), v.literal("reviewer"), v.literal("admin")),
    mainUserId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("techDayOrganizations")),
    roleTemplateId: v.optional(v.id("techDayRoleTemplates")),
    volunteerTracks: v.optional(v.array(v.string())),
    assignedTracks: v.optional(v.array(v.string())),
    availabilitySlots: v.optional(v.array(v.string())),
    voteCounterOptIn: v.optional(v.boolean()),
    reviewerDirectionId: v.optional(v.id("techDayDirections")),
    reviewerInviteId: v.optional(v.id("techDayReviewerInvites")),
    canPublishNews: v.optional(v.boolean()),
    canSubmitPapers: v.optional(v.boolean()),
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("disabled")),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_studentId", ["studentId"])
    .index("by_role", ["role"])
    .index("by_mainUser", ["mainUserId"])
    .index("by_roleTemplate", ["roleTemplateId"])
    .index("by_reviewerDirection", ["reviewerDirectionId"])
    .index("by_reviewerInvite", ["reviewerInviteId"])
    .index("by_legacyId", ["legacyId"]),

  techDayCredentials: defineTable({
    userId: v.id("techDayUsers"),
    passwordHash: v.string(),
    salt: v.string(),
    legacyHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  techDaySessions: defineTable({
    userId: v.id("techDayUsers"),
    tokenHash: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_user", ["userId"]),

  techDayOrganizations: defineTable({
    name: v.string(),
    responsibility: v.string(),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_legacyId", ["legacyId"]),

  techDayRoleTemplates: defineTable({
    name: v.string(),
    canEditVoteData: v.boolean(),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_legacyId", ["legacyId"]),

  techDayDirections: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_legacyId", ["legacyId"]),

  techDaySettings: defineTable({
    key: v.string(),
    showVoteData: v.boolean(),
    voteSortEnabled: v.boolean(),
    voteEditRoleTemplateId: v.optional(v.id("techDayRoleTemplates")),
    visibleAwardIds: v.optional(v.array(v.id("techDayAwards"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  techDaySubmissions: defineTable({
    sequenceNo: v.optional(v.number()),
    title: v.string(),
    abstract: v.string(),
    contact: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    venue: v.optional(v.string()),
    track: v.optional(v.union(v.literal("poster"), v.literal("demo"))),
    topic: v.optional(v.string()),
    reviewStatus: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    status: v.optional(v.string()),
    publicationStatus: v.optional(v.union(v.literal("accepted"), v.literal("published"))),
    archiveConsent: v.optional(v.boolean()),
    directionId: v.optional(v.id("techDayDirections")),
    authorId: v.optional(v.id("techDayUsers")),
    mainUserId: v.optional(v.id("users")),
    authors: v.optional(v.any()),
    year: v.optional(v.number()),
    voteInnovation: v.optional(v.number()),
    voteImpact: v.optional(v.number()),
    voteFeasibility: v.optional(v.number()),
    paperUrl: v.optional(v.string()),
    posterStorageId: v.optional(v.union(v.id("_storage"), v.string())),
    posterFileName: v.optional(v.string()),
    posterMimeType: v.optional(v.string()),
    posterSize: v.optional(v.number()),
    legacyPosterPath: v.optional(v.string()),
    awardText: v.optional(v.string()),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author_createdAt", ["authorId", "createdAt"])
    .index("by_track_status_year_updatedAt", ["track", "reviewStatus", "year", "updatedAt"])
    .index("by_track_status_direction_year_updatedAt", ["track", "reviewStatus", "directionId", "year", "updatedAt"])
    .index("by_track_status_year_sequenceNo", ["track", "reviewStatus", "year", "sequenceNo"])
    .index("by_legacyId", ["legacyId"]),

  techDaySubmissionVoteLogs: defineTable({
    submissionId: v.id("techDaySubmissions"),
    userId: v.id("techDayUsers"),
    fieldName: v.union(v.literal("voteInnovation"), v.literal("voteImpact"), v.literal("voteFeasibility")),
    oldValue: v.optional(v.number()),
    newValue: v.optional(v.number()),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_submission_createdAt", ["submissionId", "createdAt"])
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_legacyId", ["legacyId"]),

  techDayReimbursements: defineTable({
    projectName: v.string(),
    organization: v.string(),
    content: v.string(),
    quantity: v.optional(v.number()),
    amount: v.number(),
    invoiceCompany: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("waiting_more")),
    adminNote: v.optional(v.string()),
    applicantId: v.id("techDayUsers"),
    submitterId: v.optional(v.id("techDayUsers")),
    submittedAt: v.optional(v.number()),
    reviewerId: v.optional(v.id("techDayUsers")),
    reviewerNameSnapshot: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    attachmentStorageId: v.optional(v.union(v.id("_storage"), v.string())),
    attachmentFileName: v.optional(v.string()),
    attachmentMimeType: v.optional(v.string()),
    attachmentSize: v.optional(v.number()),
    legacyFilePath: v.optional(v.string()),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_applicant_createdAt", ["applicantId", "createdAt"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_organization_createdAt", ["organization", "createdAt"])
    .index("by_legacyId", ["legacyId"]),

  techDayReviewerInvites: defineTable({
    code: v.string(),
    presetDirectionId: v.optional(v.id("techDayDirections")),
    reviewerName: v.optional(v.string()),
    reviewerEmail: v.optional(v.string()),
    reviewerDirectionId: v.optional(v.id("techDayDirections")),
    isUsed: v.boolean(),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_isUsed", ["isUsed"])
    .index("by_presetDirection", ["presetDirectionId"])
    .index("by_reviewerDirection", ["reviewerDirectionId"])
    .index("by_legacyId", ["legacyId"]),

  techDayAwards: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_createdAt", ["createdAt"])
    .index("by_legacyId", ["legacyId"]),

  techDaySubmissionAwards: defineTable({
    submissionId: v.id("techDaySubmissions"),
    awardId: v.id("techDayAwards"),
    assignedById: v.optional(v.id("techDayUsers")),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_award", ["awardId"])
    .index("by_submission_award", ["submissionId", "awardId"])
    .index("by_legacyId", ["legacyId"]),

  techDayReviewRecommendations: defineTable({
    submissionId: v.id("techDaySubmissions"),
    reviewerId: v.id("techDayUsers"),
    reason: v.string(),
    confidence: v.optional(v.number()),
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_submission_reviewer", ["submissionId", "reviewerId"])
    .index("by_legacyId", ["legacyId"]),

  techDayPosts: defineTable({
    slug: v.string(),
    title: v.string(),
    date: v.string(),
    category: v.optional(v.string()),
    summary: v.string(),
    tags: v.array(v.string()),
    visibility: v.array(v.union(
      v.literal("public"),
      v.literal("authenticated"),
      v.literal("volunteer"),
      v.literal("author"),
      v.literal("reviewer"),
      v.literal("admin")
    )),
    authorName: v.optional(v.string()),
    authorId: v.optional(v.id("techDayUsers")),
    published: v.boolean(),
    content: v.string(),
    legacySlug: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published_date", ["published", "date"])
    .index("by_author", ["authorId"])
    .index("by_category", ["category"]),

  techDayMigrationMap: defineTable({
    sourceTable: v.string(),
    sourceId: v.string(),
    targetTable: v.string(),
    targetId: v.string(),
    checksum: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source", ["sourceTable", "sourceId"])
    .index("by_target", ["targetTable", "targetId"]),

  cc2026Store: defineTable({
    collection: v.string(),
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  })
    .index("by_collection_key", ["collection", "key"])
    .index("by_collection", ["collection"]),
})
