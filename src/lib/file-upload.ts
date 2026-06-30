export type StorageUploadTarget = string | {
  uploadUrl: string
  storageId: string
  method?: "PUT" | "POST"
  headers?: Record<string, string>
}

export async function uploadFileToStorageTarget(
  target: StorageUploadTarget,
  file: File,
  failureMessage = "上传失败"
) {
  const contentType = file.type || "application/octet-stream"

  if (typeof target === "string") {
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: file,
    })
    if (!response.ok) throw new Error(failureMessage)
    const payload = await response.json()
    if (!payload?.storageId) throw new Error(failureMessage)
    return String(payload.storageId)
  }

  const response = await fetch(target.uploadUrl, {
    method: target.method || "PUT",
    headers: target.headers || { "Content-Type": contentType },
    body: file,
  })
  if (!response.ok) throw new Error(failureMessage)
  return target.storageId
}
