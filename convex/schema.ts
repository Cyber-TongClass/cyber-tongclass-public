import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    username: v.string(),
    englishName: v.string(),
    chineseName: v.optional(v.string()),
    role: v.union(v.literal("member"), v.literal("admin"), v.literal("super_admin")),
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

  // Publications table
  publications: defineTable({
    title: v.string(),
    authors: v.array(v.string()),
    venue: v.string(),
    year: v.number(),
    abstract: v.string(),
    url: v.optional(v.string()),
    category: v.string(),
    subCategory: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_year", ["year"])
    .index("by_category", ["category"])
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_publishedAt", ["publishedAt"])
    .index("by_category", ["category"])
    .index("by_author", ["authorId"])
    .searchIndex("search_title", { searchField: "title" }),

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
    status: v.literal("submitted"),
    submittedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  reviewerAccounts: defineTable({
    username: v.string(),
    displayName: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    enabled: v.boolean(),
    permissions: v.array(v.string()),
    createdBy: v.id("users"),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_enabled", ["enabled"]),

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
    posterStorageId: v.optional(v.id("_storage")),
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
    attachmentStorageId: v.optional(v.id("_storage")),
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
})
