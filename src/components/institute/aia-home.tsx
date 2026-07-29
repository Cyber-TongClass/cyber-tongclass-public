import { AIAHero } from "@/components/institute/aia-hero"
import { HomeLiveResearch } from "@/components/institute/home-live-research"
import { HomeLiveUpdates } from "@/components/institute/home-live-updates"
import { InstituteDirectoryPreview } from "@/components/institute/institute-directory-preview"
import { TongClassPeopleBand } from "@/components/institute/tong-class-people-band"

export function AIAHome() {
  return (
    <div className="min-h-screen">
      <AIAHero />
      <TongClassPeopleBand />
      <HomeLiveUpdates />
      <HomeLiveResearch />
      <InstituteDirectoryPreview />
    </div>
  )
}
