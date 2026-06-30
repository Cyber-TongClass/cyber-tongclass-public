"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { useQuery, useMutation } from "convex/react"
import { makeFunctionReference } from "convex/server"
import { api } from "../../convex/_generated/api"
import type { ReimbursementMaterialTableDraft, UserLink } from "@/types"
import type { CohortValue } from "@/lib/cohort"
import { toOAFormUpsertPayload } from "@/lib/oa-forms"

type IdLike =
  | string
  | {
    id: string | { __id?: string }
  }
  | { __id?: string }

const toIdArg = (input: IdLike) => {
  if (typeof input === "string") {
    return { id: input as any }
  }

  if (input && typeof input === "object" && "id" in input) {
    const rawId = (input as any).id
    if (rawId && typeof rawId === "object" && "__id" in rawId) {
      return { id: (rawId as any).__id as any }
    }
    return { id: rawId as any }
  }

  if (input && typeof input === "object" && "__id" in input) {
    return { id: (input as any).__id as any }
  }

  return { id: input as any }
}

const techdayApi = api as any
const currentUserRef = makeFunctionReference<"query">("auth:currentUser")
const currentUserRoleRef = makeFunctionReference<"query">("auth:currentUserRole")
const isAdminRef = makeFunctionReference<"query">("auth:isAdmin")
const isSuperAdminRef = makeFunctionReference<"query">("auth:isSuperAdmin")
const academicExchangeProfileRef = makeFunctionReference<"query">("academicExchange:getStudentFormProfile")
const upsertAcademicExchangeProfileRef = makeFunctionReference<"mutation">("academicExchange:upsertStudentFormProfile")
const listAcademicExchangeApplicationsRef = makeFunctionReference<"query">("academicExchange:listApplications")
const getAcademicExchangeApplicationRef = makeFunctionReference<"query">("academicExchange:getApplication")
const createAcademicExchangeApplicationRef = makeFunctionReference<"mutation">("academicExchange:createApplication")
const generateAcademicExchangeUploadUrlRef = makeFunctionReference<"mutation">("academicExchange:generateUploadUrl")
const getAcademicExchangePaperPdfUrlRef = makeFunctionReference<"query">("academicExchange:getPaperPdfUrl")
const listPublishedReimbursementTablesRef = makeFunctionReference<"query">("reimbursementTables:listPublished")
const getPublishedReimbursementTableRef = makeFunctionReference<"query">("reimbursementTables:getPublishedBySlug")
const listAdminReimbursementTablesRef = makeFunctionReference<"query">("reimbursementTables:listAdmin")
const upsertAdminReimbursementTableRef = makeFunctionReference<"mutation">("reimbursementTables:upsertAdmin")
const removeAdminReimbursementTableRef = makeFunctionReference<"mutation">("reimbursementTables:removeAdmin")
const seedAcademicExchangeReimbursementTablesRef = makeFunctionReference<"mutation">("reimbursementTables:seedAcademicExchangeDefaults")
const listPublishedOAFormsRef = makeFunctionReference<"query">("oaForms:listPublished")
const getPublishedOAFormBySlugRef = makeFunctionReference<"query">("oaForms:getPublishedBySlug")
const adminListOAFormsRef = makeFunctionReference<"query">("oaForms:adminList")
const adminGetOAFormRef = makeFunctionReference<"query">("oaForms:adminGet")
const adminUpsertOAFormRef = makeFunctionReference<"mutation">("oaForms:adminUpsert")
const adminSetOAFormStatusRef = makeFunctionReference<"mutation">("oaForms:adminSetStatus")
const adminRemoveOAFormRef = makeFunctionReference<"mutation">("oaForms:adminRemove")
const generateOAFormUploadUrlRef = makeFunctionReference<"mutation">("oaForms:generateUploadUrl")
const submitOAFormRef = makeFunctionReference<"mutation">("oaForms:submit")
const updateOAFormSubmissionRef = makeFunctionReference<"mutation">("oaForms:updateSubmission")
const listMyOAFormSubmissionsRef = makeFunctionReference<"query">("oaForms:listMine")
const adminListOAFormSubmissionsRef = makeFunctionReference<"query">("oaForms:adminListSubmissions")
const adminReviewOAFormSubmissionRef = makeFunctionReference<"mutation">("oaForms:adminReviewSubmission")
const getOAFormAttachmentUrlRef = makeFunctionReference<"query">("oaForms:getAttachmentUrl")
const adminExportOAFormSubmissionsRef = makeFunctionReference<"query">("oaForms:adminExportSubmissions")
const adminUpdateOAFormResultConfigRef = makeFunctionReference<"mutation">("oaForms:adminUpdateResultConfig")
const adminBatchUpdateOAFormResultsRef = makeFunctionReference<"mutation">("oaForms:adminBatchUpdateResults")
const listReviewerAccountsRef = makeFunctionReference<"query">("reviewerAuth:listAccounts")
const createReviewerAccountRef = makeFunctionReference<"mutation">("reviewerAuth:createAccount")
const updateReviewerAccountRef = makeFunctionReference<"mutation">("reviewerAuth:updateAccount")
const resetReviewerPasswordRef = makeFunctionReference<"mutation">("reviewerAuth:resetPassword")
const TECHDAY_AUTH_STORAGE_EVENT = "techday-auth-storage"
const TONGCLASS_AUTH_STORAGE_EVENT = "tongclass-auth-storage"

