"use client"

import { RouteErrorState } from "@/components/navigation/route-error-state"

export default function OAError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState reset={reset} fallbackHref="/services/oa" fallbackLabel="返回 OA 服务" contextLabel="OA" />
}
