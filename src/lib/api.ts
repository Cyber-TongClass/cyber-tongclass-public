"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { useAction, useQuery, useMutation } from "convex/react"
import { makeFunctionReference } from "convex/server"
import { api } from "../../convex/_generated/api"
import type { ReimbursementMaterialTableDraft, UserLink } from "@/types"
import type { CohortValue } from "@/lib/cohort"
import { useAuth } from "@/lib/hooks/use-auth"
import { normalizeOAUserScope, toOAFormUpsertPayload, type OAUserScope } from "@/lib/oa-forms"
import type {
  ManagedResearchGroupProfile,
  ManagedResearchGroupRoster,
} from "@/types/institute"

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
const listInstituteTeacherAuthorOptionsRef = makeFunctionReference<"query">(
  "publications:listInstituteTeacherAuthorOptions",
)
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
const adminSetOAFormPinnedRef = makeFunctionReference<"mutation">("oaForms:adminSetPinned")
const adminRemoveOAFormRef = makeFunctionReference<"mutation">("oaForms:adminRemove")
const teacherListOAFormsRef = makeFunctionReference<"query">("oaForms:teacherList")
const teacherGetOAFormRef = makeFunctionReference<"query">("oaForms:teacherGet")
const teacherUpsertOAFormRef = makeFunctionReference<"mutation">("oaForms:teacherUpsert")
const teacherSetOAFormStatusRef = makeFunctionReference<"mutation">("oaForms:teacherSetStatus")
const teacherRemoveOAFormRef = makeFunctionReference<"mutation">("oaForms:teacherRemove")
const teacherListOAFormSubmissionsRef = makeFunctionReference<"query">("oaForms:teacherListSubmissions")
const manageListOAFormsRef = makeFunctionReference<"query">("oaForms:manageList")
const editorVisibleOAFormsRef = makeFunctionReference<"query">("oaForms:listEditorVisibleTargets")
const manageGetOAFormRef = makeFunctionReference<"query">("oaForms:manageGet")
const manageUpsertOAFormRef = makeFunctionReference<"mutation">("oaForms:manageUpsert")
const manageSetOAFormStatusRef = makeFunctionReference<"mutation">("oaForms:manageSetStatus")
const manageSetOAFormPinnedRef = makeFunctionReference<"mutation">("oaForms:manageSetPinned")
const manageRemoveOAFormRef = makeFunctionReference<"mutation">("oaForms:manageRemove")
const manageListOAFormSubmissionsRef = makeFunctionReference<"query">("oaForms:manageListSubmissions")
const generateOAFormUploadUrlRef = makeFunctionReference<"mutation">("oaForms:generateUploadUrl")
const submitOAFormRef = makeFunctionReference<"mutation">("oaForms:submit")
const updateOAFormSubmissionRef = makeFunctionReference<"mutation">("oaForms:updateSubmission")
const listMyOAFormSubmissionsRef = makeFunctionReference<"query">("oaForms:listMine")
const listMyOAApprovalHistoryRef = makeFunctionReference<"query">("oaForms:listMineApprovalHistory")
const listMyOAApprovalInboxRef = makeFunctionReference<"query">("oaForms:listMyApprovalInbox")
const ensureMyReimbursementApprovalTasksRef = makeFunctionReference<"mutation">("oaForms:ensureMyReimbursementApprovalTasks")
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
const assignTeacherGroupMemberRef = makeFunctionReference<"mutation">("instituteDirectory:assignTeacherGroupMember")
const removeTeacherGroupMemberRef = makeFunctionReference<"mutation">("instituteDirectory:removeTeacherGroupMember")
const setTeacherGroupMemberSubtitleRef = makeFunctionReference<"mutation">("instituteDirectory:setTeacherGroupMemberSubtitle")
const updateTeacherGroupProfileRef = makeFunctionReference<"mutation">("instituteDirectory:updateTeacherGroupProfile")
const setTeacherGroupMemberOrderRef = makeFunctionReference<"mutation">("instituteDirectory:setTeacherGroupMemberOrder")
const setTeacherGroupPublicationVisibilityRef = makeFunctionReference<"mutation">("instituteDirectory:setTeacherGroupPublicationVisibility")
const setTeacherGroupVisibilityRef = makeFunctionReference<"mutation">("instituteDirectory:setTeacherGroupVisibility")
const listUserGroupsRef = makeFunctionReference<"query">("userGroups:listUserGroups")
const listUserGroupScopeOptionsRef = makeFunctionReference<"query">("userGroups:listUserGroupScopeOptions")
const listUserPickOptionsRef = makeFunctionReference<"query">("userGroups:listUserPickOptions")
const searchManageableScopeOptionsRef = makeFunctionReference<"query">("oaScopeOptions:searchManageableScopeOptions")
const createUserGroupRef = makeFunctionReference<"mutation">("userGroups:createUserGroup")
const updateUserGroupRef = makeFunctionReference<"mutation">("userGroups:updateUserGroup")
const deleteUserGroupRef = makeFunctionReference<"mutation">("userGroups:deleteUserGroup")
const addUserGroupMemberRef = makeFunctionReference<"mutation">("userGroups:addUserGroupMember")
const removeUserGroupMemberRef = makeFunctionReference<"mutation">("userGroups:removeUserGroupMember")
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
const teacherRecognitionAccessRef = makeFunctionReference<"query">("teacherRecognitions:getAccess")
const teacherRecognitionConfigurationRef = makeFunctionReference<"query">("teacherRecognitions:getConfiguration")
const teacherRecognitionSetReviewerGroupsRef = makeFunctionReference<"mutation">("teacherRecognitions:setReviewerGroups")
const teacherRecognitionCategoriesRef = makeFunctionReference<"query">("teacherRecognitions:listCategories")
const teacherRecognitionMineRef = makeFunctionReference<"query">("teacherRecognitions:listMine")
const teacherRecognitionMineDetailRef = makeFunctionReference<"query">("teacherRecognitions:getMine")
const teacherRecognitionSaveDraftRef = makeFunctionReference<"mutation">("teacherRecognitions:saveDraft")
const teacherRecognitionRemoveDraftRef = makeFunctionReference<"mutation">("teacherRecognitions:removeDraft")
const teacherRecognitionProofUploadRef = makeFunctionReference<"mutation">("teacherRecognitions:generateProofUploadUrl")
const teacherRecognitionSubmitDraftRef = makeFunctionReference<"mutation">("teacherRecognitions:submitDraft")
const teacherRecognitionUpdateNeedsChangesRef = makeFunctionReference<"mutation">("teacherRecognitions:updateNeedsChanges")
const teacherRecognitionReviewQueueRef = makeFunctionReference<"query">("teacherRecognitions:listReviewQueue")
const teacherRecognitionReviewDetailRef = makeFunctionReference<"query">("teacherRecognitions:getReviewDetail")
const teacherRecognitionReviewActionRef = makeFunctionReference<"mutation">("teacherRecognitions:actOnReviewTask")
const teacherRecognitionManagementRef = makeFunctionReference<"query">("teacherRecognitions:listForManagement")
const teacherRecognitionProofUrlRef = makeFunctionReference<"query">("teacherRecognitions:getProofUrl")
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

