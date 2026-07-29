"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { useQuery, useMutation } from "convex/react"
import { makeFunctionReference } from "convex/server"
import { api } from "../../convex/_generated/api"
import type { ReimbursementMaterialTableDraft, UserLink } from "@/types"
import type { CohortValue } from "@/lib/cohort"
import { useAuth } from "@/lib/hooks/use-auth"
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
const listPublicTongClassMembersRef = makeFunctionReference<"query">("users:listPublicTongClassMembers")
const listTongClassDirectoryMembersRef = makeFunctionReference<"query">("users:listTongClassDirectoryMembers")
const listAdminUsersRef = makeFunctionReference<"query">("users:list")
const getUserByIdRef = makeFunctionReference<"query">("users:getById")
const getUserByEmailRef = makeFunctionReference<"query">("users:getByEmail")
const getUserByStudentIdRef = makeFunctionReference<"query">("users:getByStudentId")
const searchPublicTongClassMembersRef = makeFunctionReference<"query">("users:searchPublicTongClassMembers")
const getPublicTongClassMemberBySlugRef = makeFunctionReference<"query">("users:getPublicTongClassMemberBySlug")
const academicExchangeProfileRef = makeFunctionReference<"query">("academicExchange:getStudentFormProfile")
const upsertAcademicExchangeProfileRef = makeFunctionReference<"mutation">("academicExchange:upsertStudentFormProfile")
const listAcademicExchangeApplicationsRef = makeFunctionReference<"query">("academicExchange:listApplications")
const getAcademicExchangeApplicationRef = makeFunctionReference<"query">("academicExchange:getApplication")
const createAcademicExchangeApplicationRef = makeFunctionReference<"mutation">("academicExchange:createApplication")
const updateAcademicExchangeApplicationRef = makeFunctionReference<"mutation">("academicExchange:updateApplication")
const withdrawAcademicExchangeApplicationRef = makeFunctionReference<"mutation">("academicExchange:withdrawApplication")
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
const listMyOAApprovalHistoryRef = makeFunctionReference<"query">("oaForms:listMineApprovalHistory")
const listMyOAApprovalInboxRef = makeFunctionReference<"query">("oaForms:listMyApprovalInbox")
const getMyOAApprovalTaskRef = makeFunctionReference<"query">("oaForms:getMyApprovalTask")
const actOnOAApprovalTaskRef = makeFunctionReference<"mutation">("oaForms:actOnApprovalTask")
const listMyAiaNotificationsRef = makeFunctionReference<"query">("oaForms:listMyNotifications")
const markMyAiaNotificationReadRef = makeFunctionReference<"mutation">("oaForms:markMyNotificationRead")
const archiveMyAiaNotificationRef = makeFunctionReference<"mutation">("oaForms:archiveMyNotification")
const markAllMyAiaNotificationsReadRef = makeFunctionReference<"mutation">("oaForms:markAllMyNotificationsRead")
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
const upsertTeacherReviewerBindingRef = makeFunctionReference<"mutation">("reviewerAuth:upsertTeacherBinding")
const clearTeacherReviewerBindingRef = makeFunctionReference<"mutation">("reviewerAuth:clearTeacherBinding")
const listPublicInstitutePeopleRef = makeFunctionReference<"query">("instituteDirectory:listPublicPeople")
const getPublicInstitutePersonRef = makeFunctionReference<"query">("instituteDirectory:getPublicPerson")
const getMyPublicProfileDestinationRef = makeFunctionReference<"query">("instituteDirectory:getMyPublicProfileDestination")
const listPublicResearchGroupsRef = makeFunctionReference<"query">("instituteDirectory:listPublicResearchGroups")
const getPublicResearchGroupRef = makeFunctionReference<"query">("instituteDirectory:getPublicResearchGroup")
const listResearchGroupScopeOptionsRef = makeFunctionReference<"query">("instituteDirectory:listResearchGroupScopeOptions")
const listTeacherGroupRosterRef = makeFunctionReference<"query">("instituteDirectory:listTeacherGroupRoster")
const assignTeacherGroupStudentRef = makeFunctionReference<"mutation">("instituteDirectory:assignTeacherGroupStudent")
const removeTeacherGroupStudentRef = makeFunctionReference<"mutation">("instituteDirectory:removeTeacherGroupStudent")
const listInstituteAccountBindingCandidatesRef = makeFunctionReference<"query">("instituteDirectory:listAccountBindingCandidates")
const bindInstitutePersonAccountRef = makeFunctionReference<"mutation">("instituteDirectory:bindPersonAccount")
const setAccountCapabilityRef = makeFunctionReference<"mutation">("instituteDirectory:setAccountCapability")
const syncExistingTeacherCoffeeTalkProfilesRef = makeFunctionReference<"mutation">("instituteDirectory:syncExistingTeacherCoffeeTalkProfiles")
const listPublicInstituteResearchRef = makeFunctionReference<"query">("instituteContent:listPublicInstituteResearch")
const listPublicInstituteUpdatesRef = makeFunctionReference<"query">("instituteContent:listPublicInstituteUpdates")
const getPublicInstituteResearchByIdRef = makeFunctionReference<"query">("instituteContent:getPublicInstituteResearchById")
const getPublicInstituteUpdateByIdRef = makeFunctionReference<"query">("instituteContent:getPublicInstituteUpdateById")
const submitCoffeeTalkApplicationRef = makeFunctionReference<"mutation">("coffeeTalk:submitApplication")
const listMyCoffeeTalkApplicationsRef = makeFunctionReference<"query">("coffeeTalk:listMine")
const listTeacherCoffeeTalkApplicationsRef = makeFunctionReference<"query">("coffeeTalk:listForTeacher")
const getCoffeeTalkManageAccessRef = makeFunctionReference<"query">("coffeeTalk:getManageAccess")
const getMyCoffeeTalkTeacherAvailabilityRef = makeFunctionReference<"query">("coffeeTalk:getMyTeacherAvailability")
const setCoffeeTalkTeacherAvailabilityRef = makeFunctionReference<"mutation">("coffeeTalk:setTeacherAvailability")
const actOnCoffeeTalkApplicationRef = makeFunctionReference<"mutation">("coffeeTalk:actOnApplication")
const listCoffeeTalkNotificationsRef = makeFunctionReference<"query">("coffeeTalk:listNotifications")
const markCoffeeTalkNotificationReadRef = makeFunctionReference<"mutation">("coffeeTalk:markNotificationRead")
const markAllCoffeeTalkNotificationsReadRef = makeFunctionReference<"mutation">("coffeeTalk:markAllNotificationsRead")
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
  return useCallback(
    async (_input: SignUpInput) => {
      throw new Error("公开注册已停用，请联系管理员创建账户")
    },
    []
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

type UserListArgs = {
  organization?: "pku" | "thu"
  cohort?: CohortValue
  skip?: number | boolean
  limit?: number
  classMembersOnly?: boolean
  identityType?: "undergrad" | "graduate"
}

function normalizeUserListArgs(args?: UserListArgs) {
  if (!args) return {}
  const { skip, classMembersOnly: _classMembersOnly, ...rest } = args
  return {
    ...rest,
    ...(typeof skip === "number" ? { skip } : {}),
  }
}

function withClientUserId(result: unknown): any {
  if (result === undefined || result === null) return result
  if (Array.isArray(result)) {
    return result.map(withClientUserId)
  }
  const record = result as { id?: unknown }
  return typeof result === "object" && typeof record.id === "string"
    ? { ...record, _id: record.id }
    : result
}

/**
 * General user discovery deliberately uses only public profile fields while
 * signed out, and a PII-free directory projection while signed in.
 */
export function useUsers(args?: UserListArgs) {
  const sessionToken = useTongClassSessionToken()
  const queryArgs = useMemo(() => normalizeUserListArgs(args), [args])
  const result = useQuery(
    sessionToken ? listTongClassDirectoryMembersRef : listPublicTongClassMembersRef,
    args?.skip === true
      ? "skip"
      : sessionToken
        ? ({ ...queryArgs, sessionToken } as any)
        : (queryArgs as any),
  )
  return useMemo(() => withClientUserId(result), [result])
}

/** Account management screens explicitly opt into an administrator-only DTO. */
export function useAdminUsers(args?: UserListArgs) {
  const sessionToken = useTongClassSessionToken()
  const queryArgs = useMemo(() => {
    if (!args) return {}
    const { skip, ...rest } = args
    return {
      ...rest,
      ...(typeof skip === "number" ? { skip } : {}),
    }
  }, [args])
  const result = useQuery(
    listAdminUsersRef,
    !sessionToken || args?.skip === true ? "skip" : ({ ...queryArgs, sessionToken } as any),
  )
  return useMemo(() => withClientUserId(result), [result])
}

export function useUserById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  const result = useQuery(
    getUserByIdRef,
    id && sessionToken ? ({ id: id as any, sessionToken } as any) : "skip",
  )
  return useMemo(() => withClientUserId(result), [result])
}

