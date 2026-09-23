"use client";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useAdminData,
  Message,
  message,
  fieldClass,
} from "@/components/admin/quiz/shared";
export default function Page() {
  const { studentId: id } = useParams<{ studentId: string }>();
  const { data, error, call, refresh } = useAdminData("detail", { id });
  const catalog = useAdminData("catalog");
  const [failure, setFailure] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setFailure("");
    setCode("");
    try {
      await fn();
      refresh();
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(() =>
      call("updateStudent", {
        id,
        name: String(f.get("name")),
        status: String(f.get("status")),
      }),
    );
  }
  return (
    <div className="space-y-5">
      <Message error={error || catalog.error || failure} />
      {data && (
        <>
          <h2 className="text-xl font-bold">
            {data.name} · {data.studentId}
          </h2>
          <form
            key={`${data.name}-${data.status}`}
            onSubmit={save}
            className="space-y-4 rounded-xl border bg-white p-5"
          >
            <label className="block text-sm">
              姓名
              <input
                name="name"
                className={fieldClass}
                defaultValue={data.name}
                required
              />
            </label>
            <label className="block text-sm">
              账号状态
              <select
                name="status"
                className={fieldClass}
                defaultValue={data.status}
              >
                <option value="active">启用</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            <p className="text-xs text-slate-500">
              保存账号变更会使已有登录失效。
            </p>
            <Button disabled={busy}>保存账号</Button>
          </form>
          <section className="space-y-3 rounded-xl border bg-white p-5">
            <h3 className="font-bold">激活 / 重置密码</h3>
            <p className="text-sm text-slate-500">
              生成新码会立即停用原密码与所有登录。激活码有效期24小时，仅在此显示一次，请通过课程私密渠道交给本人。
            </p>
            <Button
              variant="outline"
              disabled={busy || data.status !== "active"}
              onClick={() =>
                void run(async () => {
                  const r = await call("reset", { id });
                  setCode(r.code);
                })
              }
            >
              生成一次性激活码
            </Button>
            {code && (
              <div className="break-all rounded bg-slate-100 p-4">
                <code>{code}</code>
                <p className="mt-2 text-sm">
                  学生前往独立练习平台的 /quiz/activate 设置新密码。
                </p>
              </div>
            )}
          </section>
          <section className="space-y-3 rounded-xl border bg-white p-5">
            <h3 className="font-bold">选课权限</h3>
            {catalog.data?.courses
              .filter((c) => !c.deletedAt)
              .map((c) => {
                const active = data.enrollments.some(
                  (e) => e.course === c._id && e.active,
                );
                return (
                  <div
                    key={c._id}
                    className="flex items-center justify-between gap-4"
                  >
                    <span>
                      {c.title} · {c.term}
                    </span>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() =>
                        void run(() =>
                          call("enroll", {
                            student: id,
                            course: c._id,
                            active: !active,
                          }),
                        )
                      }
                    >
                      {active ? "取消选课" : "分配课程"}
                    </Button>
                  </div>
                );
              })}
          </section>
          <Button asChild variant="outline">
            <Link
              href={`/admin/quiz/progress?studentId=${encodeURIComponent(data.studentId)}`}
            >
              查看学习进度
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