export function useMyPublicProfileDestination(options?: { enabled?: boolean }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getMyPublicProfileDestinationRef,
    options?.enabled !== false && sessionToken ? ({ sessionToken } as any) : "skip",
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

/** Managed roster for a teacher's own group or a super-admin-selected group. */
export function useTeacherGroupRoster(groupId?: string) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listTeacherGroupRosterRef,
    sessionToken
      ? ({
          sessionToken,
          ...(groupId ? { groupId: groupId as any } : {}),
        } as any)
      : "skip",
  ) as ManagedResearchGroupRoster | undefined
}

export function useAssignTeacherGroupMember() {
  const assign = useMutation(assignTeacherGroupMemberRef)
  return useCallback((args: { groupId?: string; userId: string; subtitle?: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return assign({
      sessionToken,
      ...args,
      ...(args.groupId ? { groupId: args.groupId as any } : {}),
    } as any)
  }, [assign])
}

export function useRemoveTeacherGroupMember() {
  const remove = useMutation(removeTeacherGroupMemberRef)
  return useCallback((args: string | { groupId?: string; userId: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    const input = typeof args === "string" ? { userId: args } : args
    return remove({
      sessionToken,
      ...input,
      ...(input.groupId ? { groupId: input.groupId as any } : {}),
    } as any)
  }, [remove])
}

export function useSetTeacherGroupMemberSubtitle() {
  const setSubtitle = useMutation(setTeacherGroupMemberSubtitleRef)
  return useCallback((args: { groupId?: string; userId: string; subtitle?: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setSubtitle({
      sessionToken,
      ...args,
      ...(args.groupId ? { groupId: args.groupId as any } : {}),
    } as any)
  }, [setSubtitle])
}

export function useUpdateTeacherGroupProfile() {
  const updateProfile = useMutation(updateTeacherGroupProfileRef)
  return useCallback((args: { groupId?: string; profile: ManagedResearchGroupProfile }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return updateProfile({
      sessionToken,
      ...args,
      ...(args.groupId ? { groupId: args.groupId as any } : {}),
    } as any)
  }, [updateProfile])
}

export function useSetTeacherGroupMemberOrder() {
  const setOrder = useMutation(setTeacherGroupMemberOrderRef)
  return useCallback((args: { groupId?: string; orderedUserIds: string[] }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setOrder({
      sessionToken,
      ...args,
      ...(args.groupId ? { groupId: args.groupId as any } : {}),
      orderedUserIds: args.orderedUserIds as any,
    } as any)
  }, [setOrder])
}

export function useSetTeacherGroupPublicationVisibility() {
  const setVisibility = useMutation(setTeacherGroupPublicationVisibilityRef)
  return useCallback((args: {
    groupId?: string
    publicationId: string
    visible: boolean
  }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setVisibility({
      sessionToken,
      ...args,
      ...(args.groupId ? { groupId: args.groupId as any } : {}),
      publicationId: args.publicationId as any,
    } as any)
  }, [setVisibility])
}

export function useSetTeacherGroupVisibility() {
  const setVisibility = useMutation(setTeacherGroupVisibilityRef)
  return useCallback((visibility: "public" | "hidden") => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setVisibility({ sessionToken, visibility } as any)
  }, [setVisibility])
}

/** Super-admin organization management: user groups with members and the account list. */
export function useUserGroups() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(listUserGroupsRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

/** Group names and sizes for scope pickers; available to any signed-in account. */
export function useUserGroupScopeOptions() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(listUserGroupScopeOptionsRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

/** Directory-level account list for adding individuals to a scope; any signed-in account. */
export function useUserPickOptions() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(listUserPickOptionsRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

export type ManageableScopePurpose = "form_audience" | "workflow_approver" | "notification"

/** One actor-filtered, bounded source for every OA audience/recipient picker. */
export function useManageableScopeOptions(
  purpose: ManageableScopePurpose,
  query?: string,
  selectedScope?: OAUserScope,
) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    searchManageableScopeOptionsRef,
    sessionToken ? ({
      sessionToken,
      purpose,
      query: query?.trim() || undefined,
      selectedScope: normalizeOAUserScope(selectedScope),
    } as any) : "skip",
  )
}

function useUserGroupMutation<TArgs extends Record<string, unknown>>(ref: typeof createUserGroupRef) {
  const run = useMutation(ref)
  return useCallback((args: TArgs) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return run({ sessionToken, ...args } as any)
  }, [run])
}

export function useCreateUserGroup() {
  return useUserGroupMutation<{ name: string; description?: string }>(createUserGroupRef)
}

export function useUpdateUserGroup() {
  return useUserGroupMutation<{ groupId: string; name: string; description?: string }>(updateUserGroupRef)
}

export function useDeleteUserGroup() {
  return useUserGroupMutation<{ groupId: string }>(deleteUserGroupRef)
}

export function useAddUserGroupMember() {
  return useUserGroupMutation<{ groupId: string; userId: string }>(addUserGroupMemberRef)
}

export function useRemoveUserGroupMember() {
  return useUserGroupMutation<{ groupId: string; userId: string }>(removeUserGroupMemberRef)
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
  const sessionToken = useTongClassSessionToken()
  const queryArgs = useMemo(() => {
    const { groupSlug, ...rest } = args || {}
    const base = groupSlug ? { ...rest, researchGroupSlug: groupSlug } : rest
    return sessionToken ? ({ ...base, sessionToken } as any) : base
  }, [args, sessionToken])
  return useQuery(listPublicInstituteUpdatesRef, queryArgs)
}

export function usePublicInstituteResearchById(id?: string | null) {
  return useQuery(getPublicInstituteResearchByIdRef, id ? { id } : "skip")
}

export function usePublicInstituteUpdateById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    getPublicInstituteUpdateByIdRef,
    id ? (sessionToken ? ({ id, sessionToken } as any) : { id }) : "skip",
  )
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
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.news.list, { ...(args || {}), ...(sessionToken ? { sessionToken } : {}) } as any)
}

