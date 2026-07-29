import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "研究",
  description: "北京大学人工智能研究院的研究主题、协作入口与经发布流程确认的公开研究成果。",
  alternates: { canonical: "/research" },
}

export default function ResearchLayout({ children }: { children: ReactNode }) {
  return children
}
