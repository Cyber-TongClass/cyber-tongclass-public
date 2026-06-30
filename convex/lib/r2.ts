const R2_STORAGE_ID_PREFIX = "r2:"
const DEFAULT_R2_TTL_SECONDS = 900
const MAX_R2_TTL_SECONDS = 7 * 24 * 60 * 60
const R2_KEY_PART_PATTERN = /^[a-z0-9._-]+$/

export type R2Purpose =
  | "academic-exchange-paper"
  | "oa-form-attachment"
  | "techday-poster"
  | "techday-reimbursement-attachment"

const R2_PURPOSES = new Set<R2Purpose>([
  "academic-exchange-paper",
  "oa-form-attachment",
  "techday-poster",
  "techday-reimbursement-attachment",
])

export type R2Config = {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export type R2UploadTarget = {
  storageId: string
  uploadUrl: string
  method: "PUT"
  headers: Record<string, string>
}

const PINYIN_MAP: Record<string, string> = {
  报: "bao",
  销: "xiao",
  票: "piao",
  据: "ju",
  论: "lun",
  文: "wen",
  附: "fu",
  件: "jian",
  海: "hai",
  证: "zheng",
  明: "ming",
  材: "cai",
  料: "liao",
}

function getCrypto() {
  const cryptoImpl = (globalThis as any).crypto || (typeof global !== "undefined" ? (global as any).crypto : undefined)
  if (!cryptoImpl?.subtle) throw new Error("WebCrypto is required for R2 signing")
  return cryptoImpl as Crypto
}

function getEnvValue(key: string) {
  const env = typeof process !== "undefined" ? (process as any).env : undefined
  return typeof env?.[key] === "string" && env[key].trim() ? env[key].trim() : undefined
}

function getDefaultR2TtlSeconds() {
  const raw = getEnvValue("R2_SIGNED_URL_TTL_SECONDS")
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : DEFAULT_R2_TTL_SECONDS
}

function clampTtl(value?: number) {
  const candidate = Number.isFinite(value || NaN) ? value! : getDefaultR2TtlSeconds()
  return Math.max(1, Math.min(Math.floor(candidate), MAX_R2_TTL_SECONDS))
}

export function getR2ConfigFromEnv(): R2Config | null {
  const bucket = getEnvValue("R2_BUCKET")
  const accessKeyId = getEnvValue("R2_ACCESS_KEY_ID")
  const secretAccessKey = getEnvValue("R2_SECRET_ACCESS_KEY")
  const accountId = getEnvValue("R2_ACCOUNT_ID")
  const endpoint = getEnvValue("R2_ENDPOINT") || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) return null
  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    bucket,
    accessKeyId,
    secretAccessKey,
  }
}

export function isR2Configured() {
  return Boolean(getR2ConfigFromEnv())
}

function transliterate(input: string) {
  return Array.from(input).map((char) => {
    if (/^[a-zA-Z0-9._-]$/.test(char)) return char
    return PINYIN_MAP[char] ? `-${PINYIN_MAP[char]}-` : "-"
  }).join("")
}

function sanitizePathPart(value: string, fallback: string) {
  const sanitized = transliterate(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+\./g, ".")
    .replace(/-{2,}/g, "-")
    .slice(0, 120)
  return sanitized || fallback
}

function formatYearMonth(now: Date) {
  return {
    year: String(now.getUTCFullYear()),
    month: String(now.getUTCMonth() + 1).padStart(2, "0"),
  }
}