export type TechDayActorArgs = {
  mainSessionToken?: string
  techDaySessionToken?: string
}

export function getTechDayStoredActorArgs(): TechDayActorArgs {
  if (typeof window === "undefined") return {}
  return {
    mainSessionToken: window.localStorage.getItem("tongclass_session_token") || undefined,
    techDaySessionToken: window.localStorage.getItem("techday_session_token") || undefined,
  }
}

export function getTongClassStoredSessionToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("tongclass_session_token")
}

export function useTongClassSessionToken() {
  return useSyncExternalStore(subscribeTechDayActorArgs, () => getTongClassStoredSessionToken() || "", () => "")
}

function getTechDayActorSnapshot() {
  const args = getTechDayStoredActorArgs()
  return JSON.stringify([
    args.mainSessionToken || "",
    args.techDaySessionToken || "",
  ])
}

function subscribeTechDayActorArgs(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {}

  window.addEventListener("storage", onStoreChange)
  window.addEventListener(TECHDAY_AUTH_STORAGE_EVENT, onStoreChange)
  window.addEventListener(TONGCLASS_AUTH_STORAGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(TECHDAY_AUTH_STORAGE_EVENT, onStoreChange)
    window.removeEventListener(TONGCLASS_AUTH_STORAGE_EVENT, onStoreChange)
  }
}

export function notifyTechDayActorStorageChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(TECHDAY_AUTH_STORAGE_EVENT))
}

export function useTechDayActorArgs() {
  const snapshot = useSyncExternalStore(subscribeTechDayActorArgs, getTechDayActorSnapshot, () => "[\"\",\"\"]")

  return useMemo(() => {
    const [mainSessionToken, techDaySessionToken] = JSON.parse(snapshot) as [string, string]
    return {
      mainSessionToken: mainSessionToken || undefined,
      techDaySessionToken: techDaySessionToken || undefined,
    }
  }, [snapshot])
}

// ==================== 认证相关 ====================

export function useCurrentUser() {
  return useQuery(currentUserRef)
}

export function useCurrentUserRole() {
  return useQuery(currentUserRoleRef)
}

export function useIsAdmin() {
  return useQuery(isAdminRef)
}

export function useIsSuperAdmin() {
  return useQuery(isSuperAdminRef)
}

type SignUpInput = {
  email: string
  username: string
  englishName: string
  chineseName?: string
  organization: "pku" | "thu"
  cohort: CohortValue
  studentId: string
  password: string
  personalEmails?: string[]
  personalEmail?: string
  bio?: string
  researchDirections?: string[]
  researchInterests?: string[]
  links?: UserLink[]
  titles?: { title: string; link: string }[]
  scholarUrl?: string
  orcidUrl?: string
  avatar?: string
  isEmailVerified?: boolean
}

export function useSignUp() {
  const createUser = useMutation(api.users.create)

  return useCallback(
    async (input: SignUpInput) => {
      return createUser({
        email: input.email,
        username: input.username,
        englishName: input.englishName,
        chineseName: input.chineseName,
        organization: input.organization,
        cohort: input.cohort,
        studentId: input.studentId,
        password: input.password,
        personalEmails: input.personalEmails,
        personalEmail: input.personalEmail,
        bio: input.bio,
        researchDirections: input.researchDirections,
        researchInterests: input.researchInterests,
        links: input.links,
        titles: input.titles,
        scholarUrl: input.scholarUrl,
        orcidUrl: input.orcidUrl,
        avatar: input.avatar,
        isEmailVerified: input.isEmailVerified,
      } as any)
    },
    [createUser]
  )
}

type SignInInput = {
  studentId: string
  password: string
}

export function useSignIn() {
  const login = useMutation(api.users.simpleLogin)

  return useCallback(
    async (input: SignInInput) => {
      const result = await login({
        studentId: input.studentId,
        password: input.password,
      } as any)

      if (!result) {
        return { success: false }
      }

      return {
        ...(result as any),
        success: true,
      }
    },
    [login]
  )
}

// ==================== 用户相关 ====================

