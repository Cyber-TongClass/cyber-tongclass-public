import { AIAHero } from "@/components/institute/aia-hero"
import { HomeLiveUpdates } from "@/components/institute/home-live-updates"

export function AIAHome() {
  return (
    <div className="min-h-screen">
      <AIAHero />
      <HomeLiveUpdates />
    </div>
  )
}
