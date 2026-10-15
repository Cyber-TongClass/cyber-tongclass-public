import type { Metadata } from "next"
import { CreativeChallengeShowcase } from "@/components/creative-apps/creative-challenge-showcase"

export const metadata: Metadata = {
  title: "创意开发挑战赛 2026 | Tong Class",
  description: "通班同学2026创意挑战赛中的优秀作品。",
}

export default function IntranetCreativeChallengeShowcasePage() {
  return <CreativeChallengeShowcase />
}
