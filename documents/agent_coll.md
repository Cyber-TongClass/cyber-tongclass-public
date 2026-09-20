# Agent Collaboration

本文档记录项目中多个 Agent 的分工与协作。

---

## 项目概述

- **项目名称**: tongclass.ac.cn (通班官方网站)
- **技术栈**: Next.js + Shadcn/UI + Convex
- **设计风格**: Yale (简洁、学术、 premium)

---

## 当前进度

### 已完成

1. **项目初始化** (本 Agent)
   - Git 仓库设置
   - 项目结构创建
   - 配置文件 (package.json, tsconfig.json, tailwind.config.ts 等)
   - 设计系统 (Yale-inspired colors, typography, spacing)
   - 基础 UI 组件 (Button, Card, Input, Sheet, DropdownMenu)
   - 布局组件 (Navbar, Footer)
   - 首页开发
   - Convex 后端 schema 和 API 函数
   - 文档文件 (api.md, tools.md, user_pipe.md, module.md)

---

## 分工建议

### Agent 1: 前端 UI 开发 (已认领 ✅ - Agent 9)
**认领时间**: 2026-02-21
**状态**: 开发中
**职责**:
- 完成所有页面组件开发
- 实现响应式设计
- UI/UX 优化

**已完成任务**:
- [x] `/members` 成员列表页 - `src/app/members/page.tsx`
- [x] `/members/[id]` 成员详情页 - `src/app/members/[id]/page.tsx`
- [x] `/publications` 成果列表页 (由其他 Agent 完成)
- [x] `/publications/[id]` 成果详情页 (由其他 Agent 完成)
- [x] `/news` 新闻列表页 (由其他 Agent 完成)
- [x] `/news/[id]` 新闻详情页 (由其他 Agent 完成)
- [x] `/events` 活动列表页 (由其他 Agent 完成)
- [x] `/events/[id]` 活动详情页 (由其他 Agent 完成)
- [x] `/resources` 资源页 (由其他 Agent 完成)
- [x] `/resources/courses/[name]` 课程详情页 (由其他 Agent 完成)
- [x] `/about` 关于页 (由其他 Agent 完成)

**当前进度**: 成员页面开发完成

### Agent 2: 认证与用户系统
**职责**:
- Convex Auth 集成
- 登录/注册流程
- 用户权限控制

**待完成任务**:
- 登录页面 (`/login`)
- 注册页面 (`/register`)
- 用户设置页面 (`/settings`)
- 权限中间件
- 高危操作二次确认组件

### Agent 3: 管理后台
**职责**:
- Admin Dashboard
- 内容管理系统
- 数据导入导出

**待完成任务**:
- `/admin` Dashboard
- `/admin/users` 用户管理
- `/admin/news` 新闻管理
- `/admin/events` 活动管理
- `/admin/reviews` 课程测评
- 数据导入功能

### Agent 4: 部署与运维 ✅
**状态**: 已完成
**Agent**: Agent 4 (本人)
**职责**:
- Docker 配置
- CI/CD
- 环境变量管理

**已完成任务** (2026-02-21):
- [x] Dockerfile
- [x] docker-compose.yml
- [x] GitHub Actions CI/CD
- [x] Env 文件 (dev, local, production)
- [x] Nginx 配置

**相关文件**:
- `Dockerfile` - Docker 镜像构建
- `docker-compose.yml` - Docker 编排
- `.github/workflows/ci-cd.yml` - CI/CD 自动化
- `deployments/` - 环境配置文件
- `nginx.conf` - Nginx 配置

---

## 工作流程

### Feature Branch 工作流

