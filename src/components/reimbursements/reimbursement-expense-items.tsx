"use client"

import { ClipboardList, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { parseReimbursementExpenseCsv, type ParsedReimbursementExpenseRow } from "@/lib/reimbursement-expense-csv"
import { cn } from "@/lib/utils"

export type ReimbursementExpenseRow = {
  key: string
  item: string
  amount: string
  note: string
}

const expenseHeaderClassName =
  "sticky top-0 z-20 h-8 border-r border-slate-300 bg-slate-100 px-2 py-1 text-left align-middle text-xs font-semibold text-slate-700"

const expenseCellClassName =
  "min-w-[180px] border-r border-slate-200 p-0 align-middle"

const expenseInputClassName =
  "h-8 rounded-none border-0 bg-transparent px-2 py-1 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"

export function ReimbursementExpenseItems({
  rows,
  totalLabel,
  onAddRow,
  onAppendRows,
  onRemoveRow,
  onUpdateRow,
}: {
  rows: ReimbursementExpenseRow[]
  totalLabel: string
  onAddRow: () => void
  onAppendRows?: (rows: ParsedReimbursementExpenseRow[]) => void
  onRemoveRow: (key: string) => void
  onUpdateRow: (key: string, patch: Partial<ReimbursementExpenseRow>) => void
}) {
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [bulkErrors, setBulkErrors] = useState<string[]>([])

  const appendBulkRows = () => {
    const result = parseReimbursementExpenseCsv(bulkText)
    setBulkErrors(result.errors)

    if (result.rows.length === 0) return

    onAppendRows?.(result.rows)
    setBulkText("")
    if (result.errors.length === 0) {
      setBulkOpen(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="reimbursement-expense-dense-table overflow-x-auto rounded-sm border border-slate-300 bg-white">
        <table className="w-full min-w-[760px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-300">
              <th className={cn(expenseHeaderClassName, "sticky left-0 top-0 z-30 w-12 min-w-12 text-center")}>#</th>
              <th className={expenseHeaderClassName}>开支项目</th>
              <th className={expenseHeaderClassName}>预计金额（人民币元）</th>
              <th className={expenseHeaderClassName}>备注</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.key} className="h-8 border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                <td className="sticky left-0 z-10 w-12 border-r border-slate-300 bg-slate-50 p-0 align-middle">
                  <div className="flex h-8 items-center justify-center gap-1">
                    <span className="w-4 text-center text-[11px] text-slate-500">{rowIndex + 1}</span>
                    {rows.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-sm text-slate-400 hover:text-red-600"
                        onClick={() => onRemoveRow(row.key)}
                        aria-label={`删除第 ${rowIndex + 1} 行申请金额`}
                        title="删除行"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </td>
                <td className={expenseCellClassName}>
                  <Input
                    value={row.item}
                    onChange={(event) => onUpdateRow(row.key, { item: event.target.value })}
                    className={expenseInputClassName}
                    aria-label={`第 ${rowIndex + 1} 行开支项目`}
                    required
                  />
                </td>
                <td className={expenseCellClassName}>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.amount}
                    onChange={(event) => onUpdateRow(row.key, { amount: event.target.value })}
                    className={expenseInputClassName}
                    aria-label={`第 ${rowIndex + 1} 行预计金额`}
                    required
                  />
                </td>
                <td className={expenseCellClassName}>
                  <Input
                    value={row.note}
                    onChange={(event) => onUpdateRow(row.key, { note: event.target.value })}
                    className={expenseInputClassName}
                    aria-label={`第 ${rowIndex + 1} 行备注`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="reimbursement-expense-toolbar flex flex-col gap-2 rounded-sm border border-slate-200 bg-slate-50 px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={onAddRow}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            增加一行
          </Button>
          {onAppendRows ? (
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={() => {
              setBulkOpen((value) => !value)
              setBulkErrors([])
            }}>
              <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
              批量增加
            </Button>
          ) : null}
        </div>
        <p className="text-sm font-semibold text-slate-900 sm:text-base">总计：{totalLabel}</p>
      </div>

      {bulkOpen && onAppendRows ? (
        <div className="grid gap-3 rounded-sm border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">粘贴 CSV 文本后追加到当前明细</p>
            <p className="mt-1 text-xs text-slate-500">每行格式：项目名称,金额,备注。可包含表头；备注可为空。</p>
          </div>
          <Textarea
            className="min-h-32 bg-white font-mono text-sm"
            placeholder={"项目名称,金额,备注\n机票,3500,北京往返\n住宿,1200,会议期间住宿"}
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
          />
          {bulkErrors.length ? (
            <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {bulkErrors.map((error) => <p key={error}>{error}</p>)}
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => {
              setBulkText("")
              setBulkErrors([])
            }}>
              清空
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              setBulkOpen(false)
              setBulkErrors([])
            }}>
              取消
            </Button>
            <Button type="button" onClick={appendBulkRows} disabled={!bulkText.trim()}>
              追加到明细
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
