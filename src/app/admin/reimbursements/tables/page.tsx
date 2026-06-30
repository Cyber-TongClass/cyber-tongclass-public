"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Save, TableProperties, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  useAdminReimbursementMaterialTables,
  useRemoveReimbursementMaterialTable,
  useSeedAcademicExchangeReimbursementTables,
  useUpsertReimbursementMaterialTable,
} from "@/lib/api"
import {
  ACADEMIC_EXCHANGE_REIMBURSEMENT_CATEGORY,
  createDefaultLivingExpenseTableDraft,
  normalizeReimbursementTableDraft,
} from "@/lib/reimbursement-material-tables"
import type {
  ReimbursementMaterialTable,
  ReimbursementMaterialTableColumn,
  ReimbursementMaterialTableDraft,
  ReimbursementMaterialTableRow,
} from "@/types"
import { cn } from "@/lib/utils"

const compactControlClassName =
  "h-8 rounded-sm border-slate-300 bg-white px-2 py-1 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"

const compactTextareaClassName =
  "min-h-[44px] rounded-sm border-slate-300 bg-white px-2 py-1.5 text-xs leading-5 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"

const spreadsheetHeaderClassName =
  "sticky top-0 z-20 h-9 border-r border-slate-300 bg-slate-100 px-1.5 py-1 align-middle text-xs font-semibold text-slate-700"

const spreadsheetCellClassName =
  "h-8 min-h-8 resize-none overflow-hidden rounded-none border-0 bg-transparent px-2 py-1 text-xs leading-5 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"

function createNewDraft(): ReimbursementMaterialTableDraft {
  return {
    slug: `reimbursement-table-${Date.now()}`,
    title: "新建报销表格",
    description: "",
    category: ACADEMIC_EXCHANGE_REIMBURSEMENT_CATEGORY,
    columns: [
      { id: "item", label: "项目" },
      { id: "standard", label: "标准" },
      { id: "note", label: "备注" },
    ],
    rows: [],
    isPublished: false,
  }
}

function tableToDraft(table: ReimbursementMaterialTable): ReimbursementMaterialTableDraft {
  return {
    _id: table._id,
    slug: table.slug,
    title: table.title,
    description: table.description,
    category: table.category,
    columns: table.columns.map((column) => ({ ...column })),
    rows: table.rows.map((row) => ({ id: row.id, cells: [...row.cells] })),
    isPublished: table.isPublished,
  }
}

function formatTime(timestamp?: number) {
  if (!timestamp) return "-"
  return new Date(timestamp).toLocaleString("zh-CN")
}

