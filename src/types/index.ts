// User types
export type UserRole = 'member' | 'admin' | 'super_admin'

export type UserLinkType =
  | 'homepage'
  | 'scholar'
  | 'orcid'
  | 'github'
  | 'x'
  | 'xiaohongshu'
  | 'linkedin'
  | 'custom'

export interface UserLink {
  type: UserLinkType
  label: string
  url: string
}

export interface User {
  _id: string
  email: string
  username: string
  englishName: string
  chineseName?: string
  role: UserRole
  organization: 'pku' | 'thu'
  cohort: number | 'mascot'
  studentId: string
  personalEmails?: string[]
  personalEmail?: string
  bio?: string // Markdown
  profileMarkdown?: string
  researchDirections?: string[]
  researchInterests?: string[]
  links?: UserLink[]
  titles?: { title: string; link: string }[]
  scholarUrl?: string
  orcidUrl?: string
  avatar?: string
  realPhoto?: string
  isClassMember?: boolean
  isEmailVerified?: boolean
  lastVerificationRequestedAt?: number
  approvedContributions?: number
  createdAt: number
  updatedAt: number
}

// Publication types
export interface Publication {
  _id: string
  title: string
  authors: string[]
  venue: string
  year: number
  abstract: string
  url?: string
  category: string
  subCategory?: string
  userId: string // Owner
  createdAt: number
  updatedAt: number
}

export interface PublicationVenue {
  _id?: string
  name: string
  source: "manual" | "publication"
  updatedAt?: number
}

export interface StudentFormProfile {
  _id: string
  userId: string
  gender?: string
  phone?: string
  createdAt: number
  updatedAt: number
}

export interface AcademicExchangeExpenseItem {
  item: string
  amount: number
  note?: string
}

export interface AcademicExchangeSupportApplication {
  _id: string
  userId: string
  applicantName: string
  studentId: string
  email: string
  gender?: string
  phone?: string
  projectCategory: string
  projectName: string
  exchangeLocation: string
  projectTime: string
  otherFunding: string
  projectPlan: string
  expenseItems: AcademicExchangeExpenseItem[]
  totalAmount: number
  applicationDate: string
  publicationId?: string
  paperTitle?: string
  paperAuthors?: string[]
  applicantAuthorName?: string
  applicantAuthorIndexLabel?: string
  applicantAffiliation?: string
  totalPages?: number
  bodyPages?: number
  paperPdfUrl?: string
  paperPdfSource?: "url" | "upload"
  paperPdfStorageId?: string
  paperPdfFileName?: string
  paperPdfMimeType?: string
  paperPdfSize?: number
  status: "submitted"
  submittedAt: number
  createdAt: number
}

export type OAFormStatus = "draft" | "published" | "archived"
export type OAFormKind = "form" | "reimbursement"
export type OAReviewStatus = "pending" | "approved" | "rejected" | "needs_changes"
export type OAFieldType = "text" | "textarea" | "number" | "date" | "select" | "radio" | "checkbox" | "file" | "table"
export type OAResultFieldType = "text" | "number" | "date" | "select"

export interface OAFormOption {
  label: string
  value: string
}

export interface OATableColumn {
  id: string
  label: string
  type: "text" | "number" | "date"
  required?: boolean
}

export interface OAFormField {
  id: string
  type: OAFieldType
  label: string
  helpText?: string
  placeholder?: string
  required?: boolean
  options?: OAFormOption[]
  acceptedMimeTypes?: string[]
  maxFiles?: number
  maxFileSizeMB?: number
  columns?: OATableColumn[]
}

export interface OAResultField {
  id: string
  label: string
  type: OAResultFieldType
  visibleToSubmitter?: boolean
  options?: OAFormOption[]
}

export interface OAForm {
  _id: string
  slug: string
  title: string
  description?: string
  category: string
  kind?: OAFormKind
  visibility: "members" | "admins"
  status: OAFormStatus
  allowMultipleSubmissions?: boolean
  maxSubmissionsPerUser?: number
  allowSubmissionEdits?: boolean
  openAt?: number
  closeAt?: number
  fields: OAFormField[]
  resultFields?: OAResultField[]
  resultsVisible?: boolean
  createdBy: string
  updatedBy?: string
  publishedAt?: number
  createdAt: number
  updatedAt: number
}

export interface OAFileAnswer {
  storageId: string
  fileName: string
  mimeType: string
  size: number
}

export interface OAFormSubmission {
  _id: string
  formId: string
  formSlug: string
  submitterId: string
  submitterName: string
  studentId: string
  submitterEmail?: string
  answers: Record<string, unknown>
  reviewStatus: OAReviewStatus
  adminNote?: string
  reviewerId?: string
  reviewerName?: string
  reviewedAt?: number
  resultValues?: Record<string, unknown>
  submittedAt: number
  createdAt: number
  updatedAt: number
}

export interface ReimbursementMaterialTableColumn {
  id: string
  label: string
  width?: string
}

export interface ReimbursementMaterialTableRow {
  id: string
  cells: string[]
  kind?: "data" | "section"
  sectionLevel?: number
}

export interface ReimbursementMaterialTableDraft {
  _id?: string
  slug: string
  title: string
  description: string
  category: string
  columns: ReimbursementMaterialTableColumn[]
  rows: ReimbursementMaterialTableRow[]
  isPublished: boolean
}