export function useUserByEmail(email?: string | null) {
  const sessionToken = useTongClassSessionToken()
  const result = useQuery(
    getUserByEmailRef,
    email && sessionToken ? ({ email, sessionToken } as any) : "skip",
  )
  return useMemo(() => withClientUserId(result), [result])
}

export function useUserByStudentId(studentId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  const result = useQuery(
    getUserByStudentIdRef,
    studentId && sessionToken ? ({ studentId, sessionToken } as any) : "skip",
  )
  return useMemo(() => withClientUserId(result), [result])
}

export function useSearchUsers(query: string) {
  const normalizedQuery = query.trim()
  return useQuery(
    searchPublicTongClassMembersRef,
    normalizedQuery ? ({ query: normalizedQuery } as any) : "skip",
  )
}

export function useUserByProfileSlug(slug?: string | null) {
  return useQuery(
    getPublicTongClassMemberBySlugRef,
    slug?.trim() ? ({ slug: slug.trim() } as any) : "skip",
  )
}

export function useCreateUser() {
  const create = useMutation(api.users.create)
  return useCallback((args: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useUpdateUser() {
  const update = useMutation(api.users.update)
  return useCallback((args: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken } as any)
  }, [update])
}

export function useUpdateUserRole() {
  const updateRole = useMutation(api.users.updateRole)
  return useCallback((args: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return updateRole({ ...args, sessionToken } as any)
  }, [updateRole])
}

export function useUpdatePasswordWithCurrent() {
  const updatePassword = useMutation(api.users.updatePasswordWithCurrent)
  return useCallback((args: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return updatePassword({ ...args, sessionToken } as any)
  }, [updatePassword])
}

export function useResetPasswordAsSuperAdmin() {
  const resetPassword = useMutation(api.users.resetPasswordAsSuperAdmin)
  return useCallback((args: Record<string, unknown>) => {
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
  return useMutation(api.users.simpleLogin)
}

export function useUsersCount(args?: { organization?: "pku" | "thu"; classMembersOnly?: boolean }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.users.count, sessionToken ? ({ ...(args || {}), sessionToken } as any) : "skip")
}

// ==================== AIA 公开目录与 Coffee Talk ====================

/** Public institute directory hooks deliberately never accept account IDs or visibility bypasses. */
export function usePublicInstitutePeople(args?: {
  kind?: "teacher" | "graduate"
  researchArea?: string
  query?: string
  limit?: number
}) {
  return useQuery(listPublicInstitutePeopleRef, args || {})
}

export function usePublicInstitutePerson(slug?: string | null) {
  return useQuery(getPublicInstitutePersonRef, slug ? { slug } : "skip")
}

export function useMyPublicProfileDestination() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getMyPublicProfileDestinationRef,
    sessionToken ? ({ sessionToken } as any) : "skip",
  ) as { href: string; label: string } | null | undefined
}