export function useUsers(args?: { organization?: "pku" | "thu"; cohort?: CohortValue; skip?: number | boolean; limit?: number; classMembersOnly?: boolean }) {
  const queryArgs = useMemo(() => {
    if (!args) return {}
    const { skip, ...rest } = args
    return {
      ...rest,
      ...(typeof skip === "number" ? { skip } : {}),
    }
  }, [args])

  return useQuery(api.users.list, args?.skip === true ? "skip" : queryArgs)
}

export function useUserById(id?: string | null) {
  return useQuery(api.users.getById, id ? ({ id: id as any } as any) : "skip")
}

export function useUserByProfileSlug(slug?: string | null) {
  const users = useUsers({ limit: 1000, classMembersOnly: true })
  const normalizedSlug = slug?.trim().toLowerCase()

  if (!slug) return null
  if (users === undefined) return undefined

  return (
    users.find((user: any) => user.username?.toLowerCase() === normalizedSlug) ||
    users.find((user: any) => String(user._id) === slug) ||
    null
  )
}

export function useCreateUser() {
  return useMutation(api.users.create)
}

export function useUpdateUser() {
  return useMutation(api.users.update)
}

export function useUpdateUserRole() {
  return useMutation(api.users.updateRole)
}

export function useUpdatePasswordWithCurrent() {
  return useMutation(api.users.updatePasswordWithCurrent)
}

export function useResetPasswordAsSuperAdmin() {
  return useMutation(api.users.resetPasswordAsSuperAdmin)
}

export function useDeleteUser() {
  const remove = useMutation(api.users.remove)
  return useCallback((input: IdLike) => remove(toIdArg(input) as any), [remove])
}

export function useSimpleLogin() {
  return useMutation(api.users.simpleLogin)
}

export function useUsersCount(args?: { organization?: "pku" | "thu"; classMembersOnly?: boolean }) {
  return useQuery(api.users.count, args || {})
}

// ==================== 新闻相关 ====================

export function useNews(args?: { category?: string; skip?: number; limit?: number }) {
  return useQuery(api.news.list, args || {})
}

export function useAllNews(args?: { category?: string; skip?: number; limit?: number }) {
  return useQuery(api.news.listAll, args || {})
}

export function useNewsById(id?: string | null) {
  return useQuery(api.news.getById, id ? ({ id: id as any } as any) : "skip")
}

export function useCreateNews() {
  return useMutation(api.news.create)
}

export function useUpdateNews() {
  return useMutation(api.news.update)
}

export function useDeleteNews() {
  const remove = useMutation(api.news.remove)
  return useCallback((input: IdLike) => remove(toIdArg(input) as any), [remove])
}

export function useNewsCount(args?: { category?: string }) {
  return useQuery(api.news.count, args || {})
}

// ==================== 内网相关 ====================

export function useTreeholePosts(args?: { search?: string }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.treehole.list, sessionToken ? ({ sessionToken, ...(args || {}) } as any) : "skip")
}

export function useTreeholePostById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.treehole.getById, id && sessionToken ? ({ sessionToken, id: id as any } as any) : "skip")
}

export function useAdminTreeholePosts(args?: { actorId?: string | null; search?: string }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.treehole.listAdmin,
    sessionToken ? ({ sessionToken, actorId: args?.actorId as any, search: args?.search } as any) : "skip"
  )
}

export function useAdminTreeholePostById(id?: string | null, actorId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.treehole.getByIdAdmin,
    id && sessionToken ? ({ sessionToken, id: id as any, actorId: actorId as any } as any) : "skip"
  )
}

export function useCreateTreeholePost() {
  const create = useMutation(api.treehole.createPost)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useEnsureTreeholeSerialNumbers() {
  const ensure = useMutation(api.treehole.ensureSerialNumbers)
  return useCallback(() => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return ensure({ sessionToken } as any)
  }, [ensure])
}

export function useCreateTreeholeReply() {
  const create = useMutation(api.treehole.createReply)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useDeleteTreeholePost() {
  const remove = useMutation(api.treehole.removePost)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...args, sessionToken } as any)
  }, [remove])
}

export function useDeleteTreeholeReply() {
  const remove = useMutation(api.treehole.removeReply)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...args, sessionToken } as any)
  }, [remove])
}

export function useVoteTreeholePost() {
  const vote = useMutation(api.contentVotes.voteTreeholePost)
  return useCallback((args: { id: string; value?: 1 | -1 }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return vote({ ...args, sessionToken } as any)
  }, [vote])
}

export function useVoteTreeholeReply() {
  const vote = useMutation(api.contentVotes.voteTreeholeReply)
  return useCallback((args: { id: string; value?: 1 | -1 }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return vote({ ...args, sessionToken } as any)
  }, [vote])
}

export function useFeedbackEntries() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.feedback.list, sessionToken ? { sessionToken } : "skip")
}

export function useAdminFeedbackEntries(args?: { actorId?: string | null; search?: string }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.feedback.listAdmin,
    sessionToken ? ({ sessionToken, actorId: args?.actorId as any, search: args?.search } as any) : "skip"
  )
}

