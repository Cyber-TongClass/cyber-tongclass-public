import { spawn, type ChildProcess } from "node:child_process"
import { constants } from "node:fs"
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { Readable } from "node:stream"

import type { OADocumentPageRotation } from "@/lib/oa-document-templates"
import type { OAPdfPageInfo } from "@/lib/server/oa-pdf-layout"
import { configuredAbsoluteExecutable } from "@/lib/server/office-capabilities"

export interface OAPreviewToolCapabilities {
  pdfInfoPath: string | null
  pdfTextPath: string | null
  pdfToPpmPath: string | null
  pdfFontsPath: string | null
  unavailableReasons: string[]
}

export interface OAPdfFontInfo {
  name: string
  type: string
  encoding: string
  embedded: boolean
  subset: boolean
  unicode: boolean
  objectId: string
}

const PDF_MAGIC = Buffer.from("%PDF-")
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const MAX_INPUT_BYTES = 100 * 1024 * 1024
const MAX_PAGES = 100
const MAX_PAGE_POINTS = 20_000
const MAX_PAGE_PIXELS = 40_000_000
const MAX_TOTAL_PIXELS = 200_000_000
const MAX_PAGE_BYTES = 20 * 1024 * 1024
const MAX_STDOUT_BYTES = 5 * 1024 * 1024
const MAX_STDERR_BYTES = 128 * 1024
const TOOL_TIMEOUT_MS = 60_000
const RENDER_DPI = 144
const POPPLER_FONT_TYPES = [
  "CID TrueType (OT)",
  "CID Type 0C (OT)",
  "TrueType (OT)",
  "Type 1C (OT)",
  "CID TrueType",
  "CID Type 0C",
  "CID Type 0",
  "TrueType",
  "Type 1C",
  "Type 1",
  "Type 3",
  "OpenType",
  "unknown",
] as const

const TOOL_CONFIG = [
  { key: "pdfInfoPath", env: ["OA_PDFINFO_PATH", "PDFINFO_PATH"], basename: "pdfinfo", label: "pdfinfo" },
  { key: "pdfTextPath", env: ["OA_PDFTOTEXT_PATH", "PDFTOTEXT_PATH"], basename: "pdftotext", label: "pdftotext" },
  { key: "pdfToPpmPath", env: ["OA_PDFTOPPM_PATH", "PDFTOPPM_PATH"], basename: "pdftoppm", label: "pdftoppm" },
  { key: "pdfFontsPath", env: ["OA_PDFFONTS_PATH", "PDFFONTS_PATH"], basename: "pdffonts", label: "pdffonts" },
] as const

function firstConfigured(env: NodeJS.ProcessEnv, names: readonly string[]) {
  return names.map((name) => env[name]).find((value) => value?.trim())
}

export async function detectPreviewToolCapabilities(env: NodeJS.ProcessEnv = process.env): Promise<OAPreviewToolCapabilities> {
  const unavailableReasons: string[] = []
  const resolved: Record<(typeof TOOL_CONFIG)[number]["key"], string | null> = {
    pdfInfoPath: null, pdfTextPath: null, pdfToPpmPath: null, pdfFontsPath: null,
  }
  for (const tool of TOOL_CONFIG) {
    const configured = firstConfigured(env, tool.env)
    if (!configured) {
      unavailableReasons.push(`未配置 ${tool.label} 绝对路径`)
      continue
    }
    const executable = configuredAbsoluteExecutable(configured, new Set([tool.basename]))
    if (!executable) {
      unavailableReasons.push(`${tool.label} 路径必须是允许范围内的绝对路径`)
      continue
    }
    try {
      await access(executable, constants.X_OK)
      resolved[tool.key] = executable
    } catch {
      unavailableReasons.push(`${tool.label} 程序不可执行`)
    }
  }
  return { ...resolved, unavailableReasons }
}

function assertPdf(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_INPUT_BYTES || !Buffer.from(bytes).subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    throw new Error("PDF 输入无效或超过大小限制")
  }
}

function appendBounded(chunks: Buffer[], chunk: Buffer, state: { bytes: number }, limit: number) {
  if (state.bytes >= limit) return
  const accepted = chunk.subarray(0, limit - state.bytes)
  chunks.push(accepted)
  state.bytes += accepted.length
}

