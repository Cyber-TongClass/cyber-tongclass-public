import { redirect } from "next/navigation"

export default function LegacyAdminPermissionsPage() {
  redirect("/platform/permissions")
}
