import type { Metadata } from "next"
import Link from "next/link"
import { TongxiaomiaoGallery } from "@/components/creative-apps/tongxiaomiao-gallery"

export const metadata: Metadata = {
  title: "通小喵案例画廊 | Tong Class",
  description: "通小喵案例画廊：角色图、动作参考、提示词与成图案例。",
}

export default function TongxiaomiaoShowcasePage() {
  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between text-sm text-primary">
          <Link href="/intranet/apps/creative-challenge-2026" className="underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
            返回内网
          </Link>
        </div>
        <TongxiaomiaoGallery project={{ githubUrl: "https://github.com/look-dyz/tongtong" }} />
      </div>
    </div>
  )
}
