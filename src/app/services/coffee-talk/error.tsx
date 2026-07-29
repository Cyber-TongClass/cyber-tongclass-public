"use client"

import { RouteErrorState } from "@/components/navigation/route-error-state"

export default function CoffeeTalkError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState reset={reset} fallbackHref="/services/coffee-talk" fallbackLabel="返回 Coffee Talk" contextLabel="Coffee Talk" />
}