export function useAllNews(args?: { category?: string; skip?: number; limit?: number; disabled?: boolean }) {
  const sessionToken = useTongClassSessionToken()
  const { disabled, ...queryArgs } = args || {}
  return useQuery(api.news.listAll, sessionToken && !disabled ? ({ ...queryArgs, sessionToken } as any) : "skip") as any
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
  const sessionToken = useTongClassSessionToken()
  return useQuery(api.news.count, { ...(args || {}), ...(sessionToken ? { sessionToken } : {}) } as any)
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
  return useQuery(api.events.adminList, sessionToken && !disabled ? ({ ...queryArgs, sessionToken } as any) : "skip")
}

export function useAdminEventById(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    api.events.adminGetById,
    sessionToken && id ? ({ id: id as any, sessionToken } as any) : "skip",
  )
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

export function usePublicationTeacherAuthorOptions() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listInstituteTeacherAuthorOptionsRef,
    sessionToken ? { sessionToken } : "skip",
  ) as Array<{ slug: string; nameZh: string; nameEn: string }> | undefined
}

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
  return useCallback((args: Record<string, unknown> & { idempotencyKey: string }) => {
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

// ==================== 教师奖励与专业服务 ====================

function useTeacherRecognitionMutation(ref: ReturnType<typeof makeFunctionReference<"mutation">>) {
  const mutate = useMutation(ref)
  return useCallback((args: Record<string, unknown> = {}) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return mutate({ ...args, sessionToken } as any)
  }, [mutate])
}

export function useTeacherRecognitionAccess() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherRecognitionAccessRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

export function useTeacherRecognitionConfiguration() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherRecognitionConfigurationRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

export function useSetTeacherRecognitionReviewerGroups() {
  return useTeacherRecognitionMutation(teacherRecognitionSetReviewerGroupsRef)
}

export function useTeacherRecognitionCategories(includeRetired = false) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherRecognitionCategoriesRef, sessionToken ? ({ sessionToken, includeRetired } as any) : "skip")
}

