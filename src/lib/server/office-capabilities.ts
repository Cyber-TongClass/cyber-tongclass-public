import { access, readdir } from "node:fs/promises"
import path from "node:path"

import type { OADocumentTemplateCapabilities } from "@/lib/oa-document-templates"

export interface OfficeCapabilities extends OADocumentTemplateCapabilities {
  libreOfficePath: string | null
  fontDirectory: string | null
  installedFonts: string[]
}

const SAFE_EXECUTABLE_NAMES = new Set(["soffice", "soffice.bin", "libreoffice"])
const FONT_EXTENSIONS = new Set([".ttf", ".otf", ".ttc", ".woff", ".woff2"])

function configuredExecutable(value = process.env.LIBREOFFICE_PATH) {
  const candidate = value?.trim()
  if (!candidate) return null
  if (!path.isAbsolute(candidate) || !SAFE_EXECUTABLE_NAMES.has(path.basename(candidate).toLowerCase())) {
    return null
  }
  return path.normalize(candidate)
}

function requiredFonts(value = process.env.OA_TEMPLATE_REQUIRED_FONTS) {
  return (value || "")
    .split(/[,;\n]/)
    .map((font) => font.normalize("NFKC").trim())
    .filter(Boolean)
}

function normalizeFontName(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/[\s_-]+/g, "")
}

export async function inventoryOfficeFonts(directory = process.env.OA_TEMPLATE_FONT_DIR) {
  const configured = directory?.trim()
  if (!configured || !path.isAbsolute(configured)) return []
  try {
    const entries = await readdir(configured, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => path.basename(entry.name, path.extname(entry.name)))
      .sort((left, right) => left.localeCompare(right, "zh-CN"))
  } catch {
    return []
  }
}

export async function detectOfficeCapabilities(env: NodeJS.ProcessEnv = process.env): Promise<OfficeCapabilities> {
  const executable = configuredExecutable(env.LIBREOFFICE_PATH)
  let executableAvailable = false
  if (executable) {
    try {
      await access(executable)
      executableAvailable = true
    } catch {
      executableAvailable = false
    }
  }

  const fontDirectory = env.OA_TEMPLATE_FONT_DIR?.trim() && path.isAbsolute(env.OA_TEMPLATE_FONT_DIR.trim())
    ? path.normalize(env.OA_TEMPLATE_FONT_DIR.trim())
    : null
  const installedFonts = await inventoryOfficeFonts(fontDirectory || undefined)
  const installedKeys = new Set(installedFonts.map(normalizeFontName))
  const missingFonts = requiredFonts(env.OA_TEMPLATE_REQUIRED_FONTS)
    .filter((font) => !installedKeys.has(normalizeFontName(font)))
  const unavailableReasons: string[] = []
  if (!env.LIBREOFFICE_PATH?.trim()) unavailableReasons.push("未配置 LibreOffice，.doc 转换和 PDF 导出暂不可用")
  else if (!executable) unavailableReasons.push("LibreOffice 路径不在允许范围内")
  else if (!executableAvailable) unavailableReasons.push("LibreOffice 程序不可访问")
  if (!fontDirectory) unavailableReasons.push("未配置模板字体目录，无法保证转换版式")
  else if (!installedFonts.length) unavailableReasons.push("模板字体目录中未检测到字体文件")
  if (missingFonts.length) unavailableReasons.push(`缺少模板所需字体：${missingFonts.join("、")}`)

  const conversionReady = executableAvailable && !!fontDirectory && installedFonts.length > 0 && missingFonts.length === 0
  return {
    libreOfficePath: executableAvailable ? executable : null,
    fontDirectory,
    installedFonts,
    canAnalyze: true,
    canCompile: true,
    canExportDocx: true,
    canExportLegacyDoc: conversionReady,
    canExportPdf: conversionReady,
    unavailableReasons,
    missingFonts,
  }
}

export function publicOfficeCapabilities(report: OfficeCapabilities): OADocumentTemplateCapabilities {
  return {
    canAnalyze: report.canAnalyze,
    canCompile: report.canCompile,
    canExportDocx: report.canExportDocx,
    canExportLegacyDoc: report.canExportLegacyDoc,
    canExportPdf: report.canExportPdf,
    unavailableReasons: [...report.unavailableReasons],
    missingFonts: [...report.missingFonts],
  }
}
