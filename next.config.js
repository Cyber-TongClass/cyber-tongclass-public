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
const outputFileTracingIncludes = {
  ...Object.fromEntries(
    academicExchangePdfRoutes.map((route) => [route, academicExchangePdfRuntimeAssets])
  ),
  "/api/intranet-materials/*": ["./private/intranet-materials/**/*"],
}

const nextConfig = {
  // Produce a standalone build output so Docker can copy the standalone server
  // into the final image (creates `.next/standalone`).
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
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
  async redirects() {
    return [
      { source: "/resources/courses/:path*", destination: "/tong-class/courses/:path*", permanent: false },
      { source: "/about/:path*", destination: "/tong-class/about/:path*", permanent: false },
      { source: "/members/:path*", destination: "/tong-class/members/:path*", permanent: false },
      { source: "/users", destination: "/tong-class/members", permanent: false },
      { source: "/users/:path*", destination: "/tong-class/members/:path*", permanent: false },
      { source: "/news/:path*", destination: "/tong-class/news/:path*", permanent: false },
      { source: "/publications/:path*", destination: "/tong-class/publications/:path*", permanent: false },
      { source: "/resources/:path*", destination: "/tong-class/resources/:path*", permanent: false },
      { source: "/courses/:path*", destination: "/tong-class/courses/:path*", permanent: false },
      { source: "/events/:path*", destination: "/tong-class/events/:path*", permanent: false },
      { source: "/intranet/:path*", destination: "/tong-class/intranet/:path*", permanent: false },
      // 通班内网表单列表已并入研究院 OA 工作台（同一套 usePublishedOAForms 数据）。
      // 放在遗留重定向之后：test-aia-legacy-redirects 锁定前 11 条顺序。
      { source: "/tong-class/intranet/forms", destination: "/services/oa", permanent: false },
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