export function useMonthlyFeedbackExport(month?: string | null, actorId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.feedback.exportMonthlyForAdmin,
    month && sessionToken ? ({ sessionToken, month, actorId: actorId as any } as any) : "skip"
  )
}

export function useCreateFeedbackEntry() {
  const create = useMutation(api.feedback.create)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useDeleteFeedbackEntry() {
  const remove = useMutation(api.feedback.remove)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...args, sessionToken } as any)
  }, [remove])
}

// ==================== 活动相关 ====================

export function useEvents(args?: { fromDate?: string; toDate?: string; skip?: number; limit?: number }) {
  return useQuery(api.events.list, args || {})
}

export function useEventById(id?: string | null) {
  return useQuery(api.events.getById, id ? ({ id: id as any } as any) : "skip")
}

export function useCreateEvent() {
  return useMutation(api.events.create)
}

export function useUpdateEvent() {
  return useMutation(api.events.update)
}

export function useDeleteEvent() {
  const remove = useMutation(api.events.remove)
  return useCallback((input: IdLike) => remove(toIdArg(input) as any), [remove])
}

export function useEventsCount() {
  return useQuery(api.events.count)
}

// ==================== 出版物相关 ====================

export function usePublications(args?: { category?: string; year?: number; skip?: number; limit?: number }) {
  return useQuery(api.publications.list, args || {})
}

export function usePublicationsByUser(userId?: string | null) {
  return useQuery(api.publications.listByUser, userId ? ({ userId: userId as any } as any) : "skip")
}

export function usePublicationById(id?: string | null) {
  return useQuery(api.publications.getById, id ? ({ id: id as any } as any) : "skip")
}

export function useCreatePublication() {
  return useMutation(api.publications.create)
}

export function useUpdatePublication() {
  return useMutation(api.publications.update)
}

export function useDeletePublication() {
  const remove = useMutation(api.publications.remove)
  return useCallback((input: IdLike) => remove(toIdArg(input) as any), [remove])
}

export function usePublicationsCount(args?: { category?: string; year?: number }) {
  return useQuery(api.publications.count, args || {})
}

export function useSearchPublications(query: string) {
  return useQuery(api.publications.search, query ? { query } : "skip")
}

// ==================== 学术交流支持申请 ====================

export function useStudentFormProfile() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(academicExchangeProfileRef, sessionToken ? { sessionToken } : "skip")
}

export function useUpsertStudentFormProfile() {
  const upsert = useMutation(upsertAcademicExchangeProfileRef)
  return useCallback((args: { gender?: string; phone?: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return upsert({ ...args, sessionToken } as any)
  }, [upsert])
}

export function useAcademicExchangeApplications() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(listAcademicExchangeApplicationsRef, sessionToken ? { sessionToken } : "skip")
}

export function useAcademicExchangeApplication(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getAcademicExchangeApplicationRef,
    sessionToken && id ? ({ sessionToken, id: id as any } as any) : "skip"
  )
}

export function useCreateAcademicExchangeApplication() {
  const create = useMutation(createAcademicExchangeApplicationRef)
  return useCallback((args: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useGenerateAcademicExchangeUploadUrl() {
  const generate = useMutation(generateAcademicExchangeUploadUrlRef)
  return useCallback((args?: { fileName?: string; mimeType?: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return generate({ ...(args || {}), sessionToken } as any)
  }, [generate])
}

export function useAcademicExchangePaperPdfUrl(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getAcademicExchangePaperPdfUrlRef,
    sessionToken && id ? ({ sessionToken, id: id as any } as any) : "skip"
  )
}

// ==================== 报销资料表格 ====================

export function usePublishedReimbursementMaterialTables(args?: { category?: string }) {
  return useQuery(listPublishedReimbursementTablesRef, args || {})
}

export function usePublishedReimbursementMaterialTable(slug?: string | null) {
  return useQuery(getPublishedReimbursementTableRef, slug ? { slug } : "skip")
}

export function useAdminReimbursementMaterialTables() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(listAdminReimbursementTablesRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

export function useUpsertReimbursementMaterialTable() {
  const upsert = useMutation(upsertAdminReimbursementTableRef)
  return useCallback((args: ReimbursementMaterialTableDraft) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return upsert({ ...args, id: args._id as any, sessionToken } as any)
  }, [upsert])
}

export function useRemoveReimbursementMaterialTable() {
  const remove = useMutation(removeAdminReimbursementTableRef)
  return useCallback((id: string) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ id: id as any, sessionToken } as any)
  }, [remove])
}

export function useSeedAcademicExchangeReimbursementTables() {
  const seed = useMutation(seedAcademicExchangeReimbursementTablesRef)
  return useCallback(() => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return seed({ sessionToken } as any)
  }, [seed])
}

