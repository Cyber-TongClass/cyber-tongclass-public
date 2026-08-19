export type TongInitCourseResourceKind = "slides" | "exercise" | "supplement"

export type CourseResource = {
  resourceKey: string
  title: string
  href: string
  description?: string
  kind: TongInitCourseResourceKind
  lectureNumber?: number
  sortOrder: number
  source?: "static" | "r2"
  dynamicId?: string
  fileName?: string
  mimeType?: string
  size?: number
}

export type TongInitCoursePublicManifest = {
  resources: Array<{
    id: string
    resourceKey: string
    title: string
    description?: string
    kind: TongInitCourseResourceKind
    lectureNumber?: number
    sortOrder: number
    source: "static" | "r2"
    staticHref?: string
    fileName: string
    mimeType: string
    size?: number
  }>
  managedKeys: string[]
}

const MB = 1024 * 1024
const MIN_UPLOAD_TTL_SECONDS = 15 * 60
const MAX_UPLOAD_TTL_SECONDS = 2 * 60 * 60
const CONSERVATIVE_UPLOAD_BITS_PER_SECOND = 512 * 1024
const UPLOAD_FINALIZE_GRACE_SECONDS = 10 * 60

export const TONG_INIT_COURSE_FILE_POLICIES = [
  { extensions: [".tar.gz", ".tgz"], mimeType: "application/gzip", acceptedMimeTypes: ["application/gzip", "application/x-gzip", "application/x-tar", "application/x-compressed-tar", "application/octet-stream"], maxBytes: 300 * MB },
  { extensions: [".pdf"], mimeType: "application/pdf", acceptedMimeTypes: ["application/pdf", "application/octet-stream"], maxBytes: 100 * MB },
  { extensions: [".pptx"], mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", acceptedMimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/octet-stream"], maxBytes: 200 * MB },
  { extensions: [".docx"], mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", acceptedMimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"], maxBytes: 100 * MB },
  { extensions: [".xlsx"], mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", acceptedMimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"], maxBytes: 100 * MB },
  { extensions: [".zip"], mimeType: "application/zip", acceptedMimeTypes: ["application/zip", "application/x-zip-compressed", "application/octet-stream"], maxBytes: 300 * MB },
  { extensions: [".ipynb"], mimeType: "application/x-ipynb+json", acceptedMimeTypes: ["application/x-ipynb+json", "application/json", "application/octet-stream"], maxBytes: 25 * MB },
  { extensions: [".md"], mimeType: "text/markdown", acceptedMimeTypes: ["text/markdown", "text/plain", "application/octet-stream"], maxBytes: 25 * MB },
  { extensions: [".txt"], mimeType: "text/plain", acceptedMimeTypes: ["text/plain", "application/octet-stream"], maxBytes: 25 * MB },
  { extensions: [".csv"], mimeType: "text/csv", acceptedMimeTypes: ["text/csv", "application/vnd.ms-excel", "text/plain", "application/octet-stream"], maxBytes: 25 * MB },
  { extensions: [".json"], mimeType: "application/json", acceptedMimeTypes: ["application/json", "text/json", "text/plain", "application/octet-stream"], maxBytes: 25 * MB },
  { extensions: [".png"], mimeType: "image/png", acceptedMimeTypes: ["image/png", "application/octet-stream"], maxBytes: 25 * MB },
  { extensions: [".jpg", ".jpeg"], mimeType: "image/jpeg", acceptedMimeTypes: ["image/jpeg", "application/octet-stream"], maxBytes: 25 * MB },
  { extensions: [".webp"], mimeType: "image/webp", acceptedMimeTypes: ["image/webp", "application/octet-stream"], maxBytes: 25 * MB },
] as const

export const TONG_INIT_COURSE_FILE_ACCEPT = TONG_INIT_COURSE_FILE_POLICIES
  .flatMap((policy) => [...policy.extensions])
  .join(",")

export function getTongInitCourseUploadTtlSeconds(size: number) {
  const safeSize = Number.isFinite(size) && size > 0 ? size : 1
  const transferSeconds = Math.ceil((safeSize * 8) / CONSERVATIVE_UPLOAD_BITS_PER_SECOND)
  return Math.min(
    MAX_UPLOAD_TTL_SECONDS,
    Math.max(MIN_UPLOAD_TTL_SECONDS, transferSeconds + UPLOAD_FINALIZE_GRACE_SECONDS)
  )
}

export function getTongInitCourseMetadataTarget(state: {
  pendingUpload?: unknown
  draft?: unknown
  published?: unknown
}) {
  if (state.pendingUpload) return "pendingUpload" as const
  if (state.draft || state.published) return "draft" as const
  return null
}

export function shouldDeleteTongInitCourseDraftRecord(state: {
  status: "draft" | "published" | "archived"
  published?: unknown
}) {
  return !state.published && state.status !== "archived"
}

export function normalizeTongInitCourseFileName(value: string) {
  const leafName = String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
  if (!leafName) throw new Error("文件名不能为空")
  if (leafName.length > 180) throw new Error("文件名不能超过 180 个字符")
  return leafName
}