export function useMyTeacherRecognitions() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherRecognitionMineRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

export function useMyTeacherRecognitionDetail(input?: { draftId?: string; submissionId?: string } | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    teacherRecognitionMineDetailRef,
    sessionToken && input ? ({ sessionToken, ...input } as any) : "skip",
  )
}

export function useSaveTeacherRecognitionDraft() { return useTeacherRecognitionMutation(teacherRecognitionSaveDraftRef) }
export function useRemoveTeacherRecognitionDraft() { return useTeacherRecognitionMutation(teacherRecognitionRemoveDraftRef) }
export function useGenerateTeacherRecognitionProofUploadUrl() { return useTeacherRecognitionMutation(teacherRecognitionProofUploadRef) }
export function useSubmitTeacherRecognitionDraft() { return useTeacherRecognitionMutation(teacherRecognitionSubmitDraftRef) }
export function useUpdateTeacherRecognitionNeedsChanges() { return useTeacherRecognitionMutation(teacherRecognitionUpdateNeedsChangesRef) }

export function useTeacherRecognitionReviewQueue(status?: string) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherRecognitionReviewQueueRef, sessionToken ? ({ sessionToken, ...(status ? { status } : {}) } as any) : "skip")
}

export function useTeacherRecognitionReviewDetail(taskId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherRecognitionReviewDetailRef, sessionToken && taskId ? ({ sessionToken, taskId } as any) : "skip")
}

