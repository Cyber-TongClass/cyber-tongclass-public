"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  useAdminData,
  Message,
  message,
  fieldClass,
} from "@/components/admin/quiz/shared";
export default function Page() {
  const { data, error, call, refresh } = useAdminData("catalog");
  const [note, setNote] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setFailure("");
    setNote("");
    try {
      const file = f.get("file");
      if (!(file instanceof File) || file.size > 4_000_000)
        throw new Error("请选择不超过4MB的JSON文件");
      const text = await file.text();
      const parsed = JSON.parse(text);
      const questions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (
        !Array.isArray(questions) ||
        questions.length < 1 ||
        questions.length > 1000
      )
        throw new Error("文件须包含1–1000道题");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(text),
      );
      const key = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const bank = await call("beginBank", {
        key,
        title: String(f.get("title")),
        expected: questions.length,
      });
      for (let i = 0; i < questions.length; i += 25) {
        await call("chunk", { bank, questions: questions.slice(i, i + 25) });
        setNote(
          `已校验 ${Math.min(i + 25, questions.length)} / ${questions.length} 题`,
        );
      }
      await call("finishBank", { bank });
      setNote(
        "题库已校验完成，可在课程与讲次中选择。相同文件重复导入不会新增题目。",
      );
      refresh();
    } catch (e) {
      setFailure(message(e));
      setNote("未完成的题库保持草稿；修正内容后重新导入，或使用相同文件重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <Message error={error || failure} note={note} />
      <form
        onSubmit={upload}
        className="space-y-4 rounded-xl border bg-white p-5"
      >
        <h2 className="font-bold">导入私有题库</h2>
        <label className="block text-sm">
          版本名称
          <input name="title" className={fieldClass} required />
        </label>
        <label className="block text-sm">
          JSON 文件
          <input
            name="file"
            type="file"
            accept=".json,application/json"
            required
            className={`${fieldClass} mt-2`}
          />
        </label>
        <p className="text-sm text-slate-500">
          每题包含 id、type、stem、answer，选择题另含
          options（id、text）。题型：single_choice、multiple_choice、fill_blank。答案仅用于后端评分，不向学生提供。
        </p>
        <Button disabled={busy}>{busy ? "正在校验导入…" : "上传并校验"}</Button>
      </form>
      <div className="divide-y rounded-xl border bg-white">
        {data?.banks.map((b) => (
          <div key={b._id} className="flex justify-between gap-4 p-4">
            <span>
              {b.title} · {b.expected}题
            </span>
            <span>{b.status === "ready" ? "可用" : "草稿（未完成）"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
