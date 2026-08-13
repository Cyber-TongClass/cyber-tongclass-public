# 论文作者关系迁移（仅手动、本地）

该迁移只解析旧作者快照中明确的站内 `userId`，不会按姓名猜测教师。它与 `dev`、`build`、`start`、`postinstall`、CI 和部署完全解耦。

1. 先确认当前 Convex 是本机开发实例，且环境中没有 `CONVEX_DEPLOYMENT=prod:*`。严禁连接 Silverfish 或任何生产实例。
2. 运行 `node --test scripts/test-publication-authorship-migration.mjs`，审阅分类规则。
3. 先用 `numItems:10` 手动执行 `npx convex run publicationAuthorshipMigration:backfillBatch`，不要添加 `--prod`。
4. 保存每批返回的 `conflicts`，并把 `nextCursor` 原样传给下一批；`isDone` 为 true 后停止。
5. 重跑同一游标是安全的：写入前按 deterministic natural key 查询，已有正确关系计为 `unchanged`。

实现阶段不执行上述 mutation；是否迁移及冲突处理由维护者在本地预检后决定。
