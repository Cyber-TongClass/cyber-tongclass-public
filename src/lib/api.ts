"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { withAccountId } from "@/lib/account-dto"
import { useAction, useQuery, useMutation } from "convex/react"
import { makeFunctionReference } from "convex/server"
import { api } from "../../convex/_generated/api"
import type { ReimbursementMaterialTableDraft, UserLink } from "@/types"
import type { CohortValue } from "@/lib/cohort"
import { restrictToUndergraduate, isUndergraduate } from "@/lib/undergraduate-access"
import { toOAFormUpsertPayload } from "@/lib/oa-forms"
import { parsePublicationAuthors, toPublicationAuthorInput } from "@/lib/publication-authors"
import { useAuth } from "@/lib/hooks/use-auth"

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
const sessionAccountRef = makeFunctionReference<"query">("auth:currentUserBySession")
const adminEventsRef = makeFunctionReference<"query">("events:adminList")
const adminEventByIdRef = makeFunctionReference<"query">("events:adminGetById")
const publicMembersRef = makeFunctionReference<"query">("users:listPublicTongClassMembers")
const directoryMembersRef = makeFunctionReference<"query">("users:listTongClassDirectoryMembers")
const academicExchangeProfileRef = makeFunctionReference<"query">("academicExchange:getStudentFormProfile")
const upsertAcademicExchangeProfileRef = makeFunctionReference<"mutation">("academicExchange:upsertStudentFormProfile")
const listAcademicExchangeApplicationsRef = makeFunctionReference<"query">("academicExchange:listApplications")
const getAcademicExchangeApplicationRef = makeFunctionReference<"query">("academicExchange:getApplication")
const createAcademicExchangeApplicationRef = makeFunctionReference<"mutation">("academicExchange:createApplication")
const generateAcademicExchangeUploadUrlRef = makeFunctionReference<"mutation">("academicExchange:generateUploadUrl")
const getAcademicExchangePaperPdfUrlRef = makeFunctionReference<"query">("academicExchange:getPaperPdfUrl")
const listAdminAcademicExchangeApplicationsRef = makeFunctionReference<"query">("academicExchange:listApplicationsForSuperAdmin")
const getAdminAcademicExchangeApplicationRef = makeFunctionReference<"query">("academicExchange:getApplicationForSuperAdmin")
const updateAdminAcademicExchangeApplicationRef = makeFunctionReference<"mutation">("academicExchange:updateApplicationForSuperAdmin")
const deleteAdminAcademicExchangeApplicationRef = makeFunctionReference<"mutation">("academicExchange:deleteApplicationForSuperAdmin")
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
  const token = useSyncExternalStore(subscribeTechDayActorArgs, () => getTongClassStoredSessionToken() || "", () => "")
  // Old cloud sessions are not migrated. Resolve identity before issuing
  // protected queries so an expired token cannot crash public pages.
  const account = useQuery(sessionAccountRef, token ? { sessionToken: token } : "skip")
  return isUndergraduate(account) ? token : ""
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
  return useAuth().currentUser
}

export function useCurrentUserRole() {
  return useAuth().currentRole
}

export function useIsAdmin() {
  return useAuth().isAdmin
}

export function useIsSuperAdmin() {
  return useAuth().isSuperAdmin
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
  return useCallback(async (_input: SignUpInput) => {
    throw new Error("公开注册已停用，请联系管理员创建账户")
  }, [])
}

type SignInInput = {
  studentId: string
  password: string
}

export function useSignIn() {
  const login = useSimpleLogin()

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
  const sessionToken = useTongClassSessionToken()
  const queryArgs = useMemo(() => {
    const { skip, classMembersOnly: _classMembersOnly, ...rest } = args || {}
    return {
      ...rest,
      identityType: "undergrad",
      ...(typeof skip === "number" ? { skip } : {}),
      sessionToken: sessionToken || undefined,
    }
  }, [args, sessionToken])

  const query = args?.skip === true
    ? "skip"
    : sessionToken
      ? ({ ...queryArgs, sessionToken } as any)
      : queryArgs
  const result = useQuery(
    sessionToken ? directoryMembersRef : publicMembersRef,
    query as any,
  ) as any
  return useMemo(() => result?.map(withAccountId), [result])
}

export function useAdminUsers(args?: { organization?: "pku" | "thu"; cohort?: CohortValue; skip?: number; limit?: number; classMembersOnly?: boolean }) {
  const sessionToken = useTongClassSessionToken()
  const result = useQuery(
    api.users.list,
    sessionToken ? ({ ...(args || {}), identityType: "undergrad", sessionToken } as any) : "skip",
  ) as any
  return useMemo(() => result?.filter(isUndergraduate).map(withAccountId), [result])
}

