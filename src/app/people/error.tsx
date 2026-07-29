"use client"

import { RouteErrorState } from "@/components/navigation/route-error-state"

export default function PeopleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState reset={reset} fallbackHref="/" fallbackLabel="返回 AIA 首页" contextLabel="People" />
}
