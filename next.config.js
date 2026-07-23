/** @type {import('next').NextConfig} */
const cspConnectSources = ["'self'"]
const cspScriptSources = ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"]
if (process.env.NODE_ENV === "development") cspScriptSources.push("'unsafe-eval'")
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
if (convexSiteUrl) cspConnectSources.push(convexSiteUrl)
if (convexUrl) {
  cspConnectSources.push(convexUrl)
  try {
    const convexWebSocketUrl = new URL(convexUrl)
    convexWebSocketUrl.protocol = convexWebSocketUrl.protocol === "https:" ? "wss:" : "ws:"
    cspConnectSources.push(convexWebSocketUrl.origin)
  } catch {
    // Ignore an invalid Convex URL; the client will report its configuration error.
  }
}
const r2Endpoint = process.env.R2_ENDPOINT
if (r2Endpoint) {
  try {
    cspConnectSources.push(new URL(r2Endpoint).origin)
  } catch {
    // ignore invalid R2 endpoint env
  }
}
const r2AccountId = process.env.R2_ACCOUNT_ID
if (r2AccountId) {
  cspConnectSources.push(`https://${r2AccountId}.r2.cloudflarestorage.com`)
}

// PDF routes load these assets with fs.readFile at runtime. Explicit tracing is
// required so Vercel includes them in each corresponding Serverless function.
const academicExchangePdfRuntimeAssets = [
  "./public/templates/academic-exchange-application-form-template.pdf",
  "./public/fonts/FZFSK.TTF",
  "./public/fonts/FZSSK.TTF",
  "./public/fonts/FZHTK.TTF",
  "./public/fonts/FZKTK.TTF",
]
const academicExchangePdfRoutes = [
  "/api/intranet/academic-exchange/*/pdf",
  "/api/reviewer/academic-exchange/*/pdf",
  "/api/reviewer/academic-exchange/export",
]
const outputFileTracingIncludes = Object.fromEntries(
  academicExchangePdfRoutes.map((route) => [route, academicExchangePdfRuntimeAssets])
)

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      `script-src ${cspScriptSources.join(' ')}`,
      // Next.js dev mode uses webpack-hmr; allow ws: only in development.
      "style-src 'self' 'unsafe-inline'",
      `connect-src ${cspConnectSources.join(' ')} https://challenges.cloudflare.com`,
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
]

const nextConfig = {
  // Produce a standalone build output so Docker can copy the standalone server
  // into the final image (creates `.next/standalone`).
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  reactStrictMode: true,
  outputFileTracingIncludes,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  // Note: Next.js no longer supports an `eslint` key in `next.config.js`.
  // ESLint should be handled via CI or the `next lint` command.
  typescript: {
    // Ignore TypeScript errors in production builds
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
