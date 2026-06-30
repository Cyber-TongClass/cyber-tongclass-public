export type ParsedReimbursementExpenseRow = {
  item: string
  amount: string
  note: string
}

export type ReimbursementExpenseCsvParseResult = {
  rows: ParsedReimbursementExpenseRow[]
  errors: string[]
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let cell = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      cells.push(cell.trim())
      cell = ""
      continue
    }

    cell += char
  }

  cells.push(cell.trim())
  return cells
}

function isHeaderRow(cells: string[]) {
  const first = cells[0]?.trim().toLowerCase() || ""
  const second = cells[1]?.trim().toLowerCase() || ""
  return (
    ["项目名称", "开支项目", "项目", "item", "name"].includes(first) &&
    ["金额", "预计金额", "预计金额（人民币元）", "amount", "cost"].includes(second)
  )
}

function normalizeAmount(value: string) {
  return value.trim().replace(/^[¥￥]\s*/, "").replace(/,/g, "")
}

export function parseReimbursementExpenseCsv(text: string): ReimbursementExpenseCsvParseResult {
  const rows: ParsedReimbursementExpenseRow[] = []
  const errors: string[] = []
  let seenContent = false

  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return

    const lineNumber = index + 1
    const cells = parseCsvLine(line)
    if (!seenContent && isHeaderRow(cells)) {
      seenContent = true
      return
    }
    seenContent = true

    const item = (cells[0] || "").trim()
    const rawAmount = normalizeAmount(cells[1] || "")
    const note = cells.slice(2).join(",").trim()

    if (!item || !rawAmount) {
      errors.push(`第 ${lineNumber} 行：项目名称和金额不能为空。`)
      return
    }

    const amount = Number(rawAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push(`第 ${lineNumber} 行：金额必须是非负数字。`)
      return
    }

    rows.push({ item, amount: rawAmount, note })
  })

  if (seenContent && rows.length === 0 && errors.length === 0) {
    errors.push("没有识别到可追加的金额明细。")
  }

  return { rows, errors }
}