export function useActOnTeacherRecognitionReview() { return useTeacherRecognitionMutation(teacherRecognitionReviewActionRef) }

export function useTeacherRecognitionManagement(filters: Record<string, unknown> = {}) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherRecognitionManagementRef, sessionToken ? ({ sessionToken, ...filters } as any) : "skip")
}

export function useTeacherRecognitionProofUrl(submissionId?: string | null, storageId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    teacherRecognitionProofUrlRef,
    sessionToken && submissionId && storageId ? ({ sessionToken, submissionId, storageId } as any) : "skip",
  ) as string | null | undefined
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

export function useAdminSetOAFormPinned() {
  const setPinned = useMutation(adminSetOAFormPinnedRef)
  return useCallback((args: { id: string; pinned: boolean }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setPinned({ ...args, sessionToken, id: args.id as any } as any)
  }, [setPinned])
}

/** Canonical form-management surface for owner teachers and all-seeing super administrators. */
export function useManageOAForms() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(manageListOAFormsRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

/** Target forms the current form editor is authorized to reference. */
export function useEditorVisibleOAForms() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(editorVisibleOAFormsRef, sessionToken ? ({ sessionToken } as any) : "skip") as
    | Array<{ id: string; title: string; status: "draft" | "published" | "archived"; kind: "form" | "reimbursement" }>
    | undefined
}

export function useManageOAForm(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(manageGetOAFormRef, sessionToken && id ? ({ sessionToken, id: id as any } as any) : "skip")
}

export function useManageUpsertOAForm() {
  const upsert = useMutation(manageUpsertOAFormRef)
  return useCallback((args: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return upsert({ ...toOAFormUpsertPayload(args), sessionToken } as any)
  }, [upsert])
}

export function useManageSetOAFormStatus() {
  const setStatus = useMutation(manageSetOAFormStatusRef)
  return useCallback((args: { id: string; status: "draft" | "published" | "archived" }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setStatus({ ...args, sessionToken, id: args.id as any } as any)
  }, [setStatus])
}

export function useManageSetOAFormPinned() {
  const setPinned = useMutation(manageSetOAFormPinnedRef)
  return useCallback((args: { id: string; pinned: boolean }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setPinned({ ...args, sessionToken, id: args.id as any } as any)
  }, [setPinned])
}

export function useManageRemoveOAForm() {
  const remove = useMutation(manageRemoveOAFormRef)
  return useCallback((args: { id: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...args, sessionToken, id: args.id as any } as any)
  }, [remove])
}

export function useManageOAFormSubmissions(args?: {
  formId?: string | null
  status?: "pending" | "approved" | "rejected" | "needs_changes"
  search?: string
}) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    manageListOAFormSubmissionsRef,
    sessionToken && args?.formId
      ? ({ sessionToken, ...args, formId: args.formId as any } as any)
      : "skip",
  )
}

/** Teacher-owned form publishing: each teacher only ever sees their own forms. */
export function useTeacherOAForms() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherListOAFormsRef, sessionToken ? ({ sessionToken } as any) : "skip")
}

export function useTeacherOAForm(id?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(teacherGetOAFormRef, sessionToken && id ? ({ sessionToken, id: id as any } as any) : "skip")
}