export function usePublicResearchGroups(args?: {
  researchArea?: string
  query?: string
  limit?: number
}) {
  return useQuery(listPublicResearchGroupsRef, args || {})
}

export function usePublicResearchGroup(slug?: string | null) {
  return useQuery(getPublicResearchGroupRef, slug ? { slug } : "skip")
}

export function useResearchGroupScopeOptions() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(listResearchGroupScopeOptionsRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

/** Teacher-only roster for groups whose leader profile is bound to the current account. */
export function useTeacherGroupRoster() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(listTeacherGroupRosterRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

export function useAssignTeacherGroupStudent() {
  const assign = useMutation(assignTeacherGroupStudentRef)
  return useCallback((args: { researchGroupId: string; studentUserId: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return assign({ sessionToken, ...args } as any)
  }, [assign])
}

export function useRemoveTeacherGroupStudent() {
  const remove = useMutation(removeTeacherGroupStudentRef)
  return useCallback((studentUserId: string) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ sessionToken, studentUserId } as any)
  }, [remove])
}

export function usePublicInstituteResearch(args?: {
  groupSlug?: string
  personSlug?: string
  limit?: number
}) {
  const queryArgs = useMemo(() => {
    const { groupSlug, ...rest } = args || {}
    return groupSlug ? { ...rest, researchGroupSlug: groupSlug } : rest
  }, [args])
  return useQuery(listPublicInstituteResearchRef, queryArgs)
}

