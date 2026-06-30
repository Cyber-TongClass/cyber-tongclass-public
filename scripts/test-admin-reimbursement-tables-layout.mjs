import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pagePath = resolve(__dirname, '../src/app/admin/reimbursements/tables/page.tsx')
const source = readFileSync(pagePath, 'utf8')

const expectations = [
  ['compact spreadsheet control styles', 'compactControlClassName'],
  ['sheet-like cell styles', 'spreadsheetCellClassName'],
  ['sheet-like header styles', 'spreadsheetHeaderClassName'],
  ['sticky row number column', 'sticky left-0 z-10'],
  ['bounded scrollable worksheet area', 'max-h-[calc(100vh-260px)]'],
  ['dense textarea cells without resize handle', 'resize-none overflow-hidden'],
  ['compact metadata grid', 'grid-cols-[72px_minmax(0,1fr)_72px_minmax(0,1fr)]'],
]

const missing = expectations.filter(([, needle]) => !source.includes(needle))

if (missing.length > 0) {
  console.error('Admin reimbursement table editor is missing dense spreadsheet layout markers:')
  for (const [label, needle] of missing) {
    console.error(`- ${label}: ${needle}`)
  }
  process.exit(1)
}

console.log('Admin reimbursement table editor dense layout markers found.')
