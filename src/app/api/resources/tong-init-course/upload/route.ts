import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * ToNG 课程资源上传转发：浏览器把文件发给本接口，服务器再 PUT 到 R2 的 presigned URL。
 * 绕过浏览器直传 R2 的 CORS 限制；服务器之间无 CORS。
 *
 * 请求体（multipart/form-data）：
 *   file        - 要上传的文件
 *   uploadUrl   - beginUpload 返回的 R2 presigned PUT URL
 *   headersJson - beginUpload 返回的 headers（JSON 字符串，含签名绑定的 Content-Type/Content-Disposition）
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, message: "请选择文件" }, { status: 400 })
    }
    const uploadUrl = String(formData.get("uploadUrl") || "")
    if (!uploadUrl.startsWith("https://")) {
      return NextResponse.json({ ok: false, message: "上传地址无效" }, { status: 400 })
    }

    let headers: Record<string, string> = {}
    try {
      const parsed = JSON.parse(String(formData.get("headersJson") || "{}"))
      if (parsed && typeof parsed === "object") headers = parsed
    } catch {
      headers = {}
    }

    const fileBytes = await file.arrayBuffer()
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: Object.keys(headers).length > 0
        ? headers
        : { "Content-Type": file.type || "application/octet-stream" },
      body: fileBytes,
    })
    if (!putRes.ok) {
      throw new Error(`R2 上传失败 (${putRes.status})`)
    }

    return NextResponse.json({ ok: true, status: putRes.status })
  } catch (error) {
    console.error("tong-init-course upload relay error", error)
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "上传失败",
    }, { status: 500 })
  }
}
