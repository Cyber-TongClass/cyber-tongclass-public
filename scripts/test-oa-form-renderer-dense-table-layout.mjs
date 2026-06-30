import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rendererPath = resolve(__dirname, '../src/components/oa-forms/oa-form-renderer.tsx')
const source = readFileSync(rendererPath, 'utf8')

const expectations = [
  ['field container helper exists', 'function getFieldContainerClassName'],
  ['table fields forced full row', 'field.type === "table"'],
  ['table fields span both columns', 'md:col-span-2'],
  ['dense table wrapper marker', 'oa-form-dense-table'],
  ['dense input class constant', 'denseTableInputClassName'],
  ['spreadsheet header class constant', 'denseTableHeaderClassName'],
  ['sticky row index column', 'sticky left-0 z-10'],
  ['compact cells without rounded card inputs', 'rounded-none border-0 bg-transparent'],
  ['bounded horizontal worksheet scroll', 'overflow-x-auto rounded-sm border border-slate-300'],
]

const missing = expectations.filter(([, needle]) => !source.includes(needle))

if (missing.length > 0) {
  console.error('OA form renderer is missing dense single-column table layout markers:')
  for (const [label, needle] of missing) {
    console.error(`- ${label}: ${needle}`)
  }
  process.exit(1)
}

console.log('OA form renderer dense single-column table layout markers found.')
