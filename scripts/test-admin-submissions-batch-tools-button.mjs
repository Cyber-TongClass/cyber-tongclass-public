import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pagePath = resolve(__dirname, '../src/app/admin/forms/[id]/submissions/page.tsx')
const source = readFileSync(pagePath, 'utf8')

const expectations = [
  ['batch tools visibility state', 'const [showBatchTools, setShowBatchTools] = useState(false)'],
  ['top-right action button label', '批量批复与修改'],
  ['button toggles the batch panel', 'setShowBatchTools((current) => !current)'],
  ['button exposes expanded state', 'aria-expanded={showBatchTools}'],
  ['primary deep-blue button styling', 'bg-primary text-primary-foreground hover:bg-primary/90'],
  ['batch tools panel is conditional', '{showBatchTools ? ('],
  ['result config kept inside batch tools panel', 'admin-submissions-batch-tools'],
  ['result config card no longer always visible', '结果展示配置'],
  ['batch import card no longer always visible', '批量关联结果'],
]

const missing = expectations.filter(([, needle]) => !source.includes(needle))

if (missing.length > 0) {
  console.error('Admin submissions page is missing collapsed batch tools button markers:')
  for (const [label, needle] of missing) {
    console.error(`- ${label}: ${needle}`)
  }
  process.exit(1)
}

console.log('Admin submissions collapsed batch tools button markers found.')
