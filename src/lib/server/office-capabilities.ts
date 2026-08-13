import fontkit from "@pdf-lib/fontkit"
import type { Font } from "@pdf-lib/fontkit"
import { access, readFile, readdir } from "node:fs/promises"
import path from "node:path"

import type { OADocumentTemplateCapabilities } from "@/lib/oa-document-templates"

export interface OfficeCapabilities extends OADocumentTemplateCapabilities {
  libreOfficePath: string | null
  fontDirectory: string | null
  installedFonts: string[]
  fontAliases: Record<string, string[]>
}

const SAFE_EXECUTABLE_NAMES = new Set(["soffice", "soffice.bin", "libreoffice"])
const FONT_EXTENSIONS = new Set([".ttf", ".otf", ".ttc", ".woff", ".woff2"])

export function configuredAbsoluteExecutable(value: string | undefined, allowedNames: ReadonlySet<string>) {
  const candidate = value?.trim()
  if (!candidate) return null
  if (!path.isAbsolute(candidate) || !allowedNames.has(path.basename(candidate).toLowerCase())) {
    return null
  }
  return path.normalize(candidate)
}

function configuredExecutable(value = process.env.LIBREOFFICE_PATH) {
  return configuredAbsoluteExecutable(value, SAFE_EXECUTABLE_NAMES)
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

export function missingConvertedPdfFonts(required: string[], aliases: Record<string, string[]>, pdfFontNames: string[]) {
  const converted = pdfFontNames.map((name) => normalizeFontName(name.replace(/^[A-Z]{6}\+/, "")))
  return required.filter((name) => {
    const expected = aliases[name] || []
    return !expected.some((alias) => converted.includes(normalizeFontName(alias)))
  })
}

async function listFontFiles(directory: string) {
  const result: string[] = []
  const stack: Array<{ directory: string; depth: number }> = [{ directory, depth: 0 }]
  while (stack.length) {
    const current = stack.pop()!
    const entries = await readdir(current.directory, { withFileTypes: true })
    for (const entry of entries) {
      const filePath = path.join(current.directory, entry.name)
      if (entry.isDirectory() && current.depth < 8) stack.push({ directory: filePath, depth: current.depth + 1 })
      else if (entry.isFile() && FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(filePath)
      if (result.length > 5_000) throw new Error("模板字体目录文件数量超过限制")
    }
  }
  return result.sort((left, right) => left.localeCompare(right, "en-US"))
}

export async function inventoryOfficeFonts(directory = process.env.OA_TEMPLATE_FONT_DIR) {
  const configured = directory?.trim()
  if (!configured || !path.isAbsolute(configured)) return []
  try {
    return (await listFontFiles(configured))
      .map((filePath) => path.basename(filePath, path.extname(filePath)))
      .sort((left, right) => left.localeCompare(right, "zh-CN"))
  } catch {
    return []
  }
}

async function inspectFontAliases(directory: string | null, preferredKeys: Set<string>) {
  if (!directory) return new Map<string, string[]>()
  try {
    const entries = (await listFontFiles(directory))
      .sort((left, right) => {
        const leftKey = normalizeFontName(path.basename(left, path.extname(left)))
        const rightKey = normalizeFontName(path.basename(right, path.extname(right)))
        const leftPriority = [...preferredKeys].some((key) => leftKey.includes(key)) ? 0 : 1
        const rightPriority = [...preferredKeys].some((key) => rightKey.includes(key)) ? 0 : 1
        return leftPriority - rightPriority || left.localeCompare(right, "en-US")
      })
    const parent = new Map<string, string>()
    const faces: Array<{ familyKeys: string[]; familyName: string; aliases: string[] }> = []
    const exactAliases = new Map<string, string[]>()
    const find = (key: string): string => {
      const current = parent.get(key)
      if (!current) {
        parent.set(key, key)
        return key
      }
      if (current === key) return key
      const root = find(current)
      parent.set(key, root)
      return root
    }
    const union = (left: string, right: string) => {
      const leftRoot = find(left)
      const rightRoot = find(right)
      if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot)
    }
    for (const filePath of entries.slice(0, 2_000)) {
      const fallback = path.basename(filePath, path.extname(filePath))
      try {
        type InspectedFont = Font & { name?: { records?: Record<string, Record<string, string>> } }
        const created = fontkit.create(await readFile(filePath)) as InspectedFont & { fonts?: InspectedFont[] }
        const fonts = Array.isArray(created.fonts) ? created.fonts : [created]
        for (const font of fonts) {
          const localizedFamilies = Object.values(font.name?.records?.fontFamily || {})
          const familyNames = [...new Set([font.familyName, ...localizedFamilies].filter((value): value is string => typeof value === "string" && Boolean(value)))]
          const localizedFaces = ["fullName", "postscriptName"].flatMap((key) => Object.values(font.name?.records?.[key] || {}))
          const aliases = [...new Set([...familyNames, font.fullName, font.postscriptName, ...localizedFaces].filter((value): value is string => typeof value === "string" && Boolean(value)))]
          const familyKeys = [...new Set(familyNames.map(normalizeFontName).filter(Boolean))]
          if (!familyKeys.length || !aliases.length) continue
          for (const key of familyKeys.slice(1)) union(familyKeys[0], key)
          find(familyKeys[0])
          faces.push({ familyKeys, familyName: font.familyName || familyNames[0], aliases })
          for (const alias of aliases) {
            const key = normalizeFontName(alias)
            if (key && !familyKeys.includes(key)) exactAliases.set(key, aliases)
          }
        }
      } catch {
        // Invalid files do not broaden the inventory beyond their configured filename.
        exactAliases.set(normalizeFontName(fallback), [fallback])
      }
    }
    const aliasesByRoot = new Map<string, Set<string>>()
    const canonicalByRoot = new Map<string, string>()
    for (const face of faces) {
      const root = find(face.familyKeys[0])
      const aliases = aliasesByRoot.get(root) || new Set<string>()
      face.aliases.forEach((alias) => aliases.add(alias))
      aliasesByRoot.set(root, aliases)
      if (!canonicalByRoot.has(root)) canonicalByRoot.set(root, face.familyName)
    }
    const result = new Map(exactAliases)
    for (const key of parent.keys()) {
      const root = find(key)
      const canonical = canonicalByRoot.get(root)
      const aliases = aliasesByRoot.get(root)
      if (canonical && aliases) result.set(key, [canonical, ...[...aliases].filter((alias) => alias !== canonical)])
    }
    return result
  } catch {
    return new Map<string, string[]>()
  }
}

export async function resolveOfficeFontAliases(fontNames: string[], directory = process.env.OA_TEMPLATE_FONT_DIR) {
  if (!fontNames.length) return {}
  const configured = directory?.trim() && path.isAbsolute(directory.trim()) ? path.normalize(directory.trim()) : null
  const directories = [configured, "/System/Library/Fonts", "/System/Library/Fonts/Supplemental", "/Library/Fonts"].filter((value): value is string => Boolean(value))
  const preferredKeys = new Set(fontNames.map(normalizeFontName))
  const indexes = await Promise.all(directories.map((fontDirectory) => inspectFontAliases(fontDirectory, preferredKeys)))
  const result: Record<string, string[]> = {}
  for (const name of fontNames) {
    const key = normalizeFontName(name)
    const compatibleKeys = [key, `${key}简`, `${key}繁`, `${key}sc`, `${key}tc`]
    const aliases = indexes.flatMap((index) => compatibleKeys.flatMap((candidate) => index.get(candidate) || []))
    if (aliases.length) result[name] = [...new Set(aliases)]
  }
  return result
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
  const required = requiredFonts(env.OA_TEMPLATE_REQUIRED_FONTS)
  const fontAliases = await resolveOfficeFontAliases(required, fontDirectory || undefined)
  const missingFonts = required.filter((font) => !fontAliases[font])
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
    fontAliases,
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