export function usePublicInstituteUpdates(args?: {
  groupSlug?: string
  personSlug?: string
  limit?: number
}) {
  const queryArgs = useMemo(() => {
    const { groupSlug, ...rest } = args || {}
    return groupSlug ? { ...rest, researchGroupSlug: groupSlug } : rest
  }, [args])
  return useQuery(listPublicInstituteUpdatesRef, queryArgs)
}

export function usePublicInstituteResearchById(id?: string | null) {
  return useQuery(getPublicInstituteResearchByIdRef, id ? { id } : "skip")
}

export function usePublicInstituteUpdateById(id?: string | null) {
  return useQuery(getPublicInstituteUpdateByIdRef, id ? { id } : "skip")
}

/** Super-admin-only metadata for explicit Institute person-to-account links. */
export function useInstituteAccountBindingCandidates() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listInstituteAccountBindingCandidatesRef,
    sessionToken ? ({ sessionToken } as any) : "skip",
  )
}

/** Binds an Institute profile to an exact existing main-site account. */
export function useBindInstitutePersonAccount() {
  const bind = useMutation(bindInstitutePersonAccountRef)
  return useCallback((args: { personSlug: string; accountUserId?: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return bind({
      sessionToken,
      personSlug: args.personSlug,
      ...(args.accountUserId ? { accountUserId: args.accountUserId as any } : {}),
    } as any)
  }, [bind])
}

export function useSetAccountCapability() {
  const setCapability = useMutation(setAccountCapabilityRef)
  return useCallback((args: { userId: string; capability: "manage_research_group_members"; enabled: boolean }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setCapability({ ...args, sessionToken, userId: args.userId as any } as any)
  }, [setCapability])
}

/** Super-admin-only, standalone backfill for teacher accounts created before automatic provisioning. */
export function useSyncExistingTeacherCoffeeTalkProfiles() {
  const sync = useMutation(syncExistingTeacherCoffeeTalkProfilesRef)
  return useCallback(() => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return sync({ sessionToken } as any)
  }, [sync])
}

export type CoffeeTalkApplicationInput = {
  teacherSlug: string
  topic: string
  purpose: string
  researchBackground: string
  expectedOutcome: string
  preferredFormat: "online" | "offline" | "either"
  availability: string
  consentToShareProfile: boolean
  idempotencyKey: string
  notes?: string
}

export function useSubmitCoffeeTalkApplication() {
  const submit = useMutation(submitCoffeeTalkApplicationRef)
  return useCallback((args: CoffeeTalkApplicationInput) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return submit({ ...args, sessionToken } as any)
  }, [submit])
}

export function useMyCoffeeTalkApplications() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listMyCoffeeTalkApplicationsRef,
    sessionToken ? ({ sessionToken } as any) : "skip",
  )
}

export function useTeacherCoffeeTalkApplications() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listTeacherCoffeeTalkApplicationsRef,
    sessionToken ? ({ sessionToken } as any) : "skip",
  )
}

export function useCoffeeTalkManageAccess() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getCoffeeTalkManageAccessRef,
    sessionToken ? ({ sessionToken } as any) : "skip",
  )
}

export function useMyCoffeeTalkTeacherAvailability() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getMyCoffeeTalkTeacherAvailabilityRef,
    sessionToken ? ({ sessionToken } as any) : "skip",
  )
}

