import type { Metadata } from "next"
import Link from "next/link"
import { TongxiaomiaoGallery } from "@/components/creative-apps/tongxiaomiao-gallery"

export const metadata: Metadata = {
  title: "通小喵案例画廊 | Tong Class",
  description: "通小喵案例画廊：角色图、动作参考、提示词与成图案例。",
}

export default function TongxiaomiaoShowcasePage() {
  return (
    <div className="min-h-screen bg-[#f5f2eb] px-5 py-8 text-[#193f63] sm:px-8 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between text-sm text-[#193f63]">
          <Link href="/intranet/apps/creative-challenge-2026" className="underline decoration-[#193f63]/40 underline-offset-4 hover:decoration-[#193f63]">
            返回内网
          </Link>
        </div>
        <TongxiaomiaoGallery project={{ githubUrl: "https://github.com/look-dyz/tongtong" }} />
      </div>
    </div>
  )
}