export function useTeacherUpsertOAForm() {
  const upsert = useMutation(teacherUpsertOAFormRef)
  return useCallback((args: Record<string, unknown>) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return upsert({ ...toOAFormUpsertPayload(args), sessionToken } as any)
  }, [upsert])
}

export function useTeacherSetOAFormStatus() {
  const setStatus = useMutation(teacherSetOAFormStatusRef)
  return useCallback((args: { id: string; status: "draft" | "published" | "archived" }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setStatus({ ...args, sessionToken, id: args.id as any } as any)
  }, [setStatus])
}

export function useTeacherRemoveOAForm() {
  const remove = useMutation(teacherRemoveOAFormRef)
  return useCallback((args: { id: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return remove({ ...args, sessionToken, id: args.id as any } as any)
  }, [remove])
}

export function useTeacherOAFormSubmissions(args?: { formId?: string | null; status?: "pending" | "approved" | "rejected" | "needs_changes"; search?: string }) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    teacherListOAFormSubmissionsRef,
    sessionToken && args?.formId ? ({ sessionToken, ...args, formId: args.formId as any } as any) : "skip"
  )
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

export function useEnsureMyReimbursementApprovalTasks() {
  const ensure = useMutation(ensureMyReimbursementApprovalTasksRef)
  return useCallback(() => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return ensure({ sessionToken } as any)
  }, [ensure])
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

// ---------------------------------------------------------------------------
// Permission-granted content publication (新闻 / 活动 创建与审核)
// ---------------------------------------------------------------------------

const contentReviewListPermissionsRef = makeFunctionReference<"query">("contentReview:listPermissions")
const contentReviewSetPermissionRef = makeFunctionReference<"mutation">("contentReview:setPermission")
const contentReviewSetPermissionsForScopeRef = makeFunctionReference<"mutation">("contentReview:setPermissionsForScope")
const contentReviewRemovePermissionRef = makeFunctionReference<"mutation">("contentReview:removePermission")
const contentReviewMyPermissionsRef = makeFunctionReference<"query">("contentReview:myPermissions")
const contentReviewSubmitRef = makeFunctionReference<"mutation">("contentReview:submit")
const contentReviewReviewQueueRef = makeFunctionReference<"query">("contentReview:reviewQueue")
const contentReviewMySubmissionsRef = makeFunctionReference<"query">("contentReview:mySubmissions")
const contentReviewSubmissionDetailRef = makeFunctionReference<"query">("contentReview:getSubmissionDetail")
const contentReviewReviewRef = makeFunctionReference<"mutation">("contentReview:review")
const externalNewsReviewQueueRef = makeFunctionReference<"query">("externalNewsSync:listMyReviewQueue")
const externalNewsReviewDraftRef = makeFunctionReference<"query">("externalNewsSync:getReviewDraft")
const externalNewsSaveDraftRef = makeFunctionReference<"mutation">("externalNewsSync:saveReviewDraft")
const externalNewsAdoptSnapshotRef = makeFunctionReference<"mutation">("externalNewsSync:adoptPendingSnapshot")
const externalNewsDecideReviewRef = makeFunctionReference<"mutation">("externalNewsSync:decideReview")
const externalNewsOperationsRef = makeFunctionReference<"query">("externalNewsSync:getOperations")
const externalNewsSaveSettingsRef = makeFunctionReference<"mutation">("externalNewsSync:saveSettings")
const externalNewsRunNowRef = makeFunctionReference<"action">("externalNewsSync:runNow")

export type ContentReviewCategory = "news" | "events"
export type ContentPermissionCategory = ContentReviewCategory | "reimbursement"
export type ContentReviewStatus = "pending" | "approved" | "rejected"

export type ContentPermissionEntry = {
  userId: string
  username: string
  name: string
  identityType: string
  canCreate: boolean
  canReview: boolean
  canManage: boolean
  updatedAt: number
}

