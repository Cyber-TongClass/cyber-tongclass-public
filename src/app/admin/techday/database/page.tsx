"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminTechDayDatabasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">TechDay 数据维护</h1>
        <p className="mt-2 text-sm text-slate-600">旧平台的任意 SQL 数据库控制台不会原样迁入。数据迁移和批量导入通过受控脚本执行。</p>
      </div>
      <Card>
        <CardHeader><CardTitle>安全策略</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm leading-6 text-slate-600">
          <p>Convex 版本只保留 scoped maintenance 能力：用户、方向、组织、奖项、邀请码、投稿和报销都在各自后台页面维护。</p>
          <p>生产环境不提供任意表删除、任意行写入或通用 CSV 覆盖导入入口。</p>
        </CardContent>
      </Card>
    </div>
  )
}
