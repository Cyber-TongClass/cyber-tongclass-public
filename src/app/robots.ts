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
        "/verify-email",
        "/settings",
        "/search",
        "/reviewer",
        "/techday",
        "/tong-class/intranet",
        "/tong-class/courses",
        "/tong-class/events",
      ],
    },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  }
}
