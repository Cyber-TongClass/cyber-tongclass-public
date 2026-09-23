"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "./shared";
import type { ImportedQuizQuestion } from "@/lib/quiz-import";
export function QuestionEditor({
  questions,
  onChange,
  disabled,
}: {
  questions: ImportedQuizQuestion[];
  onChange: (questions: ImportedQuizQuestion[]) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState<string[]>(
    questions.length === 1 ? [questions[0].id] : [],
  );
  function addQuestion() {
    const id = crypto.randomUUID();
    setExpanded((current) => [...current, id]);
    onChange([
      ...questions,
      {
        id,
        type: "single_choice",
        stem: "",
        options: [
          { id: "A", text: "" },
          { id: "B", text: "" },
        ],
        answer: "A",
      },
    ]);
  }
  function update(index: number, patch: Partial<ImportedQuizQuestion>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">题目与答案（{questions.length}题）</h3>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || questions.length >= 1000}
          onClick={addQuestion}
        >
          添加题目
        </Button>
      </div>
      {questions.map((q, index) => (
        <details
          key={q.id}
          className="rounded-lg border p-3"
          open={expanded.includes(q.id)}
          onToggle={(e) => {
            const open = e.currentTarget.open;
            setExpanded((current) =>
              open
                ? [...new Set([...current, q.id])]
                : current.filter((id) => id !== q.id),
            );
          }}
        >
          <summary className="cursor-pointer text-sm font-medium">
            第 {index + 1} 题 · {q.stem.slice(0, 70) || "新题目"}
          </summary>
          <div className="mt-4 space-y-3">
            <div className="flex items-end gap-3">
              <label className="flex-1 text-sm">
                题型
                <select
                  className={fieldClass}
                  value={q.type}
                  disabled={disabled}
                  onChange={(e) => {
                    const type = e.target.value as ImportedQuizQuestion["type"];
                    const options = q.options?.length
                      ? q.options
                      : [
                          { id: "A", text: "" },
                          { id: "B", text: "" },
                        ];
                    update(index, {
                      type,
                      options: type === "fill_blank" ? undefined : options,
                      answer:
                        type === "fill_blank"
                          ? [""]
                          : type === "multiple_choice"
                            ? [options[0].id]
                            : options[0].id,
                    });
                  }}
                >
                  <option value="single_choice">单选题</option>
                  <option value="multiple_choice">多选题</option>
                  <option value="fill_blank">填空题</option>
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  onChange(questions.filter((_, i) => i !== index))
                }
              >
                移除此题
              </Button>
            </div>
            <label className="block text-sm">
              题干（支持 Markdown / 数学公式）
              <textarea
                className={`${fieldClass} min-h-24`}
                value={q.stem}
                disabled={disabled}
                onChange={(e) => update(index, { stem: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              难度
              <select
                className={fieldClass}
                value={q.difficulty ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  update(index, {
                    difficulty: e.target.value
                      ? (e.target.value as ImportedQuizQuestion["difficulty"])
                      : undefined,
                  })
                }
              >
                <option value="">未分级</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </label>
            <label className="block text-sm">
              本题限时（秒，默认30秒）
              <input
                type="number"
                min={1}
                max={3600}
                step={1}
                required
                className={fieldClass}
                value={q.timeLimitSeconds ?? 30}
                disabled={disabled}
                onChange={(e) =>
                  update(index, { timeLimitSeconds: Number(e.target.value) })
                }
              />
            </label>
            <label className="block text-sm">
              答案解析（提交或超时后显示，支持 Markdown / 数学公式）
              <textarea
                className={`${fieldClass} min-h-24`}
                value={q.explanation ?? ""}
                disabled={disabled}
                onChange={(e) => update(index, { explanation: e.target.value })}
              />
            </label>
            {q.type === "fill_blank" ? (
              <label className="block text-sm">
                可接受答案（每行一个）
                <textarea
                  className={fieldClass}
                  value={(Array.isArray(q.answer) ? q.answer : [q.answer]).join(
                    "\n",
                  )}
                  disabled={disabled}
                  onChange={(e) =>
                    update(index, { answer: e.target.value.split("\n") })
                  }
                />
              </label>
            ) : (
              <fieldset disabled={disabled} className="space-y-2">
                <legend className="mb-2 text-sm font-medium">
                  选项 · 勾选正确答案
                </legend>
                {q.options?.map((o, oi) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <label className="flex shrink-0 items-center gap-2 text-sm">
                      <input
                        type={
                          q.type === "multiple_choice" ? "checkbox" : "radio"
                        }
                        name={`correct-${q.id}`}
                        aria-label={`第${index + 1}题正确答案 ${o.id}`}
                        checked={(Array.isArray(q.answer)
                          ? q.answer
                          : [q.answer]
                        ).includes(o.id)}
                        onChange={(e) => {
                          const current = Array.isArray(q.answer)
                            ? q.answer
                            : [q.answer];
                          update(index, {
                            answer:
                              q.type === "single_choice"
                                ? o.id
                                : e.target.checked
                                  ? [...current, o.id]
                                  : current.filter((a) => a !== o.id),
                          });
                        }}
                      />
                      {o.id}
                    </label>
                    <input
                      className={fieldClass}
                      aria-label={`第${index + 1}题选项 ${o.id}`}
                      value={o.text}
                      onChange={(e) =>
                        update(index, {
                          options: q.options?.map((x, i) =>
                            i === oi ? { ...x, text: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`删除第${index + 1}题选项 ${o.id}`}
                      onClick={() => {
                        const remaining = q.options?.filter((_, i) => i !== oi);
                        const answers = (
                          Array.isArray(q.answer) ? q.answer : [q.answer]
                        ).filter((a) => a !== o.id);
                        update(index, {
                          options: remaining,
                          answer:
                            q.type === "single_choice"
                              ? answers[0] || ""
                              : answers,
                        });
                      }}
                    >
                      移除
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={(q.options?.length || 0) >= 20}
                  onClick={() => {
                    const id = "ABCDEFGHIJKLMNOPQRST"
                      .split("")
                      .find((id) => !q.options?.some((o) => o.id === id));
                    if (id)
                      update(index, {
                        options: [...(q.options || []), { id, text: "" }],
                      });
                  }}
                >
                  添加选项
                </Button>
              </fieldset>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}