export function getTongInitCourseFilePolicy(fileName: string) {
  const normalizedFileName = normalizeTongInitCourseFileName(fileName)
  const lowerName = normalizedFileName.toLowerCase()
  const policy = TONG_INIT_COURSE_FILE_POLICIES.find((candidate) => (
    candidate.extensions.some((extension) => lowerName.endsWith(extension))
  ))
  if (!policy) {
    throw new Error("不支持该文件类型，请上传 PDF、Office 文档、ZIP/TAR.GZ、Notebook、文本数据或图片")
  }
  return { normalizedFileName, policy }
}

export function validateTongInitCourseFile(input: { fileName: string; mimeType?: string; size: number }) {
  const { normalizedFileName, policy } = getTongInitCourseFilePolicy(input.fileName)
  const size = Number(input.size)
  if (!Number.isFinite(size) || size <= 0) throw new Error("文件不能为空")
  if (size > policy.maxBytes) {
    throw new Error(`该文件不能超过 ${Math.round(policy.maxBytes / MB)} MB`)
  }
  const declaredMimeType = String(input.mimeType || "").split(";", 1)[0].trim().toLowerCase()
  if (declaredMimeType && !(policy.acceptedMimeTypes as readonly string[]).includes(declaredMimeType)) {
    throw new Error("文件扩展名与浏览器识别的类型不一致")
  }
  return {
    fileName: normalizedFileName,
    mimeType: policy.mimeType,
    maxBytes: policy.maxBytes,
    size,
  }
}

export function createTongInitCourseContentDisposition(fileName: string) {
  const normalizedFileName = normalizeTongInitCourseFileName(fileName)
  const extension = normalizedFileName.match(/(\.[a-z0-9]+(?:\.[a-z0-9]+)?)$/i)?.[1] || ""
  const asciiFallback = `tong-init-course-resource${extension.replace(/[^a-z0-9.]/gi, "")}`
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(normalizedFileName)}`
}

export function mergeTongInitCourseResources(
  staticResources: CourseResource[],
  manifest?: TongInitCoursePublicManifest
) {
  if (!manifest) return [...staticResources].sort((left, right) => left.sortOrder - right.sortOrder)
  const managedKeys = new Set(manifest.managedKeys)
  const fallbackResources = staticResources.filter((resource) => !managedKeys.has(resource.resourceKey))
  const dynamicResources: CourseResource[] = manifest.resources.map((resource) => ({
    resourceKey: resource.resourceKey,
    title: resource.title,
    description: resource.description,
    kind: resource.kind,
    lectureNumber: resource.lectureNumber,
    sortOrder: resource.sortOrder,
    source: resource.source,
    dynamicId: resource.id,
    fileName: resource.fileName,
    mimeType: resource.mimeType,
    size: resource.size,
    href: resource.source === "static" && resource.staticHref
      ? resource.staticHref
      : `/api/resources/tong-init-course/${resource.id}/download`,
  }))
  return [...fallbackResources, ...dynamicResources].sort((left, right) => (
    compareTongInitCourseResourceOrder(left, right)
  ))
}

/** 排序：先按讲次（lectureNumber，缺省排最后）→ 再按 sortOrder → 最后按标题字典序。 */
function compareTongInitCourseResourceOrder(left: CourseResource, right: CourseResource) {
  const leftLecture = left.lectureNumber ?? Number.MAX_SAFE_INTEGER
  const rightLecture = right.lectureNumber ?? Number.MAX_SAFE_INTEGER
  if (leftLecture !== rightLecture) return leftLecture - rightLecture
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
  return left.title.localeCompare(right.title, "zh-CN")
}

export const tongAiResearchCourseResources: CourseResource[] = [
  {
    resourceKey: "lec0-slides",
    title: "第 0 讲 课件",
    description: "自学有道：文档、搜索与AI",
    href: "/resources/tong-init-course/slides-lec0.pdf",
    fileName: "slides-lec0.pdf",
    kind: "slides",
    lectureNumber: 0,
    sortOrder: 0,
    source: "static",
  },
  {
    resourceKey: "lec1-slides",
    title: "第 1 讲 课件",
    description: "计算机的结构与硬件",
    href: "/resources/tong-init-course/slides-lec1.pdf",
    fileName: "slides-lec1.pdf",
    kind: "slides",
    lectureNumber: 1,
    sortOrder: 10,
    source: "static",
  },
  {
    resourceKey: "lec2-slides",
    title: "第 2 讲 课件",
    description: "操作系统与 Linux",
    href: "/resources/tong-init-course/slides-lec2.pdf",
    fileName: "slides-lec2.pdf",
    kind: "slides",
    lectureNumber: 2,
    sortOrder: 20,
    source: "static",
  },
  {
    resourceKey: "lec3-slides",
    title: "第 3 讲 课件",
    description: "命令行与终端实践",
    href: "/resources/tong-init-course/slides-lec3.pdf",
    fileName: "slides-lec3.pdf",
    kind: "slides",
    lectureNumber: 3,
    sortOrder: 30,
    source: "static",
  },
  {
    resourceKey: "lec3-terminal-adventure",
    title: "第 3 讲 练习包",
    description: "第三讲配套的终端探险练习",
    href: "/resources/tong-init-course/terminal-adventure.zip",
    fileName: "terminal-adventure.zip",
    kind: "exercise",
    lectureNumber: 3,
    sortOrder: 31,
    source: "static",
  },
]
