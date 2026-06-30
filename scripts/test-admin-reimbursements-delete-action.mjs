import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pagePath = resolve(__dirname, '../src/app/admin/reimbursements/page.tsx')
const source = readFileSync(pagePath, 'utf8')

const expectations = [
  ['remove hook import', 'useAdminRemoveOAForm'],
  ['remove hook instance', 'const removeForm = useAdminRemoveOAForm()'],
  ['delete handler', 'const remove = async (form: OAForm)'],
  ['delete confirmation copy', '确定删除报销模板'],
  ['backend remove call', 'await removeForm({ id: form._id })'],
  ['delete success copy', '报销模板已删除'],
  ['delete button label', '>删除</Button>'],
  ['destructive button variant', 'variant="destructive"'],
]

const missing = expectations.filter(([, needle]) => !source.includes(needle))

if (missing.length > 0) {
  console.error('Admin reimbursements page is missing delete action markers:')
  for (const [label, needle] of missing) {
    console.error(`- ${label}: ${needle}`)
  }
  process.exit(1)
}

console.log('Admin reimbursements delete action markers found.')