function randomId() {
  const cryptoImpl = (globalThis as any).crypto
  if (cryptoImpl?.randomUUID) return cryptoImpl.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createR2ObjectKey(args: {
  purpose: R2Purpose
  ownerId: string
  fileName?: string
  now?: Date
  randomId?: string
}) {
  const now = args.now || new Date()
  const { year, month } = formatYearMonth(now)
  const owner = sanitizePathPart(args.ownerId, "unknown-owner")
  const fileName = sanitizePathPart(args.fileName || "upload.bin", "upload.bin")
  const id = sanitizePathPart(args.randomId || randomId(), "file")
  return `${args.purpose}/${year}/${month}/${owner}/${id}-${fileName}`
}

export function toR2StorageId(key: string) {
  return `${R2_STORAGE_ID_PREFIX}${key}`
}

export function getR2ObjectKeyFromStorageId(storageId?: unknown) {
  const value = String(storageId || "")
  if (!value.startsWith(R2_STORAGE_ID_PREFIX)) return null
  const key = value.slice(R2_STORAGE_ID_PREFIX.length)
  return parseR2ObjectKey(key) ? key : null
}

export function isR2StorageId(storageId?: unknown) {
  return getR2ObjectKeyFromStorageId(storageId) !== null
}

export function parseR2ObjectKey(key?: unknown) {
  const value = String(key || "")
  const parts = value.split("/")
  if (parts.length !== 5) return null
  const [purpose, year, month, ownerId, objectName] = parts
  if (!R2_PURPOSES.has(purpose as R2Purpose)) return null
  if (!/^\d{4}$/.test(year)) return null
  if (!/^(0[1-9]|1[0-2])$/.test(month)) return null
  if (!R2_KEY_PART_PATTERN.test(ownerId)) return null
  if (!R2_KEY_PART_PATTERN.test(objectName)) return null
  return {
    purpose: purpose as R2Purpose,
    year,
    month,
    ownerId,
    objectName,
  }
}

export function r2StorageIdMatches(storageId: unknown, args: { ownerId?: string; purpose?: R2Purpose | R2Purpose[] }) {
  const key = getR2ObjectKeyFromStorageId(storageId)
  if (!key) return false
  const parsed = parseR2ObjectKey(key)
  if (!parsed) return false

  if (args.ownerId && parsed.ownerId !== sanitizePathPart(args.ownerId, "unknown-owner")) {
    return false
  }

  if (args.purpose) {
    const allowedPurposes = Array.isArray(args.purpose) ? args.purpose : [args.purpose]
    if (!allowedPurposes.includes(parsed.purpose)) return false
  }

  return true
}

export function r2StorageIdBelongsToOwner(storageId: unknown, ownerId: string) {
  return r2StorageIdMatches(storageId, { ownerId })
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function encodeS3Path(value: string) {
  return value.split("/").map(encodeRfc3986).join("/")
}

function amzTimestamp(now: Date) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "")
}

function dateStamp(now: Date) {
  return amzTimestamp(now).slice(0, 8)
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function utf8(value: string) {
  return new TextEncoder().encode(value)
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function sha256Hex(value: string) {
  const digest = await getCrypto().subtle.digest("SHA-256", utf8(value))
  return bytesToHex(new Uint8Array(digest))
}

async function hmac(key: Uint8Array, value: string) {
  const cryptoKey = await getCrypto().subtle.importKey("raw", toArrayBuffer(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await getCrypto().subtle.sign("HMAC", cryptoKey, utf8(value))
  return new Uint8Array(signature)
}

function canonicalQuery(params: Record<string, string>) {
  return Object.entries(params)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&")
}

async function signingKey(secretAccessKey: string, stamp: string) {
  const dateKey = await hmac(utf8(`AWS4${secretAccessKey}`), stamp)
  const regionKey = await hmac(dateKey, "auto")
  const serviceKey = await hmac(regionKey, "s3")
  return await hmac(serviceKey, "aws4_request")
}

export async function createR2SignedUrl(args: {
  method: "GET" | "PUT" | "HEAD"
  key: string
  contentType?: string
  now?: Date
  expiresSeconds?: number
  config?: R2Config
}) {
  const config = args.config || getR2ConfigFromEnv()
  if (!config) throw new Error("R2 is not configured")

  const now = args.now || new Date()
  const stamp = dateStamp(now)
  const amzDate = amzTimestamp(now)
  const credentialScope = `${stamp}/auto/s3/aws4_request`
  const endpoint = new URL(config.endpoint.replace(/\/+$/, ""))
  const host = endpoint.host
  const canonicalUri = `/${encodeRfc3986(config.bucket)}/${encodeS3Path(args.key)}`
  const signedHeaders = "host"
  const params = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(clampTtl(args.expiresSeconds)),
    "X-Amz-SignedHeaders": signedHeaders,
  }
  const query = canonicalQuery(params)
  const canonicalRequest = [
    args.method,
    canonicalUri,
    query,
    `host:${host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n")
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n")
  const signature = bytesToHex(await hmac(await signingKey(config.secretAccessKey, stamp), stringToSign))
  return `${endpoint.origin}${canonicalUri}?${query}&X-Amz-Signature=${signature}`
}

export async function createR2UploadTarget(args: {
  purpose: R2Purpose
  ownerId: string
  fileName?: string
  contentType?: string
}) {
  const config = getR2ConfigFromEnv()
  if (!config) return null
  const contentType = args.contentType || "application/octet-stream"
  const key = createR2ObjectKey({
    purpose: args.purpose,
    ownerId: args.ownerId,
    fileName: args.fileName,
  })
  return {
    storageId: toR2StorageId(key),
    uploadUrl: await createR2SignedUrl({ method: "PUT", key, contentType, config }),
    method: "PUT" as const,
    headers: { "Content-Type": contentType },
  }
}

export async function getR2DownloadUrl(storageId: unknown) {
  const key = getR2ObjectKeyFromStorageId(storageId)
  if (!key && String(storageId || "").startsWith(R2_STORAGE_ID_PREFIX)) {
    throw new Error("R2 storage id is invalid")
  }
  if (!key) return null
  return await createR2SignedUrl({ method: "GET", key })
}
