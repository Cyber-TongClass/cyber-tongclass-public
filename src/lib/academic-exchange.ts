import { getPublicationAuthorName, parsePublicationAuthors } from "@/lib/publication-authors"
import type { AcademicExchangeSupportApplication, Publication } from "@/types"

export const academicExchangeMaterials = [
  {
    name: "通班学术交流项目支持方案",
    file: "/intranet-materials/通班学术交流项目支持方案.pdf",
    type: "PDF",
  },
  {
    name: "通班学生出国出境报销注意事项",
    file: "/intranet-materials/通班学生出国出境报销注意事项.docx",
    type: "DOCX",
  },
  {
    name: "各国住宿伙食公杂费开支标准",
    file: "/intranet-materials/各国住宿伙食公杂费开支标准.xlsx",
    type: "XLSX",
  },
]

export function formatDate(value?: number | string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function toChineseOrdinal(value: number) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
  if (value <= 10) return value === 10 ? "十" : digits[value]
  if (value < 20) return `十${digits[value - 10]}`
  if (value < 100) {
    const ten = Math.floor(value / 10)
    const one = value % 10
    return `${digits[ten]}十${one ? digits[one] : ""}`
  }
  return String(value)
}

export function getApplicantAuthorInfo(publication: Publication, userId?: string | null) {
  if (!userId) return null
  const authors = parsePublicationAuthors(publication.authors)
  const applicantIndex = authors.findIndex((author) => author.userId && String(author.userId) === String(userId))
  if (applicantIndex < 0) return null

  const coFirstCount = authors.filter((author) => author.coFirst).length
  const applicant = authors[applicantIndex]

  if (coFirstCount > 1) {
    if (applicant.coFirst) {
      const coFirstIndex = authors.slice(0, applicantIndex + 1).filter((author) => author.coFirst).length
      return {
        name: applicant.name,
        label: `共一第${toChineseOrdinal(coFirstIndex)}`,
      }
    }

    const nonCoFirstBefore = authors.slice(0, applicantIndex).filter((author) => !author.coFirst).length
    return {
      name: applicant.name,
      label: `第${toChineseOrdinal(nonCoFirstBefore + 2)}作者`,
    }
  }

  return {
    name: applicant.name,
    label: `第${toChineseOrdinal(applicantIndex + 1)}作者`,
  }
}

export function formatPaperAuthors(authors: string[], emphasizedName?: string) {
  return authors.map((author) => {
    const name = getPublicationAuthorName(author)
    return {
      raw: author,
      name,
      emphasized: Boolean(emphasizedName && name === emphasizedName),
    }
  })
}

export async function downloadAcademicExchangePdf(application: AcademicExchangeSupportApplication) {
  const sessionToken = typeof window !== "undefined" ? window.localStorage.getItem("tongclass_session_token") : ""
  const response = await fetch(`/api/intranet/academic-exchange/${application._id}/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || "PDF 导出失败")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `通班学术交流支持项目申请表-${application.projectName || application._id}-${application.applicantName || "申请人"}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