export type ContentSubmissionPayload = {
  content?: string
  sourceUrl?: string
  coverImageUrl?: string
  newsCategory?: string
  date?: string
  time?: string
  endDate?: string
  endTime?: string
  location?: string
  description?: string
  url?: string
  color?: string
}

export type ContentSubmission = {
  _id: string
  category: ContentReviewCategory
  title: string
  payload: ContentSubmissionPayload
  targetScope?: Record<string, unknown>
  createdBy: string
  creatorName: string
  status: ContentReviewStatus
  reviewedBy?: string
  reviewerName?: string
  reviewComment?: string
  reviewedAt?: number
  publishedContentId?: string
  tasks?: Array<{
    _id: string
    isMine: boolean
    reviewerName: string
    status: "pending" | "approved" | "rejected" | "skipped"
    stage?: "source_review" | "publication_approval"
    comment?: string
    decidedAt?: number
  }>
  myTaskId?: string
  canReview?: boolean
  createdAt: number
  updatedAt: number
}

/** Super admin: permission rows for one category. */
export function useContentPermissions(category: ContentPermissionCategory) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    contentReviewListPermissionsRef,
    sessionToken ? ({ sessionToken, category } as any) : "skip",
  ) as ContentPermissionEntry[] | undefined
}

export function useSetContentPermission() {
  const setPermission = useMutation(contentReviewSetPermissionRef)
  return useCallback((args: { category: ContentPermissionCategory; userId: string; canCreate: boolean; canReview?: boolean; canManage: boolean }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setPermission({ ...args, sessionToken, userId: args.userId as any } as any)
  }, [setPermission])
}

/** Sends the unexpanded scope to the server, which resolves authorized members. */
export function useSetContentPermissionsForScope() {
  const setPermissionsForScope = useMutation(contentReviewSetPermissionsForScopeRef)
  return useCallback((args: {
    category: ContentPermissionCategory
    scope: OAUserScope
    canCreate: boolean
    canReview?: boolean
    canManage: boolean
  }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return setPermissionsForScope({ ...args, sessionToken } as any)
  }, [setPermissionsForScope])
}

export function useRemoveContentPermission() {
  const removePermission = useMutation(contentReviewRemovePermissionRef)
  return useCallback((args: { category: ContentPermissionCategory; userId: string }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return removePermission({ ...args, sessionToken, userId: args.userId as any } as any)
  }, [removePermission])
}

/** Signed-in account's rights across all categories (drives the portal section). */
export function useMyContentPermissions() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    contentReviewMyPermissionsRef,
    sessionToken ? ({ sessionToken } as any) : "skip",
  ) as Record<ContentPermissionCategory, { canCreate: boolean; canReview: boolean; canManage: boolean }> | undefined
}

export function useSubmitContentForReview() {
  const submit = useMutation(contentReviewSubmitRef)
  return useCallback((args: {
    category: ContentReviewCategory
    title: string
    payload: ContentSubmissionPayload
    targetScope: Record<string, unknown>
    idempotencyKey: string
  }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return submit({ ...args, sessionToken } as any)
  }, [submit])
}

export function useContentReviewQueue(category: ContentReviewCategory, status?: ContentReviewStatus) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    contentReviewReviewQueueRef,
    sessionToken ? ({ sessionToken, category, ...(status ? { status } : {}) } as any) : "skip",
  ) as ContentSubmission[] | undefined
}

export function useMyContentSubmissions(category: ContentReviewCategory) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    contentReviewMySubmissionsRef,
    sessionToken ? ({ sessionToken, category } as any) : "skip",
  ) as ContentSubmission[] | undefined
}

/**
 * Fetches one submission through the server's creator/reviewer relationship
 * authorization. `null` deliberately covers missing, mismatched and
 * inaccessible IDs without exposing which case occurred.
 */
export function useContentSubmissionDetail(category: ContentReviewCategory, id: string) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    contentReviewSubmissionDetailRef,
    sessionToken ? ({ sessionToken, id: id as any, category } as any) : "skip",
  ) as ContentSubmission | null | undefined
}

