import type { OAFormField } from "@/types"

export type OAProfileBinding =
  | "display_name"
  | "chinese_name"
  | "english_name"
  | "email"
  | "personal_email"
  | "username"
  | "student_id"
  | "organization"
  | "cohort"
  | "identity_type"
  | "gender"
  | "phone"

export type OAProfileAutofillData = Partial<Record<
  "name" | "chineseName" | "englishName" | "email" | "personalEmail" | "username" |
  "studentId" | "organization" | "cohort" | "identityType" | "gender" | "phone",
  string | number
>>

const PROFILE_BINDING_PREFIX = "application/x-oa-profile-binding;field="
const PROFILE_BINDINGS = new Set<OAProfileBinding>([
  "display_name", "chinese_name", "english_name", "email", "personal_email", "username",
  "student_id", "organization", "cohort", "identity_type", "gender", "phone",
])

export const oaProfileBindingOptions: Array<{ value: OAProfileBinding | "auto" | "none"; label: string }> = [
  { value: "auto", label: "自动识别（按问题名称）" },
  { value: "none", label: "不关联" },
  { value: "display_name", label: "姓名（中文名优先）" },
  { value: "chinese_name", label: "中文姓名" },
  { value: "english_name", label: "英文姓名" },
  { value: "email", label: "登录邮箱" },
  { value: "personal_email", label: "个人邮箱" },
  { value: "username", label: "用户名" },
  { value: "student_id", label: "学号 / 工号" },
  { value: "organization", label: "学校" },
  { value: "cohort", label: "年级" },
  { value: "identity_type", label: "身份类型" },
  { value: "gender", label: "性别" },
  { value: "phone", label: "手机号" },
]

function bindingMarker(field: Pick<OAFormField, "acceptedMimeTypes">) {
  return (field.acceptedMimeTypes || []).find((value) => value.toLowerCase().startsWith(PROFILE_BINDING_PREFIX))
}

function explicitBinding(field: Pick<OAFormField, "acceptedMimeTypes">): OAProfileBinding | "none" | undefined {
  const marker = bindingMarker(field)
  if (!marker) return undefined
  const value = marker.slice(PROFILE_BINDING_PREFIX.length).trim().toLowerCase()
  if (value === "none") return "none"
  return PROFILE_BINDINGS.has(value as OAProfileBinding) ? value as OAProfileBinding : undefined
}

export function setOAProfileBinding<T extends OAFormField>(field: T, binding: OAProfileBinding | "auto" | "none"): T {
  const remaining = (field.acceptedMimeTypes || []).filter((value) => !value.toLowerCase().startsWith(PROFILE_BINDING_PREFIX))
  return {
    ...field,
    acceptedMimeTypes: binding === "auto" ? remaining : [...remaining, `${PROFILE_BINDING_PREFIX}${binding}`],
  }
}

export function getOAProfileBinding(field: Pick<OAFormField, "acceptedMimeTypes">): OAProfileBinding | null {
  const binding = explicitBinding(field)
  return binding && binding !== "none" ? binding : null
}

export function getOAProfileBindingMode(field: Pick<OAFormField, "acceptedMimeTypes">): OAProfileBinding | "auto" | "none" {
  return explicitBinding(field) || "auto"
}

function normalizedLabel(label: string) {
  return label.normalize("NFKC").toLowerCase().replace(/[\s　:：()（）/\\_-]+/g, "")
}

export function inferOAProfileBinding(label: string): OAProfileBinding | null {
  const value = normalizedLabel(label)
  if (!value) return null
  if (/^(用户名|账号名|user(name)?)$/.test(value)) return "username"
  if (/(个人邮箱|备用邮箱|联系邮箱)/.test(value)) return "personal_email"
  if (/(电子邮箱|登录邮箱|邮箱|email|e-mail)/.test(value)) return "email"
  if (/(学号|工号|studentid)/.test(value)) return "student_id"
  if (/(英文姓名|英文名|englishname)/.test(value)) return "english_name"
  if (/(中文姓名|中文名)/.test(value)) return "chinese_name"
  if (/^(姓名|申请人姓名|联系人姓名|负责人姓名|name)$/.test(value)) return "display_name"
  if (/(手机号|手机号码|联系电话|电话|phone)/.test(value)) return "phone"
  if (/^(性别|gender)$/.test(value)) return "gender"
  if (/(年级|入学年份|入学年度|cohort)/.test(value)) return "cohort"
  if (/(学校|所在学校|organization)/.test(value)) return "organization"
  if (/(身份类型|人员类型|identitytype)/.test(value)) return "identity_type"
  return null
}

export function getEffectiveOAProfileBinding(field: Pick<OAFormField, "label" | "acceptedMimeTypes">): OAProfileBinding | null {
  const explicit = explicitBinding(field)
  if (explicit === "none") return null
  return explicit || inferOAProfileBinding(field.label)
}

function profileValue(binding: OAProfileBinding, data: OAProfileAutofillData) {
  switch (binding) {
    case "display_name": return data.name || data.chineseName || data.englishName || data.username
    case "chinese_name": return data.chineseName
    case "english_name": return data.englishName
    case "email": return data.email
    case "personal_email": return data.personalEmail || data.email
    case "username": return data.username
    case "student_id": return data.studentId
    case "organization": return data.organization
    case "cohort": return data.cohort
    case "identity_type": return data.identityType
    case "gender": return data.gender
    case "phone": return data.phone
  }
}

function isBlank(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "")
}

function normalizedComparable(value: unknown) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "")
}

function compatibleValue(field: OAFormField, raw: string | number | undefined) {
  if (raw === undefined || raw === "") return undefined
  if (field.type === "number") {
    const value = typeof raw === "number" ? raw : Number(raw)
    return Number.isFinite(value) ? value : undefined
  }
  if (field.type === "select" || field.type === "radio") {
    const comparable = normalizedComparable(raw)
    return field.options?.find((option) => (
      normalizedComparable(option.value) === comparable || normalizedComparable(option.label) === comparable
    ))?.value
  }
  if (field.type !== "text" && field.type !== "textarea") return undefined
  return String(raw)
}

export function buildOAProfileAutofill(
  fields: OAFormField[],
  data: OAProfileAutofillData,
  currentAnswers: Record<string, unknown>,
) {
  const answers = { ...currentAnswers }
  const filledFieldIds: string[] = []
  for (const field of fields) {
    if (!isBlank(answers[field.id])) continue
    const binding = getEffectiveOAProfileBinding(field)
    if (!binding) continue
    const value = compatibleValue(field, profileValue(binding, data))
    if (value === undefined || value === "") continue
    answers[field.id] = value
    filledFieldIds.push(field.id)
  }
  return { answers, filledFieldIds }
}
