"use client"

import { FormEvent, useMemo, useState } from "react"
import { ChevronDown, Download, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  useAdminTechDayUsers,
  useCreateTechDayAward,
  useCreateTechDayDirection,
  useCreateTechDayOrganization,
  useCreateTechDayReviewerInvite,
  useCreateTechDayRoleTemplate,
  useDeleteTechDayAward,
  useDeleteTechDayDirection,
  useDeleteTechDayOrganization,
  useDeleteTechDayReviewerInvite,
  useDeleteTechDayRoleTemplate,
  useDeleteTechDayUser,
  useExportTechDayUsers,
  useTechDayActorArgs,
  useTechDayAwards,
  useTechDayDirections,
  useTechDayOrganizations,
  useTechDayReviewerInvites,
  useTechDayRoleTemplates,
  useTechDaySettings,
  useUpdateTechDayAward,
  useUpdateTechDayDirection,
  useUpdateTechDayOrganization,
  useUpdateTechDayRoleTemplate,
  useUpdateTechDaySettings,
  useUpdateTechDayUser,
} from "@/lib/api"
import { TechDayAwardBadge, TechDayRoleBadge } from "@/components/techday/techday-badges"
import { downloadCsv, techDayRoleLabels, type TechDayRole } from "@/types/techday"

const EMPTY_SELECT = "__none"
const ALL_FILTER = "__all"
const UNASSIGNED_FILTER = "__unassigned"
const roleOptions: TechDayRole[] = ["volunteer", "admin", "author", "reviewer"]
const statusOptions = [
  { value: "active", label: "启用" },
  { value: "pending", label: "待审核" },
  { value: "disabled", label: "禁用" },
]
type SettingsDraft = {
  showVoteData: boolean
  voteSortEnabled: boolean
  voteEditRoleTemplateId: string
  visibleAwardIds: string[]
}
type UserFilters = {
  role: string
  status: string
  organization: string
  roleTemplate: string
  reviewerDirection: string
  canPublishNews: string
}

const defaultUserFilters: UserFilters = {
  role: ALL_FILTER,
  status: ALL_FILTER,
  organization: ALL_FILTER,
  roleTemplate: ALL_FILTER,
  reviewerDirection: ALL_FILTER,
  canPublishNews: ALL_FILTER,
}

function FilterableTableHead({
  label,
  value,
  options,
  className = "",
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  className?: string
  onChange: (value: string) => void
}) {
  const isFiltered = value !== ALL_FILTER

  return (
    <TableHead className={`relative pb-5 pr-7 ${className}`}>
      {label}
      <select
        aria-label={`${label}筛选`}
        className="absolute bottom-1 right-1 h-5 w-5 cursor-pointer opacity-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className={`pointer-events-none absolute bottom-1 right-1 h-4 w-4 ${isFiltered ? "text-primary" : "text-slate-400"}`} />
    </TableHead>
  )
}

