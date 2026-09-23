"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  useAdminData,
  Message,
  message,
  fieldClass,
} from "@/components/admin/quiz/shared";
import type { QuizCourse, QuizLecture } from "@/lib/quiz-contracts";
export default function Page() {
  const { data, error, call, refresh } = useAdminData("catalog");
  const [failure, setFailure] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [course, setCourse] = useState<QuizCourse>();
  const [lecture, setLecture] = useState<QuizLecture>();
  async function save(
    e: FormEvent<HTMLFormElement>,
    kind: "course" | "lecture",
  ) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const common = {
      slug: String(f.get("slug")),
      title: String(f.get("title")),
      published: f.get("published") === "on",
    };
    setBusy(true);
    setFailure("");
    try {
      if (kind === "course")
        await call("course", {
          ...common,
          description: String(f.get("description")),
          term: String(f.get("term")),
        });
      else
        await call("lecture", {
          ...common,
          course: String(f.get("course")),
          bank: String(f.get("bank")),
          order: Number(f.get("order")),
          drawCount: Number(f.get("drawCount")),
        });
      setNote("已保存");
      refresh();
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <Message error={error || failure} note={note} />
      <div className="grid gap-6 xl:grid-cols-2">
        <form
          key={`c-${course?._id || "new"}`}
          onSubmit={(e) => void save(e, "course")}
          className="space-y-3 rounded-xl border bg-white p-5"
        >
          <h2 className="font-bold">{course ? "编辑课程" : "新建课程"}</h2>
          <label className="block text-sm">
            课程标识（英文/数字/连字符，包含学期；创建后保持不变）
            <input
              className={fieldClass}
              name="slug"
              required
              defaultValue={course?.slug}
              readOnly={!!course}
            />
          </label>
          <label className="block text-sm">
            名称
            <input
              className={fieldClass}
              name="title"
              required
              defaultValue={course?.title}
            />
          </label>
          <label className="block text-sm">
            学期
            <input
              className={fieldClass}
              name="term"
              required
              defaultValue={course?.term}
            />
          </label>
          <label className="block text-sm">
            简介
            <textarea
              className={fieldClass}
              name="description"
              defaultValue={course?.description}
            />
          </label>
          <label className="block text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={course?.published}
            />{" "}
            发布课程
          </label>
          <Button disabled={busy}>保存课程</Button>
          {course && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => setCourse(undefined)}
            >
              新建另一课程
            </Button>
          )}
        </form>
        <form
          key={`l-${lecture?._id || "new"}`}
          onSubmit={(e) => void save(e, "lecture")}
          className="space-y-3 rounded-xl border bg-white p-5"
        >
          <h2 className="font-bold">{lecture ? "编辑讲次" : "新建讲次"}</h2>
          <label className="block text-sm">
            所属课程
            <select
              className={fieldClass}
              name="course"
              required
              defaultValue={lecture?.course}
            >
              {data?.courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} · {c.term}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            讲次标识
            <input
              className={fieldClass}
              name="slug"
              required
              defaultValue={lecture?.slug}
              readOnly={!!lecture}
            />
          </label>
          <label className="block text-sm">
            标题
            <input
              className={fieldClass}
              name="title"
              required
              defaultValue={lecture?.title}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              顺序
              <input
                className={fieldClass}
                name="order"
                type="number"
                required
                defaultValue={lecture?.order || 1}
              />
            </label>
            <label className="text-sm">
              随机抽题数
              <input
                className={fieldClass}
                name="drawCount"
                type="number"
                min="1"
                max="100"
                required
                defaultValue={lecture?.drawCount || 5}
              />
            </label>
          </div>
          <label className="block text-sm">
            题库版本
            <select
              className={fieldClass}
              name="bank"
              required
              defaultValue={lecture?.bank}
            >
              {data?.banks
                .filter((b) => b.status === "ready")
                .map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.title} ({b.expected}题)
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={lecture?.published}
            />{" "}
            发布练习
          </label>
          <Button disabled={busy}>保存讲次</Button>
          {lecture && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLecture(undefined)}
            >
              新建另一讲次
            </Button>
          )}
        </form>
      </div>
      <section className="space-y-4">
        {data?.courses.map((c) => (
          <div key={c._id} className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">
                {c.title} · {c.term}{" "}
                <small className="font-normal text-slate-500">
                  {c.published ? "已发布" : "草稿/已归档"}
                </small>
              </h2>
              <Button variant="outline" onClick={() => setCourse(c)}>
                编辑
              </Button>
            </div>
            {data.lectures
              .filter((l) => l.course === c._id)
              .sort((a, b) => a.order - b.order)
              .map((l) => (
                <div
                  key={l._id}
                  className="mt-3 flex items-center justify-between border-t pt-3"
                >
                  <span>
                    {l.order}. {l.title} · {l.drawCount}题 ·{" "}
                    {l.published ? "已发布" : "草稿/已归档"}
                  </span>
                  <Button variant="ghost" onClick={() => setLecture(l)}>
                    编辑
                  </Button>
                </div>
              ))}
          </div>
        ))}
      </section>
    </div>
  );
}
