import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "站内搜索",
  robots: { index: false, follow: false },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
