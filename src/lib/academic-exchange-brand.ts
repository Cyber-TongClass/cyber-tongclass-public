export type AcademicExchangeBrand = "tong_class" | "institute"

type BrandSource = {
  brandSnapshot?: unknown
  academicExchangeBrand?: unknown
  pdfBrand?: unknown
  identityType?: unknown
  membershipType?: unknown
  ownerIdentity?: unknown
  owner?: unknown
  user?: unknown
  applicant?: unknown
}

const TONG_CLASS_IDENTITIES = new Set([
  "undergrad",
  "undergraduate",
  "本科生",
  "tong_class",
  "tong-class",
  "tongclass",
])

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function readIdentity(value: unknown): string {
  if (typeof value === "string") return normalize(value)
  if (!value || typeof value !== "object") return ""

  const source = value as Record<string, unknown>
  for (const key of ["identityType", "membershipType", "membership", "memberType", "identity", "type"]) {
    const candidate = normalize(source[key])
    if (candidate) return candidate
  }
  return ""
}

/**
 * A stored brand is authoritative. For records created before brand snapshots
 * existed, only an explicit undergraduate identity is treated as Tong Class;
 * an absent or ambiguous identity deliberately falls back to the Institute.
 */
export function resolveAcademicExchangeBrand(
  source: BrandSource | null | undefined,
): AcademicExchangeBrand {
  if (!source) return "institute"

  for (const value of [source.pdfBrand, source.brandSnapshot, source.academicExchangeBrand]) {
    const snapshot = normalize(value)
    if (snapshot === "tong_class" || snapshot === "institute") return snapshot
  }

  const identities = [
    source.identityType,
    source.membershipType,
    source.ownerIdentity,
    source.owner,
    source.user,
    source.applicant,
  ]
  return identities.some((identity) => TONG_CLASS_IDENTITIES.has(readIdentity(identity)))
    ? "tong_class"
    : "institute"
}

export function getAcademicExchangeBrandTitle(brand: AcademicExchangeBrand) {
  return brand === "tong_class"
    ? "北京大学通班学术交流支持"
    : "北京大学人工智能研究院学术交流支持"
}

export function getAcademicExchangeBrandNumberPrefix(brand: AcademicExchangeBrand) {
  return brand === "tong_class" ? "通" : "研"
}

export function getAcademicExchangeBrandFilePrefix(brand: AcademicExchangeBrand) {
  return brand === "tong_class" ? "通班" : "人工智能研究院"
}

function sanitizeFileNamePart(value: unknown, fallback: string) {
  return String(value ?? "").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || fallback
}

export function buildAcademicExchangePdfFileName(
  brand: AcademicExchangeBrand,
  projectName: unknown,
  applicantName: unknown,
) {
  return `${getAcademicExchangeBrandFilePrefix(brand)}学术交流支持项目申请表-${sanitizeFileNamePart(projectName, "申请")}-${sanitizeFileNamePart(applicantName, "申请人")}.pdf`
}

export function parseAcademicExchangePdfContentDisposition(value: string | null) {
  if (!value) return null

  const encoded = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1]?.trim()
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      // Fall through to the plain filename parameter.
    }
  }

  const quoted = value.match(/filename\s*=\s*"([^"]+)"/i)?.[1]
  if (quoted) return quoted

  return value.match(/filename\s*=\s*([^;\s]+)/i)?.[1] || null
}
