import { MetadataRoute } from 'next'
import { absoluteSiteUrl } from "@/lib/site-url"

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const publicRoutes = [
    { pathname: "/", changeFrequency: "weekly", priority: 1 },
    { pathname: "/institute", changeFrequency: "weekly", priority: 0.9 },
    { pathname: "/people", changeFrequency: "weekly", priority: 0.9 },
    { pathname: "/groups", changeFrequency: "weekly", priority: 0.9 },
    { pathname: "/research", changeFrequency: "weekly", priority: 0.8 },
    { pathname: "/updates", changeFrequency: "daily", priority: 0.8 },
    { pathname: "/services", changeFrequency: "weekly", priority: 0.8 },
    { pathname: "/services/coffee-talk", changeFrequency: "weekly", priority: 0.8 },
    { pathname: "/contact", changeFrequency: "monthly", priority: 0.6 },
    { pathname: "/tong-class", changeFrequency: "weekly", priority: 0.8 },
    { pathname: "/tong-class/about", changeFrequency: "monthly", priority: 0.6 },
    { pathname: "/tong-class/members", changeFrequency: "weekly", priority: 0.8 },
    { pathname: "/tong-class/news", changeFrequency: "daily", priority: 0.8 },
    { pathname: "/tong-class/publications", changeFrequency: "weekly", priority: 0.8 },
    { pathname: "/tong-class/resources", changeFrequency: "weekly", priority: 0.7 },
    { pathname: "/tong-class/resources/links", changeFrequency: "monthly", priority: 0.6 },
  ] as const

  return publicRoutes.map(({ pathname, changeFrequency, priority }) => ({
    url: absoluteSiteUrl(pathname),
    lastModified,
    changeFrequency,
    priority,
  }))
}