// ==================== OA 表单 / 问卷申请 ====================

export function usePublishedOAForms(args?: { category?: string; kind?: "form" | "reimbursement"; includePast?: boolean }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listPublishedOAFormsRef,
    sessionToken ? ({ sessionToken, ...(args || {}) } as any) : "skip"
  )
}

export function usePublishedOAFormBySlug(slug?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getPublishedOAFormBySlugRef,
    sessionToken && slug ? ({ sessionToken, slug } as any) : "skip"
  )
}

export function useAdminOAForms(args?: { kind?: "form" | "reimbursement" }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(adminListOAFormsRef, sessionToken ? ({ sessionToken, ...(args || {}) } as any) : "skip")
}

export function useAdminOAForm(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(adminGetOAFormRef, sessionToken && id ? ({ sessionToken, id: id as any } as any) : "skip")
}

export function useAdminUpsertOAForm() {
  const upsert = useMutation(adminUpsertOAFormRef)
  return useCallback((args: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return upsert({ ...toOAFormUpsertPayload(args), sessionToken } as any)
  }, [upsert])
}

export function useAdminSetOAFormStatus() {
  const setStatus = useMutation(adminSetOAFormStatusRef)
  return useCallback((args: { id: string; status: "draft" | "published" | "archived" }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setStatus({ ...args, sessionToken, id: args.id as any } as any)
  }, [setStatus])
}

export function useAdminRemoveOAForm() {
  const remove = useMutation(adminRemoveOAFormRef)
  return useCallback((args: { id: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...args, sessionToken, id: args.id as any } as any)
  }, [remove])
}

export function useGenerateOAFormUploadUrl() {
  const generate = useMutation(generateOAFormUploadUrlRef)
  return useCallback((args?: { fileName?: string; mimeType?: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return generate({ ...(args || {}), sessionToken } as any)
  }, [generate])
}

export function useSubmitOAForm() {
  const submit = useMutation(submitOAFormRef)
  return useCallback((args: { formId: string; answers: Record<string, unknown> }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return submit({ ...args, sessionToken, formId: args.formId as any } as any)
  }, [submit])
}

export function useUpdateOAFormSubmission() {
  const update = useMutation(updateOAFormSubmissionRef)
  return useCallback((args: { id: string; answers: Record<string, unknown> }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken, id: args.id as any } as any)
  }, [update])
}

export function useMyOAFormSubmissions(formId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listMyOAFormSubmissionsRef,
    sessionToken && formId !== null ? ({ sessionToken, formId: formId ? (formId as any) : undefined } as any) : "skip"
  )
}

export function useAdminOAFormSubmissions(args?: { formId?: string | null; status?: "pending" | "approved" | "rejected" | "needs_changes"; search?: string }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    adminListOAFormSubmissionsRef,
    sessionToken && args?.formId ? ({ sessionToken, ...args, formId: args.formId as any } as any) : "skip"
  )
}

export function useAdminReviewOAFormSubmission() {
  const review = useMutation(adminReviewOAFormSubmissionRef)
  return useCallback((args: {
    id: string
    reviewStatus: "pending" | "approved" | "rejected" | "needs_changes"
    adminNote?: string
    resultValues?: Record<string, unknown>
  }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return review({ ...args, sessionToken, id: args.id as any } as any)
  }, [review])
}

export function useOAFormAttachmentUrl(args?: { submissionId?: string | null; storageId?: string | null }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getOAFormAttachmentUrlRef,
    sessionToken && args?.submissionId && args?.storageId
      ? ({ sessionToken, submissionId: args.submissionId as any, storageId: args.storageId } as any)
      : "skip"
  )
}

export function useAdminExportOAFormSubmissions(formId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    adminExportOAFormSubmissionsRef,
    sessionToken && formId ? ({ sessionToken, formId: formId as any } as any) : "skip"
  )
}

export function useAdminUpdateOAFormResultConfig() {
  const update = useMutation(adminUpdateOAFormResultConfigRef)
  return useCallback((args: { formId: string; resultFields: unknown[]; resultsVisible: boolean }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken, formId: args.formId as any } as any)
  }, [update])
}

export function useAdminBatchUpdateOAFormResults() {
  const update = useMutation(adminBatchUpdateOAFormResultsRef)
  return useCallback((args: { formId: string; rows: unknown[] }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken, formId: args.formId as any } as any)
  }, [update])
}

// ==================== Reviewer 账号管理 ====================

export function useReviewerAccounts() {
  const requesterSessionToken = useTongClassSessionToken()
  return useQuery(listReviewerAccountsRef, requesterSessionToken ? { requesterSessionToken } : "skip")
}

