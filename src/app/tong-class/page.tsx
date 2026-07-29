import type { Metadata } from "next"

import TongClassHomeClient from "@/components/tong-class/tong-class-home-client"

export const metadata: Metadata = {
  alternates: { canonical: "/tong-class" },
}

export default function TongClassPage() {
  return <TongClassHomeClient />
}
