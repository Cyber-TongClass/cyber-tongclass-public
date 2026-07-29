import type { Metadata } from "next"
import { AIAHome } from "@/components/institute/aia-home"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default function HomePage() {
  return <AIAHome />
}
