import type { Metadata } from "next"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/providers"
import { AppShell } from "@/components/layout/app-shell"
import { ConvexAuthClientProvider } from "@/lib/convex-client"
import { siteUrl } from "@/lib/site-url"
import { Suspense } from "react"
import { siteCopy } from "@/config/site-copy"

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteCopy.metadata.title,
    template: siteCopy.metadata.titleTemplate,
  },
  description: siteCopy.metadata.description,
  keywords: [...siteCopy.metadata.keywords],
  authors: [{ name: siteCopy.metadata.author }],
  icons: { icon: "/brand/aia/aia-seal.png" },
  openGraph: {
    title: siteCopy.metadata.title,
    description: siteCopy.metadata.shortDescription,
    url: "/",
    siteName: siteCopy.metadata.siteName,
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteCopy.metadata.twitterTitle,
    description: siteCopy.metadata.shortDescription,
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
