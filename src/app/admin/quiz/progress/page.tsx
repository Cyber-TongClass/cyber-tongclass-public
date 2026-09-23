"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useAdminData,
  Message,
  message,
  fieldClass,
} from "@/components/admin/quiz/shared";
import type { QuizProgress, QuizPage } from "@/lib/quiz-contracts";
export default function Page() {
  const [studentId, setStudentId] = useState("");
  useEffect(
    () =>
      setStudentId(
        new URLSearchParams(window.location.search).get("studentId") || "",
      ),
    [],
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const { data, error, call, refresh } = useAdminData("progress", {
    studentId,
    paginationOpts: { cursor, numItems: 30 },
  });
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    setFailure("");
    try {
      const rows: QuizProgress[] = [];
      let next: string | null = null;
      for (let i = 0; i < 100; i++) {
        const r: QuizPage<QuizProgress> = await call("progress", {
          studentId,
          paginationOpts: { cursor: next, numItems: 100 },
        });
        rows.push(...r.page);
        if (r.isDone) {
          next = null;
          break;
        }
        next = r.continueCursor;
      }
      if (next) throw new Error("导出超过10000条扫描上限，请缩小筛选范围");
      const cell = (v: unknown) => {
        let s = String(v ?? "");
        if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
        return '"' + s.replace(/"/g, '""') + '"';
      };
      const csv = [
        [
          "学号",
          "姓名",
          "课程",
          "讲次",
          "完成次数",
          "最高分",
          "最近分",
          "更新时间",
        ],
        ...rows.map((r) => [
          r.studentId,
          r.name,
          r.course,
          r.lecture,
          r.completed,
          r.best,
          r.latest,
          new Date(r.updated).toISOString(),
        ]),
      ]
        .map((row) => row.map(cell).join(","))
        .join("\r\n");
      const url = URL.createObjectURL(
        new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "quiz-progress.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <Message error={error || failure} />
      <label className="block text-sm">
        筛选学号
        <input
          className={fieldClass}
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setCursor(null);
          }}
        />
      </label>
      <div className="flex gap-3">
        <Button disabled={busy} onClick={() => void download()}>
          {busy ? "正在导出…" : "导出筛选结果"}
        </Button>
        <Button variant="outline" onClick={refresh}>
          刷新
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        每行对应一名学生的一讲已完成练习；未提交练习不计入。筛选按分页扫描，可继续下一页。
      </p>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {["学号", "姓名", "课程 / 讲次", "次数", "最高分", "最近分"].map(
                (h) => (
                  <th key={h} className="p-3">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data?.page.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{r.studentId}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">
                  {r.course} / {r.lecture}
                </td>
                <td className="p-3">{r.completed}</td>
                <td className="p-3">{r.best.toFixed(1)}</td>
                <td className="p-3">{r.latest.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
      </div>
    </div>
  );
}
