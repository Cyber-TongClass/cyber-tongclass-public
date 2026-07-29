import { redirect } from "next/navigation"

/**
 * 通班内网表单列表已与研究院 OA 工作台合并：同一套 usePublishedOAForms 数据，
 * 统一在 /services/oa 办理。
 *
 * 主跳转由 next.config.js 的服务端重定向完成（/tong-class/intranet/forms →
 * /services/oa，307）；此页仅是配置被改动时的兜底（上层 intranet/layout 为
 * 客户端边界，页面内 redirect() 只能序列化为客户端跳转）。
 */
export default function TongClassIntranetFormsPage() {
  redirect("/services/oa")
}
