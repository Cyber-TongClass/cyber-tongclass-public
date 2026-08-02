import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const componentPath = resolve(__dirname, '../src/components/reimbursements/reimbursement-expense-items.tsx')
const source = readFileSync(componentPath, 'utf8')

const expectations = [
  ['dense wrapper marker', 'reimbursement-expense-dense-table'],
  ['dense input class constant', 'expenseInputClassName'],
  ['dense header class constant', 'expenseHeaderClassName'],
  ['sticky row index column', 'sticky left-0 z-10'],
  ['compact spreadsheet cells', 'rounded-none border-0 bg-transparent'],
  ['AIA hairline spreadsheet grid border', 'overflow-x-auto border aia-border-rule'],
  ['compact AIA hairline row height', 'className="h-8 border-b aia-border-rule'],
  ['compact toolbar with total', 'reimbursement-expense-toolbar'],
  ['touch-safe square-corner add-row button', 'className="min-h-11 rounded-none px-3 text-xs"'],
  ['AIA tag toolbar surface', 'reimbursement-expense-toolbar aia-bg-tag'],
]

const missing = expectations.filter(([, needle]) => !source.includes(needle))

if (missing.length > 0) {
  console.error('Reimbursement expense items component is missing dense spreadsheet layout markers:')
  for (const [label, needle] of missing) {
    console.error(`- ${label}: ${needle}`)
  }
  process.exit(1)
}

console.log('Reimbursement expense items dense spreadsheet layout markers found.')
