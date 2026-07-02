"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowLeft, Search, TableProperties } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePublishedReimbursementMaterialTable } from "@/lib/api"
import {
  ACADEMIC_EXCHANGE_REIMBURSEMENT_CATEGORY,
  buildReimbursementDisplayRows,
  createDefaultLivingExpenseTableDraft,
  filterReimbursementRows,
  getReimbursementCountryColumnIndex,
  getReimbursementSectionOrdinal,
  getReimbursementSectionTitle,
  isReimbursementSectionRow,
  LIVING_EXPENSE_TABLE_SLUG,
} from "@/lib/reimbursement-material-tables"
import { formatDate } from "@/lib/academic-exchange"
import type { ReimbursementMaterialTable, ReimbursementMaterialTableDraft } from "@/types"

function getFallbackTable(slug: string): ReimbursementMaterialTableDraft | null {
  if (slug !== LIVING_EXPENSE_TABLE_SLUG) return null
  return createDefaultLivingExpenseTableDraft()
}

function getUpdatedLabel(table: ReimbursementMaterialTable | ReimbursementMaterialTableDraft) {
  if ("updatedAt" in table && table.updatedAt) return formatDate(table.updatedAt)
  return "来自当前公开材料"
}

function getBackLink(table?: ReimbursementMaterialTable | ReimbursementMaterialTableDraft | null) {
  if (table?.category === ACADEMIC_EXCHANGE_REIMBURSEMENT_CATEGORY) {
    return {
      href: "/intranet/reimbursements/academic-exchange",
      label: "返回学术交流支持",
    }
  }

  return {
    href: "/intranet/materials",
    label: "返回资料下载",
  }
}

export default function ReimbursementMaterialTablePage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const publishedTable = usePublishedReimbursementMaterialTable(slug) as ReimbursementMaterialTable | null | undefined
  const [searchQuery, setSearchQuery] = useState("")
  const table = publishedTable === undefined ? undefined : publishedTable || getFallbackTable(slug)

  const filteredRows = useMemo(() => {
    if (!table) return []
    return filterReimbursementRows(table.rows, table.columns, searchQuery)
  }, [table, searchQuery])
  const displayRows = useMemo(() => {
    if (!table) return []
    return buildReimbursementDisplayRows(filteredRows, table.columns)
  }, [table, filteredRows])
  const countryColumnIndex = useMemo(() => table ? getReimbursementCountryColumnIndex(table.columns) : -1, [table])
  const dataRowCount = useMemo(() => table?.rows.filter((row) => !isReimbursementSectionRow(row)).length || 0, [table])
  const filteredDataRowCount = useMemo(() => filteredRows.filter((row) => !isReimbursementSectionRow(row)).length, [filteredRows])

  if (table === undefined) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)] flex items-center justify-center">
        <p className="text-slate-600">正在读取表格...</p>
      </div>
    )
  }

  if (!table) {
    const backLink = slug === LIVING_EXPENSE_TABLE_SLUG
      ? { href: "/intranet/reimbursements/academic-exchange", label: "返回学术交流支持" }
      : getBackLink(table)

    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)] px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button asChild variant="ghost">
            <Link href={backLink.href}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLink.label}
            </Link>
          </Button>
          <Card>
            <CardContent className="py-10 text-center">
              <TableProperties className="mx-auto h-10 w-10 text-slate-300" />
              <h1 className="mt-4 text-2xl font-extrabold text-slate-900">表格暂未发布</h1>
              <p className="mt-2 text-sm text-slate-500">管理员发布后，同学们可以在这里查看对应表格。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const backLink = getBackLink(table)

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[4rem] md:text-[7rem] lg:text-[9rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none">
            TABLE
          </div>
          <Link href={backLink.href} className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {backLink.label}
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{table.title}</h1>
          <p className="text-lg text-white/70 max-w-3xl mt-2">
            {table.description || "请以网页表格中的最新内容为准。"}
          </p>
          <p className="mt-4 text-sm text-white/55">最后更新：{getUpdatedLabel(table)}</p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative md:max-w-md md:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索国家、地区、城市、币种或标准..."
                  className="pl-9"
                />
              </div>
              <p className="text-sm text-slate-500">
                共 {dataRowCount} 条标准，当前显示 {filteredDataRowCount} 条。
              </p>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {table.columns.map((column) => (
                      <TableHead key={column.id} style={column.width ? { width: column.width } : undefined}>
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={table.columns.length} className="h-24 text-center text-slate-500">
                        没有匹配的表格行
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayRows.map((displayRow) => {
                      const { row } = displayRow
                      const sectionOrdinal = getReimbursementSectionOrdinal(row)

                      return (
                        isReimbursementSectionRow(row) ? (
                          <TableRow key={row.id} className="border-y border-primary/20 bg-primary/5 hover:bg-primary/5">
                            <TableCell colSpan={table.columns.length} className="py-4">
                              <div className="flex flex-wrap items-center gap-3">
                                {sectionOrdinal ? (
                                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                                    {sectionOrdinal}
                                  </span>
                                ) : null}
                                <span className="text-base font-extrabold tracking-wide text-slate-950">
                                  {getReimbursementSectionTitle(row)}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
	                        ) : (
	                          <TableRow key={row.id} className={displayRow.isCountryContinuation ? "bg-slate-50/35" : undefined}>
	                            {table.columns.map((column, index) => {
	                              if (index === countryColumnIndex && !displayRow.showCountryCell) return null

	                              const isCountryCell = index === countryColumnIndex
	                              const cellValue = isCountryCell && displayRow.country ? displayRow.country : row.cells[index]

	                              return (
	                                <TableCell
	                                  key={`${row.id}-${column.id}`}
	                                  rowSpan={isCountryCell && displayRow.countryRowSpan > 1 ? displayRow.countryRowSpan : undefined}
	                                  className={[
	                                    "align-top",
	                                    isCountryCell && displayRow.countryRowSpan > 1 ? "border-r border-slate-100 bg-slate-50/70" : "",
	                                  ].filter(Boolean).join(" ")}
	                                >
                                  {isCountryCell && displayRow.country ? (
                                    <div className="space-y-1">
                                      <p className="font-semibold text-slate-950">{displayRow.country}</p>
                                      {displayRow.countryRowSpan > 1 ? (
                                        <p className="text-xs font-normal text-slate-400">{displayRow.countryRowSpan} 条城市标准</p>
                                      ) : null}
                                    </div>
                                  ) : cellValue ? (
                                    cellValue
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