export function useSetCoffeeTalkTeacherAvailability() {
  const setAvailability = useMutation(setCoffeeTalkTeacherAvailabilityRef)
  return useCallback((args: { open: boolean; teacherSlug?: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setAvailability({ sessionToken, ...args } as any)
  }, [setAvailability])
}

export function useActOnCoffeeTalkApplication() {
  const act = useMutation(actOnCoffeeTalkApplicationRef)
  return useCallback((args: {
    applicationId: string
    expectedVersion: number
    action: "start_review" | "accept" | "decline" | "withdraw" | "cancel" | "complete" | "reassign" | "correct" | "request_information" | "supplement"
    teacherSlug?: string
    note?: string
  }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return act({ ...args, applicationId: args.applicationId as any, sessionToken } as any)
  }, [act])
}

export function useCoffeeTalkNotifications(options?: { enabled?: boolean }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listCoffeeTalkNotificationsRef,
    options?.enabled === false
      ? "skip"
      : sessionToken ? ({ sessionToken } as any) : "skip",
  )
}

export function useMarkCoffeeTalkNotificationRead() {
  const markRead = useMutation(markCoffeeTalkNotificationReadRef)
  return useCallback((notificationId: string) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return markRead({ sessionToken, notificationId: notificationId as any } as any)
  }, [markRead])
}

export function useMarkAllCoffeeTalkNotificationsRead() {
  const markAllRead = useMutation(markAllCoffeeTalkNotificationsReadRef)
  return useCallback(() => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return markAllRead({ sessionToken } as any)
  }, [markAllRead])
}

/** Unified recipient-authorized AIA inbox (Coffee Talk and OA workflow). */
export function useAiaNotifications(options?: { enabled?: boolean; limit?: number }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listMyAiaNotificationsRef,
    options?.enabled === false
      ? "skip"
      : sessionToken ? ({ sessionToken, ...(options?.limit ? { limit: options.limit } : {}) } as any) : "skip",
  )
}

export function useMarkAiaNotificationRead() {
  const markRead = useMutation(markMyAiaNotificationReadRef)
  return useCallback((notificationId: string) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return markRead({ sessionToken, notificationId: notificationId as any } as any)
  }, [markRead])
}

export function useArchiveAiaNotification() {
  const archive = useMutation(archiveMyAiaNotificationRef)
  return useCallback((notificationId: string) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return archive({ sessionToken, notificationId: notificationId as any } as any)
  }, [archive])
}

export function useMarkAllAiaNotificationsRead() {
  const markAllRead = useMutation(markAllMyAiaNotificationsReadRef)
  return useCallback(() => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return markAllRead({ sessionToken } as any)
  }, [markAllRead])
}

// ==================== 新闻相关 ====================

export function useNews(args?: { category?: string; skip?: number; limit?: number }) {
  return useQuery(api.news.list, args || {})
}

export function useAllNews(args?: { category?: string; skip?: number; limit?: number }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.news.listAll, sessionToken ? ({ ...(args || {}), sessionToken } as any) : "skip")
}

export function useNewsById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.news.getById, id ? ({ id: id as any, ...(sessionToken ? { sessionToken } : {}) } as any) : "skip")
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

export function useAdminEvents(args?: { skip?: number; limit?: number }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.events.adminList, sessionToken ? ({ ...(args || {}), sessionToken } as any) : "skip")
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
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.events.count, sessionToken ? { sessionToken } : {})
}

// ==================== 出版物相关 ====================

export function usePublications(args?: { category?: string; year?: number; skip?: number; limit?: number }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.publications.list, { ...(args || {}), ...(sessionToken ? { sessionToken } : {}) })
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
    return create({ ...args, sessionToken } as any)
  }, [create])
}

export function useUpdatePublication() {
  const update = useMutation(api.publications.update)
  return useCallback((args: any) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, sessionToken } as any)
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
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.publications.count, { ...(args || {}), ...(sessionToken ? { sessionToken } : {}) })
}

export function useSearchPublications(query: string) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.publications.search, query ? { query, ...(sessionToken ? { sessionToken } : {}) } : "skip")
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