export function useCreateReviewerAccount() {
  const create = useMutation(createReviewerAccountRef)
  return useCallback((args: {
    username: string
    displayName: string
    password: string
    permissions?: string[]
    enabled?: boolean
  }) => {
    const requesterSessionToken = getTongClassStoredSessionToken()
    if (!requesterSessionToken) throw new Error("请先登录")
    return create({ ...args, requesterSessionToken } as any)
  }, [create])
}

export function useUpdateReviewerAccount() {
  const update = useMutation(updateReviewerAccountRef)
  return useCallback((args: {
    id: string
    displayName?: string
    permissions?: string[]
    enabled?: boolean
  }) => {
    const requesterSessionToken = getTongClassStoredSessionToken()
    if (!requesterSessionToken) throw new Error("请先登录")
    return update({ ...args, requesterSessionToken, id: args.id as any } as any)
  }, [update])
}

export function useResetReviewerPassword() {
  const reset = useMutation(resetReviewerPasswordRef)
  return useCallback((args: { id: string; password: string }) => {
    const requesterSessionToken = getTongClassStoredSessionToken()
    if (!requesterSessionToken) throw new Error("请先登录")
    return reset({ ...args, requesterSessionToken, id: args.id as any } as any)
  }, [reset])
}

export function usePublicationVenues() {
  return useQuery(api.publicationVenues.list)
}

export function useCreatePublicationVenue() {
  const create = useMutation(api.publicationVenues.create)
  return useCallback((args: { name: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useUpdatePublicationVenue() {
  const update = useMutation(api.publicationVenues.update)
  return useCallback((args: { id: string; name: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken } as any)
  }, [update])
}

// ==================== 课程相关 ====================

export function useCourses(args?: { skip?: number; limit?: number }) {
  return useQuery(api.courses.list, args || {})
}

export function useCourseById(id?: string | null) {
  return useQuery(api.courses.getById, id ? ({ id: id as any } as any) : "skip")
}

export function useCourseByName(name?: string | null) {
  return useQuery(api.courses.getByName, name ? { name } : "skip")
}

export function useCreateCourse() {
  return useMutation(api.courses.create)
}

export function useUpdateCourse() {
  return useMutation(api.courses.update)
}

export function useDeleteCourse() {
  const remove = useMutation(api.courses.remove)
  return useCallback((input: IdLike) => remove(toIdArg(input) as any), [remove])
}

// ==================== 课程评价相关 ====================

export function useCourseReviews(args?: string | {
  courseName?: string
  instructor?: string
  semesterYear?: number
  semesterTerm?: "spring" | "fall"
}) {
  const sessionToken = useTongClassSessionToken()
  const normalized =
    typeof args === "string"
      ? {
        courseName: args,
      }
      : args

  return useQuery(
    api.courseReviews.listByCourse,
    normalized?.courseName ? ({ ...normalized, sessionToken: sessionToken || undefined } as any) : "skip"
  )
}

export function useAllCourseReviews(args?: {
  courseName?: string
  status?: "pending" | "approved" | "rejected"
}) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.courseReviews.listByCourseAll, { ...(args || {}), sessionToken: sessionToken || undefined } as any)
}

export function usePendingReviews(args?: { skip?: number; limit?: number }) {
  return useQuery(api.courseReviews.listPending, args || {})
}

export function useCourseListWithReviews() {
  return useQuery(api.courseReviews.listCourses)
}

export function useCreateCourseReview() {
  return useMutation(api.courseReviews.create)
}

export function useUpdateCourseReview() {
  return useMutation(api.courseReviews.update)
}

export function useEditReviewTag() {
  return useMutation(api.courseReviews.editTag)
}

export function useApproveCourseReview() {
  return useMutation(api.courseReviews.approve)
}

export function useRejectCourseReview() {
  return useMutation(api.courseReviews.reject)
}

export function useDeleteCourseReview() {
  const remove = useMutation(api.courseReviews.remove)
  return useCallback((input: IdLike) => remove(toIdArg(input) as any), [remove])
}

export function useAssignReviewsByTags() {
  return useMutation(api.courseReviews.assignByTags)
}

export function useReviewTags() {
  return useQuery(api.courseReviews.listTags)
}

export function useSetReviewTagColor() {
  return useMutation(api.courseReviews.setTagColor)
}

export function useCommonReviewTags() {
  return useQuery(api.courseReviews.commonTags)
}

export function useVoteCourseReview() {
  const vote = useMutation(api.contentVotes.voteCourseReview)
  return useCallback((args: { id: string; value?: 1 | -1 }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return vote({ ...args, sessionToken } as any)
  }, [vote])
}

// ==================== 认证操作 ====================

export function useGetUserByEmail(email: string) {
  return useQuery(api.auth.getUserByEmail, email ? { email } : "skip")
}

// ==================== TechDay 相关 ====================

export function useTechDayCurrentPrincipal(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.auth.me, args || {})
}