export function useUserById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  const result = useQuery(
    api.users.getById,
    id && sessionToken ? ({ id: id as any, sessionToken } as any) : "skip"
  )
  return restrictToUndergraduate(result ? withAccountId(result as any) : result)
}

export function useUserByProfileSlug(slug?: string | null) {
  const members = useUsers({ classMembersOnly: true, limit: 10000 })
  if (!slug) return null
  if (members === undefined) return undefined
  return members.find((member: any) => member.username?.toLowerCase() === slug.trim().toLowerCase()) || null
}

export function useCreateUser() {
  const create = useMutation(api.users.create)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useUpdateUser() {
  const update = useMutation(api.users.update)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken } as any)
  }, [update])
}

export function useUpdateUserRole() {
  const updateRole = useMutation(api.users.updateRole)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return updateRole({ ...args, sessionToken } as any)
  }, [updateRole])
}

export function useUpdatePasswordWithCurrent() {
  const updatePassword = useMutation(api.users.updatePasswordWithCurrent)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return updatePassword({ ...args, sessionToken } as any)
  }, [updatePassword])
}

export function useResetPasswordAsSuperAdmin() {
  const resetPassword = useMutation(api.users.resetPasswordAsSuperAdmin)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return resetPassword({ ...args, sessionToken } as any)
  }, [resetPassword])
}

export function useDeleteUser() {
  const remove = useMutation(api.users.remove)
  return useCallback((input: IdLike) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...toIdArg(input), sessionToken } as any)
  }, [remove])
}

export function useSimpleLogin() {
  return useCallback(async (args: { studentId: string; password: string }) => {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.message || "登录失败")
    return result
  }, [])
}

export function useUsersCount(args?: { organization?: "pku" | "thu"; classMembersOnly?: boolean }) {
  const users = useUsers({ ...args, limit: 1000 }) as any[] | undefined
  return users?.length
}

// ==================== 新闻相关 ====================

export function useNews(args?: { category?: string; skip?: number; limit?: number }) {
  return useQuery(api.news.list, args || {})
}

export function useAllNews(args?: { category?: string; skip?: number; limit?: number }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.news.listAll,
    sessionToken ? ({ ...(args || {}), sessionToken } as any) : "skip"
  )
}

export function useNewsById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.news.getById,
    id ? ({ id: id as any, sessionToken: sessionToken || undefined } as any) : "skip"
  )
}

export function useCreateNews() {
  const create = useMutation(api.news.create)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useUpdateNews() {
  const update = useMutation(api.news.update)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken } as any)
  }, [update])
}

export function useDeleteNews() {
  const remove = useMutation(api.news.remove)
  return useCallback((input: IdLike) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...toIdArg(input), sessionToken } as any)
  }, [remove])
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
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.events.list, { ...(args || {}), ...(sessionToken ? { sessionToken } : {}) } as any)
}

export function useEventById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.events.getById, id ? ({ id: id as any, ...(sessionToken ? { sessionToken } : {}) } as any) : "skip")
}

export function useAdminEvents(args?: { skip?: number; limit?: number; disabled?: boolean }) {
  const sessionToken = useTongClassSessionToken()
  const { disabled, ...queryArgs } = args || {}
  return useQuery(adminEventsRef, sessionToken && !disabled ? ({ ...queryArgs, sessionToken } as any) : "skip")
}

export function useAdminEventById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(adminEventByIdRef, sessionToken && id ? ({ id: id as any, sessionToken } as any) : "skip")
}

export function useCreateEvent() {
  const create = useMutation(api.events.create)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useUpdateEvent() {
  const update = useMutation(api.events.update)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken } as any)
  }, [update])
}

export function useDeleteEvent() {
  const remove = useMutation(api.events.remove)
  return useCallback((input: IdLike) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...toIdArg(input), sessionToken } as any)
  }, [remove])
}

export function useEventsCount() {
  return useQuery(api.events.count)
}

// ==================== 出版物相关 ====================

export function usePublications(args?: { category?: string; year?: number; skip?: number; limit?: number }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.publications.list, { ...(args || {}), ...(sessionToken ? { sessionToken } : {}) } as any)
}

export function usePublicationsByUser(userId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.publications.listByUser, userId && sessionToken ? ({ userId: userId as any, sessionToken } as any) : "skip")
}

