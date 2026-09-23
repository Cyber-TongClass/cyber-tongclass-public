"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useAdminData,
  Message,
  fieldClass,
} from "@/components/admin/quiz/shared";
import type { QuizProgressMatrix } from "@/lib/quiz-contracts";
function Matrix({ course, title }: { course: string; title: string }) {
  const { data, error, refresh } = useAdminData("progressMatrix", { course });
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string[] | null>(null);
  useEffect(() => {
    setFilter(
      new URLSearchParams(window.location.search).get("studentId") || "",
    );
  }, []);
  const lectures =
    data?.lectures.filter(
      (l) => selected === null || selected.includes(l._id),
    ) || [];
  const rows =
    data?.rows.filter((r) =>
      (r.studentId + r.name)
        .toLowerCase()
        .includes(filter.trim().toLowerCase()),
    ) || [];
  const status = (cell: QuizProgressMatrix["rows"][number]["cells"][string]) =>
    cell && cell.completed > 0 ? "已完成" : "未完成";
  function download() {
    const cell = (value: string) =>
      '"' +
      (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""') +
      '"';
    const csv = [
      ["学号", "姓名", ...lectures.map((l) => l.title)],
      ...rows.map((r) => [
        r.studentId,
        r.name,
        ...lectures.map((l) => status(r.cells[l._id])),
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[\\/:*?"<>|]/g, "_")}-学习进度.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <Message error={error} />
      <label className="block text-sm">
        筛选学号 / 姓名
        <input
          className={fieldClass}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </label>
      <fieldset className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">
          选择要查看和导出的讲次
        </legend>
        <div className="mb-3 flex gap-3">
          <Button size="sm" variant="outline" onClick={() => setSelected(null)}>
            全选
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelected([])}>
            清空
          </Button>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {data?.lectures.map((l) => (
            <label key={l._id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected === null || selected.includes(l._id)}
                onChange={(e) =>
                  setSelected((current) => {
                    const ids = current ?? data.lectures.map((x) => x._id);
                    return e.target.checked
                      ? [...ids, l._id]
                      : ids.filter((id) => id !== l._id);
                  })
                }
              />
              {l.title}
              {!l.published ? "（未发布）" : ""}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <Button disabled={!data || !lectures.length} onClick={download}>
          导出当前表格
        </Button>
        <Button variant="outline" onClick={refresh}>
          刷新
        </Button>
        <span className="text-sm text-slate-500">
          {rows.length} 名学生 · {lectures.length} 个讲次
        </span>
      </div>
      <p className="text-xs text-slate-500">
        每行对应一名已分配此课程的学生，包括尚未开始练习的学生。完成至少一次整讲练习即为“已完成”；导出使用相同学生筛选和讲次列。
      </p>
      {!data && !error && <p>正在加载课程进度…</p>}
      <div className="max-h-[65vh] overflow-auto rounded-xl border bg-white">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {["学号", "姓名", ...lectures.map((l) => l.title)].map((h, i) => (
                <th key={i} className="min-w-32 border-b p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId}>
                <td className="whitespace-nowrap border-b p-3 font-mono">
                  {r.studentId}
                </td>
                <td className="whitespace-nowrap border-b p-3">{r.name}</td>
                {lectures.map((l) => (
                  <td
                    key={l._id}
                    className="border-b p-3"
                    title={
                      r.cells[l._id]
                        ? `完成 ${r.cells[l._id]!.completed} 次，最高 ${r.cells[l._id]!.best.toFixed(1)} 分`
                        : "尚未完成整讲练习"
                    }
                  >
                    <span
                      className={
                        r.cells[l._id]?.completed
                          ? "text-green-700"
                          : "text-slate-500"
                      }
                    >
                      {status(r.cells[l._id])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && !rows.length && (
        <p className="text-sm text-slate-500">没有符合条件的学生。</p>
      )}
    </div>
  );
}
export default function Page() {
  const { data, error } = useAdminData("catalog");
  const [selectedCourse, setSelectedCourse] = useState("");
  const courses = data?.courses.filter((c) => !c.deletedAt) || [];
  const course = courses.find((c) => c._id === selectedCourse) || courses[0];
  return (
    <div className="space-y-5">
      <Message error={error} />
      <label className="block text-sm">
        选择课程
        <select
          className={fieldClass}
          value={course?._id || ""}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="" disabled>
            请选择课程
          </option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.title} · {c.term}
            </option>
          ))}
        </select>
      </label>
      {course && (
        <Matrix key={course._id} course={course._id} title={course.title} />
      )}
    </div>
  );
}