export function useSyncInternalTechDayUser() {
  return useMutation(techdayApi.techday.auth.syncInternalUser)
}

export function useTechDayInternalVolunteerApplication(args?: TechDayActorArgs | null) {
  return useQuery(techdayApi.techday.auth.getInternalVolunteerApplication, args === null ? "skip" : args || {})
}

export function useApplyInternalTechDayVolunteer() {
  return useMutation(techdayApi.techday.auth.applyInternalVolunteer)
}

export function useTechDayLogin() {
  return useMutation(techdayApi.techday.auth.login)
}

export function useTechDayLogout() {
  return useMutation(techdayApi.techday.auth.logout)
}

export function useRegisterTechDayAuthor() {
  return useMutation(techdayApi.techday.auth.registerAuthor)
}

export function useRegisterTechDayVolunteer() {
  return useMutation(techdayApi.techday.auth.registerVolunteer)
}

export function useGetTechDayReviewerInvite(code?: string | null) {
  return useQuery(techdayApi.techday.auth.getReviewerInvite, code ? { code } : "skip")
}

export function useRegisterTechDayReviewer() {
  return useMutation(techdayApi.techday.auth.registerReviewer)
}

export function useChangeTechDayPassword() {
  return useMutation(techdayApi.techday.auth.changePassword)
}

export function useTechDayOrganizations() {
  return useQuery(techdayApi.techday.directories.listOrganizations, {})
}

export function useTechDayDirections() {
  return useQuery(techdayApi.techday.directories.listDirections, {})
}

export function useTechDayRoleTemplates(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.directories.listRoleTemplates, args || {})
}

export function useCreateTechDayOrganization() {
  return useMutation(techdayApi.techday.directories.createOrganization)
}

export function useUpdateTechDayOrganization() {
  return useMutation(techdayApi.techday.directories.updateOrganization)
}

export function useDeleteTechDayOrganization() {
  return useMutation(techdayApi.techday.directories.deleteOrganization)
}

export function useCreateTechDayDirection() {
  return useMutation(techdayApi.techday.directories.createDirection)
}

export function useUpdateTechDayDirection() {
  return useMutation(techdayApi.techday.directories.updateDirection)
}

export function useDeleteTechDayDirection() {
  return useMutation(techdayApi.techday.directories.deleteDirection)
}

export function useCreateTechDayRoleTemplate() {
  return useMutation(techdayApi.techday.directories.createRoleTemplate)
}

export function useUpdateTechDayRoleTemplate() {
  return useMutation(techdayApi.techday.directories.updateRoleTemplate)
}

export function useDeleteTechDayRoleTemplate() {
  return useMutation(techdayApi.techday.directories.deleteRoleTemplate)
}

export function useTechDaySettings(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.directories.getSettings, args || {})
}

export function useUpdateTechDaySettings() {
  return useMutation(techdayApi.techday.directories.updateSettings)
}

export function useTechDayPublicSubmissions(args?: {
  track?: "poster" | "demo"
  directionId?: string
  year?: number
  sort?: "voteInnovation" | "voteImpact" | "voteFeasibility"
}) {
  return useQuery(techdayApi.techday.submissions.listPublic, (args || {}) as any)
}

export function useTechDaySubmissionById(id?: string | null, args?: TechDayActorArgs) {
  return useQuery(
    techdayApi.techday.submissions.getById,
    id ? ({ ...(args || {}), id: id as any } as any) : "skip"
  )
}

export function useMyTechDaySubmissions(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.submissions.listMine, args || {})
}

export function useCreateTechDaySubmission() {
  return useMutation(techdayApi.techday.submissions.create)
}

export function useUpdateTechDaySubmission() {
  return useMutation(techdayApi.techday.submissions.updateMine)
}

export function useDeleteTechDaySubmission() {
  return useMutation(techdayApi.techday.submissions.removeMine)
}

export function useAdminTechDaySubmissions(args?: TechDayActorArgs & {
  track?: "poster" | "demo"
  reviewStatus?: "pending" | "approved" | "rejected"
  year?: number
}) {
  return useQuery(techdayApi.techday.submissions.listAdmin, (args || {}) as any)
}

export function useExportTechDaySubmissions(args?: (TechDayActorArgs & {
  track?: "poster" | "demo"
  directionId?: string
  year?: number
}) | null) {
  return useQuery(techdayApi.techday.submissions.exportRows, args === null ? "skip" : (args || {}) as any)
}

export function useAdminUpdateTechDaySubmission() {
  return useMutation(techdayApi.techday.submissions.adminUpdate)
}

export function useAdminDeleteTechDaySubmission() {
  return useMutation(techdayApi.techday.submissions.adminDelete)
}

export function useRenumberTechDaySubmissions() {
  return useMutation(techdayApi.techday.submissions.renumber)
}

