import type { Metadata } from "next"
import "@fontsource/noto-sans-sc/400.css"
import "@fontsource/noto-sans-sc/600.css"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/providers"
import { AppShell } from "@/components/layout/app-shell"
import { ConvexAuthClientProvider } from "@/lib/convex-client"
import { siteUrl } from "@/lib/site-url"
import { Suspense } from "react"

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "北京大学人工智能研究院综合服务系统 | Artificial Intelligence Agora",
    template: "%s | Artificial Intelligence Agora",
  },
  description: "The Integrated Services Platform of PKU IAI — 北京大学人工智能研究院综合服务系统。",
  keywords: ["人工智能", "北京大学", "北京大学人工智能研究院", "AIA", "Artificial Intelligence Agora", "PKU IAI"],
  authors: [{ name: "北京大学人工智能研究院" }],
  icons: { icon: "/brand/aia/aia-seal.png" },
  openGraph: {
    title: "北京大学人工智能研究院综合服务系统 | Artificial Intelligence Agora",
    description: "The Integrated Services Platform of PKU IAI",
    url: "/",
    siteName: "Artificial Intelligence Agora",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Artificial Intelligence Agora | PKU IAI",
    description: "The Integrated Services Platform of PKU IAI",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexAuthClientProvider>
            <Suspense fallback={<main>{children}</main>}>
              <AppShell>{children}</AppShell>
            </Suspense>
          </ConvexAuthClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