export function usePublicationById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.publications.getById, id ? ({ id: id as any, ...(sessionToken ? { sessionToken } : {}) } as any) : "skip")
}

export function useCreatePublication() {
  const create = useMutation(api.publications.create)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    const authorDetails = args.authorDetails || parsePublicationAuthors(args.authors || []).map(toPublicationAuthorInput)
    return create({ ...args, authors: authorDetails.map((author: any) => author.snapshot), authorDetails, sessionToken } as any)
  }, [create])
}

export function useUpdatePublication() {
  const update = useMutation(api.publications.update)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    const authorDetails = args.authorDetails || (args.authors ? parsePublicationAuthors(args.authors).map(toPublicationAuthorInput) : undefined)
    return update({ ...args, ...(authorDetails ? { authors: authorDetails.map((author: any) => author.snapshot), authorDetails } : {}), sessionToken } as any)
  }, [update])
}

export function useDeletePublication() {
  const remove = useMutation(api.publications.remove)
  return useCallback((input: IdLike) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...toIdArg(input), sessionToken } as any)
  }, [remove])
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

export function useAdminAcademicExchangeApplications(enabled = true) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(listAdminAcademicExchangeApplicationsRef, enabled && sessionToken ? ({ sessionToken } as any) : "skip")
}

export function useAdminAcademicExchangeApplication(id?: string | null, enabled = true) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getAdminAcademicExchangeApplicationRef,
    enabled && sessionToken && id ? ({ sessionToken, id: id as any } as any) : "skip"
  )
}

export function useUpdateAdminAcademicExchangeApplication() {
  const update = useMutation(updateAdminAcademicExchangeApplicationRef)
  return useCallback((args: Record<string, unknown> & { id: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, id: args.id as any, sessionToken } as any)
  }, [update])
}

export function useDeleteAdminAcademicExchangeApplication() {
  const remove = useMutation(deleteAdminAcademicExchangeApplicationRef)
  return useCallback((id: string) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ id: id as any, sessionToken } as any)
  }, [remove])
}

// ==================== ToNG 先导课资源 ====================

export function useTongInitCourseResources() {
  // The AIA deployment removed the tongInitCourseResources module. Public
  // resources are served from the static manifest in the resource component.
  return undefined
}

export function useAdminTongInitCourseResources() {
  return undefined
}

export function useBeginTongInitCourseUpload() {
  return useCallback(async (_args: Record<string, unknown>) => {
    throw new Error("先导课资源管理已迁移到 AIA，当前官网暂不提供该操作")
  }, [])
}

export function useFinalizeTongInitCourseUpload() {
  return useCallback(async (_args: { id: string; storageId: string }) => {
    throw new Error("先导课资源管理已迁移到 AIA，当前官网暂不提供该操作")
  }, [])
}

export function useCancelTongInitCourseUpload() {
  return useCallback(async (_args: { id: string; storageId: string }) => {
    throw new Error("先导课资源管理已迁移到 AIA，当前官网暂不提供该操作")
  }, [])
}

export function useSaveTongInitCourseDraftMetadata() {
  return useCallback(async (_args: Record<string, unknown> & { id: string }) => {
    throw new Error("先导课资源管理已迁移到 AIA，当前官网暂不提供该操作")
  }, [])
}

export function usePublishTongInitCourseResource() {
  return useCallback(async (_args: { id: string; expectedRevision?: number }) => {
    throw new Error("先导课资源管理已迁移到 AIA，当前官网暂不提供该操作")
  }, [])
}

export function useSetTongInitCourseResourceArchived() {
  return useCallback(async (_args: { id: string; archived: boolean; expectedRevision?: number }) => {
    throw new Error("先导课资源管理已迁移到 AIA，当前官网暂不提供该操作")
  }, [])
}

export function useDiscardTongInitCourseDraft() {
  return useCallback(async (_args: { id: string; expectedRevision?: number }) => {
    throw new Error("先导课资源管理已迁移到 AIA，当前官网暂不提供该操作")
  }, [])
}

export function useSeedTongInitCourseLegacyResources() {
  return useCallback(async () => {
    throw new Error("先导课资源管理已迁移到 AIA，当前官网暂不提供该操作")
  }, [])
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
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.courses.list, sessionToken ? ({ ...(args || {}), sessionToken } as any) : "skip")
}

export function useCourseById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.courses.getById, id && sessionToken ? ({ id: id as any, sessionToken } as any) : "skip")
}

export function useCourseByName(name?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.courses.getByName, name && sessionToken ? ({ name, sessionToken } as any) : "skip")
}