export interface ReimbursementMaterialTable extends ReimbursementMaterialTableDraft {
  _id: string
  createdBy?: string
  createdAt: number
  updatedAt: number
}

export type ReviewerPermission = "academicExchange:read"

export interface ReviewerAccount {
  _id: string
  username: string
  displayName: string
  enabled: boolean
  permissions: ReviewerPermission[]
  createdBy: string
  lastLoginAt?: number
  createdAt: number
  updatedAt: number
}

// Course review types
export interface CourseReview {
  _id: string
  courseName: string
  instructor: string
  semesterYear: number
  semesterTerm: "spring" | "fall"
  overallRating: number // 1-10
  department?: string
  attendanceRequired?: boolean
  workload?: number // 1-5
  pace?: number // 1-5
  gradingFairness?: number // 1-5
  courseAverageScore?: number
  personalScore?: number
  recommendedStudyMethod?: "attend" | "recording" | "self_study"
  content: string
  isAnonymous: boolean
  authorId?: string // Optional, for admin
  status: 'pending' | 'approved' | 'rejected'
  tags?: string[]
  active?: boolean
  likes?: number
  dislikes?: number
  voteScore?: number
  currentUserVote?: 1 | -1
  createdAt: number
  updatedAt: number
}

export interface Course {
  _id: string
  name: string
  isTongClassCourse?: boolean
  isActive?: boolean
  removedAt?: number
  reviewCount: number
  averageRating: number
  createdAt: number
  updatedAt: number
}

// News types
export interface News {
  _id: string
  title: string
  content: string // Markdown
  sourceUrl?: string
  coverImageUrl?: string
  showOnHomepage?: boolean
  homepageSubtitle?: string
  authorId: string
  authorName?: string // Custom author name
  category: string
  audiences?: import("@/lib/updates").Audience[]
  tags?: string[]
  publishedAt: number
  isPublished: boolean
  createdAt: number
  updatedAt: number
}

// Event types
export interface Event {
  _id: string
  title: string
  date: string // ISO date
  time?: string
  endDate?: string
  endTime?: string
  location?: string
  description?: string // Markdown
  url?: string
  color: string // For calendar display
  audiences?: import("@/lib/updates").Audience[]
  tags?: string[]
  createdAt: number
  updatedAt: number
}

export interface TreeholePostSummary {
  _id: string
  serialNumber?: number
  serialLabel?: string
  title: string
  content: string
  isAnonymous: boolean
  authorId: string
  publicAuthorName: string
  realAuthorName: string
  anonymousAlias?: string
  replyCount: number
  likes?: number
  dislikes?: number
  voteScore?: number
  currentUserVote?: 1 | -1
  createdAt: number
  updatedAt: number
}

export interface TreeholeReply {
  _id: string
  postId: string
  content: string
  isAnonymous: boolean
  authorId: string
  publicAuthorName: string
  realAuthorName: string
  anonymousAlias?: string
  likes?: number
  dislikes?: number
  voteScore?: number
  currentUserVote?: 1 | -1
  createdAt: number
  updatedAt: number
}

export interface TreeholePostDetail {
  post: TreeholePostSummary
  replies: TreeholeReply[]
}

export interface AdminTreeholePostSummary extends TreeholePostSummary {
  authorOrganization?: "pku" | "thu"
  authorCohort?: number | "mascot"
}

export interface AdminTreeholePostDetail {
  post: AdminTreeholePostSummary
  replies: Array<TreeholeReply & {
    authorOrganization?: "pku" | "thu"
    authorCohort?: number | "mascot"
  }>
}

export interface FeedbackEntry {
  _id: string
  title: string
  content: string
  isAnonymous: boolean
  authorId: string
  publicAuthorName: string
  createdAt: number
  updatedAt: number
}

export interface AdminFeedbackEntry extends FeedbackEntry {
  realAuthorName: string
  authorOrganization?: "pku" | "thu"
  authorCohort?: number | "mascot"
}

// Auth types
export interface AuthConfig {
  // Pre-registered student IDs (hashed)
  allowedStudentIds: string[]
}

// Organization types
export const ORGANIZATIONS = {
  PKU: {
    id: 'pku',
    name: 'Peking University',
    shortName: 'PKU',
    cohorts: ['mascot', 2020, 2021, 2022, 2023, 2024, 2025] as const,
  },
  THU: {
    id: 'thu',
    name: 'Tsinghua University',
    shortName: 'THU',
    cohorts: ['mascot', 2020, 2021, 2022, 2023, 2024, 2025] as const,
  },
} as const

export type OrganizationId = typeof ORGANIZATIONS.PKU | typeof ORGANIZATIONS.THU

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Filter types
export interface PublicationFilters {
  search?: string
  category?: string
  year?: number
  author?: string
}

export interface NewsFilters {
  category?: string
  authorId?: string
  fromDate?: string
  toDate?: string
}

export interface CourseFilters {
  search?: string
  instructor?: string
  semesterYear?: number
  semesterTerm?: "spring" | "fall"
  sortBy?: 'rating' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface EventFilters {
  fromDate?: string
  toDate?: string
}
