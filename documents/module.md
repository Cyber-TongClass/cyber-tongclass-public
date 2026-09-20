# 项目模块说明

> 与 `cyber-tongclass-public/main` 对齐于 2026-08-19。代码和 `convex/schema.ts` 是最终事实来源。

## 总体架构

项目是一个 Next.js + Convex 全栈单体应用。页面、HTTP Route Handler 和服务端文档生成位于 Next.js；数据、权限校验、实时查询和文件元数据位于 Convex。

```text
浏览器
├── Next.js 页面与组件
│   └── src/lib/api.ts → Convex React hooks
└── Next.js /api Route Handlers
    ├── ConvexHttpClient → Convex
    └── 邮件、Turnstile、PDF、ZIP、XLSX

Convex
├── schema 与业务函数
├── authSessions / techDaySessions / reviewerSessions
└── R2 签名上传与 Convex Storage（按业务策略使用）
```

## 路由模块

| 模块 | 主要路由 | 访问范围 |
|---|---|---|
| 公开门户 | `/`、`/about`、`/news`、`/members`、`/publications`、`/resources` | 公开 |
| 主站账号 | `/login`、`/settings`、`/my-publications` | 主站成员 |
| 课程与活动 | `/courses`、`/events` | 主站成员 |
| 通班内网 | `/intranet/*` | 主站成员 |
| 管理后台 | `/admin/*` | admin / super_admin，部分子系统有附加角色 |
| TechDay | `/techday/*` | 公开浏览、主站成员或 TechDay-only 账号 |
| Reviewer | `/reviewer/*` | 独立 Reviewer 账号 |
| 服务端 API | `/api/*` | 按端点验证主站 token 或 Reviewer Cookie |

## 身份边界

### 主站身份

- 登录入口：`src/app/login/page.tsx`
- 客户端状态：`src/lib/hooks/use-auth.ts`
- 会话表：`authSessions`
- 会话 token 存储键：`tongclass_session_token`
- 受保护页面通过 `MemberOnlyGuard` 或管理后台 Layout 控制展示。

### TechDay 身份

- 支持主站会话映射和独立 TechDay 会话。
- 客户端参数由 `useTechDayActorArgs()` 统一读取。
- 服务端权限核心位于 `convex/techday/lib.ts`。
- 角色包括 author、volunteer、reviewer 和 admin。

### Reviewer 身份

- 与 TechDay reviewer 不同，是学术交流报销审核的独立账号域。
- Next.js API 将 Reviewer session 写入 HttpOnly Cookie。
- 页面只通过 `/api/reviewer/*` 获取审核数据和下载文件。

## 数据访问约定

- React 页面和组件统一从 `src/lib/api.ts` 引入 Hook。
- 不在组件内直接使用 `convex/react` 或 `convex/_generated/api`。
- Next.js Route Handler 使用 `src/lib/server/convex-http.ts`。
- `src/lib/hooks/use-news.ts` 等文件属于遗留兼容层，不用于新代码。
- `convex/_generated/` 不提交，由 `npx convex codegen` 或 `npm run build` 生成。

## 业务域与数据表

| 业务域 | 关键表 |
|---|---|
| 用户与认证 | `users`、`authCredentials`、`authSessions`、`emailVerifications` |
| 内容 | `news`、`events`、`publications`、`publicationVenues` |
| 课程评价 | `courses`、`courseReviews`、`reviewTags`、`contentVotes` |
| 先导课资源 | `tongInitCourseResources` |
| 内网 | `treeholePosts`、`treeholeReplies`、`feedbackEntries` |
| OA 与报销 | `oaForms`、`oaFormSubmissions`、`studentFormProfiles`、`academicExchangeSupportApplications`、`reimbursementMaterialTables` |
| Reviewer | `reviewerAccounts`、`reviewerSessions`、`reviewerAuditLogs` |
| TechDay | `techDayUsers`、`techDaySubmissions`、`techDayReimbursements`、`techDayAwards`、`techDayPosts` 等 |
| 挑战赛 | `cc2026Store` |

## 文件上传与导出

通用上传链路由各业务选择 R2 预签名 PUT URL 或 Convex Storage POST URL，浏览器统一通过 `src/lib/file-upload.ts` 上传。

先导课资源是严格 R2 流程，不会回退到 Convex Storage：

1. admin / super_admin 在 `/admin/resources/tong-init-course` 选择白名单文件并填写展示信息。
2. `adminBeginUpload` 创建带内容类型和下载文件名约束的 R2 预签名目标；浏览器直传 R2。
3. `adminFinalizeUpload` 用 HEAD 核对 staging 对象的大小、MIME 和 ETag，再通过带源 ETag 条件的 CopyObject 复制到一个从未签发 PUT URL 的 final key；旧 PUT URL 无法覆盖 final 对象。
4. final 对象校验通过后写入草稿快照；`adminPublish` 原子替换公开快照，归档只隐藏资源，不物理删除 R2 对象。
5. 公开页面使用稳定的站内下载路由，点击时才生成短时 R2 签名地址并 `307` 跳转。

`public/resources/tong-init-course/` 仅保留历史静态文件。幂等的后台初始化操作可将其登记为兼容资源。

学术交流申请的 PDF 由 Next.js Node runtime 生成。模板和字体通过 `next.config.js` 的 `outputFileTracingIncludes` 显式加入 serverless/standalone 构建。

## 关键目录

```text
src/app/                 路由、Layout、页面与 HTTP API
src/components/ui/       UI 基础组件
src/components/*/        OA、TechDay、Markdown、报销等领域组件
src/lib/api.ts           前端 Convex 访问入口
src/lib/server/          仅服务端工具
src/types/               前端共享类型
convex/schema.ts         数据模型
convex/*.ts              主站业务函数
convex/techday/          TechDay 业务函数
public/resources/        历史静态课程资源（兼容回退）
scripts/                 手动迁移与回归脚本
```

## 变更边界

- `convex/` 默认只读，后端变更需维护者明确授权。
- 批量写入必须幂等，迁移脚本必须手动触发。
- 不得把迁移或数据修复挂到 `dev`、`build`、`start` 生命周期。
- 生产部署必须由用户明确指定，不能自行给 Convex 命令追加 `--prod`。
