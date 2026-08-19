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

  const upload = async (url: string, init: RequestInit) => {
    try {
      return await fetch(url, init)
    } catch {
      throw new Error(`${failureMessage}：无法连接文件存储，请检查网络或 CORS 配置`)
    }
  }

  if (typeof target === "string") {
    const response = await upload(target, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: file,
    })
    if (!response.ok) throw new Error(`${failureMessage} (${response.status})`)
    const payload = await response.json()
    if (!payload?.storageId) throw new Error(failureMessage)
    return String(payload.storageId)
  }

  const response = await upload(target.uploadUrl, {
    method: target.method || "PUT",
    headers: target.headers || { "Content-Type": contentType },
    body: file,
  })
  if (!response.ok) throw new Error(`${failureMessage} (${response.status})`)
  return target.storageId
}
