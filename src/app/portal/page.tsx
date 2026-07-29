import { redirect } from "next/navigation"

type PortalSearchParams = Record<string, string | string[] | undefined>

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<PortalSearchParams>
}) {
  const received = await searchParams
  const forwarded = new URLSearchParams()

  for (const [key, rawValue] of Object.entries(received)) {
    if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(key)) continue
    const values = Array.isArray(rawValue) ? rawValue : [rawValue]
    for (const value of values.slice(0, 10)) {
      if (typeof value === "string") forwarded.append(key, value.slice(0, 500))
    }
  }

  const query = forwarded.toString()
  redirect(`/portal/list${query ? `?${query}` : ""}`)
}
