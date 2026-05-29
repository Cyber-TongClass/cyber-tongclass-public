import type { Metadata } from "next"
import Script from "next/script"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/providers"
import { AppShell } from "@/components/layout/app-shell"
import { ConvexAuthClientProvider } from "@/lib/convex-client"

export const metadata: Metadata = {
  title: "通班官方网站 | Tong Class",
  description: "北京大学 & 清华大学 通用人工智能实验班官方网站",
  keywords: ["人工智能", "通班", "PKU", "THU", "AI", "Machine Learning"],
  authors: [{ name: "Tong Class" }],
  icons: {icon: "/logo.png"},
  openGraph: {
    title: "通班官方网站 | Tong Class",
    description: "北京大学 & 清华大学 通用人工智能实验班官方网站",
    url: "https://tongclass.ac.cn",
    siteName: "Tong Class",
    locale: "zh_CN",
    type: "website",
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