async function waitForTool(child: Pick<ChildProcess, "kill" | "once"> & { stdout: Readable; stderr: Readable }, label: string) {
  const stdout: Buffer[] = []
  const stderr: Buffer[] = []
  const stdoutState = { bytes: 0 }
  const stderrState = { bytes: 0 }
  let stdoutOverflow = false
  child.stdout.on("data", (value) => {
    const chunk = Buffer.from(value)
    if (stdoutState.bytes + chunk.length > MAX_STDOUT_BYTES) stdoutOverflow = true
    appendBounded(stdout, chunk, stdoutState, MAX_STDOUT_BYTES)
  })
  child.stderr.on("data", (value) => appendBounded(stderr, Buffer.from(value), stderrState, MAX_STDERR_BYTES))
  return await new Promise<Buffer>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      callback()
    }
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      finish(() => reject(new Error(`${label} 执行超时（60 秒）`)))
    }, TOOL_TIMEOUT_MS)
    child.once("error", (error) => finish(() => reject(error)))
    child.once("close", (code) => finish(() => {
      if (stdoutOverflow) return reject(new Error(`${label} 输出超过大小限制`))
      if ((code ?? -1) !== 0) {
        const detail = Buffer.concat(stderr).toString("utf8").trim()
        return reject(new Error(`${label} 执行失败${detail ? `：${detail.slice(0, 500)}` : ""}`))
      }
      resolve(Buffer.concat(stdout))
    }))
  })
}

async function inPdfWorkspace<T>(bytes: Uint8Array, label: string, operation: (inputPath: string, workDirectory: string) => Promise<T>) {
  assertPdf(bytes)
  const workDirectory = await mkdtemp(path.join(tmpdir(), `aia-oa-${label}-`))
  try {
    const inputPath = path.join(workDirectory, "document.pdf")
    await writeFile(inputPath, Buffer.from(bytes))
    return await operation(inputPath, workDirectory)
  } finally {
    await rm(workDirectory, { recursive: true, force: true })
  }
}

async function runTool(executable: string | null, label: string, args: string[], cwd: string) {
  if (!executable) throw new Error(`${label} 不可用`)
  const child = spawn(executable, args, {
    cwd,
    env: { PATH: "/usr/bin:/bin", HOME: cwd, TMPDIR: cwd, NODE_ENV: process.env.NODE_ENV || "production" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  })
  return waitForTool(child as ChildProcess & { stdout: Readable; stderr: Readable }, label)
}

function positiveNumber(value: string | undefined, label: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_PAGE_POINTS) throw new Error(`pdfinfo ${label}无效`)
  return parsed
}

function rotation(value: string | undefined): OADocumentPageRotation {
  const parsed = Number(value || "0")
  if (![0, 90, 180, 270].includes(parsed)) throw new Error("pdfinfo 页面旋转无效")
  return parsed as OADocumentPageRotation
}

function parsePdfInfo(output: string): OAPdfPageInfo[] {
  const pageCount = Number(output.match(/^Pages:\s*(\d+)\s*$/im)?.[1])
  if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > MAX_PAGES) throw new Error(`PDF 页数无效或超过 ${MAX_PAGES} 页限制`)
  const sizes = Array.from(output.matchAll(/^Page\s+(?:\d+\s+)?size:\s*([\d.]+)\s+x\s+([\d.]+)\s+pts/gim), (match) => ({ width: positiveNumber(match[1], "页面宽度"), height: positiveNumber(match[2], "页面高度") }))
  const generic = output.match(/^Page size:\s*([\d.]+)\s+x\s+([\d.]+)\s+pts/im)
  if (!sizes.length && generic) sizes.push({ width: positiveNumber(generic[1], "页面宽度"), height: positiveNumber(generic[2], "页面高度") })
  if (!sizes.length) throw new Error("pdfinfo 未返回页面尺寸")
  const rotations = Array.from(output.matchAll(/^Page\s+(?:\d+\s+)?rot:\s*(\d+)\s*$/gim), (match) => rotation(match[1]))
  const genericRotation = rotation(output.match(/^Page rot:\s*(\d+)\s*$/im)?.[1])
  return Array.from({ length: pageCount }, (_, index) => ({
    page: index + 1,
    ...(sizes[index] || sizes[0]),
    rotation: rotations[index] ?? rotations[0] ?? genericRotation,
  }))
}

