import type { Metadata } from "next"
import Script from "next/script"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/providers"
import { AppShell } from "@/components/layout/app-shell"
import { ConvexAuthClientProvider } from "@/lib/convex-client"
import { siteUrl } from "@/lib/site-url"

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "北京大学人工智能研究院综合服务系统 | Artificial Intelligence Agora",
    template: "%s | Artificial Intelligence Agora",
  },
  description: "The Integrated Services Platform of PKU IAI — 北京大学人工智能研究院综合服务系统。",
  keywords: ["人工智能", "北京大学", "北京大学人工智能研究院", "AIA", "Artificial Intelligence Agora", "PKU IAI"],
  authors: [{ name: "北京大学人工智能研究院" }],
  alternates: {
    canonical: "/",
  },
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
        <Script id="mathjax-config" strategy="beforeInteractive">
          {`
            window.MathJax = {
              tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true
              },
              options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
              }
            };
          `}
        </Script>
        <Script
          id="mathjax-runtime"
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="afterInteractive"
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexAuthClientProvider>
            <AppShell>{children}</AppShell>
          </ConvexAuthClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