export function useUpdateTechDayVotes() {
  return useMutation(techdayApi.techday.submissions.updateVotes)
}

export function useTechDayReimbursements(args?: TechDayActorArgs | null) {
  return useQuery(techdayApi.techday.reimbursements.list, args === null ? "skip" : args || {})
}

export function useExportTechDayReimbursements(args?: TechDayActorArgs | null) {
  return useQuery(techdayApi.techday.reimbursements.exportRows, args === null ? "skip" : args || {})
}

export function useCreateTechDayReimbursement() {
  return useMutation(techdayApi.techday.reimbursements.create)
}

export function useUpdateTechDayReimbursement() {
  return useMutation(techdayApi.techday.reimbursements.update)
}

export function useDeleteTechDayReimbursement() {
  return useMutation(techdayApi.techday.reimbursements.remove)
}

export function useReviewTechDayReimbursement() {
  return useMutation(techdayApi.techday.reimbursements.review)
}

export function useTechDayAwards(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.awards.listAwards, args || {})
}

export function useCreateTechDayAward() {
  return useMutation(techdayApi.techday.awards.createAward)
}

export function useUpdateTechDayAward() {
  return useMutation(techdayApi.techday.awards.updateAward)
}

export function useDeleteTechDayAward() {
  return useMutation(techdayApi.techday.awards.deleteAward)
}

export function useTechDayAwardSubmissions(args?: TechDayActorArgs & {
  directionIds?: string[]
  status?: string[]
  sortBy?: "sequence" | "id"
  sortOrder?: "asc" | "desc"
  track?: "poster" | "demo"
  year?: number
}) {
  return useQuery(techdayApi.techday.awards.listAwardSubmissions, (args || {}) as any)
}

export function useUpsertTechDayRecommendation() {
  return useMutation(techdayApi.techday.awards.upsertRecommendation)
}

export function useDeleteTechDayRecommendation() {
  return useMutation(techdayApi.techday.awards.deleteRecommendation)
}

export function useAssignTechDayAwards() {
  return useMutation(techdayApi.techday.awards.assignAwards)
}

export function useTechDayPosts(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.posts.listPublished, args || {})
}

export function useTechDayPostBySlug(slug?: string | null, args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.posts.getBySlug, slug ? ({ ...(args || {}), slug } as any) : "skip")
}

export function useManageTechDayPosts(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.posts.listManage, args || {})
}

export function useExportTechDayPosts(args?: TechDayActorArgs | null) {
  return useQuery(techdayApi.techday.posts.exportRows, args === null ? "skip" : args || {})
}

export function useCreateTechDayPost() {
  return useMutation(techdayApi.techday.posts.create)
}

export function useUpdateTechDayPost() {
  return useMutation(techdayApi.techday.posts.update)
}

export function useDeleteTechDayPost() {
  return useMutation(techdayApi.techday.posts.remove)
}

export function usePublishTechDayPost() {
  return useMutation(techdayApi.techday.posts.publish)
}

export function useGenerateTechDayUploadUrl() {
  return useMutation(techdayApi.techday.files.generateUploadUrl)
}

export function useFinalizeTechDayPoster() {
  return useMutation(techdayApi.techday.files.finalizePoster)
}

export function useTechDayPosterUrl(submissionId?: string | null, args?: TechDayActorArgs) {
  return useQuery(
    techdayApi.techday.files.getPosterUrl,
    submissionId ? ({ ...(args || {}), submissionId: submissionId as any } as any) : "skip"
  )
}

export function useFinalizeTechDayReimbursementAttachment() {
  return useMutation(techdayApi.techday.files.finalizeReimbursementAttachment)
}

export function useTechDayReimbursementAttachmentUrl(reimbursementId?: string | null, args?: TechDayActorArgs) {
  return useQuery(
    techdayApi.techday.files.getReimbursementAttachmentUrl,
    reimbursementId ? ({ ...(args || {}), reimbursementId: reimbursementId as any } as any) : "skip"
  )
}

export function useAdminTechDayUsers(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.admin.listUsers, args || {})
}

export function useExportTechDayUsers(args?: TechDayActorArgs | null) {
  return useQuery(techdayApi.techday.admin.exportUsers, args === null ? "skip" : args || {})
}

export function useUpdateTechDayUser() {
  return useMutation(techdayApi.techday.admin.updateUser)
}

export function useDeleteTechDayUser() {
  return useMutation(techdayApi.techday.admin.deleteUser)
}

export function useTechDayReviewerInvites(args?: TechDayActorArgs) {
  return useQuery(techdayApi.techday.admin.listReviewerInvites, args || {})
}

export function useCreateTechDayReviewerInvite() {
  return useMutation(techdayApi.techday.admin.createReviewerInvite)
}

export function useDeleteTechDayReviewerInvite() {
  return useMutation(techdayApi.techday.admin.deleteReviewerInvite)
}
