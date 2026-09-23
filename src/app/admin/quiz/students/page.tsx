"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useAdminData,
  Message,
  message,
  fieldClass,
} from "@/components/admin/quiz/shared";
export default function Page() {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const { data, error, refresh, call } = useAdminData("students", {
    search,
    paginationOpts: { cursor, numItems: 30 },
  });
  const catalog = useAdminData("catalog");
  const [roster, setRoster] = useState("");
  const [course, setCourse] = useState("");
  const [note, setNote] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  async function run(dryRun: boolean) {
    setBusy(true);
    setFailure("");
    setNote("");
    try {
      const rows = roster
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const parts = line.trim().split(/[,，\t]/);
          if (parts.length !== 2)
            throw new Error("每行格式：学号,姓名；不含表头");
          return { studentId: parts[0].trim(), name: parts[1].trim() };
        });
      if (!roster.trim() || rows.length > 100)
        throw new Error("每次输入1–100名学生");
      const r = await call("provision", {
        rows,
        ...(course ? { course } : {}),
        dryRun,
      });
      setNote(
        `${dryRun ? "预览" : "已完成"}：新建 ${r.created} 人，更新 ${r.updated} 人。${dryRun ? "确认后点击执行导入。" : "请在账号详情生成激活码。"}`,
      );
      setPreview(dryRun);
      if (!dryRun) refresh();
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <Message error={error || catalog.error || failure} note={note} />
      <section className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="text-lg font-bold">新建 / 导入课程账号</h2>
        <label className="block text-sm">
          名单（每行：学号,姓名；最多100人）
          <textarea
            className={`${fieldClass} mt-2 h-28`}
            value={roster}
            onChange={(e) => {
              setRoster(e.target.value);
              setPreview(false);
            }}
            placeholder="20260001,张同学"
          />
        </label>
        <label className="block text-sm">
          同时分配课程
          <select
            className={`${fieldClass} mt-2`}
            value={course}
            onChange={(e) => {
              setCourse(e.target.value);
              setPreview(false);
            }}
          >
            <option value="">仅创建账号</option>
            {catalog.data?.courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title} · {c.term}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void run(true)}
          >
            预览变更
          </Button>
          <Button disabled={busy || !preview} onClick={() => void run(false)}>
            执行导入
          </Button>
        </div>
      </section>
      <label className="block text-sm">
        筛选学号 / 姓名
        <input
          className={`${fieldClass} mt-2`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCursor(null);
          }}
        />
      </label>
      <p className="text-xs text-slate-500">
        筛选按分页扫描；当前页无结果时可继续下一页。
      </p>
      <div className="divide-y rounded-xl border bg-white">
        {data?.page.map((u) => (
          <Link
            key={u.id}
            href={`/admin/quiz/students/${u.id}`}
            className="flex justify-between gap-4 p-4 hover:bg-slate-50"
          >
            <span>
              {u.name}{" "}
              <span className="ml-2 text-slate-500">{u.studentId}</span>
            </span>
            <span>{u.status === "active" ? "已启用" : "已停用"} →</span>
          </Link>
        ))}
        {data && !data.page.length && (
          <p className="p-4 text-slate-500">当前页无匹配账号。</p>
        )}
      </div>
      <div className="flex gap-3">
        {cursor && (
          <Button variant="outline" onClick={() => setCursor(null)}>
            第一页
          </Button>
        )}
        {data && !data.isDone && (
          <Button onClick={() => setCursor(data.continueCursor)}>下一页</Button>
        )}
        <Button variant="outline" onClick={refresh}>
          刷新
        </Button>
      </div>
    </div>
  );
}
