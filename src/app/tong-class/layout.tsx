import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Tong Class",
  description: "Tong Class undergraduate artificial intelligence program.",
}

export default function TongClassLayout({ children }: { children: ReactNode }) {
  return children
}
