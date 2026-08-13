import { inflateRawSync } from "node:zlib"
import { OA_DOCUMENT_LIMITS } from "@/lib/oa-document-templates"
import { buildSimpleZip } from "@/lib/server/simple-zip"

const LOCAL_FILE_HEADER = 0x04034b50
const CENTRAL_FILE_HEADER = 0x02014b50
const END_OF_CENTRAL_DIRECTORY = 0x06054b50
const MAX_EOCD_SEARCH = 65_557

export interface OoxmlPackageLimits {
  maxEntries?: number
  maxExtractedBytes?: number
  maxEntryBytes?: number
  maxXmlPartBytes?: number
  maxCompressionRatio?: number
}

export interface OoxmlPackageEntry {
  name: string
  data: Buffer
  compressedSize: number
  uncompressedSize: number
  compressionMethod: 0 | 8
  crc32: number
}

export interface OoxmlPackage {
  readonly entries: ReadonlyMap<string, OoxmlPackageEntry>
  has(name: string): boolean
  read(name: string): Buffer
  readText(name: string): string
  replaceEntries(changes: ReadonlyMap<string, Uint8Array | Buffer | string> | Record<string, Uint8Array | Buffer | string>): Buffer
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < table.length; index += 1) {
    let crc = index
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    table[index] = crc >>> 0
  }
  return table
})()

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function findEocd(bytes: Buffer) {
  const minimum = Math.max(0, bytes.length - MAX_EOCD_SEARCH)
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) !== END_OF_CENTRAL_DIRECTORY) continue
    const commentLength = bytes.readUInt16LE(offset + 20)
    if (offset + 22 + commentLength === bytes.length) return offset
  }
  throw new Error("无效的 ZIP：找不到中央目录")
}

function decodeName(bytes: Buffer, flags: number) {
  // OOXML producers use UTF-8 or ASCII names. Refuse ambiguous legacy encodings.
  if ((flags & 0x0800) === 0 && bytes.some((byte) => byte >= 0x80)) throw new Error("ZIP 条目名称必须使用 UTF-8")
  const name = bytes.toString("utf8")
  if (name.includes("\ufffd") || name.includes("\0")) throw new Error("ZIP 条目名称编码无效")
  return name
}

function validateEntryName(name: string) {
  if (name.startsWith("/") || name.startsWith("\\") || /^[a-zA-Z]:/.test(name)) throw new Error(`ZIP 条目使用绝对路径：${name}`)
  if (name.includes("\\")) throw new Error(`ZIP 条目路径包含反斜杠：${name}`)
  const segments = name.split("/")
  if (!name || segments.some((segment) => segment === ".." || segment === ".")) throw new Error(`ZIP 条目路径不安全：${name}`)
}

function failIfOutOfBounds(bytes: Buffer, start: number, length: number, label: string) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length < 0 || start > bytes.length - length) {
    throw new Error(`ZIP ${label}偏移超出文件范围`)
  }
}

