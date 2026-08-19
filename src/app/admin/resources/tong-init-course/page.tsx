"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Archive,
  Database,
  ExternalLink,
  FileUp,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useAdminTongInitCourseResources,
  useBeginTongInitCourseUpload,
  useDiscardTongInitCourseDraft,
  useFinalizeTongInitCourseUpload,
  usePublishTongInitCourseResource,
  useSaveTongInitCourseDraftMetadata,
  useSeedTongInitCourseLegacyResources,
  useSetTongInitCourseResourceArchived,
} from "@/lib/api"
import { uploadFileToStorageTarget } from "@/lib/file-upload"
import {
  TONG_INIT_COURSE_FILE_ACCEPT,
  validateTongInitCourseFile,
  type TongInitCourseResourceKind,
} from "@/lib/resources/tong-init-course"

type ResourceSnapshot = {
  title: string
  description?: string
  kind: TongInitCourseResourceKind
  lectureNumber?: number
  sortOrder: number
  source: "static" | "r2"
  staticHref?: string
  storageId?: string
  fileName: string
  mimeType: string
  size?: number
  uploadedAt: number
}

type PendingUpload = {
  storageId: string
  fileName: string
  mimeType: string
  size: number
  title: string
  description?: string
  kind: TongInitCourseResourceKind
  lectureNumber?: number
  sortOrder: number
  expiresAt: number
}

type AdminResource = {
  _id: string
  resourceKey: string
  status: "draft" | "published" | "archived"
  published?: ResourceSnapshot
  draft?: ResourceSnapshot
  pendingUpload?: PendingUpload
  revision: number
  updatedAt: number
}

type ResourceForm = {
  resourceKey: string
  title: string
  description: string
  kind: TongInitCourseResourceKind
  lectureNumber: string
  sortOrder: string
}

const emptyForm = (): ResourceForm => ({
  resourceKey: "",
  title: "",
  description: "",
  kind: "slides",
  lectureNumber: "",
  sortOrder: "0",
})

function formFromResource(resource: AdminResource): ResourceForm {
  const snapshot = resource.pendingUpload || resource.draft || resource.published
  return {
    resourceKey: resource.resourceKey,
    title: snapshot?.title || "",
    description: snapshot?.description || "",
    kind: snapshot?.kind || "slides",
    lectureNumber: snapshot?.lectureNumber === undefined ? "" : String(snapshot.lectureNumber),
    sortOrder: String(snapshot?.sortOrder ?? 0),
  }
}

