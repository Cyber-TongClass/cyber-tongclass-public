/** @type {import('next').NextConfig} */
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
  // Note: Next.js no longer supports an `eslint` key in `next.config.js`.
  // ESLint should be handled via CI or the `next lint` command.
  typescript: {
    // Ignore TypeScript errors in production builds
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
