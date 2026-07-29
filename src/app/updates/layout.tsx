import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "动态",
  description: "北京大学人工智能研究院的公开动态、公告与后续服务更新。",
  alternates: { canonical: "/updates" },
}

export default function UpdatesLayout({ children }: { children: ReactNode }) {
  return children
}