function formatBytes(value?: number) {
  if (!value) return "-"
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(value / 1024))} KB`
}

function formatTime(value?: number) {
  return value ? new Date(value).toLocaleString("zh-CN") : "-"
}

function statusLabel(resource: AdminResource) {
  if (resource.status === "archived") return { label: "已归档", variant: "secondary" as const }
  if (resource.pendingUpload) return { label: "上传待确认", variant: "warning" as const }
  if (resource.draft && resource.published) return { label: "有待发布修改", variant: "warning" as const }
  if (resource.draft) return { label: "草稿", variant: "secondary" as const }
  return { label: "已发布", variant: "success" as const }
}

export default function AdminTongInitCourseResourcesPage() {
  const resources = useAdminTongInitCourseResources() as AdminResource[] | undefined
  const beginUpload = useBeginTongInitCourseUpload()
  const finalizeUpload = useFinalizeTongInitCourseUpload()
  const saveDraftMetadata = useSaveTongInitCourseDraftMetadata()
  const publishResource = usePublishTongInitCourseResource()
  const setArchived = useSetTongInitCourseResourceArchived()
  const discardDraft = useDiscardTongInitCourseDraft()
  const seedLegacy = useSeedTongInitCourseLegacyResources()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<ResourceForm>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const initialized = useRef(false)
  const loadedRevision = useRef<number | null>(null)

  const selectedResource = useMemo(
    () => resources?.find((resource) => String(resource._id) === selectedId) || null,
    [resources, selectedId]
  )

  useEffect(() => {
    if (initialized.current || !resources) return
    initialized.current = true
    if (resources[0]) setSelectedId(String(resources[0]._id))
  }, [resources])

  useEffect(() => {
    if (!selectedResource || loadedRevision.current === selectedResource.revision) return
    setForm(formFromResource(selectedResource))
    loadedRevision.current = selectedResource.revision
  }, [selectedResource])

  const selectResource = (resource: AdminResource) => {
    setSelectedId(String(resource._id))
    loadedRevision.current = null
    setFile(null)
    setFileInputKey((value) => value + 1)
    setMessage("")
  }

  const startNew = () => {
    initialized.current = true
    setSelectedId(null)
    loadedRevision.current = null
    setForm(emptyForm())
    setFile(null)
    setFileInputKey((value) => value + 1)
    setMessage("")
  }

  const metadataPayload = () => ({
    title: form.title,
    description: form.description || undefined,
    kind: form.kind,
    lectureNumber: form.lectureNumber === "" ? undefined : Number(form.lectureNumber),
    sortOrder: Number(form.sortOrder),
  })

  const runBusy = async (key: string, operation: () => Promise<void>) => {
    setBusy(key)
    setMessage("")
    try {
      await operation()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败")
    } finally {
      setBusy(null)
    }
  }

  const handleUpload = () => runBusy("upload", async () => {
    if (!file) throw new Error("请先选择文件")
    const checkedFile = validateTongInitCourseFile({ fileName: file.name, mimeType: file.type, size: file.size })
    const result = await beginUpload({
      id: selectedResource?._id,
      expectedRevision: selectedResource?.revision,
      resourceKey: form.resourceKey,
      ...metadataPayload(),
      fileName: checkedFile.fileName,
      mimeType: checkedFile.mimeType,
      size: checkedFile.size,
    }) as any
    const resourceId = String(result.resourceId)
    setSelectedId(resourceId)
    loadedRevision.current = null
    const storageId = await uploadFileToStorageTarget(result.uploadTarget, file, "上传到 R2 失败")
    await finalizeUpload({ id: resourceId, storageId })
    loadedRevision.current = null
    setFile(null)
    setFileInputKey((value) => value + 1)
    setMessage("文件已通过 R2 校验并保存为草稿，请确认后发布。")
  })

  const handleFinalizePending = () => runBusy("finalize", async () => {
    if (!selectedResource?.pendingUpload) throw new Error("没有待校验的上传任务")
    if (selectedResource.pendingUpload.expiresAt <= Date.now()) {
      throw new Error("上传任务已过期，请重新选择文件上传")
    }
    await finalizeUpload({
      id: selectedResource._id,
      storageId: selectedResource.pendingUpload.storageId,
    })
    loadedRevision.current = null
    setMessage("已重新校验 R2 文件并固化为草稿，请确认后发布。")
  })

  const handleSaveMetadata = () => runBusy("save", async () => {
    if (!selectedResource) throw new Error("新资源必须先上传文件")
    await saveDraftMetadata({
      id: selectedResource._id,
      expectedRevision: selectedResource.revision,
      ...metadataPayload(),
    })
    loadedRevision.current = null
    setMessage("展示信息已保存为草稿。")
  })

  const handlePublish = () => runBusy("publish", async () => {
    if (!selectedResource) return
    await publishResource({ id: selectedResource._id, expectedRevision: selectedResource.revision })
    loadedRevision.current = null
    setMessage("资源已发布，前台链接已切换。")
  })

  const handleArchive = (archived: boolean) => {
    if (!selectedResource) return
    const operation = () => runBusy("archive", async () => {
      await setArchived({ id: selectedResource._id, archived, expectedRevision: selectedResource.revision })
      loadedRevision.current = null
      setMessage(archived ? "资源已归档，前台不再展示。" : "资源已恢复。")
    })
    if (!archived) {
      void operation()
      return
    }
    void confirm({
      title: "归档资源",
      description: `归档“${selectedResource.published?.title || form.title}”后，前台将立即隐藏，但 R2 文件不会被删除。`,
      confirmLabel: "确认归档",
      variant: "warning",
      onConfirm: operation,
    })
  }

  const handleDiscard = () => {
    if (!selectedResource) return
    void confirm({
      title: "丢弃草稿",
      description: "将清除待发布信息和当前上传任务；已经上传到 R2 的对象不会被物理删除。",
      confirmLabel: "丢弃草稿",
      variant: "danger",
      onConfirm: () => runBusy("discard", async () => {
        const result = await discardDraft({ id: selectedResource._id, expectedRevision: selectedResource.revision }) as any
        if (result.removed) startNew()
        loadedRevision.current = null
        setMessage("草稿已丢弃。")
      }),
    })
  }

  const handleSeed = () => runBusy("seed", async () => {
    const result = await seedLegacy() as any
    setMessage(`初始化完成：新增 ${result.insertedKeys.length} 项，跳过 ${result.skippedKeys.length} 项。`)
  })

  const currentFile = selectedResource?.pendingUpload || selectedResource?.draft || selectedResource?.published
  const pendingExpired = Boolean(
    selectedResource?.pendingUpload && selectedResource.pendingUpload.expiresAt <= Date.now()
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">先导课资源</h1>
          <p className="mt-1 text-sm text-slate-500">文件直传 Cloudflare R2，发布前不会影响线上版本。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={Boolean(busy)}>
            <Database className="mr-2 h-4 w-4" />初始化现有资源
          </Button>
          <Button size="sm" onClick={startNew} disabled={Boolean(busy)}>
            <Plus className="mr-2 h-4 w-4" />新增资源
          </Button>
        </div>
      </div>

      {message ? <div className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50 px-4 py-3">
            <CardTitle className="text-sm">资源列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {resources === undefined ? (
              <p className="px-2 py-4 text-sm text-slate-500">正在读取...</p>
            ) : resources.length === 0 ? (
              <p className="border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                尚未初始化，可先导入现有 lec0–lec3。
              </p>
            ) : resources.map((resource) => {
              const status = statusLabel(resource)
              const title = resource.pendingUpload?.title || resource.draft?.title || resource.published?.title || resource.resourceKey
              return (
                <button
                  key={resource._id}
                  type="button"
                  onClick={() => selectResource(resource)}
                  className={`w-full border px-3 py-3 text-left transition ${selectedId === String(resource._id) ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <span className="block truncate text-sm font-semibold text-slate-950">{title}</span>
                  <span className="mt-2 flex items-center justify-between gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="truncate text-xs text-slate-400">{resource.resourceKey}</span>
                  </span>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">{selectedResource ? "编辑资源" : "新增资源"}</CardTitle>
              {selectedResource ? <span className="text-xs text-slate-500">revision {selectedResource.revision} · {formatTime(selectedResource.updatedAt)}</span> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resource-key">资源标识</Label>
                <Input id="resource-key" value={form.resourceKey} disabled={Boolean(selectedResource)} placeholder="例如 lec4-slides" onChange={(event) => setForm((current) => ({ ...current, resourceKey: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource-title">展示标题</Label>
                <Input id="resource-title" value={form.title} placeholder="例如 第 4 讲 课件" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>资源类型</Label>
                <Select value={form.kind} onValueChange={(value) => setForm((current) => ({ ...current, kind: value as TongInitCourseResourceKind }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slides">课件</SelectItem>
                    <SelectItem value="exercise">练习包</SelectItem>
                    <SelectItem value="supplement">补充资料</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lecture-number">讲次</Label>
                  <Input id="lecture-number" type="number" min="0" value={form.lectureNumber} onChange={(event) => setForm((current) => ({ ...current, lectureNumber: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort-order">排序</Label>
                  <Input id="sort-order" type="number" min="0" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-description">说明</Label>
              <Textarea id="resource-description" value={form.description} rows={3} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </div>

            <div className="border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">R2 文件</h2>
                  <p className="mt-1 text-xs text-slate-500">支持 PDF、PPTX、DOCX、XLSX、ZIP/TAR.GZ、IPYNB、文本数据和常用图片；不支持视频和可执行内容。</p>
                </div>
                {currentFile ? <span className="text-xs text-slate-500">{currentFile.fileName} · {formatBytes(currentFile.size)}</span> : null}
              </div>
              {selectedResource?.pendingUpload ? (
                <p className={`mt-3 text-xs ${pendingExpired ? "text-red-600" : "text-amber-700"}`}>
                  {pendingExpired
                    ? "该上传任务已过期，请重新选择文件上传。"
                    : `待校验上传有效至 ${formatTime(selectedResource.pendingUpload.expiresAt)}；页面刷新后仍可继续校验。`}
                </p>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input key={fileInputKey} type="file" accept={TONG_INIT_COURSE_FILE_ACCEPT} onChange={(event) => setFile(event.target.files?.[0] || null)} />
                <Button type="button" onClick={handleUpload} disabled={!file || Boolean(busy) || Boolean(selectedId && !selectedResource)} className="shrink-0">
                  <FileUp className="mr-2 h-4 w-4" />{busy === "upload" ? "上传并校验中..." : selectedResource ? "上传新版本" : "上传为草稿"}
                </Button>
              </div>
              {selectedResource?.pendingUpload ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={handleFinalizePending}
                  disabled={Boolean(busy) || pendingExpired}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {busy === "finalize" ? "重新校验中..." : "重新校验已上传文件"}
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleSaveMetadata} disabled={!selectedResource || Boolean(busy)}>
                  <Save className="mr-2 h-4 w-4" />保存展示信息
                </Button>
                {selectedResource?.published ? (
                  <Button variant="outline" asChild>
                    <Link href={`/api/resources/tong-init-course/${selectedResource._id}/download`} target="_blank">
                      <ExternalLink className="mr-2 h-4 w-4" />查看线上文件
                    </Link>
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedResource?.draft || selectedResource?.pendingUpload ? (
                  <Button variant="outline" onClick={handleDiscard} disabled={Boolean(busy)}>
                    <Trash2 className="mr-2 h-4 w-4" />丢弃草稿
                  </Button>
                ) : null}
                {selectedResource?.status === "archived" ? (
                  <Button variant="outline" onClick={() => handleArchive(false)} disabled={Boolean(busy)}>
                    <RotateCcw className="mr-2 h-4 w-4" />恢复
                  </Button>
                ) : selectedResource ? (
                  <Button variant="outline" onClick={() => handleArchive(true)} disabled={Boolean(busy)}>
                    <Archive className="mr-2 h-4 w-4" />归档
                  </Button>
                ) : null}
                <Button onClick={handlePublish} disabled={!selectedResource?.draft || Boolean(busy)}>
                  <Send className="mr-2 h-4 w-4" />{busy === "publish" ? "发布中..." : "发布草稿"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog />
    </div>
  )
}
