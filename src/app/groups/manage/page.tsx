"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import {
  ResearchGroupMemberManager,
  type ResearchGroupManagedPerson,
} from "@/components/institute/research-group-member-manager"
import {
  ResearchGroupProfileEditor,
  type ResearchGroupProfileDraft,
} from "@/components/institute/research-group-profile-editor"
import {
  ResearchGroupPublicationManager,
  type ResearchGroupManagedPublication,
} from "@/components/institute/research-group-publication-manager"
import {
  useAssignTeacherGroupMember,
  useResearchGroupScopeOptions,
  useRemoveTeacherGroupMember,
  useSetTeacherGroupMemberOrder,
  useSetTeacherGroupPublicationVisibility,
  useSetTeacherGroupMemberSubtitle,
  useTeacherGroupRoster,
  useUpdateTeacherGroupProfile,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { ManagedResearchGroupPerson } from "@/types/institute"

function managedPerson(person: ManagedResearchGroupPerson): ResearchGroupManagedPerson {
  return {
    userId: person.userId ?? person.id,
    username: person.username,
    name: person.name,
    identityType: person.identityType,
    subtitle: person.subtitle,
    otherGroupName: person.otherGroupName,
  }
}

function TeacherGroupManagementContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === "super_admin"
  const selectedGroupId = isSuperAdmin
    ? searchParams.get("groupId") || undefined
    : undefined
  const groupOptions = useResearchGroupScopeOptions() as
    | Array<{ id: string; name: string; leaderName?: string }>
    | undefined
  const roster = useTeacherGroupRoster(selectedGroupId)
  const assignMember = useAssignTeacherGroupMember()
  const removeMember = useRemoveTeacherGroupMember()
  const saveSubtitle = useSetTeacherGroupMemberSubtitle()
  const saveProfile = useUpdateTeacherGroupProfile()
  const saveOrder = useSetTeacherGroupMemberOrder()
  const savePublicationVisibility = useSetTeacherGroupPublicationVisibility()

  if (roster === undefined || (isSuperAdmin && groupOptions === undefined)) {
    return (
      <main className="container-custom py-12">
        <p role="status" className="aia-text-muted border-y aia-border-rule py-6 text-sm">
          正在加载课题组管理信息…
        </p>
      </main>
    )
  }

  if (!roster.canManage) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <p className="aia-kicker">内网 · 课题组</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">课题组管理</h1>
        <p className="aia-text-muted mt-4 text-sm leading-6">
          课题组管理权限已被关闭；现有公开资料、成员顺序和文章展示设置保持不变。
        </p>
      </main>
    )
  }

  const groupSelector = isSuperAdmin ? (
    <section className="mt-8 border-y aia-border-rule py-5">
      <label
        htmlFor="managed-research-group"
        className="aia-mono block text-xs font-medium tracking-[0.08em] text-[hsl(var(--aia-ink))]"
      >
        超级管理员 · 选择课题组
      </label>
      <select
        id="managed-research-group"
        className="aia-focus mt-3 h-11 w-full max-w-xl border aia-border-rule bg-transparent px-3 text-sm text-[hsl(var(--aia-ink))]"
        value={selectedGroupId ?? ""}
        onChange={(event) => {
          const groupId = event.target.value
          router.replace(groupId ? `/groups/manage?groupId=${encodeURIComponent(groupId)}` : "/groups/manage")
        }}
      >
        <option value="">选择要管理的课题组…</option>
        {(groupOptions ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}{option.leaderName ? ` · ${option.leaderName}` : ""}
          </option>
        ))}
      </select>
      <p className="aia-text-muted mt-2 text-xs leading-5">
        超级管理员可切换并维护全部课题组；教师账号始终只管理自己负责的课题组。
      </p>
    </section>
  ) : null

  if (!roster.group) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <p className="aia-kicker">内网 · 课题组</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">课题组管理</h1>
        {groupSelector}
        <p className="aia-text-muted mt-4 text-sm leading-6">
          {isSuperAdmin ? "请选择一个课题组开始管理。" : "当前账号未绑定为任何课题组的负责人，无法管理课题组资料。"}
        </p>
      </main>
    )
  }

  const group = roster.group
  const profile: ResearchGroupProfileDraft = {
    nameZh: group.nameZh ?? group.name,
    nameEn: group.nameEn ?? "",
    summaryZh: group.summaryZh ?? "",
    summaryEn: group.summaryEn ?? "",
    descriptionZh: group.descriptionZh ?? "",
    descriptionEn: group.descriptionEn ?? "",
    researchAreas: group.researchAreas ?? [],
    recruitmentZh: group.recruitmentZh ?? "",
    recruitmentEn: group.recruitmentEn ?? "",
    publicLinks: group.publicLinks ?? [],
    visibility: group.visibility,
  }
  const members = roster.members.map(managedPerson)
  const candidates = roster.candidates.map(managedPerson)
  const publications: ResearchGroupManagedPublication[] = (roster.publications ?? []).map((publication) => ({
    ...publication,
    relationSource: publication.relationSource,
  }))

  return (
    <main className="container-custom max-w-6xl py-10 sm:py-12">
      <Link href="/portal" className="aia-link aia-focus inline-flex items-center gap-1.5 text-sm font-medium">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />返回内网
      </Link>

      <header className="mt-8 border-b aia-border-rule pb-8">
        <p className="aia-kicker">内网 · 课题组</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="aia-serif text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
              {group.nameZh ?? group.name}
            </h1>
            {group.nameEn ? <p className="aia-mono aia-text-muted mt-2 text-xs tracking-[0.08em]">{group.nameEn}</p> : null}
          </div>
          <p className="aia-mono aia-text-muted text-xs">/groups/{group.slug}</p>
        </div>
      </header>

      {groupSelector}

      <ResearchGroupProfileEditor
        profile={profile}
        onSave={(nextProfile) => saveProfile({ groupId: group.id, profile: nextProfile })}
      />

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ResearchGroupMemberManager
          leader={roster.leader ? managedPerson(roster.leader) : null}
          members={members}
          candidates={candidates}
          onAdd={(userId, subtitle) => assignMember({ groupId: group.id, userId, subtitle })}
          onRemove={(userId) => removeMember({ groupId: group.id, userId })}
          onSaveSubtitle={(userId, subtitle) => saveSubtitle({ groupId: group.id, userId, subtitle })}
          onReorder={(orderedUserIds) => saveOrder({ groupId: group.id, orderedUserIds })}
        />
        <ResearchGroupPublicationManager
          publications={publications}
          onSetVisibility={(publicationId, visible) => (
            savePublicationVisibility({ groupId: group.id, publicationId, visible })
          )}
        />
      </div>
    </main>
  )
}

export default function TeacherGroupManagementPage() {
  return (
    <Suspense
      fallback={(
        <main className="container-custom py-12">
          <p role="status" className="aia-text-muted border-y aia-border-rule py-6 text-sm">
            正在加载课题组管理信息…
          </p>
        </main>
      )}
    >
      <TeacherGroupManagementContent />
    </Suspense>
  )
}
