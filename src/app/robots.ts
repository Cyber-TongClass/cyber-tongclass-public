import { MetadataRoute } from 'next'
import { absoluteSiteUrl } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        "/admin",
        "/api",
        "/account",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/notifications",
        "/portal",
        "/verify-email",
        "/settings",
        "/search",
        "/reviewer",
        "/techday",
        "/tong-class/intranet",
        "/tong-class/courses",
        "/tong-class/events",
        "/services/coffee-talk/apply",
        "/services/coffee-talk/manage",
        "/services/coffee-talk/my",
        "/services/oa/approvals",
        "/services/oa/my",
        "/services/oa/submissions",
      ],
    },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  }
}
