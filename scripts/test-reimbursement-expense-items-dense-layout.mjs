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
  ['thin spreadsheet grid border', 'overflow-x-auto rounded-sm border border-slate-300'],
  ['compact table row height', 'className="h-8 border-b border-slate-200'],
  ['compact toolbar with total', 'reimbursement-expense-toolbar'],
  ['small add-row button', 'h-8 rounded-sm px-2 text-xs'],
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
