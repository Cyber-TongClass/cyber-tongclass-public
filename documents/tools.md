# 技术栈与工具

> 当前版本说明，更新于 2026-08-19。精确版本以 `package-lock.json` 为准。

## 核心运行时

| 层 | 工具 | 说明 |
|---|---|---|
| Web | Next.js 16 App Router | 页面、Layout、Route Handler、standalone 构建 |
| UI | React 18 + TypeScript | 客户端交互与严格类型检查 |
| 数据 | Convex | Schema、实时查询、mutation、会话和存储 |
| 样式 | Tailwind CSS 3 + Radix UI | CSS 变量主题和本地 UI 原语 |
| 部署 | Docker + Nginx + GitHub Actions | 镜像构建、反向代理和自动部署 |

最低运行版本：Node.js 24.14.0、npm 11.9.0。

## 前端组件

- `src/components/ui/`：Button、Card、Dialog、Dropdown、Select、Sheet、Table、Tabs 等本地组件。
- `lucide-react`：统一图标来源。
- `class-variance-authority`、`clsx`、`tailwind-merge`：组件变体和 class 合并。
- `next-themes`：class 模式的浅色/深色主题容器。

## Markdown 与数学公式

- `react-markdown`：Markdown 渲染。
- `remark-gfm`：表格、任务列表等 GFM 语法。
- `remark-math` + `rehype-katex` + `katex`：数学公式。
- `rehype-highlight` + `highlight.js`：代码高亮。
- `MarkdownSplitEditor`：项目自有的编辑/预览组件，不依赖第三方富文本编辑器。

## PDF、表格和邮件

- `pdf-lib` + `@pdf-lib/fontkit`：学术交流申请 PDF 生成和中文字体嵌入。
- `src/lib/server/simple-xlsx.ts`：轻量 XLSX 生成。
- `src/lib/server/simple-zip.ts`：批量导出 ZIP。
- `nodemailer`：SMTP 邮件发送。
- `mailtrap`：配置 token 时优先走 Mailtrap API。

## 文件存储

上传入口统一接受两种目标：

- Cloudflare R2 预签名 PUT URL；
- Convex Storage POST URL。

是否允许回退由业务决定。学术交流论文、OA 附件、TechDay 海报和 TechDay 报销附件保留原有策略；ToNG 先导课资源要求 R2 已配置，不使用 Convex Storage 回退。

先导课文件限定为 PDF、PPTX、DOCX、XLSX、ZIP/TAR.GZ/TGZ、IPYNB、MD/TXT/CSV/JSON 和 PNG/JPG/JPEG/WebP，并按类型设置 25–300 MB 上限。上传期限按文件大小估算（15–120 分钟）；上传完成后使用 R2 HEAD 校验大小、MIME 和 ETag，再条件复制到不可被原 PUT URL 覆盖的 final key。公开下载是私有 bucket 的点击时短签名链接。

## 数据访问

- 客户端页面：从 `src/lib/api.ts` 引入 Hook。
- 主站认证状态：`src/lib/hooks/use-auth.ts`。
- 服务端访问 Convex：`src/lib/server/convex-http.ts`。
- 生成类型：`convex/_generated/`，不提交到 Git。

旧的 `src/lib/hooks/use-news.ts`、`use-events.ts` 等文件仅作兼容保留，不应用于新页面。

## 常用命令

```bash
npm ci
npx convex dev
npm run dev
```

质量检查：

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

`npm run build` 已包含 `npx convex codegen`。不要在任何 npm lifecycle 中自动运行迁移脚本。

## 依赖维护

- 依赖安装统一使用 `npm ci`。
- 更新依赖后必须提交 `package.json` 和 `package-lock.json`。
- 不使用 `--force` 或 `--legacy-peer-deps` 绕过 peer dependency 检查。
- React、Next.js、Tailwind、Convex 等跨 major 升级应单独进行，不混入普通内容变更。
- 使用 `npm outdated` 审计可升级版本，并在升级后运行 lint、typecheck 和 build。

## 运维检查

- `GET /api/health`：容器健康检查。
- `.github/workflows/ci-cd.yml`：安装、lint、typecheck、build、Docker 和部署。
- `next.config.js`：standalone 输出与 PDF runtime assets tracing。
- `Dockerfile`：Node 24 多阶段构建。