export default function AdminTechDaySettingsPage() {
  const actorArgs = useTechDayActorArgs()
  const orgs = useTechDayOrganizations()
  const directions = useTechDayDirections()
  const roles = useTechDayRoleTemplates(actorArgs)
  const users = useAdminTechDayUsers(actorArgs)
  const exportUsers = useExportTechDayUsers(actorArgs)
  const invites = useTechDayReviewerInvites(actorArgs)
  const awards = useTechDayAwards(actorArgs)
  const settings = useTechDaySettings(actorArgs)

  const createOrg = useCreateTechDayOrganization()
  const updateOrg = useUpdateTechDayOrganization()
  const deleteOrg = useDeleteTechDayOrganization()
  const createDirection = useCreateTechDayDirection()
  const updateDirection = useUpdateTechDayDirection()
  const deleteDirection = useDeleteTechDayDirection()
  const createRole = useCreateTechDayRoleTemplate()
  const updateRole = useUpdateTechDayRoleTemplate()
  const deleteRole = useDeleteTechDayRoleTemplate()
  const createAward = useCreateTechDayAward()
  const updateAward = useUpdateTechDayAward()
  const deleteAward = useDeleteTechDayAward()
  const updateSettings = useUpdateTechDaySettings()
  const updateUser = useUpdateTechDayUser()
  const deleteUser = useDeleteTechDayUser()
  const createInvite = useCreateTechDayReviewerInvite()
  const deleteInvite = useDeleteTechDayReviewerInvite()

  const [orgForm, setOrgForm] = useState({ name: "", responsibility: "" })
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null)
  const [orgEditForm, setOrgEditForm] = useState({ name: "", responsibility: "" })
  const [directionForm, setDirectionForm] = useState({ name: "", description: "" })
  const [editingDirectionId, setEditingDirectionId] = useState<string | null>(null)
  const [directionEditForm, setDirectionEditForm] = useState({ name: "", description: "" })
  const [roleForm, setRoleForm] = useState({ name: "", canEditVoteData: false })
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [roleEditForm, setRoleEditForm] = useState({ name: "", canEditVoteData: false })
  const [awardForm, setAwardForm] = useState({ name: "", description: "", color: "#F59E0B" })
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null)
  const [awardEditForm, setAwardEditForm] = useState({ name: "", description: "", color: "#F59E0B" })
  const [inviteForm, setInviteForm] = useState({ code: "", presetDirectionId: EMPTY_SELECT })
  const [settingsDraftOverride, setSettingsDraftOverride] = useState<SettingsDraft | null>(null)
  const [userFilters, setUserFilters] = useState<UserFilters>(defaultUserFilters)

  const organizationNames = useMemo(() => (orgs || []).map((org: any) => org.name), [orgs])
  const roleFilterOptions = useMemo(() => [
    { value: ALL_FILTER, label: "全部人员类型" },
    ...roleOptions.map((role) => ({ value: role, label: techDayRoleLabels[role] })),
  ], [])
  const statusFilterOptions = useMemo(() => [
    { value: ALL_FILTER, label: "全部状态" },
    ...statusOptions,
  ], [])
  const organizationFilterOptions = useMemo(() => [
    { value: ALL_FILTER, label: "全部工作组" },
    { value: UNASSIGNED_FILTER, label: "未分配" },
    ...organizationNames.map((name: string) => ({ value: name, label: name })),
  ], [organizationNames])
  const roleTemplateFilterOptions = useMemo(() => [
    { value: ALL_FILTER, label: "全部计票模板" },
    { value: EMPTY_SELECT, label: "无模板" },
    ...(roles || []).map((role: any) => ({ value: String(role._id), label: role.name })),
  ], [roles])
  const reviewerDirectionFilterOptions = useMemo(() => [
    { value: ALL_FILTER, label: "全部审阅方向" },
    { value: EMPTY_SELECT, label: "未指定" },
    ...(directions || []).map((direction: any) => ({ value: String(direction._id), label: direction.name })),
  ], [directions])
  const newsFilterOptions = useMemo(() => [
    { value: ALL_FILTER, label: "全部新闻权限" },
    { value: "yes", label: "可发布" },
    { value: "no", label: "不可发布" },
  ], [])
  const settingsDraft = useMemo<SettingsDraft>(() => {
    if (settingsDraftOverride) return settingsDraftOverride
    return {
      showVoteData: Boolean(settings?.showVoteData),
      voteSortEnabled: Boolean(settings?.voteSortEnabled),
      voteEditRoleTemplateId: settings?.voteEditRoleTemplateId ? String(settings.voteEditRoleTemplateId) : EMPTY_SELECT,
      visibleAwardIds: (settings?.visibleAwardIds || []).map(String),
    }
  }, [settings, settingsDraftOverride])
  const setSettingsDraft = (updater: SettingsDraft | ((current: SettingsDraft) => SettingsDraft)) => {
    setSettingsDraftOverride((current) => {
      const base = current || settingsDraft
      return typeof updater === "function" ? updater(base) : updater
    })
  }

  const submitOrg = async (event: FormEvent) => {
    event.preventDefault()
    await createOrg({ ...actorArgs, name: orgForm.name, responsibility: orgForm.responsibility })
    setOrgForm({ name: "", responsibility: "" })
  }

  const submitDirection = async (event: FormEvent) => {
    event.preventDefault()
    await createDirection({ ...actorArgs, name: directionForm.name, description: directionForm.description || undefined })
    setDirectionForm({ name: "", description: "" })
  }

  const submitRole = async (event: FormEvent) => {
    event.preventDefault()
    await createRole({ ...actorArgs, name: roleForm.name, canEditVoteData: roleForm.canEditVoteData })
    setRoleForm({ name: "", canEditVoteData: false })
  }

  const submitAward = async (event: FormEvent) => {
    event.preventDefault()
    await createAward({
      ...actorArgs,
      name: awardForm.name,
      description: awardForm.description || undefined,
      color: awardForm.color || undefined,
    })
    setAwardForm({ name: "", description: "", color: "#F59E0B" })
  }

  const saveSettings = async () => {
    await updateSettings({
      ...actorArgs,
      showVoteData: settingsDraft.showVoteData,
      voteSortEnabled: settingsDraft.voteSortEnabled,
      voteEditRoleTemplateId: settingsDraft.voteEditRoleTemplateId === EMPTY_SELECT ? null : settingsDraft.voteEditRoleTemplateId as any,
      visibleAwardIds: settingsDraft.visibleAwardIds.length ? settingsDraft.visibleAwardIds as any : null,
    })
    setSettingsDraftOverride(null)
  }

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault()
    await createInvite({
      ...actorArgs,
      code: inviteForm.code || undefined,
      presetDirectionId: inviteForm.presetDirectionId === EMPTY_SELECT ? undefined : inviteForm.presetDirectionId as any,
    })
    setInviteForm({ code: "", presetDirectionId: EMPTY_SELECT })
  }

  const toggleVisibleAward = (awardId: string) => {
    setSettingsDraft((current) => ({
      ...current,
      visibleAwardIds: current.visibleAwardIds.includes(awardId)
        ? current.visibleAwardIds.filter((id) => id !== awardId)
        : [...current.visibleAwardIds, awardId],
    }))
  }

  const updateUserField = async (user: any, payload: Record<string, unknown>) => {
    await updateUser({ ...actorArgs, id: user._id, ...payload } as any)
  }

  const toggleAssignedOrg = async (user: any, orgName: string) => {
    const current = user.assignedTracks || []
    const next = current.includes(orgName)
      ? current.filter((name: string) => name !== orgName)
      : [...current, orgName]
    await updateUserField(user, { assignedTracks: next })
  }

  const confirmDelete = async (message: string, action: () => Promise<unknown>) => {
    if (window.confirm(message)) await action()
  }

  const updateUserFilter = (key: keyof UserFilters, value: string) => {
    setUserFilters((current) => ({ ...current, [key]: value }))
  }

  const filteredUsers = useMemo(() => {
    return (users || []).filter((user: any) => {
      if (userFilters.role !== ALL_FILTER && user.role !== userFilters.role) return false
      if (userFilters.status !== ALL_FILTER && user.status !== userFilters.status) return false
      if (userFilters.organization !== ALL_FILTER) {
        const assignedTracks = user.assignedTracks || []
        if (userFilters.organization === UNASSIGNED_FILTER) {
          if (assignedTracks.length > 0) return false
        } else if (!assignedTracks.includes(userFilters.organization)) {
          return false
        }
      }
      if (userFilters.roleTemplate !== ALL_FILTER) {
        const roleTemplateId = user.roleTemplateId ? String(user.roleTemplateId) : EMPTY_SELECT
        if (roleTemplateId !== userFilters.roleTemplate) return false
      }
      if (userFilters.reviewerDirection !== ALL_FILTER) {
        const reviewerDirectionId = user.reviewerDirectionId ? String(user.reviewerDirectionId) : EMPTY_SELECT
        if (reviewerDirectionId !== userFilters.reviewerDirection) return false
      }
      if (userFilters.canPublishNews !== ALL_FILTER) {
        if (Boolean(user.canPublishNews) !== (userFilters.canPublishNews === "yes")) return false
      }
      return true
    })
  }, [users, userFilters])

  const filteredUserIds = useMemo(() => new Set(filteredUsers.map((user: any) => String(user._id))), [filteredUsers])
  const filteredExportUsers = useMemo(() => {
    return (exportUsers || []).filter((user: any) => filteredUserIds.has(String(user.id)))
  }, [exportUsers, filteredUserIds])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">TechDay 设置</h1>
        <p className="mt-2 text-sm text-slate-600">复现原 AITechDay 的展示设置、组织职责、方向详情、角色模板、奖项和人员类型管理。</p>
      </div>

      <Card>
        <CardHeader><CardTitle>列表展示设置</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                checked={settingsDraft.showVoteData}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, showVoteData: event.target.checked }))}
              />
              列表展示投票数据
            </Label>
            <Label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                checked={settingsDraft.voteSortEnabled}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, voteSortEnabled: event.target.checked }))}
              />
              允许按投票排序
            </Label>
            <Label className="space-y-1 text-sm">
              <span>计票角色模板</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                value={settingsDraft.voteEditRoleTemplateId}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, voteEditRoleTemplateId: event.target.value }))}
              >
                <option value={EMPTY_SELECT}>不指定</option>
                {(roles || []).map((role: any) => (
                  <option key={role._id} value={String(role._id)}>{role.name}</option>
                ))}
              </select>
            </Label>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">公开列表展示的奖项</p>
            <div className="flex flex-wrap gap-2">
              {(awards || []).map((award: any) => (
                <Label key={award._id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsDraft.visibleAwardIds.includes(String(award._id))}
                    onChange={() => toggleVisibleAward(String(award._id))}
                  />
                  <TechDayAwardBadge name={award.name} color={award.color} />
                </Label>
              ))}
              {(awards || []).length === 0 ? <span className="text-sm text-slate-500">暂无可选奖项</span> : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSettingsDraft((current) => ({ ...current, visibleAwardIds: [] }))}
            >
              清空并展示全部奖项
            </Button>
          </div>
          <Button onClick={saveSettings}>
            <Save className="mr-2 h-4 w-4" />
            保存展示设置
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>组织管理</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 lg:grid-cols-[1fr,1.5fr,auto]" onSubmit={submitOrg}>
              <Input value={orgForm.name} onChange={(event) => setOrgForm((current) => ({ ...current, name: event.target.value }))} placeholder="组织名称" required />
              <Input value={orgForm.responsibility} onChange={(event) => setOrgForm((current) => ({ ...current, responsibility: event.target.value }))} placeholder="职责详情" required />
              <Button type="submit"><Plus className="mr-2 h-4 w-4" />新增</Button>
            </form>
            <div className="space-y-2">
              {(orgs || []).map((org: any) => (
                <div key={org._id} className="rounded-md border p-3 text-sm">
                  {editingOrgId === String(org._id) ? (
                    <div className="grid gap-2">
                      <Input value={orgEditForm.name} onChange={(event) => setOrgEditForm((current) => ({ ...current, name: event.target.value }))} />
                      <Textarea value={orgEditForm.responsibility} onChange={(event) => setOrgEditForm((current) => ({ ...current, responsibility: event.target.value }))} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={async () => { await updateOrg({ ...actorArgs, id: org._id, ...orgEditForm }); setEditingOrgId(null) }}><Save className="mr-2 h-4 w-4" />保存</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingOrgId(null)}><X className="mr-2 h-4 w-4" />取消</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{org.name}</p>
                        <p className="mt-1 text-slate-600">{org.responsibility || "未填写职责"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditingOrgId(String(org._id)); setOrgEditForm({ name: org.name, responsibility: org.responsibility || "" }) }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDelete("确认删除该组织？已分配给用户或报销记录中的组织不能删除。", () => deleteOrg({ ...actorArgs, id: org._id }))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>方向管理</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 lg:grid-cols-[1fr,1.5fr,auto]" onSubmit={submitDirection}>
              <Input value={directionForm.name} onChange={(event) => setDirectionForm((current) => ({ ...current, name: event.target.value }))} placeholder="方向名称" required />
              <Input value={directionForm.description} onChange={(event) => setDirectionForm((current) => ({ ...current, description: event.target.value }))} placeholder="详情描述" />
              <Button type="submit"><Plus className="mr-2 h-4 w-4" />新增</Button>
            </form>
            <div className="space-y-2">
              {(directions || []).map((direction: any) => (
                <div key={direction._id} className="rounded-md border p-3 text-sm">
                  {editingDirectionId === String(direction._id) ? (
                    <div className="grid gap-2">
                      <Input value={directionEditForm.name} onChange={(event) => setDirectionEditForm((current) => ({ ...current, name: event.target.value }))} />
                      <Textarea value={directionEditForm.description} onChange={(event) => setDirectionEditForm((current) => ({ ...current, description: event.target.value }))} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={async () => { await updateDirection({ ...actorArgs, id: direction._id, ...directionEditForm }); setEditingDirectionId(null) }}><Save className="mr-2 h-4 w-4" />保存</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDirectionId(null)}><X className="mr-2 h-4 w-4" />取消</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{direction.name}</p>
                        <p className="mt-1 text-slate-600">{direction.description || "未填写详情"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditingDirectionId(String(direction._id)); setDirectionEditForm({ name: direction.name, description: direction.description || "" }) }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDelete("确认删除该方向？已被投稿使用的方向不能删除。", () => deleteDirection({ ...actorArgs, id: direction._id }))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>角色模板</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 md:grid-cols-[1fr,auto,auto]" onSubmit={submitRole}>
              <Input value={roleForm.name} onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))} placeholder="模板名称" required />
              <Label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={roleForm.canEditVoteData} onChange={(event) => setRoleForm((current) => ({ ...current, canEditVoteData: event.target.checked }))} />
                可编辑计票
              </Label>
              <Button type="submit"><Plus className="mr-2 h-4 w-4" />新增</Button>
            </form>
            <div className="space-y-2">
              {(roles || []).map((role: any) => (
                <div key={role._id} className="rounded-md border p-3 text-sm">
                  {editingRoleId === String(role._id) ? (
                    <div className="grid gap-2 md:grid-cols-[1fr,auto,auto,auto] md:items-center">
                      <Input value={roleEditForm.name} onChange={(event) => setRoleEditForm((current) => ({ ...current, name: event.target.value }))} />
                      <Label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={roleEditForm.canEditVoteData} onChange={(event) => setRoleEditForm((current) => ({ ...current, canEditVoteData: event.target.checked }))} />
                        可编辑计票
                      </Label>
                      <Button size="sm" onClick={async () => { await updateRole({ ...actorArgs, id: role._id, ...roleEditForm }); setEditingRoleId(null) }}>保存</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingRoleId(null)}>取消</Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{role.name}</p>
                        <p className="text-slate-600">{role.canEditVoteData ? "可编辑投票数据" : "普通模板"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditingRoleId(String(role._id)); setRoleEditForm({ name: role.name, canEditVoteData: Boolean(role.canEditVoteData) }) }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDelete("确认删除该角色模板？正在被用户或计票设置使用的模板不能删除。", () => deleteRole({ ...actorArgs, id: role._id }))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>奖项配置</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 md:grid-cols-[1fr,1.5fr,120px,auto]" onSubmit={submitAward}>
              <Input value={awardForm.name} onChange={(event) => setAwardForm((current) => ({ ...current, name: event.target.value }))} placeholder="奖项名称" required />
              <Input value={awardForm.description} onChange={(event) => setAwardForm((current) => ({ ...current, description: event.target.value }))} placeholder="描述" />
              <Input type="color" value={awardForm.color} onChange={(event) => setAwardForm((current) => ({ ...current, color: event.target.value }))} title="标签颜色" />
              <Button type="submit"><Plus className="mr-2 h-4 w-4" />新增</Button>
            </form>
            <div className="space-y-2">
              {(awards || []).map((award: any) => (
                <div key={award._id} className="rounded-md border p-3 text-sm">
                  {editingAwardId === String(award._id) ? (
                    <div className="grid gap-2 md:grid-cols-[1fr,1.5fr,120px,auto,auto] md:items-center">
                      <Input value={awardEditForm.name} onChange={(event) => setAwardEditForm((current) => ({ ...current, name: event.target.value }))} />
                      <Input value={awardEditForm.description} onChange={(event) => setAwardEditForm((current) => ({ ...current, description: event.target.value }))} />
                      <Input type="color" value={awardEditForm.color} onChange={(event) => setAwardEditForm((current) => ({ ...current, color: event.target.value }))} />
                      <Button size="sm" onClick={async () => { await updateAward({ ...actorArgs, id: award._id, ...awardEditForm }); setEditingAwardId(null) }}>保存</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingAwardId(null)}>取消</Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <TechDayAwardBadge name={award.name} color={award.color} />
                        <p className="mt-2 text-slate-600">{award.description || "无描述"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditingAwardId(String(award._id)); setAwardEditForm({ name: award.name, description: award.description || "", color: award.color || "#F59E0B" }) }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDelete("确认删除该奖项？已分配给投稿的奖项不能删除。", () => deleteAward({ ...actorArgs, id: award._id }))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>审阅者邀请码</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-[1fr,1fr,auto]" onSubmit={submitInvite}>
            <Input value={inviteForm.code} onChange={(event) => setInviteForm((current) => ({ ...current, code: event.target.value }))} placeholder="自定义邀请码，留空自动生成" />
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm"
              value={inviteForm.presetDirectionId}
              onChange={(event) => setInviteForm((current) => ({ ...current, presetDirectionId: event.target.value }))}
            >
              <option value={EMPTY_SELECT}>不预设方向</option>
              {(directions || []).map((direction: any) => (
                <option key={direction._id} value={String(direction._id)}>{direction.name}</option>
              ))}
            </select>
            <Button type="submit"><Plus className="mr-2 h-4 w-4" />生成邀请码</Button>
          </form>
          <Table className="min-w-[760px]">
            <TableHeader><TableRow><TableHead>邀请码</TableHead><TableHead>状态</TableHead><TableHead>邮箱</TableHead><TableHead>审阅方向</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {(invites || []).map((invite: any) => (
                <TableRow key={invite._id}>
                  <TableCell className="font-mono">{invite.code}</TableCell>
                  <TableCell>{invite.isUsed ? invite.reviewerName || "已注册" : "未使用"}</TableCell>
                  <TableCell>{invite.reviewerEmail || "-"}</TableCell>
                  <TableCell>{invite.reviewerDirectionName || invite.presetDirectionName || "未指定"}</TableCell>
                  <TableCell className="text-right">
                    {!invite.isUsed ? (
                      <Button size="sm" variant="destructive" onClick={() => confirmDelete("确认删除该邀请码？", () => deleteInvite({ ...actorArgs, id: invite._id }))}>删除</Button>
                    ) : (
                      <span className="text-xs text-slate-500">已使用</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>用户角色与组织</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!filteredExportUsers.length}
              onClick={() => downloadCsv("techday-users.csv", filteredExportUsers as any)}
            >
              <Download className="mr-2 h-4 w-4" />
              导出当前人员
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[1160px]">
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <FilterableTableHead label="人员类型" value={userFilters.role} options={roleFilterOptions} onChange={(value) => updateUserFilter("role", value)} />
                <FilterableTableHead label="状态" value={userFilters.status} options={statusFilterOptions} onChange={(value) => updateUserFilter("status", value)} />
                <FilterableTableHead label="工作组" value={userFilters.organization} options={organizationFilterOptions} onChange={(value) => updateUserFilter("organization", value)} />
                <FilterableTableHead label="计票模板" value={userFilters.roleTemplate} options={roleTemplateFilterOptions} onChange={(value) => updateUserFilter("roleTemplate", value)} />
                <FilterableTableHead label="审阅方向" value={userFilters.reviewerDirection} options={reviewerDirectionFilterOptions} onChange={(value) => updateUserFilter("reviewerDirection", value)} />
                <FilterableTableHead label="新闻" value={userFilters.canPublishNews} options={newsFilterOptions} onChange={(value) => updateUserFilter("canPublishNews", value)} />
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: any) => (
                <TableRow key={user._id}>
                  <TableCell className="min-w-32">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.school || "-"} {user.college || ""}</div>
                  </TableCell>
                  <TableCell className="min-w-48 break-all">{user.email}</TableCell>
                  <TableCell>
                    <div className="mb-2"><TechDayRoleBadge role={user.role} /></div>
                    <select
                      className="h-9 rounded-md border bg-white px-2 text-sm"
                      value={user.role}
                      onChange={(event) => updateUserField(user, { role: event.target.value })}
                    >
                      {roleOptions.map((role) => <option key={role} value={role}>{techDayRoleLabels[role]}</option>)}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-9 rounded-md border bg-white px-2 text-sm"
                      value={user.status}
                      onChange={(event) => updateUserField(user, { status: event.target.value })}
                    >
                      {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className="min-w-72">
                    {user.role === "author" ? (
                      <span className="text-xs text-slate-500">作者无需分组</span>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-600">当前：{user.assignedTracks?.join("、") || "未分配"}</div>
                        {user.volunteerTracks?.length ? <div className="text-xs text-slate-500">志愿：{user.volunteerTracks.join("、")}</div> : null}
                        <div className="flex flex-wrap gap-1">
                          {organizationNames.map((orgName: string) => {
                            const assigned = user.assignedTracks?.includes(orgName)
                            const preferred = user.volunteerTracks?.includes(orgName)
                            return (
                              <button
                                key={orgName}
                                type="button"
                                className={`rounded-md border px-2 py-1 text-xs ${assigned ? "border-primary bg-primary text-white" : preferred ? "border-blue-200 bg-blue-50 text-blue-700" : "bg-white text-slate-600"}`}
                                onClick={() => toggleAssignedOrg(user, orgName)}
                              >
                                {orgName}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role === "author" ? (
                      <span className="text-xs text-slate-500">作者无需计票</span>
                    ) : (
                      <div className="space-y-2">
                        <select
                          className="h-9 rounded-md border bg-white px-2 text-sm"
                          value={user.roleTemplateId ? String(user.roleTemplateId) : EMPTY_SELECT}
                          onChange={(event) => updateUserField(user, { roleTemplateId: event.target.value === EMPTY_SELECT ? null : event.target.value })}
                        >
                          <option value={EMPTY_SELECT}>无模板</option>
                          {(roles || []).map((role: any) => <option key={role._id} value={String(role._id)}>{role.name}</option>)}
                        </select>
                        <Label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={Boolean(user.voteCounterOptIn)} onChange={(event) => updateUserField(user, { voteCounterOptIn: event.target.checked })} />
                          计票志愿
                        </Label>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-9 rounded-md border bg-white px-2 text-sm"
                      value={user.reviewerDirectionId ? String(user.reviewerDirectionId) : EMPTY_SELECT}
                      onChange={(event) => updateUserField(user, { reviewerDirectionId: event.target.value === EMPTY_SELECT ? null : event.target.value })}
                    >
                      <option value={EMPTY_SELECT}>未指定</option>
                      {(directions || []).map((direction: any) => <option key={direction._id} value={String(direction._id)}>{direction.name}</option>)}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={Boolean(user.canPublishNews)} onChange={(event) => updateUserField(user, { canPublishNews: event.target.checked })} />
                      可发布
                    </Label>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" onClick={() => confirmDelete("确认删除该用户？该操作无法撤销。", () => deleteUser({ ...actorArgs, id: user._id }))}>
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-slate-500">没有符合当前筛选条件的人员。</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
