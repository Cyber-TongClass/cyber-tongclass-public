"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminData,
  Message,
  message,
  fieldClass,
} from "@/components/admin/quiz/shared";
import { QuestionEditor } from "@/components/admin/quiz/question-editor";
import { useQuizAdmin } from "@/lib/api";
import { parseQuizImport, type ImportedQuizQuestion } from "@/lib/quiz-import";
import type {
  QuizCourse,
  QuizLecture,
  QuizCatalog,
} from "@/lib/quiz-contracts";
type Editor =
  | { kind: "course"; course?: QuizCourse }
  | { kind: "lecture"; course: QuizCourse; lecture?: QuizLecture };
type StateChange =
  | { kind: "course"; item: QuizCourse }
  | { kind: "lecture"; item: QuizLecture };
function EditorForm({
  editor,
  catalog,
  onSaved,
  onCancel,
  onSaving,
}: {
  editor: Editor;
  catalog: QuizCatalog;
  onSaved: () => void;
  onCancel: () => void;
  onSaving: (saving: boolean) => void;
}) {
  const call = useQuizAdmin();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [questions, setQuestions] = useState<ImportedQuizQuestion[]>([]);
  const [original, setOriginal] = useState("[]");
  const [loadedBank, setLoadedBank] = useState("");
  const lesson = editor.kind === "lecture" ? editor.lecture : undefined;
  const [bank, setBank] = useState(
    lesson?.bank || catalog.banks.find((b) => b.status === "ready")?._id || "",
  );
  const [bankError, setBankError] = useState("");
  useEffect(() => {
    if (editor.kind !== "lecture" || !bank) return;
    let active = true;
    setBankError("");
    setLoadedBank("");
    call("bankQuestions", { bank })
      .then((q) => {
        if (active) {
          setQuestions(q);
          setOriginal(JSON.stringify(q));
          setLoadedBank(bank);
        }
      })
      .catch((e) => {
        if (active) setBankError(message(e));
      });
    return () => {
      active = false;
    };
  }, [bank, call, editor.kind]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    onSaving(true);
    setFailure("");
    try {
      const common = {
        slug: String(f.get("slug")),
        title: String(f.get("title")).trim(),
        published: f.get("published") === "on",
      };
      if (editor.kind === "course")
        await call("course", {
          ...common,
          ...(editor.course ? { id: editor.course._id } : {}),
          term: String(f.get("term")),
          description: String(f.get("description")),
        });
      else {
        if (!bank || loadedBank !== bank) throw new Error("请等待题目加载完成");
        const canonical = parseQuizImport(questions);
        const drawCount = Number(f.get("drawCount"));
        if (
          !Number.isInteger(drawCount) ||
          drawCount < 1 ||
          drawCount > canonical.length
        )
          throw new Error("抽题数不能超过当前题目数量");
        let savedBank = bank;
        if (JSON.stringify(questions) !== original) {
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
              JSON.stringify({ title: common.title, questions: canonical }),
            ),
          );
          const hash = Array.from(new Uint8Array(digest))
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("");
          const key = `edit:${lesson?._id || editor.course._id}:${hash}`;
          savedBank = await call("beginBank", {
            key,
            title: `${common.title.slice(0, 180)} · 修订题库`,
            expected: canonical.length,
          });
          for (let i = 0; i < canonical.length; i += 25)
            await call("chunk", {
              bank: savedBank,
              questions: canonical.slice(i, i + 25),
            });
          await call("finishBank", { bank: savedBank });
        }
        await call("lecture", {
          ...common,
          ...(lesson ? { id: lesson._id, expectedBank: lesson.bank } : {}),
          course: editor.course._id,
          bank: savedBank,
          order: Number(f.get("order")),
          drawCount,
          ...(lesson?.sampling ? { sampling: lesson.sampling } : {}),
        });
      }
      onSaved();
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
      onSaving(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-5">
      <fieldset disabled={busy} className="space-y-4">
        <Message error={failure} />
        <label className="block text-sm">
          {editor.kind === "course" ? "课程名称" : "讲次标题"}
          <input
            className={fieldClass}
            name="title"
            defaultValue={
              editor.kind === "course" ? editor.course?.title : lesson?.title
            }
            required
            maxLength={200}
          />
        </label>
        <label className="block text-sm">
          标识（英文、数字、连字符）
          <input
            className={fieldClass}
            name="slug"
            defaultValue={
              editor.kind === "course" ? editor.course?.slug : lesson?.slug
            }
            readOnly={editor.kind === "course" ? !!editor.course : !!lesson}
            required
            pattern="[a-z0-9-]{1,80}"
          />
        </label>
        {editor.kind === "course" ? (
          <>
            <label className="block text-sm">
              学期
              <input
                className={fieldClass}
                name="term"
                defaultValue={editor.course?.term}
                required
                maxLength={100}
              />
            </label>
            <label className="block text-sm">
              简介
              <textarea
                className={`${fieldClass} min-h-24`}
                name="description"
                defaultValue={editor.course?.description}
                maxLength={5000}
              />
            </label>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              所属课程：{editor.course.title}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                顺序
                <input
                  className={fieldClass}
                  type="number"
                  name="order"
                  defaultValue={lesson?.order ?? 1}
                  required
                />
              </label>
              <label className="text-sm">
                随机抽题数
                <input
                  className={fieldClass}
                  type="number"
                  name="drawCount"
                  readOnly={lesson?.sampling === "stratified-334"}
                  defaultValue={
                    lesson?.drawCount ?? Math.min(5, questions.length || 5)
                  }
                  min={1}
                  max={Math.min(100, questions.length || 100)}
                  required
                />
              </label>
            </div>
            <label className="block text-sm">
              题库
              <select
                className={fieldClass}
                value={bank}
                disabled={JSON.stringify(questions) !== original}
                onChange={(e) => setBank(e.target.value)}
              >
                <option value="" disabled>
                  请选择题库
                </option>
                {catalog.banks
                  .filter((b) => b.status === "ready")
                  .map((b) => (
                    <option value={b._id} key={b._id}>
                      {b.title}（{b.expected}题）
                    </option>
                  ))}
              </select>
            </label>
            {lesson?.sampling === "stratified-334" && (
              <p className="text-sm text-slate-500">
                每次固定抽取简单3题、中等3题、困难4题；题库须保持15 / 15 /
                20题。
              </p>
            )}
            {JSON.stringify(questions) !== original && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuestions(JSON.parse(original))}
              >
                撤销题目修改
              </Button>
            )}
            <Message error={bankError} />
            {loadedBank === bank && bank ? (
              <QuestionEditor
                questions={questions}
                onChange={setQuestions}
                disabled={busy}
              />
            ) : (
              <p className="text-sm text-slate-500">
                {bank ? "正在加载题目…" : "请先在题库页面导入题目。"}
              </p>
            )}
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={
              editor.kind === "course"
                ? editor.course?.published
                : lesson?.published
            }
          />
          {editor.kind === "course"
            ? "向选课学生显示课程"
            : "向选课学生显示讲次"}
        </label>
      </fieldset>
      <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white py-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          取消
        </Button>
        <Button
          disabled={
            busy ||
            (editor.kind === "lecture" && (!bank || loadedBank !== bank))
          }
        >
          {busy ? "正在保存…" : "保存修改"}
        </Button>
      </div>
    </form>
  );
}
export default function Page() {
  const { data, error, call, refresh } = useAdminData("catalog");
  const [editor, setEditor] = useState<Editor>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<StateChange>();
  const [showDeleted, setShowDeleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [note, setNote] = useState("");
  async function state(
    target: StateChange,
    value: "published" | "hidden" | "deleted",
  ) {
    setBusy(true);
    setFailure("");
    try {
      await call(target.kind === "course" ? "courseState" : "lectureState", {
        id: target.item._id,
        state: value,
      });
      setNote(
        value === "deleted"
          ? "已移入回收站，历史记录保留。"
          : value === "published"
            ? "已显示。"
            : "已隐藏。可随时重新显示。",
      );
      setDeleting(undefined);
      refresh();
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  function controls(target: StateChange) {
    const deleted = !!target.item.deletedAt;
    return (
      <div className="flex flex-wrap gap-2">
        {deleted ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void state(target, "hidden")}
          >
            恢复为隐藏
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (target.kind === "course")
                  setEditor({ kind: "course", course: target.item });
                else {
                  const course = data?.courses.find(
                    (c) => c._id === target.item.course,
                  );
                  if (course)
                    setEditor({
                      kind: "lecture",
                      course,
                      lecture: target.item,
                    });
                }
              }}
            >
              {target.kind === "course" ? "编辑课程" : "编辑讲次与题目"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void state(
                  target,
                  target.item.published ? "hidden" : "published",
                )
              }
            >
              {target.item.published ? "隐藏" : "显示"}
            </Button>
            <Button
              variant="ghost"
              className="text-red-700"
              disabled={busy}
              onClick={() => {
                setFailure("");
                setDeleting(target);
              }}
            >
              删除
            </Button>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <Message error={error || failure} note={note} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button disabled={!data} onClick={() => setEditor({ kind: "course" })}>
          新建课程
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          显示回收站
        </label>
      </div>
      {!data && !error && <p>正在加载课程…</p>}
      {data?.courses
        .filter((c) => showDeleted || !c.deletedAt)
        .map((c) => (
          <section
            key={c._id}
            className={`rounded-xl border bg-white p-5 ${c.deletedAt ? "opacity-75" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{c.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {c.term} ·{" "}
                  {c.deletedAt ? "已删除" : c.published ? "显示中" : "已隐藏"}
                </p>
              </div>
              {controls({ kind: "course", item: c })}
            </div>
            {!c.deletedAt && (
              <>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setEditor({ kind: "lecture", course: c })}
                  >
                    添加讲次
                  </Button>
                </div>
                {data.lectures
                  .filter(
                    (l) => l.course === c._id && (showDeleted || !l.deletedAt),
                  )
                  .sort((a, b) => a.order - b.order)
                  .map((l) => (
                    <div
                      key={l._id}
                      className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t pt-4"
                    >
                      <div>
                        <p className="font-medium">
                          {l.order}. {l.title}
                        </p>
                        <p className="text-sm text-slate-500">
                          抽取 {l.drawCount} 题 ·{" "}
                          {l.deletedAt
                            ? "已删除"
                            : l.published
                              ? c.published
                                ? "显示中"
                                : "课程隐藏，学生不可见"
                              : "已隐藏"}
                        </p>
                      </div>
                      {controls({ kind: "lecture", item: l })}
                    </div>
                  ))}
              </>
            )}
          </section>
        ))}
      {editor && (
        <Dialog
          open={!!editor}
          onOpenChange={(open) => {
            if (!open && !saving) setEditor(undefined);
          }}
        >
          <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editor?.kind === "course"
                  ? editor.course
                    ? "编辑课程"
                    : "新建课程"
                  : editor?.lecture
                    ? "编辑讲次与题目"
                    : "添加讲次"}
              </DialogTitle>
              <DialogDescription>
                {editor?.kind === "lecture"
                  ? "修改讲次信息、题目、选项和正确答案。保存后用于新的练习，已有作答记录保持不变。"
                  : "修改课程信息和学生可见状态。"}
              </DialogDescription>
            </DialogHeader>
            {editor && data && (
              <EditorForm
                editor={editor}
                onSaving={setSaving}
                catalog={data}
                onCancel={() => setEditor(undefined)}
                onSaved={() => {
                  setEditor(undefined);
                  setNote("修改已保存。");
                  refresh();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          open={!!deleting}
          onOpenChange={(open) => {
            if (!open && !busy) setDeleting(undefined);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                删除{deleting?.kind === "course" ? "课程" : "讲次"}？
              </DialogTitle>
              <DialogDescription>
                “{deleting?.item.title}”将从学生页面和默认管理列表移除。
                {deleting?.kind === "course"
                  ? "课程下的所有讲次也将不可访问。"
                  : ""}
                已有作答记录保留，可在回收站恢复。
              </DialogDescription>
            </DialogHeader>
            <Message error={failure} />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDeleting(undefined)}
              >
                取消
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-800"
                disabled={busy}
                onClick={() => deleting && void state(deleting, "deleted")}
              >
                {busy ? "正在删除…" : "确认删除"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