1. **开始新任务**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/xxx
   ```

2. **开发完成**
   ```bash
   git add .
   git commit -m "feat: add xxx"
   git push origin feature/xxx
   ```

3. **合并到 develop**
   ```bash
   git checkout develop
   git merge feature/xxx
   git push origin develop
   ```

---

## 协作规范

1. **代码风格**: 遵循 ESLint 配置
2. **组件命名**: PascalCase (如 `Navbar.tsx`)
3. **工具函数**: camelCase (如 `formatDate.ts`)
4. **样式**: 使用设计系统颜色和间距
5. **提交信息**: 遵循 Conventional Commits
   - `feat:` 新功能
   - `fix:` Bug 修复
   - `docs:` 文档更新
   - `style:` 样式调整
   - `refactor:` 代码重构

---

## 文件引用

### 核心文件

| 文件 | 描述 |
|------|------|
| `src/styles/design-system.ts` | 设计系统 |
| `src/styles/globals.css` | 全局样式 |
| `src/components/ui/` | UI 组件库 |
| `src/components/layout/` | 布局组件 |
| `convex/schema.ts` | 数据库 Schema |
| `convex/*.ts` | API 函数 |
| `documents/` | 项目文档 |

---

## 后续更新

请在本文件末尾 append 你的分工和进度。

---

## Agent 7: 前端 UI 开发 (已认领 ✅)

**认领时间**: 2026-02-21

**职责范围**:
- 完成前端页面组件开发
- 实现响应式设计 (桌面端/移动端适配)
- UI/UX 优化 (Yale 风格)

**任务清单**:
| 任务 | 状态 |
|------|------|
| 成员列表页 (`/members`) | ✅ 已完成 |
| 成员详情页 (`/members/[id]`) | ✅ 已完成 |
| 成果列表页 (`/publications`) | ✅ 已完成 |
| 成果详情页 (`/publications/[id]`) | ✅ 已完成 |
| 新闻列表页 (`/news`) | ✅ 已完成（其他agent） |
| 新闻详情页 (`/news/[id]`) | ✅ 已完成（其他agent） |
| 活动列表页 (`/events`) | ✅ 已完成（其他agent） |
| 活动详情页 (`/events/[id]`) | 待开始 |
| 日历视图 | 待开始 |
| 资源页 (`/resources`) | 待开始 |
| 课程详情页 (`/resources/courses/[name]`) | 待开始 |
| 关于页 (`/about`) | 待开始 |

**当前进度**: 成果页面已完成，继续下一个任务

---

## Agent Codex: Feature Audit & Completion Patch (2026-02-21)

**职责范围**:
- 对照 `README.md` 与 `prompt.md` 进行功能核对
- 修复阻塞构建/运行的问题
- 补齐关键缺失功能

**完成内容**:
- [x] 修复构建阻塞：移除线上字体依赖、修复全局 CSS 变量错误、修复 `convex/users.ts` 语法错误
- [x] 完成首页轮播 Banner（自动轮播 + 手动切换）
- [x] 完成活动页日历视图（按日期展示彩色 event block，可跳转详情）
- [x] 完成本地可用注册/登录/会话/设置流程（`src/lib/mock-auth.ts`）
- [x] 导航栏登录态切换（登录按钮 ⇄ 头像菜单）并加入资源页登录门禁
- [x] 管理后台高危操作二次确认弹窗（用户/新闻/活动/评测删除与课程测评）
- [x] 补充路由：`/users`、`/users/[id]`（兼容 alias）、`/forgot-password`、`/admin/settings`
- [x] 去除 About 页 emoji，占位统一为图标

**主要文件引用**:
- `src/app/page.tsx`
- `src/app/events/page.tsx`
- `src/components/layout/navbar.tsx`
- `src/lib/mock-auth.ts`
- `src/lib/hooks/use-auth.ts`
- `src/app/register/page.tsx`
- `src/app/login/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/resources/page.tsx`
- `src/app/resources/courses/[name]/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/news/page.tsx`
- `src/app/admin/events/page.tsx`
- `src/app/admin/reviews/page.tsx`
- `src/components/ui/dialog.tsx`
- `src/app/layout.tsx`
- `src/styles/globals.css`