export function useReviewContentSubmission() {
  const review = useMutation(contentReviewReviewRef)
  return useCallback((args: {
    taskId?: string
    id?: string
    decision: "approved" | "rejected"
    comment?: string
  }) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    if (!args.taskId && !args.id) throw new Error("审核任务标识不能为空")
    return review({
      ...args,
      sessionToken,
      ...(args.taskId ? { taskId: args.taskId as any } : {}),
      ...(args.id ? { id: args.id as any } : {}),
    } as any)
  }, [review])
}

export type ExternalNewsReviewQueueItem = {
  taskId: string
  submissionId: string
  title: string
  category: string
  sourceUrl: string
  sourcePublishedAt?: number
  sourceUpdateAvailable: boolean
  taskStatus: "pending" | "changes_requested" | "accepted" | "rejected" | "skipped"
  lastFetchedAt?: number
  createdAt: number
}

export type ExternalNewsReviewDraft = {
  submissionId: string
  taskId: string
  title: string
  content: string
  category: string
  sourceUrl: string
  coverImageUrl?: string
  sourcePublishedAt?: number
  sourceReviewStatus: "pending" | "needs_changes" | "accepted" | "rejected"
  taskStatus: "pending" | "changes_requested" | "accepted" | "rejected" | "skipped"
  sourceUpdateAvailable: boolean
  internalUpdatedAt: number
  sourceSnapshot?: { title: string; content: string; fetchedAt: number }
}

export type ExternalNewsSyncOperations = {
  settings: {
    enabled: boolean
    mode: "observation" | "draft"
    reviewerMode: "scope" | "all_reviewers"
    reviewerScope?: OAUserScope
  }
  reviewerPreview: { count: number; labels: string[] }
  sources: Array<{
    key: "news" | "notices" | "research_progress" | "academic_lectures"
    label: string
    listUrl: string
    health: null | {
      lastAttemptAt?: number
      lastSuccessAt?: number
      lastFailureCode?: string
      consecutiveFailures: number
      lastDiscoveredCount: number
    }
  }>
  runs: Array<{
    _id: string
    trigger: "cron" | "manual"
    mode: "observation" | "draft"
    status: "running" | "completed" | "partial_failure" | "failed"
    discoveredCount: number
    draftCount: number
    failureCount: number
    startedAt: number
    finishedAt?: number
  }>
}

function useExternalNewsMutation(ref: ReturnType<typeof makeFunctionReference<"mutation">>) {
  const mutate = useMutation(ref)
  return useCallback((args: Record<string, unknown> = {}) => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return mutate({ ...args, sessionToken } as any)
  }, [mutate])
}

export function useExternalNewsReviewQueue() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(externalNewsReviewQueueRef, sessionToken ? ({ sessionToken } as any) : "skip") as ExternalNewsReviewQueueItem[] | undefined
}

export function useExternalNewsReviewDraft(taskId?: string | null) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    externalNewsReviewDraftRef,
    sessionToken && taskId ? ({ sessionToken, taskId: taskId as any } as any) : "skip",
  ) as ExternalNewsReviewDraft | undefined
}

export function useSaveExternalNewsReviewDraft() { return useExternalNewsMutation(externalNewsSaveDraftRef) }
export function useAdoptExternalNewsSnapshot() { return useExternalNewsMutation(externalNewsAdoptSnapshotRef) }
export function useDecideExternalNewsReview() { return useExternalNewsMutation(externalNewsDecideReviewRef) }

export function useExternalNewsSyncOperations(enabled = true) {
  const sessionToken = useTongClassSessionToken()
  return useQuery(externalNewsOperationsRef, enabled && sessionToken ? ({ sessionToken } as any) : "skip") as ExternalNewsSyncOperations | undefined
}

export function useSaveExternalNewsSyncSettings() { return useExternalNewsMutation(externalNewsSaveSettingsRef) }

export function useRunExternalNewsSyncNow() {
  const run = useAction(externalNewsRunNowRef)
  return useCallback(() => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    return run({ sessionToken } as any)
  }, [run])
}
