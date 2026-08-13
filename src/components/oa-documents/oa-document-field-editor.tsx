"use client"

import type { OADocumentAnswerType, OADocumentOutputMode, OADocumentSuggestion } from "@/lib/oa-document-templates"

const answerTypes: Array<[OADocumentAnswerType, string]> = [
  ["text", "单行文本"], ["textarea", "多行文本"], ["number", "数字"], ["date", "日期"],
  ["email", "邮箱"], ["phone", "电话"], ["single_choice", "单选"], ["multiple_choice", "多选"], ["file", "附件"],
]

export function OADocumentFieldEditor({
  suggestion,
  onChange,
}: {
  suggestion?: OADocumentSuggestion
  onChange: (next: OADocumentSuggestion) => void
}) {
  if (!suggestion) return null
  const update = (patch: Partial<OADocumentSuggestion>) => onChange({ ...suggestion, ...patch })
  const outputMode: OADocumentOutputMode = suggestion.kind === "repeat_row" ? "repeat_row" : "replace"
  return (
    <section aria-labelledby="document-field-editor-title" className="border-t aia-border-rule bg-[hsl(var(--aia-paper))] px-4 py-5 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span id="document-field-editor-title" className="aia-mono text-[10px] uppercase tracking-[0.12em] aia-text-muted">问题名称</span>
          <input value={suggestion.label} onChange={(event) => update({ label: event.target.value })} className="aia-focus mt-2 w-full border-b aia-border-rule bg-transparent py-2 text-sm" />
        </label>
        <label className="block">
          <span className="aia-mono text-[10px] uppercase tracking-[0.12em] aia-text-muted">回答类型</span>
          <select value={suggestion.inferredAnswerType} onChange={(event) => update({ inferredAnswerType: event.target.value as OADocumentAnswerType })} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-2 py-2 text-sm">
            {answerTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="aia-mono text-[10px] uppercase tracking-[0.12em] aia-text-muted">最大长度</span>
          <input type="number" min={1} value={suggestion.maxLength ?? ""} onChange={(event) => update({ maxLength: event.target.value ? Number(event.target.value) : undefined })} className="aia-focus mt-2 w-full border-b aia-border-rule bg-transparent py-2 text-sm" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={Boolean(suggestion.required)} onChange={(event) => update({ required: event.target.checked })} />必填</label>
        <span className="aia-mono text-[10px] aia-text-muted">输出：{outputMode === "repeat_row" ? "重复整行" : "替换原位置"}</span>
        <span className="aia-mono text-[10px] aia-text-muted">依据：{suggestion.evidence.join("、") || "手动添加"}</span>
      </div>
    </section>
  )
}