export async function inspectPdf(bytes: Uint8Array, caps: OAPreviewToolCapabilities): Promise<OAPdfPageInfo[]> {
  return inPdfWorkspace(bytes, "pdfinfo", async (inputPath, cwd) => {
    const output = await runTool(caps.pdfInfoPath, "pdfinfo", ["-f", "1", "-l", String(MAX_PAGES), "-box", inputPath], cwd)
    return parsePdfInfo(output.toString("utf8"))
  })
}

export async function extractPdfBboxXml(bytes: Uint8Array, caps: OAPreviewToolCapabilities): Promise<string> {
  return inPdfWorkspace(bytes, "pdftotext", async (inputPath, cwd) => {
    const output = await runTool(caps.pdfTextPath, "pdftotext", ["-bbox-layout", "-f", "1", "-l", String(MAX_PAGES), inputPath, "-"], cwd)
    return output.toString("utf8")
  })
}

function assertPng(bytes: Buffer) {
  if (!bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) throw new Error("pdftoppm 生成了无效 PNG")
  if (!bytes.length || bytes.length > MAX_PAGE_BYTES) throw new Error("PDF 页面 PNG 超过 20 MiB 限制")
  if (bytes.length >= 24 && bytes.toString("ascii", 12, 16) === "IHDR") {
    const pixels = bytes.readUInt32BE(16) * bytes.readUInt32BE(20)
    if (!Number.isSafeInteger(pixels) || pixels <= 0 || pixels > MAX_PAGE_PIXELS) throw new Error("PDF 页面像素数量超过限制")
  }
}

export async function renderPdfPages(bytes: Uint8Array, caps: OAPreviewToolCapabilities): Promise<Buffer[]> {
  const pages = await inspectPdf(bytes, caps)
  let totalPixels = 0
  for (const page of pages) {
    const pixels = Math.ceil(page.width * RENDER_DPI / 72) * Math.ceil(page.height * RENDER_DPI / 72)
    if (pixels > MAX_PAGE_PIXELS) throw new Error("PDF 页面像素数量超过限制")
    totalPixels += pixels
  }
  if (totalPixels > MAX_TOTAL_PIXELS) throw new Error("PDF 总像素数量超过限制")
  return inPdfWorkspace(bytes, "pdftoppm", async (inputPath, cwd) => {
    const prefix = path.join(cwd, "page")
    await runTool(caps.pdfToPpmPath, "pdftoppm", ["-png", "-r", String(RENDER_DPI), "-f", "1", "-l", String(pages.length), inputPath, prefix], cwd)
    const names = (await readdir(cwd)).filter((name) => /^page-\d+\.png$/.test(name)).sort((left, right) => Number(left.match(/\d+/)?.[0]) - Number(right.match(/\d+/)?.[0]))
    if (names.length !== pages.length) throw new Error("pdftoppm 生成的页面数量不匹配")
    const rendered: Buffer[] = []
    for (const name of names) {
      const page = await readFile(path.join(cwd, name))
      assertPng(page)
      rendered.push(page)
    }
    return rendered
  })
}

function parsePdfFonts(output: string): OAPdfFontInfo[] {
  return output.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim()
    const parsed = POPPLER_FONT_TYPES.flatMap((type) => {
      const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const match = trimmed.match(new RegExp(`^(.*?)\\s+(${escapedType})\\s+(\\S+)\\s+(yes|no)\\s+(yes|no)\\s+(yes|no)\\s+(\\d+)\\s+(\\d+)\\s*$`, "i"))
      return match ? [{ type, match }] : []
    })[0]
    if (!parsed) return []
    const { type: fontType, match } = parsed
    const name = match[1].trim()
    if (!name) return []
    return [{
      name,
      type: fontType,
      encoding: match[3],
      embedded: match[4].toLowerCase() === "yes",
      subset: match[5].toLowerCase() === "yes",
      unicode: match[6].toLowerCase() === "yes",
      objectId: `${match[7]} ${match[8]}`,
    }]
  })
}

export async function inspectPdfFonts(bytes: Uint8Array, caps: OAPreviewToolCapabilities): Promise<OAPdfFontInfo[]> {
  return inPdfWorkspace(bytes, "pdffonts", async (inputPath, cwd) => parsePdfFonts((await runTool(caps.pdfFontsPath, "pdffonts", [inputPath], cwd)).toString("utf8")))
}