export function readOoxmlPackage(input: Uint8Array | Buffer, configuredLimits: OoxmlPackageLimits = {}): OoxmlPackage {
  const bytes = Buffer.from(input)
  if (bytes.length < 22) throw new Error("无效的 ZIP 文件")
  const limits = {
    maxEntries: configuredLimits.maxEntries ?? OA_DOCUMENT_LIMITS.maxZipEntries,
    maxExtractedBytes: configuredLimits.maxExtractedBytes ?? OA_DOCUMENT_LIMITS.maxExtractedBytes,
    maxEntryBytes: configuredLimits.maxEntryBytes ?? OA_DOCUMENT_LIMITS.maxExtractedBytes,
    maxXmlPartBytes: configuredLimits.maxXmlPartBytes ?? OA_DOCUMENT_LIMITS.maxXmlPartBytes,
    maxCompressionRatio: configuredLimits.maxCompressionRatio ?? OA_DOCUMENT_LIMITS.maxCompressionRatio,
  }
  const eocdOffset = findEocd(bytes)
  const diskNumber = bytes.readUInt16LE(eocdOffset + 4)
  const centralDisk = bytes.readUInt16LE(eocdOffset + 6)
  const diskEntries = bytes.readUInt16LE(eocdOffset + 8)
  const totalEntries = bytes.readUInt16LE(eocdOffset + 10)
  const centralSize = bytes.readUInt32LE(eocdOffset + 12)
  const centralOffset = bytes.readUInt32LE(eocdOffset + 16)
  if (diskNumber !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) throw new Error("不支持分卷 ZIP")
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error("不支持 ZIP64 模板")
  if (totalEntries > limits.maxEntries) throw new Error(`ZIP 条目数量超过 ${limits.maxEntries} 限制`)
  failIfOutOfBounds(bytes, centralOffset, centralSize, "中央目录")
  if (centralOffset + centralSize !== eocdOffset) throw new Error("ZIP 中央目录偏移或大小无效")

  const entries = new Map<string, OoxmlPackageEntry>()
  const dataRanges: Array<{ start: number; end: number; name: string }> = []
  let totalExtracted = 0
  let cursor = centralOffset
  for (let index = 0; index < totalEntries; index += 1) {
    failIfOutOfBounds(bytes, cursor, 46, "中央目录条目")
    if (bytes.readUInt32LE(cursor) !== CENTRAL_FILE_HEADER) throw new Error("ZIP 中央目录条目签名无效")
    const flags = bytes.readUInt16LE(cursor + 8)
    const compressionMethod = bytes.readUInt16LE(cursor + 10)
    const expectedCrc = bytes.readUInt32LE(cursor + 16)
    const compressedSize = bytes.readUInt32LE(cursor + 20)
    const uncompressedSize = bytes.readUInt32LE(cursor + 24)
    const nameLength = bytes.readUInt16LE(cursor + 28)
    const extraLength = bytes.readUInt16LE(cursor + 30)
    const commentLength = bytes.readUInt16LE(cursor + 32)
    const startDisk = bytes.readUInt16LE(cursor + 34)
    const localOffset = bytes.readUInt32LE(cursor + 42)
    const variableLength = nameLength + extraLength + commentLength
    failIfOutOfBounds(bytes, cursor + 46, variableLength, "中央目录名称")
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength)
    const name = decodeName(nameBytes, flags)
    validateEntryName(name)
    if (entries.has(name)) throw new Error(`ZIP 包含重复条目：${name}`)
    if ((flags & 0x0001) !== 0 || (flags & 0x0040) !== 0) throw new Error(`ZIP 条目已加密：${name}`)
    if (compressionMethod !== 0 && compressionMethod !== 8) throw new Error(`ZIP 条目使用不支持的压缩方法：${name}`)
    if (startDisk !== 0) throw new Error("不支持分卷 ZIP 条目")
    if (uncompressedSize > limits.maxEntryBytes) throw new Error(`ZIP 条目解压大小超过限制：${name}`)
    if (/\.(?:xml|rels)$/i.test(name) && uncompressedSize > limits.maxXmlPartBytes) throw new Error(`XML 部件超过大小限制：${name}`)
    const ratio = compressedSize === 0 ? (uncompressedSize === 0 ? 1 : Number.POSITIVE_INFINITY) : uncompressedSize / compressedSize
    if (ratio > limits.maxCompressionRatio) throw new Error(`ZIP 条目压缩比超过 ${limits.maxCompressionRatio}:1：${name}`)
    totalExtracted += uncompressedSize
    if (totalExtracted > limits.maxExtractedBytes) throw new Error("ZIP 总解压大小超过限制")

    failIfOutOfBounds(bytes, localOffset, 30, "本地头")
    if (localOffset >= centralOffset || bytes.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER) throw new Error(`ZIP 本地头偏移无效：${name}`)
    const localFlags = bytes.readUInt16LE(localOffset + 6)
    const localMethod = bytes.readUInt16LE(localOffset + 8)
    const localCrc = bytes.readUInt32LE(localOffset + 14)
    const localCompressedSize = bytes.readUInt32LE(localOffset + 18)
    const localUncompressedSize = bytes.readUInt32LE(localOffset + 22)
    const localNameLength = bytes.readUInt16LE(localOffset + 26)
    const localExtraLength = bytes.readUInt16LE(localOffset + 28)
    if (localFlags !== flags || localMethod !== compressionMethod) throw new Error(`ZIP 本地头与中央目录不一致：${name}`)
    const usesDataDescriptor = (flags & 0x0008) !== 0
    if (!usesDataDescriptor && (localCrc !== expectedCrc || localCompressedSize !== compressedSize || localUncompressedSize !== uncompressedSize)) {
      throw new Error(`ZIP 本地头 CRC 或大小与中央目录不一致：${name}`)
    }
    if (usesDataDescriptor && ((localCrc !== 0 && localCrc !== expectedCrc) || (localCompressedSize !== 0 && localCompressedSize !== compressedSize) || (localUncompressedSize !== 0 && localUncompressedSize !== uncompressedSize))) {
      throw new Error(`ZIP 数据描述符前的本地头信息不一致：${name}`)
    }
    failIfOutOfBounds(bytes, localOffset + 30, localNameLength + localExtraLength, "本地头名称")
    const localName = decodeName(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength), flags)
    if (localName !== name) throw new Error(`ZIP 本地头名称不一致：${name}`)
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength
    failIfOutOfBounds(bytes, dataOffset, compressedSize, "压缩数据")
    if (dataOffset + compressedSize > centralOffset) throw new Error(`ZIP 条目数据越过中央目录：${name}`)
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize)
    let data: Buffer
    try {
      data = compressionMethod === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: limits.maxEntryBytes })
    } catch {
      throw new Error(`ZIP 条目解压失败：${name}`)
    }
    if (data.length !== uncompressedSize) throw new Error(`ZIP 条目解压大小不一致：${name}`)
    if (crc32(data) !== expectedCrc) throw new Error(`ZIP 条目 CRC 校验失败：${name}`)
    dataRanges.push({ start: localOffset, end: dataOffset + compressedSize, name })
    entries.set(name, {
      name,
      data,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      crc32: expectedCrc,
    })
    cursor += 46 + variableLength
  }
  if (cursor !== eocdOffset) throw new Error("ZIP 中央目录条目数量或长度不一致")
  dataRanges.sort((a, b) => a.start - b.start)
  for (let index = 1; index < dataRanges.length; index += 1) {
    if (dataRanges[index].start < dataRanges[index - 1].end) throw new Error(`ZIP 条目数据范围重叠：${dataRanges[index].name}`)
  }

  const api: OoxmlPackage = {
    entries,
    has(name) { return entries.has(name) },
    read(name) {
      const entry = entries.get(name)
      if (!entry) throw new Error(`OOXML 部件不存在：${name}`)
      return Buffer.from(entry.data)
    },
    readText(name) {
      const entry = entries.get(name)
      if (!entry) throw new Error(`OOXML 部件不存在：${name}`)
      if (entry.data.includes(0)) throw new Error(`OOXML 文本部件包含 NUL：${name}`)
      return entry.data.toString("utf8")
    },
    replaceEntries(changes) {
      const replacements = changes instanceof Map ? changes : new Map(Object.entries(changes))
      for (const name of replacements.keys()) {
        validateEntryName(name)
        if (!entries.has(name)) throw new Error(`不能替换不存在的 OOXML 部件：${name}`)
      }
      return buildSimpleZip(Array.from(entries.values(), (entry) => ({
        name: entry.name,
        data: replacements.has(entry.name) ? replacements.get(entry.name)! : entry.data,
      })))
    },
  }
  return api
}