export default function AdminReimbursementTablesPage() {
  const tables = useAdminReimbursementMaterialTables() as ReimbursementMaterialTable[] | undefined
  const upsertTable = useUpsertReimbursementMaterialTable()
  const removeTable = useRemoveReimbursementMaterialTable()
  const seedDefaults = useSeedAcademicExchangeReimbursementTables()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ReimbursementMaterialTableDraft>(() => createNewDraft())
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!tables || selectedId || draft._id) return
    if (tables.length > 0) {
      setSelectedId(tables[0]._id)
      setDraft(tableToDraft(tables[0]))
    }
  }, [draft._id, selectedId, tables])

  const selectedTable = useMemo(
    () => tables?.find((table) => table._id === selectedId) || null,
    [selectedId, tables]
  )

  const selectTable = (table: ReimbursementMaterialTable) => {
    setMessage("")
    setSelectedId(table._id)
    setDraft(tableToDraft(table))
  }

  const startNewTable = () => {
    setMessage("")
    setSelectedId(null)
    setDraft(createNewDraft())
  }

  const updateColumn = (index: number, patch: Partial<ReimbursementMaterialTableColumn>) => {
    setDraft((current) => ({
      ...current,
      columns: current.columns.map((column, columnIndex) => (
        columnIndex === index ? { ...column, ...patch } : column
      )),
    }))
  }

  const addColumn = () => {
    setDraft((current) => ({
      ...current,
      columns: [...current.columns, { id: `column-${Date.now()}`, label: "新列" }],
      rows: current.rows.map((row) => ({ ...row, cells: [...row.cells, ""] })),
    }))
  }

  const removeColumnAt = (index: number) => {
    setDraft((current) => {
      if (current.columns.length <= 1) return current
      return {
        ...current,
        columns: current.columns.filter((_, columnIndex) => columnIndex !== index),
        rows: current.rows.map((row) => ({
          ...row,
          cells: row.cells.filter((_, cellIndex) => cellIndex !== index),
        })),
      }
    })
  }

  const addRow = () => {
    setDraft((current) => ({
      ...current,
      rows: [
        ...current.rows,
        {
          id: `row-${Date.now()}`,
          cells: current.columns.map(() => ""),
        },
      ],
    }))
  }

  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row, index) => {
        if (index !== rowIndex) return row
        const cells = [...row.cells]
        cells[cellIndex] = value
        return { ...row, cells }
      }),
    }))
  }

  const removeRowAt = (index: number) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.filter((_, rowIndex) => rowIndex !== index),
    }))
  }

  const handleSave = async () => {
    setMessage("")
    setSaving(true)
    try {
      const normalized = normalizeReimbursementTableDraft(draft)
      const id = await upsertTable(normalized)
      setSelectedId(String(id))
      setDraft({ ...normalized, _id: String(id) })
      setMessage("表格已保存。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleSeedDefaults = async () => {
    setMessage("")
    setSaving(true)
    try {
      const result = await seedDefaults()
      setMessage(result?.created ? "已创建默认报销标准表。" : "默认报销标准表已存在。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建默认表失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!draft._id) return
    await confirm({
      title: "删除报销表格",
      description: `确定删除“${draft.title}”吗？学生将无法继续查看这个网页表格。`,
      confirmLabel: "确定删除",
      variant: "danger",
      onConfirm: async () => {
        await removeTable(draft._id!)
        setMessage("表格已删除。")
        startNewTable()
      },
    })
  }

  const loadDefaultDraft = () => {
    setMessage("")
    setSelectedId(null)
    setDraft(createDefaultLivingExpenseTableDraft())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">报销表格配置</h1>
          <p className="mt-1 text-sm text-gray-500">维护学生在内网点击“查看表单”后看到的 HTML 表格。</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={loadDefaultDraft}>
            <TableProperties className="mr-1.5 h-3.5 w-3.5" />
            载入默认标准
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={handleSeedDefaults} disabled={saving}>
            发布默认表
          </Button>
          <Button type="button" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={startNewTable}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            新建表格
          </Button>
        </div>
      </div>

      {message ? (
        <div className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50 px-3 py-2">
            <CardTitle className="text-sm">表格列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 p-2">
            {tables === undefined ? (
              <p className="px-2 py-3 text-xs text-slate-500">正在读取...</p>
            ) : tables.length === 0 ? (
              <p className="rounded-sm border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                暂无表格，可先发布默认表或新建表格。
              </p>
            ) : (
              tables.map((table) => (
                <button
                  key={table._id}
                  type="button"
                  onClick={() => selectTable(table)}
                  className={`w-full rounded-sm border px-2 py-2 text-left transition ${
                    selectedTable?._id === table._id
                      ? "border-blue-900 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="block truncate text-xs font-semibold text-slate-950">{table.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {table.isPublished ? "已发布" : "草稿"} · {table.slug}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">编辑表格</CardTitle>
              <span className="text-xs text-slate-500">
                {draft.columns.length} 列 · {draft.rows.length} 行 · 更新：{formatTime(selectedTable?.updatedAt)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div className="grid items-center gap-x-2 gap-y-2 lg:grid-cols-[72px_minmax(0,1fr)_72px_minmax(0,1fr)]">
              <Label htmlFor="table-title" className="text-xs font-medium text-slate-500">标题</Label>
              <Input
                id="table-title"
                value={draft.title}
                className={compactControlClassName}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
              <Label htmlFor="table-slug" className="text-xs font-medium text-slate-500">链接标识</Label>
              <Input
                id="table-slug"
                value={draft.slug}
                className={compactControlClassName}
                onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
              />
              <Label htmlFor="table-category" className="text-xs font-medium text-slate-500">分类</Label>
              <Input
                id="table-category"
                value={draft.category}
                className={compactControlClassName}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              />
              <span className="text-xs font-medium text-slate-500">状态</span>
              <label className="flex h-8 items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.isPublished}
                  onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))}
                />
                发布给学生查看
              </label>
              <Label htmlFor="table-description" className="text-xs font-medium text-slate-500">说明</Label>
              <Textarea
                id="table-description"
                value={draft.description}
                className={cn(compactTextareaClassName, "lg:col-span-3")}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-slate-200 bg-slate-50 px-2 py-2">
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={addColumn}>
                  新增列
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={addRow}>
                  新增行
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={handleSave} disabled={saving}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {saving ? "保存中..." : "保存表格"}
                </Button>
                <Button type="button" variant="destructive" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={handleDelete} disabled={!draft._id || saving}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  删除
                </Button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-sm border border-slate-300 bg-white">
              <table className="w-full min-w-max border-collapse text-xs">
                <TableHeader>
                  <TableRow className="border-b border-slate-300 hover:bg-transparent">
                    <TableHead className={cn(spreadsheetHeaderClassName, "sticky left-0 top-0 z-30 w-12 min-w-12 text-center")}>
                      #
                    </TableHead>
                    {draft.columns.map((column, index) => (
                      <TableHead key={column.id} className={cn(spreadsheetHeaderClassName, "min-w-[128px]")}>
                        <div className="flex items-center gap-1">
                          <Input
                            value={column.label}
                            onChange={(event) => updateColumn(index, { label: event.target.value })}
                            className={cn(compactControlClassName, "!h-7 rounded-none border-0 bg-transparent px-1 font-semibold")}
                            aria-label={`第 ${index + 1} 列标题`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 rounded-sm text-slate-500 hover:text-red-600"
                            onClick={() => removeColumnAt(index)}
                            disabled={draft.columns.length <= 1}
                            aria-label={`删除第 ${index + 1} 列`}
                            title="删除列"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.rows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={draft.columns.length + 1} className="h-20 text-center text-xs text-slate-500">
                        暂无行，点击“新增行”开始编辑。
                      </TableCell>
                    </TableRow>
                  ) : (
                    draft.rows.map((row: ReimbursementMaterialTableRow, rowIndex) => (
                      <TableRow key={row.id} className="h-8 border-b border-slate-200 hover:bg-slate-50">
                        <TableCell className="sticky left-0 z-10 w-12 border-r border-slate-300 bg-slate-50 !p-0 text-center align-middle">
                          <div className="flex h-8 items-center justify-center gap-1">
                            <span className="w-4 text-[11px] text-slate-500">{rowIndex + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-sm text-slate-400 hover:text-red-600"
                              onClick={() => removeRowAt(rowIndex)}
                              aria-label={`删除第 ${rowIndex + 1} 行`}
                              title="删除行"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        {draft.columns.map((column, cellIndex) => (
                          <TableCell key={`${row.id}-${column.id}`} className="min-w-[128px] border-r border-slate-200 !p-0 align-top">
                            <Textarea
                              value={row.cells[cellIndex] || ""}
                              onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
                              rows={1}
                              className={spreadsheetCellClassName}
                              aria-label={`第 ${rowIndex + 1} 行第 ${cellIndex + 1} 列`}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              保存时会自动去除空行并规范链接标识。
            </p>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog />
    </div>
  )
}
