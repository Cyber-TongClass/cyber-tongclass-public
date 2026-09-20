import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
let states, cursor, refs, refCursor, canManage, mutate, calls
const element = (type, props) => ({ type, props })
const react = { useState: initial => { const n = cursor++; states[n] ??= initial; return [states[n], value => { states[n] = value }] }, useRef: initial => { const n = refCursor++; return refs[n] ||= { current: initial } } }
const out = {}
const require = name => ({
  react,
  'react/jsx-runtime': { jsx: element, jsxs: element },
  '@/lib/api': { useUpdateUser: () => async args => { calls.push(args); return mutate(args) } },
  '@/lib/hooks/use-auth': { useAuth: () => ({ isSuperAdmin: canManage }) },
}[name])
vm.runInNewContext(ts.transpileModule(readFileSync('src/components/admin/member-visibility-toggle.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports: out, require })
function reset() { states = []; refs = []; calls = []; canManage = true; mutate = async () => {} }
function render(enabled = true) { cursor = refCursor = 0; return out.MemberVisibilityToggle({ userId: 'student-id', name: 'Student', enabled }) }
function find(node, predicate) { if (!node || typeof node !== 'object') return; if (predicate(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const hit = find(child, predicate); if (hit) return hit } }
const button = tree => find(tree, n => n.props?.role === 'switch')
reset()
assert.equal(button(render()).props['aria-checked'], true)
await button(render()).props.onClick()
assert.equal(JSON.stringify(calls), JSON.stringify([{ id: 'student-id', isClassMember: false }]))
assert.equal(button(render(false)).props['aria-checked'], false)
reset()
await button(render(false)).props.onClick()
assert.equal(calls[0].isClassMember, true)
reset()
mutate = async () => { throw Error('保存失败') }
await button(render()).props.onClick()
assert.equal(button(render()).props['aria-checked'], true)
assert.ok(find(render(), n => n.props?.role === 'alert'))
reset()
canManage = false
assert.equal(button(render()).props.disabled, true)
await button(render()).props.onClick()
assert.equal(calls.length, 0)
reset()
let done
mutate = () => new Promise(resolve => { done = resolve })
const action = button(render()).props.onClick
const pending = action()
await action()
assert.equal(calls.length, 1)
assert.equal(button(render()).props.disabled, true)
done(); await pending
console.log('Member visibility: hide, re-enable, failure, permissions, and duplicate-click tests passed')
