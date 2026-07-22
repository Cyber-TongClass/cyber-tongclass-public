export type PublicShellKind = "aia" | "tong-class" | "none"

const TONG_CLASS_ROOT = "/tong-class"
const PRIVATE_PRODUCT_ROOTS = ["/admin", "/reviewer", "/techday"] as const

const hasRoutePrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(prefix + "/")

export function getPublicShellKind(pathname: string): PublicShellKind {
  if (PRIVATE_PRODUCT_ROOTS.some((prefix) => hasRoutePrefix(pathname, prefix))) {
    return "none"
  }

  return hasRoutePrefix(pathname, TONG_CLASS_ROOT) ? "tong-class" : "aia"
}

export function tongClassPath(path = "") {
  const normalizedPath = path.replace(/^\/+/, "")

  if (!normalizedPath) {
    return TONG_CLASS_ROOT
  }

  if (normalizedPath === "tong-class" || normalizedPath.startsWith("tong-class/")) {
    return ("/" + normalizedPath).replace(/\/+$/, "") || TONG_CLASS_ROOT
  }

  return (TONG_CLASS_ROOT + "/" + normalizedPath).replace(/\/+$/, "")
}

const tongClassNestedPath = (section: string, path?: string) =>
  tongClassPath(path ? section + "/" + path.replace(/^\/+/, "") : section)

export const tongClassHomePath = () => tongClassPath()
export const tongClassAboutPath = () => tongClassPath("about")
export const tongClassMembersPath = (memberId?: string) => tongClassNestedPath("members", memberId)
export const tongClassNewsPath = (newsId?: string) => tongClassNestedPath("news", newsId)
export const tongClassPublicationsPath = (publicationId?: string) => tongClassNestedPath("publications", publicationId)
export const tongClassResourcesPath = (path?: string) => tongClassNestedPath("resources", path)
export const tongClassCoursesPath = (courseName?: string) => tongClassNestedPath("courses", courseName)
export const tongClassEventsPath = (eventId?: string) => tongClassNestedPath("events", eventId)
export const tongClassIntranetPath = (path?: string) => tongClassNestedPath("intranet", path)