export function useCreateCourse() {
  const create = useMutation(api.courses.create)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useUpdateCourse() {
  const update = useMutation(api.courses.update)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken } as any)
  }, [update])
}

export function useDeleteCourse() {
  const remove = useMutation(api.courses.remove)
  return useCallback((input: IdLike) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...toIdArg(input), sessionToken } as any)
  }, [remove])
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
    normalized?.courseName && sessionToken ? ({ ...normalized, sessionToken } as any) : "skip"
  )
}

export function useAllCourseReviews(args?: {
  courseName?: string
  status?: "pending" | "approved" | "rejected"
}) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.courseReviews.listByCourseAll,
    sessionToken ? ({ ...(args || {}), sessionToken } as any) : "skip"
  )
}

export function usePendingReviews(args?: { skip?: number; limit?: number }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.courseReviews.listPending,
    sessionToken ? ({ ...(args || {}), sessionToken } as any) : "skip"
  )
}

export function useCourseListWithReviews() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.courseReviews.listCourses, sessionToken ? { sessionToken } as any : "skip")
}

export function useCreateCourseReview() {
  const create = useMutation(api.courseReviews.create)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useUpdateCourseReview() {
  const update = useMutation(api.courseReviews.update)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken } as any)
  }, [update])
}

export function useEditReviewTag() {
  const edit = useMutation(api.courseReviews.editTag)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return edit({ ...args, sessionToken } as any)
  }, [edit])
}

export function useApproveCourseReview() {
  const approve = useMutation(api.courseReviews.approve)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return approve({ ...args, sessionToken } as any)
  }, [approve])
}

export function useRejectCourseReview() {
  const reject = useMutation(api.courseReviews.reject)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return reject({ ...args, sessionToken } as any)
  }, [reject])
}

export function useDeleteCourseReview() {
  const remove = useMutation(api.courseReviews.remove)
  return useCallback((input: IdLike) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...toIdArg(input), sessionToken } as any)
  }, [remove])
}

export function useAssignReviewsByTags() {
  const assign = useMutation(api.courseReviews.assignByTags)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return assign({ ...args, sessionToken } as any)
  }, [assign])
}

export function useReviewTags() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.courseReviews.listTags,
    sessionToken ? ({ sessionToken } as any) : "skip"
  )
}

export function useSetReviewTagColor() {
  const setColor = useMutation(api.courseReviews.setTagColor)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setColor({ ...args, sessionToken } as any)
  }, [setColor])
}

export function useCommonReviewTags() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.courseReviews.commonTags, sessionToken ? { sessionToken } as any : "skip")
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

// ---------- CC2026 Store ----------

export function useCC2026Get(collection: string, key: string) {
  return useQuery(api.cc2026.get, { collection, key })
}

export function useCC2026List(collection: string) {
  return useQuery(api.cc2026.list, { collection })
}

export function useCC2026ListAll() {
  return useQuery(api.cc2026.listAll, {})
}

export function useCC2026Set() {
  const set = useMutation(api.cc2026.set)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return set({ ...args, sessionToken } as any)
  }, [set])
}

export function useCC2026BatchSet() {
  const batchSet = useMutation(api.cc2026.batchSet)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return batchSet({ ...args, sessionToken } as any)
  }, [batchSet])
}

export function useCC2026Remove() {
  const remove = useMutation(api.cc2026.remove)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...args, sessionToken } as any)
  }, [remove])
}

export function useCC2026MyRegistrations() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.cc2026.listMyRegistrations, sessionToken ? { sessionToken } : "skip")
}

export function useCC2026PublishedRegistrations() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.cc2026.listPublishedRegistrations, sessionToken ? { sessionToken } : "skip")
}

export function useCC2026ManageRegistrations(enabled = true) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.cc2026.listManageRegistrations, sessionToken && enabled ? { sessionToken } : "skip")
}

export function useCC2026UpsertRegistration() {
  const upsert = useMutation(api.cc2026.upsertRegistration)
  return useCallback((registration: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return upsert({ registration, sessionToken } as any)
  }, [upsert])
}

export function useCC2026RemoveRegistration() {
  const remove = useMutation(api.cc2026.removeRegistration)
  return useCallback((id: string) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ id, sessionToken } as any)
  }, [remove])
}

export function useCC2026Vote() {
  return useCallback((_projectId: string): Promise<{ votes: Record<string, number>; myVotes: string[] }> => {
    return Promise.reject(new Error("投票功能已随 AIA 后端升级下线"))
  }, [])
}
