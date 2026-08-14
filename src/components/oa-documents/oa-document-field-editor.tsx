"use client"

import type { OADocumentAnswerType, OADocumentBindingCandidate, OADocumentOutputMode, OADocumentSuggestion, OADocumentWriteTarget } from "@/lib/oa-document-templates"

type PreviewCandidate = Pick<OADocumentBindingCandidate, "id" | "description" | "writeTarget">

const answerTypes: Array<[OADocumentAnswerType, string]> = [
  ["text", "单行文本"], ["textarea", "多行文本"], ["number", "数字"], ["date", "日期"],
  ["email", "邮箱"], ["phone", "电话"], ["single_choice", "单选"], ["multiple_choice", "多选"], ["file", "附件"],
]

const targetLabels: Record<OADocumentWriteTarget, string> = {
  "table-cell": "Word 表格单元格",
  "inline-run": "Word 行内填写位置",
  "paragraph-after": "Word 段落后填写位置",
  choice: "Word 选项标记位置",
  "repeat-row": "Word 可重复表格行",
}

export function OADocumentFieldEditor({
  suggestion,
  candidates,
  selectedCandidateId,
  onCandidateChange,
  onChange,
}: {
  suggestion?: OADocumentSuggestion
  candidates: PreviewCandidate[]
  selectedCandidateId?: string
  onCandidateChange: (candidateId: string) => void
  onChange: (next: OADocumentSuggestion) => void
}) {
  if (!suggestion) return null
  const update = (patch: Partial<OADocumentSuggestion>) => onChange({ ...suggestion, ...patch })
  const outputMode: OADocumentOutputMode = suggestion.kind === "repeat_row" ? "repeat_row" : "replace"
  const selected = candidates.find((candidate) => candidate.id === selectedCandidateId)
  const hasOptions = suggestion.inferredAnswerType === "single_choice" || suggestion.inferredAnswerType === "multiple_choice"
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
        <label className="block lg:col-span-2">
          <span className="aia-mono text-[10px] uppercase tracking-[0.12em] aia-text-muted">提示文字</span>
          <input value={suggestion.placeholder ?? ""} maxLength={500} placeholder="输入框为空时灰色显示；不会从 Word 自动识别" onChange={(event) => update({ placeholder: event.target.value })} className="aia-focus mt-2 w-full border-b aia-border-rule bg-transparent py-2 text-sm" />
        </label>
        <label className="block lg:col-span-2">
          <span className="aia-mono text-[10px] uppercase tracking-[0.12em] aia-text-muted">Word 写入绑定</span>
          <select value={selectedCandidateId || ""} onChange={(event) => onCandidateChange(event.target.value)} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-2 py-2 text-sm">
            <option value="" disabled>选择与框选区域重叠的 Word 可写位置</option>
            {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.description}</option>)}
          </select>
          {selected ? (
            <span className="mt-2 block text-xs text-emerald-700">已绑定 Word 可写位置 · {targetLabels[selected.writeTarget]} · {selected.description}</span>
          ) : (
            <span className="mt-2 block text-xs text-amber-700">未绑定 Word 位置；请选择候选后再确认。</span>
          )}
        </label>
        {hasOptions ? (
          <label className="block lg:col-span-2">
            <span className="aia-mono text-[10px] uppercase tracking-[0.12em] aia-text-muted">选项（每行一项）</span>
            <textarea rows={4} value={(suggestion.options || []).join("\n")} onChange={(event) => update({ options: event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) })} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent p-2 text-sm" />
          </label>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={Boolean(suggestion.required)} onChange={(event) => update({ required: event.target.checked })} />必填</label>
        <span className="aia-mono text-[10px] aia-text-muted">输出：{outputMode === "repeat_row" ? "重复整行" : "替换原位置"}</span>
        <span className="aia-mono text-[10px] aia-text-muted">依据：{suggestion.evidence.join("、") || "框选新增"}</span>
      </div>
    </section>
  )
}
