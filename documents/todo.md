# 当前维护清单

> 更新于 2026-08-19。历史设计和实施记录保存在 `docs/superpowers/`；本文件只记录尚未完成或需要持续维护的工作。

## 已完成的当前基线

- [x] Next.js App Router、Tailwind 和本地 UI 组件。
- [x] Convex 数据层和主站成员会话。
- [x] 新闻、成员、成果、课程评价和活动页面。
- [x] 内网树洞、反馈、OA 表单和学术交流报销。
- [x] 独立 Reviewer 门户。
- [x] TechDay 投稿、作品、奖项、报销和新闻子系统。
- [x] R2 上传与 Convex Storage 回退。
- [x] Docker standalone 构建和 `/api/health` 健康检查。
- [x] GitHub Actions lint、typecheck、build 和镜像部署流程。
- [x] ToNG 第 0–3 讲课件及第 3 讲练习包。
- [x] ToNG 先导课后台 R2 直传、草稿发布、原子替换和归档。

## P0：安全与数据边界

- [ ] 由后端维护者审计所有公开 Convex mutation/query 的服务端鉴权。
- [ ] 核对 `src/lib/api.ts` 附加的 session 参数与每个 Convex 参数校验器是否一致。
- [ ] 为主站、TechDay、Reviewer 三套会话补充权限回归测试。
- [ ] 确认账号 CSV、恢复密码文件和本地迁移脚本不会进入 Git。

`convex/` 默认只读；以上后端任务必须获得维护者明确授权后实施。

## P1：可靠性

- [ ] 建立正式的单元测试和 E2E 测试目录；现有 `scripts/test-*.mjs` 仅覆盖少量回归场景。
- [ ] 覆盖登录、成员门禁、管理员权限、OA 提交、Reviewer 下载和 TechDay 投稿主路径。
- [ ] 增加部署后的健康检查和关键 API 监控。
- [ ] 增加先导课 R2 孤儿对象盘点/清理工具（仅手动运行，默认不物理删除）。
- [ ] 决定是否恢复完整自助密码重置；在页面和 Route Handler 完成前保持未公开状态。

## P1：代码维护

- [ ] 按业务域拆分体积较大的 `src/lib/api.ts`，同时保留兼容出口。
- [ ] 清理未使用的 `src/lib/hooks/use-news.ts` 等遗留 Hook。
- [ ] 清理未被页面引用的列表组件和已停用的注册客户端。
- [ ] 逐步减少公开页面的 Client Component 比例，改善首屏与 SEO。

## P2：体验与性能

- [ ] 审计 `public/fonts/` 和大型静态资源，减少镜像和部署体积。
- [ ] 为新闻、成员和成果页面补充更完整的 metadata。
- [ ] 完成键盘导航、焦点顺序、色彩对比度和 reduced-motion 检查。
- [x] 为先导课资料增加文件类型和大小展示。
- [ ] 为先导课公开页补充更新时间展示。

## 依赖维护原则

- 使用 `npm outdated` 定期审计依赖。
- 普通维护只升级当前 semver 范围内版本。
- React、Next.js、Tailwind 等 major 升级必须单独建任务并验证迁移文档。
- 每次变更依赖都提交 `package.json` 和 `package-lock.json`，并运行：

```bash
npm ci
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## 2026-08-19 同步记录

- 本地 `main` 已快进到 `cyber-tongclass-public/main` 的 `b4c2781`。
- 补齐 CI 工作流、第 2/3 讲课件和第 3 讲练习包。
- 更新 README、模块、工具、API、邮件和课程资源文档。
- 移除无源码引用的直接依赖，并把代码高亮库声明为直接依赖。
- 新增先导课资源后台，新文件改为私有 R2 直传，不再通过 Git push 更新。