export function useUpdateAcademicExchangeApplication() {
  const update = useMutation(updateAcademicExchangeApplicationRef)
  return useCallback((args: Record<string, unknown> & { id: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return update({ ...args, id: args.id as any, sessionToken } as any)
  }, [update])
}

export function useWithdrawAcademicExchangeApplication() {
  const withdraw = useMutation(withdrawAcademicExchangeApplicationRef)
  return useCallback((id: string) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return withdraw({ sessionToken, id: id as any } as any)
  }, [withdraw])
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

/** AIA-facing alias: the server applies the configured institute target scope. */
export function useOAForm(slug?: string | null) {
  return usePublishedOAFormBySlug(slug)
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
  return useCallback((args: { formId: string; answers: Record<string, unknown>; idempotencyKey: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return submit({ ...args, sessionToken, formId: args.formId as any } as any)
  }, [submit])
}

export function useUpdateOAFormSubmission() {
  const update = useMutation(updateOAFormSubmissionRef)
  return useCallback((args: { id: string; answers: Record<string, unknown>; expectedVersion?: number }) => {
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

/** Approval audit entries for a submission owned by the current user. */
export function useMyOAApprovalHistory(submissionId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listMyOAApprovalHistoryRef,
    sessionToken && submissionId ? ({ sessionToken, submissionId: submissionId as any } as any) : "skip",
  )
}

/** Pending workflow tasks assigned to the current authenticated institute account. */
export function useOAApprovalInbox() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listMyOAApprovalInboxRef,
    sessionToken ? ({ sessionToken } as any) : "skip",
  )
}

export function useOAApprovalTask(taskId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getMyOAApprovalTaskRef,
    sessionToken && taskId ? ({ sessionToken, taskId: taskId as any } as any) : "skip",
  )
}

/** Acts on a persisted task ID; callers never submit a role, scope, or recipient. */
export function useReviewOAFormSubmission() {
  const act = useMutation(actOnOAApprovalTaskRef)
  return useCallback((args: {
    taskId: string
    action: "approve" | "reject" | "request_changes"
    comment?: string
    expectedVersion: number
    idempotencyKey: string
  }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return act({
      sessionToken,
      taskId: args.taskId as any,
      action: args.action,
      idempotencyKey: args.idempotencyKey,
      ...(args.comment ? { comment: args.comment } : {}),
      expectedVersion: args.expectedVersion,
    } as any)
  }, [act])
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

/** Enables teacher-derived reviewer access through an exact, super-admin link. */
export function useUpsertTeacherReviewerBinding() {
  const upsert = useMutation(upsertTeacherReviewerBindingRef)
  return useCallback((args: { reviewerAccountId: string; mainUserId: string }) => {
    const requesterSessionToken = getTongClassStoredSessionToken()
    if (!requesterSessionToken) throw new Error("请先登录")
    return upsert({
      requesterSessionToken,
      reviewerAccountId: args.reviewerAccountId as any,
      mainUserId: args.mainUserId as any,
      teacherDerivedEnabled: true,
    } as any)
  }, [upsert])
}

export function useClearTeacherReviewerBinding() {
  const clear = useMutation(clearTeacherReviewerBindingRef)
  return useCallback((reviewerAccountId: string) => {
    const requesterSessionToken = getTongClassStoredSessionToken()
    if (!requesterSessionToken) throw new Error("请先登录")
    return clear({ requesterSessionToken, reviewerAccountId: reviewerAccountId as any } as any)
  }, [clear])
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

export function useCourses(args?: { skip?: number; limit?: number; enabled?: boolean }) {
  const sessionToken = useTongClassSessionToken()
  const { enabled = true, ...queryArgs } = args || {}
  return useQuery(
    api.courses.list,
    sessionToken && enabled ? ({ ...queryArgs, sessionToken } as any) : "skip"
  )
}

export function useCourseById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.courses.getById,
    id && sessionToken ? ({ id: id as any, sessionToken } as any) : "skip"
  )
}

export function useCourseByName(name?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.courses.getByName,
    name && sessionToken ? ({ name, sessionToken } as any) : "skip"
  )
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
  return useQuery(
    api.courseReviews.listCourses,
    sessionToken ? ({ sessionToken } as any) : "skip"
  )
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
  return useQuery(
    api.courseReviews.commonTags,
    sessionToken ? ({ sessionToken } as any) : "skip"
  )
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
  return useUserByEmail(email)
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
  return useMutation(api.cc2026.set)
}

export function useCC2026BatchSet() {
  return useMutation(api.cc2026.batchSet)
}

export function useCC2026Remove() {
  return useMutation(api.cc2026.remove)
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
