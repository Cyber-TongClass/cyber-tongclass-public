import { spawn, type ChildProcess } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { Readable } from "node:stream"
import { pathToFileURL } from "node:url"

import { detectOfficeCapabilities, type OfficeCapabilities } from "@/lib/server/office-capabilities"

export type OfficeConversionTarget = "docx" | "doc" | "pdf"

export interface OfficeConversionResult {
  bytes: Buffer
  fileName: string
  warnings: string[]
}

interface ConversionOptions {
  capabilities?: OfficeCapabilities
  timeoutMs?: number
  maxOutputBytes?: number
  spawnImpl?: typeof spawn
}

const MAX_PROCESS_OUTPUT = 128 * 1024
const DEFAULT_MAX_OUTPUT_BYTES = 100 * 1024 * 1024

function safeBaseName(value: string) {
  const base = path.basename(value).normalize("NFKC").replace(/[\u0000-\u001f]/g, "").trim()
  if (!base || base === "." || base === "..") throw new Error("Office 源文件名无效")
  return base.replace(/[\\/:*?"<>|]/g, "_")
}

function boundedAppend(chunks: Buffer[], chunk: Buffer, state: { size: number }) {
  if (state.size >= MAX_PROCESS_OUTPUT) return
  const remaining = MAX_PROCESS_OUTPUT - state.size
  const accepted = chunk.subarray(0, remaining)
  chunks.push(accepted)
  state.size += accepted.length
}

async function waitForProcess(child: Pick<ChildProcess, "kill" | "once"> & { stdout: Readable; stderr: Readable }, timeoutMs: number) {
  const stdout: Buffer[] = []
  const stderr: Buffer[] = []
  const stdoutSize = { size: 0 }
  const stderrSize = { size: 0 }
  child.stdout.on("data", (chunk) => boundedAppend(stdout, Buffer.from(chunk), stdoutSize))
  child.stderr.on("data", (chunk) => boundedAppend(stderr, Buffer.from(chunk), stderrSize))
  return await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeoutMs)
    child.once("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once("close", (code) => {
      clearTimeout(timer)
      if (timedOut) return reject(new Error("Office 转换超时，请稍后重试"))
      resolve({ code: code ?? -1, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") })
    })
  })
}

export async function convertOfficeDocument(
  source: Uint8Array | Buffer,
  sourceFileName: string,
  target: OfficeConversionTarget,
  options: ConversionOptions = {},
): Promise<OfficeConversionResult> {
  const capabilities = options.capabilities || await detectOfficeCapabilities()
  if (!capabilities.libreOfficePath) throw new Error(capabilities.unavailableReasons[0] || "LibreOffice 不可用")
  if ((target === "pdf" || target === "doc") && (!capabilities.fontDirectory || capabilities.missingFonts.length)) {
    throw new Error(capabilities.unavailableReasons.find((reason) => reason.includes("字体")) || "模板字体未就绪")
  }
  const inputName = safeBaseName(sourceFileName)
  const sourceExtension = path.extname(inputName).toLowerCase()
  if (!new Set([".doc", ".docx"]).has(sourceExtension)) throw new Error("仅支持 .doc 或 .docx 源文件")
  const outputName = `${path.basename(inputName, sourceExtension)}.${target}`
  const workDirectory = await mkdtemp(path.join(tmpdir(), "aia-oa-office-"))
  try {
    const inputPath = path.join(workDirectory, inputName)
    await writeFile(inputPath, Buffer.from(source))
    const child = (options.spawnImpl || spawn)(capabilities.libreOfficePath, [
      `-env:UserInstallation=${pathToFileURL(path.join(workDirectory, "profile")).href}`,
      "--headless",
      "--nologo",
      "--nolockcheck",
      "--nodefault",
      "--nofirststartwizard",
      "--convert-to",
      target,
      "--outdir",
      workDirectory,
      inputPath,
    ], {
      cwd: workDirectory,
      env: {
        PATH: process.env.PATH || "/usr/bin:/bin",
        HOME: workDirectory,
        TMPDIR: workDirectory,
        NODE_ENV: process.env.NODE_ENV || "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    })
    const result = await waitForProcess(child, Math.min(Math.max(options.timeoutMs ?? 60_000, 1), 60_000))
    if (result.code !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim()
      throw new Error(`Office 转换失败${detail ? `：${detail.slice(0, 500)}` : ""}`)
    }
    const bytes = await readFile(path.join(workDirectory, outputName)).catch(() => null)
    if (!bytes) throw new Error("Office 转换未生成预期文件")
    if (!bytes.length || bytes.length > (options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES)) throw new Error("Office 转换输出大小无效")
    return {
      bytes,
      fileName: outputName,
      warnings: sourceExtension === ".doc" && target === "docx" ? ["已保留原始 .doc，并生成可编辑的 .docx 工作副本"] : [],
    }
  } finally {
    await rm(workDirectory, { recursive: true, force: true })
  }
}

export async function convertLegacyDocToDocx(source: Uint8Array | Buffer, sourceFileName: string, options?: ConversionOptions) {
  return convertOfficeDocument(source, sourceFileName, "docx", options)
}

export async function convertFilledDocxToPdf(source: Uint8Array | Buffer, sourceFileName: string, options?: ConversionOptions) {
  return convertOfficeDocument(source, sourceFileName, "pdf", options)
}

export async function convertFilledDocxToLegacyDoc(source: Uint8Array | Buffer, sourceFileName: string, options?: ConversionOptions) {
  return convertOfficeDocument(source, sourceFileName, "doc", options)
}
